/**
 * Find — and optionally merge — customer accounts created from the same real
 * phone number in different formats, before normalisation moved server-side.
 *
 *   node server/scripts/fixDuplicatePhones.js            # dry run, reports only
 *   node server/scripts/fixDuplicatePhones.js --apply    # writes changes
 *
 * Two distinct problems, handled differently:
 *
 *  1. A single account stored in a non-canonical spelling ("+91 82484 56747").
 *     Safe: rewrite the phone field in place. Nothing else changes.
 *
 *  2. Several accounts that resolve to the SAME canonical number. A real
 *     person with two carts and two order histories. One is kept — the richest
 *     record, not merely the oldest, because the account someone actually used
 *     is the one worth preserving — and every related document is repointed to
 *     it before the others are deleted.
 *
 * Dry run by default. `--apply` is the only thing that writes, and it prints
 * every action it takes. Take a database backup first regardless: this deletes
 * user documents, and no script should be trusted to be reversible.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { normalizeIndianPhone, CANONICAL_PHONE } from "../utils/phone.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

// Collections keyed to a user by string id. RefreshToken is excluded on
// purpose: merging should invalidate sessions, not carry them across.
const OWNED = [
  { name: "carts", field: "userId" },
  { name: "wishlists", field: "userId" },
  { name: "orders", field: "userId" },
  { name: "reviews", field: "userId" },
  { name: "productviews", field: "userId" },
];

/** Prefer the account a human actually used. */
const scoreAccount = (u, counts) =>
  (u.name ? 100 : 0) +
  (u.email ? 50 : 0) +
  counts.orders * 10 +
  counts.reviews * 5 +
  counts.carts +
  counts.wishlists;

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Point it at the database you intend to clean.");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  console.log(`Connected to "${mongoose.connection.name}"`);
  console.log(APPLY ? "MODE: APPLY — changes will be written\n" : "MODE: dry run — nothing will be written\n");

  const users = await db.collection("users").find({ phone: { $ne: null } }).toArray();

  // Group every account by the canonical form of its stored number.
  const groups = new Map();
  const unparseable = [];

  for (const u of users) {
    const n = normalizeIndianPhone(u.phone);
    if (!n.ok) {
      unparseable.push({ _id: u._id, phone: u.phone, reason: n.reason });
      continue;
    }
    if (!groups.has(n.phone)) groups.set(n.phone, []);
    groups.get(n.phone).push(u);
  }

  const countsFor = async (userId) => {
    const id = String(userId);
    const out = {};
    for (const { name, field } of OWNED) {
      out[name] = await db.collection(name).countDocuments({ [field]: id });
    }
    return {
      orders: out.orders || 0,
      reviews: out.reviews || 0,
      carts: out.carts || 0,
      wishlists: out.wishlists || 0,
    };
  };

  let rewrites = 0;
  let merges = 0;

  for (const [canonical, accounts] of groups) {
    // ── Case 1: one account, possibly mis-spelled ────────────────────────────
    if (accounts.length === 1) {
      const u = accounts[0];
      if (CANONICAL_PHONE.test(u.phone)) continue;

      rewrites++;
      console.log(`REWRITE  ${u.phone}  ->  ${canonical}   (user ${u._id})`);
      if (APPLY) {
        await db.collection("users").updateOne({ _id: u._id }, { $set: { phone: canonical } });
      }
      continue;
    }

    // ── Case 2: genuine duplicates ───────────────────────────────────────────
    merges++;
    const scored = [];
    for (const u of accounts) {
      const counts = await countsFor(u._id);
      scored.push({ u, counts, score: scoreAccount(u, counts) });
    }
    scored.sort((a, b) => b.score - a.score);

    const keep = scored[0];
    const drop = scored.slice(1);

    console.log(`\nMERGE    ${canonical} — ${accounts.length} accounts`);
    console.log(
      `  KEEP   ${keep.u._id}  phone="${keep.u.phone}"  name=${keep.u.name || "—"}  ` +
        `orders=${keep.counts.orders} reviews=${keep.counts.reviews}`
    );

    for (const d of drop) {
      console.log(
        `  MERGE  ${d.u._id}  phone="${d.u.phone}"  name=${d.u.name || "—"}  ` +
          `orders=${d.counts.orders} reviews=${d.counts.reviews}`
      );

      for (const { name, field } of OWNED) {
        const n = await db
          .collection(name)
          .countDocuments({ [field]: String(d.u._id) });
        if (!n) continue;
        console.log(`           ${name}: repoint ${n}`);
        if (APPLY) {
          await db
            .collection(name)
            .updateMany(
              { [field]: String(d.u._id) },
              { $set: { [field]: String(keep.u._id) } }
            );
        }
      }

      if (APPLY) {
        await db.collection("refreshtokens").deleteMany({ userId: d.u._id });
        await db.collection("users").deleteOne({ _id: d.u._id });
      }
    }

    // Carry over a name/email the kept account happens to lack.
    const patch = {};
    if (!keep.u.name) {
      const named = drop.find((d) => d.u.name);
      if (named) patch.name = named.u.name;
    }
    if (!keep.u.email) {
      const mailed = drop.find((d) => d.u.email);
      if (mailed) patch.email = mailed.u.email;
    }
    patch.phone = canonical;

    console.log(`  SET    ${JSON.stringify(patch)} on ${keep.u._id}`);
    if (APPLY) {
      await db.collection("users").updateOne({ _id: keep.u._id }, { $set: patch });
    }
  }

  console.log("\n─────────────────────────────────────────────");
  console.log(`accounts scanned:        ${users.length}`);
  console.log(`spelling rewrites:       ${rewrites}`);
  console.log(`duplicate groups merged: ${merges}`);
  console.log(`unparseable numbers:     ${unparseable.length}`);

  if (unparseable.length) {
    console.log("\nThese could not be normalised and were left untouched — review by hand:");
    for (const u of unparseable) {
      console.log(`  ${u._id}  "${u.phone}"  (${u.reason})`);
    }
  }

  if (!APPLY && (rewrites || merges)) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
    console.log("Back up the database first — merging deletes user documents.");
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
