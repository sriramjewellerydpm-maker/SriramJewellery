import express from "express";
import crypto from "node:crypto";
import { releaseStaleReservations, STOCK_RELEASE_MINUTES } from "../utils/stock.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

/**
 * Scheduled maintenance, triggered by an EXTERNAL scheduler (cron-job.org or
 * similar) — no longer by Vercel Cron.
 *
 * Why external: the sweep has to run on roughly the resolution of
 * STOCK_RELEASE_MINUTES (default 30) to mean anything, and Vercel's Hobby plan
 * caps crons at one run per day. A daily sweep would leave stock from an
 * abandoned checkout unsellable for up to 24 hours, so the schedule moved off
 * the platform and `crons` came out of vercel.json.
 *
 * Deliberately not an in-process setInterval: this API runs as a serverless
 * function that scales to zero, so a timer registered at module load dies with
 * the container and would only ever fire while the site happened to be busy —
 * exactly when a sweeper is least needed. An external schedule calling an
 * endpoint is the only thing that runs when nobody is on the site.
 *
 * Not an admin route either, because the caller is a scheduler rather than a
 * signed-in operator. The shared secret is the whole gate — so the route fails
 * closed when it is unset rather than leaving a public endpoint that cancels
 * orders.
 *
 * The secret may arrive two ways, because not every scheduler can set headers:
 *   Authorization: Bearer <CRON_SECRET>   ← preferred
 *   ?secret=<CRON_SECRET>                 ← fallback
 * Prefer the header. Query strings are recorded in access logs and proxy logs,
 * so the fallback leaks the secret into places the header never reaches.
 */

/**
 * Constant-time comparison. Hashing both sides first keeps the buffers the same
 * length, since timingSafeEqual throws on a length mismatch — and comparing the
 * raw strings would leak the secret's length through the error path.
 */
const secretMatches = (provided, expected) => {
  const a = crypto.createHash("sha256").update(String(provided)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};
const requireCronAuth = (req, res, next) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("Cron request refused: CRON_SECRET is not set.");
    return res.status(503).json({ error: "Scheduled jobs are not configured on this server" });
  }

  // A repeated ?secret=a&secret=b arrives as an array, so only take a string.
  const fromHeader = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const fromQuery = typeof req.query.secret === "string" ? req.query.secret : "";
  const provided = fromHeader || fromQuery;

  if (!provided || !secretMatches(provided, secret)) {
    console.warn("Cron request refused: bad or missing secret.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

// GET /api/cron/release-stale-reservations
// Vercel Cron issues a GET, so that is the verb here.
router.get("/release-stale-reservations", requireCronAuth, async (req, res) => {
  try {
    const result = await releaseStaleReservations();

    // Quiet when there is nothing to do — this runs every few minutes and a
    // line per run would bury the ones that matter.
    if (result.released.length) {
      console.log(
        `🧹 Sweep complete: released ${result.released.length} of ${result.scanned} stale ` +
          `reservation(s) older than ${result.windowMinutes}m.`
      );
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Stale reservation sweep failed:", error);
    res.status(500).json({ error: "Sweep failed" });
  }
});

// GET /api/cron/health — what the schedule is configured to do, without doing it.
router.get("/health", requireCronAuth, (req, res) => {
  res.json({
    success: true,
    stockReleaseMinutes: STOCK_RELEASE_MINUTES,
  });
});

export default router;
