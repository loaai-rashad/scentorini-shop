// Small client-side SEO helper: sets the document <title> and meta description
// per page. Improves browser tabs, social shares, and analytics clarity
// (your product pages previously all reported the title "Scentorini").

const SITE_NAME = "Scentorini";
const DEFAULT_DESCRIPTION =
  "Scentorini — Santorini-inspired fragrances. Discover long-lasting perfumes, oils, and build your own discovery set. Shipping across Egypt.";

export function setPageMeta({ title, description } = {}) {
  if (typeof document === "undefined") return;

  document.title = title || SITE_NAME;

  const desc = description || DEFAULT_DESCRIPTION;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", desc);
}

export { SITE_NAME, DEFAULT_DESCRIPTION };
