/**
 * Plausibility bounds and staleness rules for metal rates.
 *
 * Background: the gold rate was once set to ₹96/gram — roughly 1/75th of the
 * real value — and checkout priced and charged against it for weeks. These
 * guards exist so that specific mistake cannot repeat silently. They are
 * deliberately wide: the job is to catch an order-of-magnitude slip (a missing
 * digit, a paise/rupee mix-up), not to track the market.
 *
 * The bounds themselves live in shared/rateBounds.js so the admin rate form
 * can import them too; this module adds the staleness rules, which depend on
 * process.env and so cannot be shared with the browser.
 */

export { RATE_BOUNDS } from "../../shared/rateBounds.js";
import { RATE_BOUNDS } from "../../shared/rateBounds.js";

export const MIN_GOLD_RATE_PER_GRAM = RATE_BOUNDS.gold.min;
export const MAX_GOLD_RATE_PER_GRAM = RATE_BOUNDS.gold.max;
export const MIN_SILVER_RATE_PER_GRAM = RATE_BOUNDS.silver.min;
export const MAX_SILVER_RATE_PER_GRAM = RATE_BOUNDS.silver.max;

/**
 * How long a rate stays usable. Metal prices move daily, so a rate the shop
 * has not touched in days is more likely forgotten than stable.
 */
export const RATE_STALE_AFTER_DAYS = Number(process.env.RATE_STALE_AFTER_DAYS) || 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export const isRateStale = (updatedAt) => {
  if (!updatedAt) return true;
  const age = Date.now() - new Date(updatedAt).getTime();
  return Number.isNaN(age) || age > RATE_STALE_AFTER_DAYS * DAY_MS;
};

export const rateAgeInDays = (updatedAt) => {
  if (!updatedAt) return null;
  const age = Date.now() - new Date(updatedAt).getTime();
  return Number.isNaN(age) ? null : Math.floor(age / DAY_MS);
};

/**
 * Human-readable reason a rate is rejected, used by both the API and the form
 * so the wording matches.
 */
export const rateOutOfBoundsMessage = (metal) => {
  const b = RATE_BOUNDS[metal];
  return `${metal === "gold" ? "Gold" : "Silver"} rate must be between ₹${b.min.toLocaleString(
    "en-IN"
  )} and ₹${b.max.toLocaleString("en-IN")} per gram`;
};
