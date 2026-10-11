/**
 * What delivery costs.
 *
 * The charge is set per product by the shop, in Dashboard → Products, so the
 * rates are the owner's to change and not a developer's. Nothing is hardcoded
 * per category or per weight: a coin is simply a product that carries a
 * delivery charge, and a bangle is one that does not.
 *
 * The one rule in code is the shop's own waiver (client, 11 Oct 2026): an
 * order containing a piece over ₹5,000 is delivered free, and anything
 * travelling with it — a coin included — goes free too. It is one parcel.
 *
 * Shared because both sides need the same answer: the basket shows it before
 * the customer commits, and the server charges it. A second copy of this on
 * the client is how a basket and an invoice come to disagree.
 */

/** A piece over this carries the whole parcel. */
export const FREE_DELIVERY_OVER = 5000;

/** What the shop suggests for a coin, offered in the admin form as a hint. */
export const SUGGESTED_COIN_DELIVERY = { upto1g: 50, over1g: 100 };

const lineCharge = (item) => {
  const charge = Number(item?.deliveryCharge);
  if (!Number.isFinite(charge) || charge <= 0) return 0;
  return charge * (Number(item?.quantity) || 1);
};

/**
 * @param {Array<{deliveryCharge?: number, unitPrice?: number, quantity?: number}>} items
 * @returns {number} rupees, never negative
 */
export const deliveryChargeFor = (items = []) => {
  const lines = Array.isArray(items) ? items : [];

  const carriesTheParcel = lines.some(
    (i) => Number(i?.unitPrice) > FREE_DELIVERY_OVER
  );
  if (carriesTheParcel) return 0;

  return lines.reduce((total, item) => total + lineCharge(item), 0);
};

/** One line of plain English for the basket. */
export const deliveryExplanation = (items = [], charge = deliveryChargeFor(items)) => {
  if (charge > 0) return "Delivery is charged on some items in your order.";
  const lines = Array.isArray(items) ? items : [];
  if (lines.some((i) => lineCharge(i) > 0 || Number(i?.deliveryCharge) > 0)) {
    return `Free — your order includes a piece over ₹${FREE_DELIVERY_OVER.toLocaleString("en-IN")}.`;
  }
  return "Free delivery.";
};
