// src/lib/promo.js
// Single source of truth for promo code rules (checkout + dashboard).
//
// A promo document in the "promocodes" collection:
//   code:             string   — stored UPPERCASE for new codes (old codes may be mixed case)
//   active:           boolean  — the manual on/off switch
//   type:             'percent'|'fixed'   (missing = 'percent', for old codes)
//   discount:         number   — percent off (1-100) or EGP off
//   maxDiscount:      number|null — cap in EGP for percent codes
//   minOrder:         number|null — minimum cart subtotal in EGP
//   usageLimit:       number|null — total uses across all customers
//   perCustomerLimit: number|null — uses per customer (matched by email OR phone)
//   startsAt:         Timestamp|null
//   expiresAt:        Timestamp|null
//   newCustomersOnly: boolean  — only for customers with no previous orders
//   stackWithLoyalty: boolean  — false = customer gets the bigger of promo vs loyalty reward
//   note:             string   — internal note, never shown to customers
//
// Usage is NOT stored as a counter: it is counted from orders whose promoCode
// matches, so deleting / cancelling / re-assigning an order keeps counts right.

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// Orders with these statuses don't consume a use of the code.
export const NON_COUNTING_STATUSES = ["Cancelled"];

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const normalizeCode = (code) => String(code || "").trim().toUpperCase();
const normEmail = (e) => String(e || "").trim().toLowerCase();
const normPhone = (p) => String(p || "").replace(/\D/g, "").slice(-10);

// Firestore Timestamp | Date | string | null -> Date | null
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const countsAsUse = (order) =>
  !!order?.promoCode && !NON_COUNTING_STATUSES.includes(order.status);

// Orders that used this exact code (excluding cancelled ones).
export const ordersForPromo = (orders, code) =>
  (orders || []).filter((o) => countsAsUse(o) && normalizeCode(o.promoCode) === normalizeCode(code));

// How many of these promo orders belong to the given customer.
export function customerUses(promoOrders, { email, phone }) {
  const e = normEmail(email);
  const p = normPhone(phone);
  if (!e && !p) return 0;
  return promoOrders.filter(
    (o) => (e && normEmail(o.email) === e) || (p && p.length >= 8 && normPhone(o.phoneNumber) === p)
  ).length;
}

/** Lifecycle status ignoring the specific customer/cart. */
export function getPromoStatus(promo, usedCount = 0, now = new Date()) {
  if (!promo?.active) return { key: "paused", label: "Paused" };
  const start = toDate(promo.startsAt);
  const end = toDate(promo.expiresAt);
  if (start && now < start) return { key: "scheduled", label: "Scheduled" };
  if (end && now > end) return { key: "expired", label: "Expired" };
  const limit = num(promo.usageLimit);
  if (limit !== null && usedCount >= limit) return { key: "exhausted", label: "Used up" };
  return { key: "live", label: "Live" };
}

/** Discount in whole EGP this promo gives on a subtotal (no eligibility checks). */
export function computePromoDiscount(promo, subtotal) {
  if (!promo || subtotal <= 0) return 0;
  const value = num(promo.discount) || 0;
  let amount = promo.type === "fixed" ? value : (Math.min(value, 100) / 100) * subtotal;
  const cap = num(promo.maxDiscount);
  if (promo.type !== "fixed" && cap !== null && cap > 0) amount = Math.min(amount, cap);
  return Math.max(0, Math.round(Math.min(amount, subtotal)));
}

/**
 * Checks every rule. Customer rules (per-customer limit, new customers only)
 * are skipped until we know who the customer is (customerKnown = false).
 * Returns { ok: true } or { ok: false, reason, blocking }.
 * blocking = false means the customer can fix it (e.g. add more to cart).
 */
export function validatePromo(promo, ctx) {
  const {
    subtotal = 0,
    usedCount = 0,
    customerUseCount = 0,
    customerOrderCount = 0,
    customerKnown = false,
    now = new Date(),
  } = ctx || {};

  const status = getPromoStatus(promo, usedCount, now);
  if (status.key === "paused") return { ok: false, blocking: true, reason: "This promo code is no longer active." };
  if (status.key === "scheduled") {
    const start = toDate(promo.startsAt);
    return { ok: false, blocking: true, reason: `This code starts on ${formatDate(start)}.` };
  }
  if (status.key === "expired") return { ok: false, blocking: true, reason: "This promo code has expired." };
  if (status.key === "exhausted") return { ok: false, blocking: true, reason: "This promo code has reached its usage limit." };

  const minOrder = num(promo.minOrder);
  if (minOrder !== null && subtotal < minOrder) {
    return {
      ok: false,
      blocking: false,
      reason: `Add EGP ${Math.ceil(minOrder - subtotal).toLocaleString()} more to use this code (min. order EGP ${minOrder.toLocaleString()}).`,
    };
  }

  if (customerKnown) {
    if (promo.newCustomersOnly && customerOrderCount > 0) {
      return { ok: false, blocking: true, reason: "This code is for first orders only." };
    }
    const perCustomer = num(promo.perCustomerLimit);
    if (perCustomer !== null && customerUseCount >= perCustomer) {
      return {
        ok: false,
        blocking: true,
        reason: perCustomer === 1 ? "You've already used this code." : `You've already used this code ${perCustomer} times.`,
      };
    }
  }

  return { ok: true };
}

export function formatDate(d) {
  const date = toDate(d);
  if (!date) return "";
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Short human summary: "20% off · max EGP 200" / "EGP 100 off"
export function describeDiscount(promo) {
  const value = num(promo?.discount) || 0;
  if (promo?.type === "fixed") return `EGP ${value.toLocaleString()} off`;
  const cap = num(promo?.maxDiscount);
  return `${value}% off${cap ? ` · max EGP ${cap.toLocaleString()}` : ""}`;
}

// --- Firestore helpers (used by checkout) ---

export async function findPromoByCode(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  // Old codes were saved in whatever case they were typed, so try the common variants.
  const variants = [...new Set([raw, raw.toLowerCase(), raw.toUpperCase()])];
  const snap = await getDocs(query(collection(db, "promocodes"), where("code", "in", variants)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function fetchPromoOrders(code) {
  const snap = await getDocs(query(collection(db, "orders"), where("promoCode", "==", code)));
  return ordersForPromo(snap.docs.map((d) => d.data()), code);
}
