// Vercel Edge Function: /robots.txt (rewritten here by vercel.json).
// Pure string, no network calls — it can't fail. Generated (not a static file)
// only so the Sitemap line points at whatever domain the site is served on.

import { getOrigin } from "./_lib/site";

export const config = { runtime: "edge" };

// Search engines and AI assistants we explicitly welcome. They all share the
// same rules as everyone else ("*"); listing them just makes the intent clear.
const BOTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "Google-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Applebot",
  "Applebot-Extended",
];

// Private / transactional pages with nothing useful to index.
const PRIVATE = ["/admin", "/admin-login", "/checkout", "/cart", "/confirmation", "/account"];

export default function handler(request: Request): Response {
  const origin = getOrigin(request);
  const body = [
    ...BOTS.map((b) => `User-agent: ${b}`),
    "Allow: /",
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=86400" },
  });
}
