// Direct, in-dashboard image upload to Cloudinary with automatic compression.
//
// Why compression: uploading full-size phone photos (3–5 MB) is what blew
// through the free bandwidth limits. We resize + convert to WebP in the browser
// (~100 KB) BEFORE uploading, so free tiers last basically forever.
//
// Usage: const url = await uploadImage(file);  // returns an optimized URL

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../config";

const MAX_DIMENSION = 1200; // longest side, px
const QUALITY = 0.8;

const isConfigured = () =>
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_CLOUD_NAME !== "YOUR_CLOUD_NAME" &&
  CLOUDINARY_UPLOAD_PRESET &&
  CLOUDINARY_UPLOAD_PRESET !== "YOUR_UNSIGNED_PRESET";

// Resize + compress an image File in the browser. Returns a Blob (or the
// original file if it's not a compressible image, e.g. an animated GIF).
async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", QUALITY)
  );
  return blob || file; // fall back to original if toBlob is unsupported
}

// Insert f_auto,q_auto so every delivery is auto-format/quality (extra safety).
function optimizeUrl(url) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

// Compress + upload to Cloudinary; resolves to an optimized image URL.
export async function uploadImage(file) {
  if (!isConfigured()) {
    throw new Error(
      "Cloudinary isn't set up yet. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in src/config.js."
    );
  }

  const compressed = await compressImage(file);

  const form = new FormData();
  form.append("file", compressed, "upload.webp");
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Upload failed. Check your Cloudinary preset.");
  }

  const data = await res.json();
  return optimizeUrl(data.secure_url);
}
