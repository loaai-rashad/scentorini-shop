// src/lib/giveaway.js
// Lucky-wheel giveaway: shared by the public page (/lucky-wheel), the homepage
// banner and the admin "Giveaway" tab.
//
// Firestore layout:
//   siteSettings/giveaway        — settings + live spin state (one document)
//     visible:            boolean   — master switch; nothing public shows while false
//     title, prizeText:   string
//     drawAt:             Timestamp — countdown target (the live draw)
//     entriesOpen:        boolean   — manual switch for joining
//     closeEntriesAtDraw: boolean   — joining also stops when the countdown ends
//     removeWinners:      boolean   — winners leave the wheel for the next spin
//     instagramUrl, xUrl: string
//     round:              number    — bumped by "Start a new giveaway"
//     spin:    { id, at, durationMs, angle, winnerKey, winnerName, winnerIndex, names[] } | null
//     winners: [{ key, name, at, round }]
//   giveawayNames/{round}           — public: { round, names: [{ k, n }] } in join order
//     ONE document for the whole wheel, so a visitor costs ~1 read however many
//     people joined (Firestore's free plan allows 50k reads/day for the whole site).
//   giveawayContacts/{round}_{uid}  — admin only: { uid, round, name, email, googleName, joinedAt }
//     (kept apart from the public names so contact details can be locked down
//      with Firestore rules without hiding the names on the wheel)

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const GIVEAWAY_DOC = doc(db, "siteSettings", "giveaway");
export const NAMES = "giveawayNames";
export const namesDoc = (round) => doc(db, NAMES, String(round));
export const CONTACTS = "giveawayContacts";

export const DEFAULT_INSTAGRAM = "https://www.instagram.com/scentorini.eg";
export const DEFAULT_X = "https://x.com/scentorini_eg";
export const SPIN_MS = 9000;
export const IDLE_DEG_PER_SEC = 8; // gentle idle turn (~45s per revolution)
export const MAX_NAME = 24;

export const DEFAULT_SETTINGS = {
  visible: false,
  title: "Scentorini Giveaway",
  prizeText: "",
  drawAt: null,
  entriesOpen: true,
  closeEntriesAtDraw: true,
  removeWinners: true,
  instagramUrl: DEFAULT_INSTAGRAM,
  xUrl: DEFAULT_X,
  round: 1,
  spin: null,
  winners: [],
};

export const entryId = (round, uid) => `${round}_${uid}`;

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const cleanName = (name) => String(name || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

// Live settings document (null until loaded).
export function useGiveawaySettings() {
  const [settings, setSettings] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        GIVEAWAY_DOC,
        (snap) => setSettings({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) }),
        (err) => {
          console.error("Giveaway settings:", err);
          setSettings({ ...DEFAULT_SETTINGS });
        }
      ),
    []
  );
  return settings;
}

// Live wheel names for a round, in join order: [{ key, name }].
export function useGiveawayNames(round, enabled = true) {
  const [names, setNames] = useState([]);
  useEffect(() => {
    if (!enabled || !round) return undefined;
    return onSnapshot(
      namesDoc(round),
      (snap) => {
        const seen = new Set();
        const list = [];
        for (const item of (snap.exists() && snap.data().names) || []) {
          if (!item?.k || seen.has(item.k)) continue; // one slice per person
          seen.add(item.k);
          list.push({ key: item.k, name: cleanName(item.n) || "Guest", raw: item });
        }
        setNames(list);
      },
      (err) => console.error("Giveaway names:", err)
    );
  }, [round, enabled]);
  return names;
}

// Keys of this round's winners.
export const winnerKeys = (settings) =>
  new Set((settings?.winners || []).filter((w) => w.round === settings.round).map((w) => w.key));

// Ticks every second; returns ms remaining until `target` (0 once passed, null if no target).
export function useCountdown(target) {
  const targetMs = toDate(target)?.getTime() ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetMs === null) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  return targetMs === null ? null : Math.max(0, targetMs - now);
}

export function splitDuration(ms) {
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

// Whether a visitor can join right now.
export function entriesAreOpen(settings, now = Date.now()) {
  if (!settings?.visible || !settings.entriesOpen) return false;
  const drawMs = toDate(settings.drawAt)?.getTime();
  if (settings.closeEntriesAtDraw && drawMs && now >= drawMs) return false;
  return true;
}

// The names on the wheel: everyone in the round, minus past winners if configured.
export function wheelEntries(names, settings) {
  if (!settings?.removeWinners) return names;
  const won = winnerKeys(settings);
  return names.filter((n) => !won.has(n.key));
}

// Unbiased random integer in [0, n) using the browser's crypto RNG.
export function randomIndex(n) {
  if (n <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

/**
 * Where the wheel must stop (0–360°, clockwise) so slice `index` of `count` sits
 * under the pointer at the top. Each screen spins from wherever its wheel happens
 * to be (it idles on its own) to this same angle, so all screens agree.
 */
export function angleFor(index, count) {
  const slice = 360 / count;
  const jitter = (Math.random() - 0.5) * slice * 0.6; // not always dead-centre
  return (((360 - (index + 0.5) * slice + jitter) % 360) + 360) % 360;
}

// Instagram / Facebook / TikTok in-app browsers block Google sign-in pop-ups.
export function inAppBrowser() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/Twitter/i.test(ua)) return "X";
  return null;
}

export const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

// Android: opens the current page in Chrome from an in-app browser.
export function chromeIntentUrl() {
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
}
