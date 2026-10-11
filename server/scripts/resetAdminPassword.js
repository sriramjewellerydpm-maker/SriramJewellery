/**
 * Break-glass administrator password reset. Bypasses email entirely.
 *
 *   node server/scripts/resetAdminPassword.js --list
 *   node server/scripts/resetAdminPassword.js --email admin@buildwithus
 *   node server/scripts/resetAdminPassword.js --email admin@buildwithus --password 'Chosen Passphrase'
 *
 * This exists because there is currently one administrator account, and the
 * emailed reset flow depends on a mail provider, a correct sender domain and a
 * reachable inbox. If any of those fail, that single account is the only way
 * into the dashboard and there is no other way back in.
 *
 * Requires shell access to an environment holding MONGODB_URI — which is
 * already full database access, so this grants no privilege the operator did
 * not have. It is a convenience over hand-editing a bcrypt hash in Compass,
 * and unlike doing it by hand it also revokes existing sessions.
 *
 * With no --password it generates a strong passphrase and prints it once.
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";

import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { BCRYPT_SALT_ROUNDS } from "../utils/passwords.js";
import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT } from "../middleware/validate.js";

dotenv.config();


const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const has = (flag) => process.argv.includes(flag);

/** Readable, high-entropy, and safe to read down a phone line. */
const generatePassphrase = () => {
  const words = [
    "amber", "bronze", "cedar", "dune", "ember", "filigree", "garnet", "harbour",
    "ivory", "jasper", "kiln", "lantern", "mosaic", "nectar", "onyx", "pearl",
    "quarry", "ribbon", "saffron", "tundra", "umber", "velvet", "willow", "zenith",
  ];
  const pick = () => words[crypto.randomInt(0, words.length)];
  const digits = String(crypto.randomInt(10, 100));
  return `${pick()}-${pick()}-${pick()}-${digits}`;
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Point it at the database holding the admin account.");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to "${mongoose.connection.name}"\n`);

  const admins = await User.find({ role: "ADMIN" }).select("email name createdAt");

  if (!admins.length) {
    console.error("No ADMIN accounts exist in this database. Nothing to reset.");
    await mongoose.disconnect();
    process.exit(1);
  }

  if (has("--list")) {
    console.log("Administrator accounts:");
    for (const a of admins) {
      console.log(`  ${a.email}   ${a.name || "(no name)"}   created ${a.createdAt?.toISOString?.().slice(0, 10) || "—"}`);
    }
    await mongoose.disconnect();
    return;
  }

  const email = (arg("--email") || "").trim().toLowerCase();
  if (!email) {
    console.error("Specify which account: --email <address>   (or --list to see them)");
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = admins.find((a) => a.email?.toLowerCase() === email);
  if (!user) {
    console.error(`No ADMIN account with email "${email}".`);
    console.error(`Known: ${admins.map((a) => a.email).join(", ")}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const supplied = arg("--password");
  if (supplied && supplied.length < PASSWORD_MIN_LENGTH) {
    console.error(`${PASSWORD_TOO_SHORT}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const password = supplied || generatePassphrase();

  // Interactive confirmation, since this hands over an administrator account
  // and immediately signs out whoever is currently using it. `--yes` skips it
  // for scripted recovery.
  if (!has("--yes")) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(
      `\nReset the password for ${user.email} and end all its active sessions? (yes/no) `
    );
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("Aborted. Nothing was changed.");
      await mongoose.disconnect();
      return;
    }
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS) } }
  );

  // Same reasoning as the emailed flow: a new password is worthless while an
  // intruder's existing session is still valid.
  const killed = await RefreshToken.deleteMany({ userId: user._id });
  await PasswordResetToken.deleteMany({ userId: user._id });

  console.log("\n─────────────────────────────────────────────");
  console.log(`Password changed for ${user.email}`);
  if (!supplied) {
    console.log(`\n   New password:  ${password}\n`);
    console.log("   This is shown once and is not stored anywhere in readable form.");
    console.log("   Copy it now, then sign in and change it to something you'll remember.");
  }
  console.log(`\nSessions revoked: ${killed.deletedCount}`);
  console.log("Pending reset links invalidated.");
  console.log("─────────────────────────────────────────────");

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
