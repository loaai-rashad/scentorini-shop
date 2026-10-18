// Vercel Edge Function: /feed.xml (rewritten here by vercel.json).
// Google Merchant Center product feed (RSS 2.0 + g: namespace) for free Google
// Shopping listings. Nothing uses it until it is added in Merchant Center.
//
// Deliberately leaves out the "inspired by" brand names: Google's counterfeit
// policy can disapprove listings that name another brand in a dupe's title.

import { getOrigin, esc, fetchCollection, productUrl, productImages, productOffers, inStock, summary, clean, SITE_NAME } from "./_lib/site";

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const origin = getOrigin(request);
  const products = await fetchCollection("products").catch(() => []);

  const items: string[] = [];
  for (const p of products) {
    const name = clean(p.title);
    const images = productImages(p, origin);
    const offers = productOffers(p);
    if (!p.id || !name || !images.length || !offers.length) continue;

    // One feed item per size, grouped so Google shows them as variants.
    offers.forEach((offer, i) => {
      const id = offers.length > 1 ? `${p.id}-${i + 1}` : p.id;
      const title = [name, offers.length > 1 ? offer.size : clean(p.subtitle)].filter(Boolean).join(" - ");
      const description = summary(p.description, 900) || clean(p.subtitle) || `${name} by ${SITE_NAME}`;
      items.push(
        [
          "<item>",
          `<g:id>${esc(id)}</g:id>`,
          offers.length > 1 ? `<g:item_group_id>${esc(p.id)}</g:item_group_id>` : "",
          offers.length > 1 && offer.size ? `<g:size>${esc(offer.size)}</g:size>` : "",
          `<g:title>${esc(title.slice(0, 150))}</g:title>`,
          `<g:description>${esc(description)}</g:description>`,
          `<g:link>${esc(productUrl(origin, p.id))}</g:link>`,
          `<g:image_link>${esc(images[0])}</g:image_link>`,
          ...images.slice(1, 10).map((img) => `<g:additional_image_link>${esc(img)}</g:additional_image_link>`),
          `<g:availability>${inStock(p) ? "in_stock" : "out_of_stock"}</g:availability>`,
          `<g:price>${offer.price.toFixed(2)} EGP</g:price>`,
          `<g:brand>${esc(SITE_NAME)}</g:brand>`,
          "<g:condition>new</g:condition>",
          "<g:identifier_exists>no</g:identifier_exists>",
          "<g:google_product_category>Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Perfume &amp; Cologne</g:google_product_category>",
          "</item>",
        ]
          .filter(Boolean)
          .join("")
      );
    });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
    `<title>${esc(SITE_NAME)}</title><link>${esc(origin)}</link><description>${esc(SITE_NAME)} fragrances</description>\n` +
    items.join("\n") +
    `\n</channel></rss>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
