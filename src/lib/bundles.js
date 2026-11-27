// src/lib/bundles.js
// Customizable bundles ("Perfume + Oil + Tester", "2 Perfumes + free Oil + free Tester").
// Shared by the storefront (showcase cards, /bundles/:id builder, cart, checkout)
// and the admin's Bundles section.
//
// Firestore:
//   bundles/{id} — {
//     title, badge, tagline, description, image,
//     published: boolean,          — nothing public shows while false
//     order: number,               — display order (lower first)
//     discountPercent: number,     — taken off the paid items (0 for "free items" bundles)
//     slots: [{ type: "perfume" | "oil" | "tester", label, free: boolean }]
//   }
//   siteSettings/bundles — { heading } (the showcase title, e.g. "Black Friday Bundles")
//
// Which products can fill a slot comes from the existing menu categories:
//   perfume → products in categories whose slug contains "perfume"
//   oil     → products in categories whose slug contains "oil"
//   musk    → products in categories whose slug contains "musk" (smallest size, e.g. 3 gm)
//   tester  → the Discovery Set samples (samples collection)
// Bundles are priced from regular prices (product sale prices don't stack on top),
// and promo codes can't be used on a cart that contains a bundle.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const BUNDLES = "bundles";
export const BUNDLE_SETTINGS_DOC = doc(db, "siteSettings", "bundles");
export const DEFAULT_HEADING = "Black Friday Bundles";

export const SLOT_TYPES = [
  { value: "perfume", label: "Perfume" },
  { value: "oil", label: "Oil" },
  { value: "musk", label: "Musk" },
  { value: "oilmusk", label: "Oil or Musk" }, // customer picks either; two boxes = 2 oils, 2 musks or one of each
  { value: "tester", label: "Tester" },
];

export const PRESETS = {
  A: {
    title: "Perfume + Oil + Tester",
    badge: "10% OFF",
    tagline: "Your signature scent, its matching oil and a tester to try something new.",
    description:
      "Pick any 55ml perfume, any perfume oil and one tester from our Discovery Set — and get 10% off the whole set.\n\nTap each box below to choose your item. You can mix and match freely.",
    discountPercent: 10,
    slots: [
      { type: "perfume", label: "Perfume", free: false },
      { type: "oil", label: "Oil", free: false },
      { type: "tester", label: "Tester", free: false },
    ],
  },
  B: {
    title: "2 Perfumes + FREE Oil + FREE Tester",
    badge: "BEST VALUE",
    tagline: "Two full-size perfumes, plus an oil and a tester on us.",
    description:
      "Choose any two 55ml perfumes — the same one twice is fine — and we'll add a perfume oil and a Discovery Set tester for free.\n\nTap each box below to choose your item.",
    discountPercent: 0,
    slots: [
      { type: "perfume", label: "Perfume 1", free: false },
      { type: "perfume", label: "Perfume 2", free: false },
      { type: "oil", label: "Oil", free: true },
      { type: "tester", label: "Tester", free: true },
    ],
  },
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

export const inStock = (item) => num(item?.stock) > 0;

// Regular price of a product or sample (bundles never stack product sale prices).
export const basePrice = (item) => Math.round(num(item?.price));

export const productImage = (p) => (Array.isArray(p?.images) && p.images[0]) || p?.image || "";

/**
 * Everything that can fill a slot of `type`, in stock or not (the picker greys
 * out sold-out items). Testers carry the matching perfume's photo, since samples
 * have none. Each option: { key, id, kind, title, subtitle, price, stock, image }.
 */
export function poolFor(type, { products = [], categories = [], samples = [] }) {
  if (type === "oilmusk") {
    const tag = (o, kind) => ({ ...o, subtitle: [kind, o.subtitle].filter(Boolean).join(" · ") });
    const seen = new Set();
    return [
      ...poolFor("oil", { products, categories, samples }).map((o) => tag(o, "Oil")),
      ...poolFor("musk", { products, categories, samples }).map((o) => tag(o, "Musk")),
    ].filter((o) => !seen.has(o.key) && seen.add(o.key));
  }
  if (type === "tester") {
    return samples
      .map((s) => {
        const match = products.find((p) => norm(p.title) === norm(s.title));
        return {
          key: `samples/${s.id}`,
          id: s.id,
          kind: "sample",
          title: String(s.title || "").trim(),
          subtitle: "Discovery Set tester",
          price: basePrice(s),
          stock: num(s.stock),
          image: match ? productImage(match) : "",
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  const needle = type === "oil" || type === "musk" ? type : "perfume";
  const cats = categories.filter((c) => String(c.slug || "").includes(needle) && c.visible !== false);
  let ids = new Set(cats.flatMap((c) => c.productIds || []));
  // Fallback if the categories aren't set up: use the free-text "for" field.
  if (!ids.size) {
    ids = new Set(
      products
        .filter((p) => {
          const f = norm(p.for);
          if (type === "oil" || type === "musk") return f.includes(type);
          return /\b(her|him|unisex)\b/.test(f) && !f.includes("oil");
        })
        .map((p) => p.id)
    );
  }
  return products
    // The Discovery Set sits in the perfume menu categories, but it's a set of samples, not a perfume.
    .filter((p) => ids.has(p.id) && norm(p.for) !== "tester" && !norm(p.title).includes("discovery set"))
    .map((p) => {
      // Musks come in several sizes: bundles include the smallest one (e.g. 3 gm).
      const sizes = type === "musk" && Array.isArray(p.sizeOptions) ? p.sizeOptions.filter((s) => s && num(s.price) > 0) : [];
      const small = sizes.length ? sizes.reduce((a, b) => (num(b.price) < num(a.price) ? b : a)) : null;
      const size = small ? String(small.size || "").trim() : "";
      return {
        key: `products/${p.id}`,
        id: p.id,
        kind: "product",
        title: String(p.title || "").trim(),
        size,
        subtitle: size || [p.inspiredBy ? `Inspired by ${String(p.inspiredBy).trim()}` : "", String(p.subtitle || "").trim()].filter(Boolean).join(" · "),
        price: small ? Math.round(num(small.price)) : basePrice(p),
        stock: num(p.stock),
        image: productImage(p),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** { original, price, saving } for picks[i] filling bundle.slots[i] (missing picks count as 0). */
export function bundlePrice(bundle, picks) {
  let original = 0;
  let paid = 0;
  (bundle?.slots || []).forEach((slot, i) => {
    const p = picks?.[i]?.price || 0;
    original += p;
    if (!slot.free) paid += p;
  });
  const pct = Math.min(100, Math.max(0, num(bundle?.discountPercent)));
  const price = Math.round(paid * (1 - pct / 100));
  return { original, price, saving: Math.max(0, original - price) };
}

// How many of each stock item a list of picks needs (e.g. the same perfume twice).
export function stockNeeds(picks) {
  const needs = {};
  for (const p of picks || []) if (p) needs[p.key] = (needs[p.key] || 0) + 1;
  return needs;
}

// Short promise line for a card, e.g. "Save 10%" or "Oil + Tester FREE".
export function offerLine(bundle) {
  const free = (bundle?.slots || []).filter((s) => s.free).map((s) => SLOT_TYPES.find((t) => t.value === s.type)?.label || s.label);
  const parts = [];
  if (num(bundle?.discountPercent) > 0) parts.push(`Save ${num(bundle.discountPercent)}%`);
  if (free.length) parts.push(`${[...new Set(free)].join(" + ")} FREE`);
  return parts.join(" · ");
}

// Live list of bundles, sorted by `order` (all of them; callers filter on `published`).
export function useBundles() {
  const [bundles, setBundles] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, BUNDLES),
        (snap) =>
          setBundles(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => num(a.order) - num(b.order) || String(a.title).localeCompare(String(b.title)))
          ),
        (err) => {
          console.error("Bundles:", err);
          setBundles([]);
        }
      ),
    []
  );
  return bundles;
}

export function useBundleHeading() {
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  useEffect(
    () =>
      onSnapshot(
        BUNDLE_SETTINGS_DOC,
        (snap) => setHeading((snap.exists() && String(snap.data().heading || "").trim()) || DEFAULT_HEADING),
        () => {}
      ),
    []
  );
  return heading;
}
