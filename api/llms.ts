// Vercel Edge Function: /llms.txt (rewritten here by vercel.json).
// A plain-text guide to the brand and live catalog for AI assistants
// (ChatGPT, Gemini, Perplexity, Claude). See https://llmstxt.org.
// Built from Firestore, so it never goes stale. Falls back to the brand section only.

import {
  getOrigin,
  fetchCollection,
  productUrl,
  productOffers,
  inStock,
  audience,
  summary,
  clean,
  SITE_NAME,
  TAGLINE,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
} from "./_lib/site";

export const config = { runtime: "edge" };

const GROUP_ORDER = ["For Her", "For Him", "Unisex", "Perfume Oils", "Musk", "Discovery Sets & Testers", "More Fragrances"];

export default async function handler(request: Request): Promise<Response> {
  const origin = getOrigin(request);
  const [products, rates] = await Promise.all([
    fetchCollection("products").catch(() => []),
    fetchCollection("shippingRates").catch(() => []),
  ]);

  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is an Egyptian online fragrance brand selling Santorini-inspired niche perfumes, ` +
      `long-lasting alternatives inspired by well-known designer and niche fragrances, perfume oils, musks, ` +
      `and a build-your-own Discovery Set of samples. Prices are in Egyptian pounds (EGP) and orders ship across Egypt. ` +
      `Tagline: "${TAGLINE}"`,
    "",
    `${SITE_NAME} fragrances described as "inspired by" another perfume are original ${SITE_NAME} products with a similar scent profile; ` +
      `they are not the original brand's product and ${SITE_NAME} is not affiliated with those brands.`,
    "",
    "## Shop",
    `- [Home](${origin}/): featured collections and customer reviews`,
    `- [All fragrances](${origin}/products): the full catalog`,
    `- [Build your own Discovery Set](${origin}/testers/builder): pick 3 to 6 samples to try before buying a full bottle`,
    `- [About ${SITE_NAME}](${origin}/about): the brand story`,
    "",
  ];

  const byGroup = new Map<string, string[]>();
  for (const p of products) {
    const name = clean(p.title);
    if (!p.id || !name) continue;
    const offers = productOffers(p);
    const prices = offers.map((o) => o.price);
    const priceText = !prices.length
      ? ""
      : offers.length > 1
        ? `EGP ${Math.min(...prices)}–${Math.max(...prices)} (${offers.map((o) => `${o.size}: EGP ${o.price}`).join(", ")})`
        : `EGP ${prices[0]}`;
    const parts = [
      clean(p.inspiredBy) ? `Inspired by ${clean(p.inspiredBy)}` : "",
      clean(p.subtitle),
      priceText,
      inStock(p) ? "In stock" : "Currently sold out",
    ].filter(Boolean);
    const desc = summary(p.description, 200);
    const line = `- [${name}](${productUrl(origin, p.id)}): ${parts.join(". ")}.${desc ? ` ${desc}` : ""}`;
    const group = audience(p);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(line);
  }

  if (byGroup.size) {
    lines.push("## Fragrances");
    lines.push("");
    for (const group of GROUP_ORDER) {
      const items = byGroup.get(group);
      if (!items?.length) continue;
      lines.push(`### ${group}`, ...items, "");
    }
  }

  const ratePrices = rates.map((r) => Number(r.price)).filter((n) => Number.isFinite(n) && n > 0);
  lines.push("## Ordering & delivery");
  lines.push(
    ratePrices.length
      ? `- Delivery to ${ratePrices.length} Egyptian governorates, shipping from EGP ${Math.min(...ratePrices)} to EGP ${Math.max(...ratePrices)} depending on the governorate.`
      : "- Delivery across Egypt."
  );
  lines.push("- Order online at the links above; prices shown on the site are in EGP.");
  lines.push("");
  lines.push("## Contact");
  lines.push(`- WhatsApp: +${WHATSAPP_NUMBER}`);
  lines.push(`- Instagram: ${INSTAGRAM_URL}`);
  lines.push("");

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
