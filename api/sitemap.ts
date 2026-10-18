// Vercel Edge Function: /sitemap.xml (rewritten here by vercel.json).
// Built live from Firestore, so new products and categories appear automatically.
// If Firestore is unreachable it still returns the static pages (never an error page).

import { getOrigin, esc, fetchCollection, productUrl, productImages, clean } from "./_lib/site";

export const config = { runtime: "edge" };

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/products", priority: "0.9", changefreq: "daily" },
  { path: "/testers/builder", priority: "0.8", changefreq: "weekly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
];

export default async function handler(request: Request): Promise<Response> {
  const origin = getOrigin(request);
  const entries: string[] = STATIC_PATHS.map(
    (s) => `<url><loc>${esc(origin + s.path)}</loc><changefreq>${s.changefreq}</changefreq><priority>${s.priority}</priority></url>`
  );

  const [products, categories] = await Promise.all([
    fetchCollection("products").catch(() => []),
    fetchCollection("categories").catch(() => []),
  ]);

  for (const c of categories) {
    if (c.visible === false || !c.slug) continue;
    entries.push(
      `<url><loc>${esc(`${origin}/category/${encodeURIComponent(c.slug)}`)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  }

  for (const p of products) {
    if (!p.id || !clean(p.title)) continue;
    const images = productImages(p, origin)
      .slice(0, 5)
      .map((img) => `<image:image><image:loc>${esc(img)}</image:loc></image:image>`)
      .join("");
    entries.push(
      `<url><loc>${esc(productUrl(origin, p.id))}</loc><changefreq>weekly</changefreq><priority>0.9</priority>${images}</url>`
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    entries.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
