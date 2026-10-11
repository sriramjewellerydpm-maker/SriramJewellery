/**
 * Plausibility bounds for metal rates — the one definition, shared by the
 * server and the browser.
 *
 * Background: the gold rate was once set to ₹96/gram — roughly 1/75th of the
 * real value — and checkout priced and charged against it for weeks. These
 * guards exist so that specific mistake cannot repeat silently. They are
 * deliberately wide: the job is to catch an order-of-magnitude slip (a missing
 * digit, a paise/rupee mix-up), not to track the market.
 *
 * It lives in shared/ rather than server/utils/rateGuards.js because the admin
 * rate form needs it too, and rateGuards.js reads process.env at module scope,
 * which a browser bundle cannot. The form previously carried its own copy of
 * these four numbers; they agreed, but nothing made them agree, and these are
 * the numbers standing between a typo and a mispriced catalogue.
 */
export const RATE_BOUNDS = {
  // Real 22K/24K gold sits in the thousands per gram. ₹2,000 is far below any
  // plausible market and ₹50,000 far above, so both ends leave ample headroom.
  gold: { min: 2000, max: 50000 },
  // Silver is two orders of magnitude cheaper, so it needs its own band —
  // ₹96/gram is nonsense for gold but entirely normal for silver.
  silver: { min: 20, max: 5000 },
};

export default RATE_BOUNDS;
