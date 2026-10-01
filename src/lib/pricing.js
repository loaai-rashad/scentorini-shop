// src/lib/pricing.js
// Single source of truth for product discounts (storefront + dashboard).
//
// A product carries flat discount fields so Firestore writes stay simple:
//   discountActive: boolean          — the on/off switch the dashboard toggles
//   discountType:   'percent'|'fixed'
//   discountValue:  number           — percent off (1-99) or EGP off
//   discountLabel:  string           — optional campaign name, e.g. "Summer Sale"

export const DISCOUNT_TYPES = [
  { value: "percent", label: "% Off", suffix: "%" },
  { value: "fixed", label: "EGP Off", suffix: "EGP" },
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatEGP = (value) => `EGP ${Math.round(toNumber(value)).toLocaleString()}`;

// A discount counts only when it is switched on AND the numbers make sense.
export function hasActiveDiscount(product) {
  if (!product || !product.discountActive) return false;
  const value = toNumber(product.discountValue);
  if (value <= 0) return false;
  // A "100% off" percentage is a data entry slip, not a giveaway — ignore it.
  if (product.discountType !== "fixed" && value >= 100) return false;
  return true;
}

// Applies the product's discount to any base price (base price or a size option's price).
export function getDiscountedPrice(basePrice, product) {
  const base = toNumber(basePrice);
  if (!hasActiveDiscount(product)) return base;
  const value = toNumber(product.discountValue);
  // A fixed amount that swallows the whole price is a data slip, not a free product.
  if (product.discountType === "fixed" && value >= base) return base;
  const discounted =
    product.discountType === "fixed" ? base - value : base * (1 - value / 100);
  // Prices are shown as whole EGP across the store, so keep the maths whole too.
  return Math.max(0, Math.round(discounted));
}

/**
 * Everything the UI needs to render a price, discounted or not.
 * Pass `basePrice` when the shown price is not the product's base price
 * (e.g. the selected size option).
 */
export function getPriceInfo(product, basePrice) {
  const original = Math.round(
    toNumber(basePrice === undefined || basePrice === null ? product?.price : basePrice)
  );
  const discounted = getDiscountedPrice(original, product);
  const amountOff = Math.max(0, original - discounted);
  const hasDiscount = hasActiveDiscount(product) && amountOff > 0;
  const percentOff = hasDiscount && original > 0 ? Math.round((amountOff / original) * 100) : 0;

  return {
    hasDiscount,
    price: hasDiscount ? discounted : original, // what the customer pays
    original,                                   // crossed-out price
    amountOff,
    percentOff,
    label: String(product?.discountLabel || "").trim(),
    // Short pill text for cards/badges: "-20%" or "-EGP 150"
    badge: hasDiscount
      ? product.discountType === "fixed"
        ? `-${formatEGP(amountOff)}`
        : `-${percentOff}%`
      : "",
  };
}
