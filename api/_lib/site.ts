// Shared helpers for the SEO edge functions (sitemap, robots, llms.txt, feed, product pages).
// Files under api/_lib are not deployed as routes (Vercel skips "_" prefixed paths).
//
// Everything here reads Firestore's public REST API — the same reads the storefront
// already does in the browser — so no credentials are involved.

export const PROJECT_ID = "scentorini-3562b";
export const SITE_NAME = "Scentorini";
export const TAGLINE = "Not just a perfume, a destination.";
export const INSTAGRAM_URL = "https://www.instagram.com/scentorini.eg";
export const WHATSAPP_NUMBER = "201553883588";

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// The public origin the request came in on (works for the vercel.app URL and any custom domain).
export function getOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

// Escape for HTML text/attributes and XML.
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Collapse whitespace / stray spaces that come from hand-typed admin data.
export const clean = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim();

// Pull a plain value out of a Firestore REST typed field.
export function fieldValue(field: any): any {
  if (!field || typeof field !== "object") return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("timestampValue" in field) return field.timestampValue;
  if ("nullValue" in field) return null;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map((v: any) => fieldValue(v));
  if ("mapValue" in field) return docFields(field.mapValue.fields || {});
  return undefined;
}

function docFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(fields || {})) out[key] = fieldValue(fields[key]);
  return out;
}

const toDoc = (d: any) => ({ id: String(d.name || "").split("/").pop(), ...docFields(d.fields || {}) });

// fetch with a hard timeout so a slow Firestore never hangs a page.
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCollection(name: string, ms = 4000): Promise<Record<string, any>[]> {
  const docs: Record<string, any>[] = [];
  let pageToken = "";
  for (let i = 0; i < 10; i++) {
    const url = `${FS_BASE}/${name}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetchWithTimeout(url, {}, ms);
    if (!res.ok) throw new Error(`Firestore ${name}: ${res.status}`);
    const json: any = await res.json();
    for (const d of json.documents || []) docs.push(toDoc(d));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return docs;
}

export async function fetchDoc(collection: string, id: string, ms = 4000): Promise<Record<string, any> | null> {
  const res = await fetchWithTimeout(`${FS_BASE}/${collection}/${encodeURIComponent(id)}`, {}, ms);
  if (!res.ok) return null;
  const json: any = await res.json();
  return json && json.fields ? toDoc(json) : null;
}

// Documents where `field == value` (used for a product's reviews).
export async function queryEqual(collection: string, field: string, value: string, ms = 2000): Promise<Record<string, any>[]> {
  const res = await fetchWithTimeout(
    `${FS_BASE}:runQuery`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } },
          limit: 200,
        },
      }),
    },
    ms
  );
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows.filter((r) => r.document).map((r) => toDoc(r.document));
}

// --- Product helpers (mirror src/lib/pricing.js so crawlers see the price shoppers pay) ---

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function hasActiveDiscount(p: Record<string, any>): boolean {
  if (!p || !p.discountActive) return false;
  const value = num(p.discountValue);
  if (value <= 0) return false;
  if (p.discountType !== "fixed" && value >= 100) return false;
  return true;
}

export function finalPrice(basePrice: unknown, p: Record<string, any>): number {
  const base = num(basePrice);
  if (!hasActiveDiscount(p)) return Math.round(base);
  const value = num(p.discountValue);
  if (p.discountType === "fixed" && value >= base) return Math.round(base);
  const discounted = p.discountType === "fixed" ? base - value : base * (1 - value / 100);
  return Math.max(0, Math.round(discounted));
}

export type SizeOffer = { size: string; price: number };

// Every purchasable price for a product. Like the product page: the base price is
// always an option (labelled with the subtitle), followed by any extra size options.
export function productOffers(p: Record<string, any>): SizeOffer[] {
  const sizes = (Array.isArray(p.sizeOptions) ? p.sizeOptions : [])
    .filter((s: any) => s && num(s.price) > 0)
    .map((s: any) => ({ size: clean(s.size), price: finalPrice(s.price, p) }));
  const base = num(p.price) > 0 ? [{ size: sizes.length ? clean(p.subtitle) || "Standard" : "", price: finalPrice(p.price, p) }] : [];
  return [...base, ...sizes];
}

export const inStock = (p: Record<string, any>): boolean => num(p.stock) > 0;

export function productImages(p: Record<string, any>, origin: string): string[] {
  const list: string[] = Array.isArray(p.images) ? p.images : [];
  const all = [...list, typeof p.image === "string" ? p.image : ""].filter((u) => typeof u === "string" && u);
  return [...new Set(all)].map((u) => (u.startsWith("/") ? origin + u : u));
}

export const productUrl = (origin: string, id: string) => `${origin}/products/${encodeURIComponent(id)}`;

// "For Her" / "For Him" / ... from the free-text `for` field the admin fills in.
export function audience(p: Record<string, any>): string {
  const f = clean(p.for).toLowerCase();
  const her = /\bher\b/.test(f);
  const him = /\bhim\b/.test(f);
  if (f.includes("unisex") || (her && him)) return "Unisex";
  if (her) return "For Her";
  if (him) return "For Him";
  if (f.includes("oil")) return "Perfume Oils";
  if (f.includes("musk")) return "Musk";
  if (f.includes("tester")) return "Discovery Sets & Testers";
  return "More Fragrances";
}

// Plain-text summary of a free-form description (drops bullets / line breaks).
export function summary(text: unknown, max = 220): string {
  // Join lines into sentences; lines already ending in punctuation (e.g. "Top Notes:") just get a space.
  const flat = String(text ?? "")
    .split(/\n+/)
    .map((l) => clean(l.replace(/^\s*[-•*]\s+/, "")))
    .filter(Boolean)
    .reduce((acc, l) => (!acc ? l : /[.:!?,;…]$/.test(acc) ? `${acc} ${l}` : `${acc}. ${l}`), "");
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,.;:\s]+$/, "") + "…";
}

// Page title used for both crawlers and the browser tab.
export function productTitle(p: Record<string, any>): string {
  const name = clean(p.title) || SITE_NAME;
  const inspired = clean(p.inspiredBy);
  return inspired ? `${name} — Inspired by ${inspired} | ${SITE_NAME}` : `${name} | ${SITE_NAME}`;
}
