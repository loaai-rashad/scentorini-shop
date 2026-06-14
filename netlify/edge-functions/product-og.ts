// Netlify Edge Function: inject per-product Open Graph / Twitter meta tags.
//
// Social crawlers (WhatsApp, Twitter/X, Facebook, iMessage, etc.) fetch the raw
// HTML WITHOUT running JavaScript, so the React SPA can't set these tags in a way
// they can see. This function runs at the edge for /products/:id, fetches the
// product from Firestore's public REST API, and rewrites the static index.html
// with the right title/description/image before it reaches the crawler.
//
// The injected tags are harmless for real browsers — React still boots normally.

import type { Context, Config } from "@netlify/edge-functions";

const PROJECT_ID = "scentorini-3562b";
const COLLECTION = "products";
const SITE_NAME = "Scentorini";

// Escape a string for safe insertion into an HTML attribute value.
function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pull a plain value out of a Firestore REST typed field, e.g. { stringValue: "x" }.
function fieldValue(field: any): any {
  if (!field || typeof field !== "object") return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("arrayValue" in field) {
    return (field.arrayValue.values || []).map((v: any) => fieldValue(v));
  }
  return undefined;
}

export default async function handler(req: Request, context: Context) {
  // Always let the normal pipeline produce the SPA HTML first.
  const response = await context.next();

  const url = new URL(req.url);
  const match = url.pathname.match(/^\/products\/([^/]+)\/?$/);
  if (!match) return response;

  // Only rewrite HTML documents.
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const id = decodeURIComponent(match[1]);

  let product: Record<string, any> | null = null;
  try {
    const fsUrl =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
      `/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(id)}`;
    const fsRes = await fetch(fsUrl);
    if (fsRes.ok) {
      const doc = await fsRes.json();
      if (doc && doc.fields) {
        product = {};
        for (const key of Object.keys(doc.fields)) {
          product[key] = fieldValue(doc.fields[key]);
        }
      }
    }
  } catch {
    // Network/Firestore error — fall back to the unmodified page.
    return response;
  }

  if (!product) return response;

  // Resolve the best image: first valid entry in images[], else legacy image string.
  const images: string[] = Array.isArray(product.images) ? product.images : [];
  let image: string = images.find((u) => typeof u === "string" && u) ||
    (typeof product.image === "string" ? product.image : "");
  // Open Graph requires an absolute URL.
  if (image && image.startsWith("/")) image = url.origin + image;
  if (!image) image = url.origin + "/images/scentorinilogoo.jpeg";

  const title = product.title ? `${product.title} | ${SITE_NAME}` : SITE_NAME;
  const description =
    product.subtitle ||
    (product.description ? String(product.description).slice(0, 160) : "") ||
    "Discover our fragrances at Scentorini.";
  const pageUrl = url.origin + url.pathname;

  const tags = `
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(pageUrl)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:secure_url" content="${esc(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
  `;

  let html = await response.text();
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace("</head>", `${tags}</head>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");

  return new Response(html, {
    status: response.status,
    headers,
  });
}

export const config: Config = {
  path: "/products/*",
};
