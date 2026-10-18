// Vercel Edge Function: per-product HTML for crawlers.
//
// Social crawlers (WhatsApp, Facebook, X) and AI crawlers (ChatGPT, Perplexity, Claude)
// fetch the raw HTML WITHOUT running JavaScript, so the React SPA's own tags are
// invisible to them. vercel.json rewrites /products/:id to this function, which reads
// the product from Firestore's public REST API and enriches the static index.html with:
//   1. Open Graph / Twitter tags (link previews)               — original behaviour
//   2. canonical URL + schema.org Product JSON-LD (price, stock, review stars)
//   3. a readable product summary inside #root, which React replaces on boot
//
// Safety: (1) is built exactly as before; (2) and (3) are layered on in a try/catch,
// so any failure there serves the same page this function served before.

import {
  SITE_NAME,
  INSTAGRAM_URL,
  getOrigin,
  esc,
  clean,
  fetchDoc,
  queryEqual,
  productOffers,
  productImages,
  productUrl,
  productTitle,
  inStock,
  summary,
} from "./_lib/site";

export const config = { runtime: "edge" };

const htmlResponse = (html: string) =>
  new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

// JSON for a <script> tag — "<" escaped so text can never close the tag.
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = getOrigin(request);
  const id = (url.searchParams.get("id") || "").trim();

  // Always serve the real SPA shell; we only enrich it.
  const shellRes = await fetch(`${origin}/index.html`);
  let html = await shellRes.text();

  if (!id) return htmlResponse(html);

  let product: Record<string, any> | null = null;
  try {
    product = await fetchDoc("products", id);
  } catch {
    // Network/Firestore error — fall back to the unmodified shell.
  }
  if (!product) return htmlResponse(html);

  // --- 1. Link-preview tags (original behaviour) ---
  const images = productImages(product, origin);
  const image = images[0] || origin + "/images/scentorinilogoo.jpeg";
  const title = productTitle(product);
  const name = clean(product.title) || SITE_NAME;
  const inspired = clean(product.inspiredBy);
  const description =
    clean(product.subtitle) ||
    (product.description ? summary(product.description, 160) : "") ||
    "Discover our fragrances at Scentorini.";
  const pageUrl = productUrl(origin, id);

  const tags = `
    <meta name="description" content="${esc(description)}" />
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

  // index.html carries a site-wide default description between these markers;
  // drop it so the product's own description is the only one.
  html = html.replace(/<!--seo-defaults-->[\s\S]*?<!--\/seo-defaults-->/, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  const basicHtml = html.replace("</head>", `${tags}</head>`);

  // --- 2 + 3. Structured data and crawler-readable content ---
  try {
    const reviews = (await queryEqual("reviews", "productId", id).catch(() => []))
      .filter((r) => Number(r.rating) >= 1 && Number(r.rating) <= 5)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : 0;

    const offers = productOffers(product);
    const prices = offers.map((o) => o.price);
    const availability = inStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
    const longDescription = [
      inspired ? `${name} is a ${SITE_NAME} fragrance inspired by ${inspired}.` : "",
      clean(product.subtitle),
      summary(product.description, 600),
    ]
      .filter(Boolean)
      .join(" ");

    const productLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: longDescription || description,
      image: images.length ? images : [image],
      sku: id,
      url: pageUrl,
      brand: { "@type": "Brand", name: SITE_NAME },
      category: "Perfume",
    };
    if (offers.length === 1) {
      productLd.offers = {
        "@type": "Offer",
        url: pageUrl,
        price: prices[0],
        priceCurrency: "EGP",
        availability,
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: SITE_NAME },
      };
    } else if (offers.length > 1) {
      productLd.offers = {
        "@type": "AggregateOffer",
        url: pageUrl,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: offers.length,
        priceCurrency: "EGP",
        availability,
      };
    }
    if (reviews.length) {
      productLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      };
      productLd.review = reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: clean(r.name) || "Customer" },
        reviewRating: { "@type": "Rating", ratingValue: Number(r.rating), bestRating: 5, worstRating: 1 },
        ...(clean(r.comment) ? { reviewBody: clean(r.comment) } : {}),
        ...(r.createdAt ? { datePublished: String(r.createdAt).slice(0, 10) } : {}),
      }));
    }

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Fragrances", item: `${origin}/products` },
        { "@type": "ListItem", position: 3, name, item: pageUrl },
      ],
    };

    const orgLd = {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: SITE_NAME,
      url: `${origin}/`,
      logo: `${origin}/images/scentorinilogoo.jpeg`,
      sameAs: [INSTAGRAM_URL],
      areaServed: "EG",
    };

    const head = `
    <link rel="canonical" href="${esc(pageUrl)}" />
    ${jsonLd(productLd)}
    ${jsonLd(breadcrumbLd)}
    ${jsonLd(orgLd)}
  `;

    // Shown for a moment before React boots (then replaced), and read by crawlers
    // that don't run JavaScript. Same facts as the real page, plainly styled.
    const priceText = !offers.length
      ? ""
      : offers.length > 1
        ? offers.map((o) => `${esc(o.size)}: EGP ${o.price.toLocaleString("en-US")}`).join(" · ")
        : `EGP ${prices[0].toLocaleString("en-US")}`;
    const descriptionHtml = String(product.description || "")
      .split(/\n+/)
      .map((l) => clean(l.replace(/^[-•*]\s+/, "")))
      .filter(Boolean)
      .map((l) => `<p style="margin:0 0 8px">${esc(l)}</p>`)
      .join("");
    const reviewsHtml = reviews.length
      ? `<h2 style="font-size:16px;margin:24px 0 8px;color:#1C3C85">Customer reviews (${reviews.length}, average ${(Math.round(avgRating * 10) / 10).toFixed(1)}/5)</h2>` +
        reviews
          .slice(0, 5)
          .map(
            (r) =>
              `<blockquote style="margin:0 0 10px;padding:8px 12px;border-left:3px solid #1C3C85;background:#f6f7fb">` +
              `<strong>${esc(clean(r.name) || "Customer")}</strong> — ${"★".repeat(Number(r.rating))}${"☆".repeat(5 - Number(r.rating))}` +
              (clean(r.comment) ? `<br/>${esc(clean(r.comment))}` : "") +
              `</blockquote>`
          )
          .join("")
      : "";

    const body =
      `<div id="root"><main style="max-width:680px;margin:0 auto;padding:32px 16px;font-family:system-ui,-apple-system,sans-serif;color:#222;line-height:1.5">` +
      `<p style="margin:0 0 4px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#1C3C85">${esc(SITE_NAME)}</p>` +
      `<h1 style="margin:0 0 8px;font-size:28px;color:#1C3C85">${esc(name)}</h1>` +
      (inspired ? `<p style="margin:0 0 8px">Inspired by <strong>${esc(inspired)}</strong></p>` : "") +
      (clean(product.subtitle) ? `<p style="margin:0 0 8px;color:#555">${esc(clean(product.subtitle))}</p>` : "") +
      (priceText ? `<p style="margin:0 0 16px;font-weight:700">${priceText}${inStock(product) ? "" : " — sold out"}</p>` : "") +
      descriptionHtml +
      reviewsHtml +
      `<p style="margin:24px 0 0"><a href="/products" style="color:#1C3C85">Browse all ${esc(SITE_NAME)} fragrances</a></p>` +
      `</main></div>`;

    if (!basicHtml.includes('<div id="root"></div>')) throw new Error("root not found");
    const enriched = basicHtml.replace("</head>", `${head}</head>`).replace('<div id="root"></div>', body);
    return htmlResponse(enriched);
  } catch {
    return htmlResponse(basicHtml);
  }
}
