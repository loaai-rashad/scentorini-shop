// Meta (Facebook/Instagram) Pixel integration.
// Loads the pixel once and exposes a tiny track() helper. Everything is a
// no-op until META_PIXEL_ID is set, so the app is safe before you add the ID.

import { META_PIXEL_ID } from "../config";

const isEnabled = () => META_PIXEL_ID && META_PIXEL_ID !== "YOUR_PIXEL_ID";

// Injects the standard Meta Pixel base code (idempotent).
export function initMetaPixel() {
  if (!isEnabled() || typeof window === "undefined" || window.fbq) return;

  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", META_PIXEL_ID);
}

// Track a standard pixel event, e.g. pixelTrack("AddToCart", { value, currency }).
export function pixelTrack(event, data) {
  if (isEnabled() && typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, data);
  }
}
