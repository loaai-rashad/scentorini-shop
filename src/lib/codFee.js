// src/lib/codFee.js
// Flat fee added to Cash on Delivery orders. The amount lives in
// siteSettings/payments → { codFee } and is editable from the admin Settings tab.

export const DEFAULT_COD_FEE = 5;

// Anything missing or invalid falls back to the default; negatives are not a fee.
export function normalizeCodFee(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_COD_FEE;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COD_FEE;
  return Math.round(n * 100) / 100;
}

export function codFeeFor(paymentMethod, codFee) {
  return paymentMethod === "COD" ? normalizeCodFee(codFee) : 0;
}
