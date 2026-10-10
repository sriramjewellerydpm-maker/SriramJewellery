/**
 * server/db/connect.js on its own: first-run seeding, connection reuse, and
 * what happens when the database cannot be reached. Runs without useApp() so
 * connectDB() does the connecting itself.
 */
import { describe, it, expect, inject, afterAll, afterEach, beforeEach } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const base = inject("mongoUri").replace(/\/$/, "");
const freshDb = () => `${base}/seed_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;

let connectDB;
let vercelFlag;
beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  globalThis.__mongooseCache = { conn: null, promise: null };
  // Demo seeding is now gated on insecureDevAllowed(): an explicit opt-in that
  // VERCEL overrides. The harness sets VERCEL so index.js skips app.listen, so
  // both have to be arranged for these tests to reach the seeding path at all.
  process.env.ALLOW_INSECURE_DEV = "true";
  vercelFlag = process.env.VERCEL;
  delete process.env.VERCEL;
  connectDB = (await import("../../server/db/connect.js")).default;
});

afterEach(() => {
  delete process.env.ALLOW_INSECURE_DEV;
  if (vercelFlag !== undefined) process.env.VERCEL = vercelFlag;
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

describe("connectDB", () => {
  it("never seeds demo data on a deployment, even with the opt-in set", async () => {
    // An admin deleting the last product used to re-seed demo jewellery AND
    // demo rates into a live shop. The rates were the dangerous half: a second
    // GoldRate document for a metal silently becomes the effective rate, so
    // every price on the storefront and every amount charged would move to it.
    process.env.VERCEL = "1";
    process.env.MONGODB_URI = freshDb();
    try {
      await connectDB();
      const { Product } = await import("../../server/models/Product.js");
      const { GoldRate } = await import("../../server/models/GoldRate.js");
      const { Category } = await import("../../server/models/Category.js");
      expect(await Product.countDocuments()).toBe(0);
      expect(await GoldRate.countDocuments()).toBe(0);
      expect(await Category.countDocuments()).toBe(0);
    } finally {
      delete process.env.VERCEL;
    }
  });

  it("still creates the first administrator on a deployment", async () => {
    // The admin bootstrap is deliberately outside the demo gate: it is
    // idempotent, needs ADMIN_PASSWORD set on purpose, and is the only way a
    // fresh production database gets its first administrator.
    process.env.VERCEL = "1";
    process.env.MONGODB_URI = freshDb();
    try {
      await connectDB();
      const { User } = await import("../../server/models/User.js");
      const admin = await User.findOne({ role: "ADMIN" }).lean();
      expect(admin?.email).toBe("admin@buildwithus");
      expect(await User.countDocuments({ email: "user@test.com" })).toBe(0);
    } finally {
      delete process.env.VERCEL;
    }
  });


  it("seeds an empty database once: 5 products, 2 fresh rates, 3 categories, the admin", async () => {
    process.env.MONGODB_URI = freshDb();
    const conn = await connectDB();
    expect(conn).toBeTruthy();
    const { Product } = await import("../../server/models/Product.js");
    const { GoldRate } = await import("../../server/models/GoldRate.js");
    const { Category } = await import("../../server/models/Category.js");
    const { User } = await import("../../server/models/User.js");
    expect(await Product.countDocuments()).toBe(5);
    expect(await Category.countDocuments()).toBe(3);
    const rates = await GoldRate.find().lean();
    expect(rates.map((r) => r.metalType).sort()).toEqual(["gold", "silver"]);
    const admin = await User.findOne({ email: "admin@buildwithus" }).lean();
    expect(admin.role).toBe("ADMIN");
    expect(await bcrypt.compare(process.env.ADMIN_PASSWORD, admin.passwordHash)).toBe(true);
    // The shared-password test account follows the same opt-in as the demo
    // catalogue, so it appears here and can never reach a deployment — pinned
    // by "still creates the first administrator on a deployment" above.
    expect(await User.findOne({ email: "user@test.com" })).not.toBeNull();

    // Second call reuses the connection and does not re-seed.
    expect(await connectDB()).toBe(conn);
    expect(await Product.countDocuments()).toBe(5);
  });

  it("seeded catalogue passes the rate guards and prices sensibly", async () => {
    process.env.MONGODB_URI = freshDb();
    await connectDB();
    const { Product } = await import("../../server/models/Product.js");
    const { getRates } = await import("../../server/utils/getRates.js");
    const { computePrice } = await import("../../server/utils/computePrice.js");
    const { updateRatesSchema } = await import("../../server/middleware/validate.js");
    const rates = await getRates();
    expect(updateRatesSchema.safeParse(rates).success).toBe(true);
    const p1 = await Product.findOne({ productId: "p1" }).lean();
    // 12.5 g × 7250 × 1.12 × 1.03 = 104,545
    expect(computePrice(p1, rates).finalPrice).toBe(104545);
  });

  it("skips the admin when ADMIN_PASSWORD is unset (no literal fallback)", async () => {
    process.env.MONGODB_URI = freshDb();
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      await connectDB();
      const { User } = await import("../../server/models/User.js");
      expect(await User.countDocuments()).toBe(0);
    } finally {
      process.env.ADMIN_PASSWORD = saved;
    }
  });

  it("does not re-seed a database that already has products", async () => {
    const uri = freshDb();
    await mongoose.connect(uri);
    const { Product } = await import("../../server/models/Product.js");
    await Product.create({ productId: "mine", name: "Mine", category: "Gold" });
    await mongoose.disconnect();
    globalThis.__mongooseCache = { conn: null, promise: null };
    process.env.MONGODB_URI = uri;
    await connectDB();
    expect(await Product.countDocuments()).toBe(1);
  });

  it("outside development an unreachable DB resolves undefined instead of throwing (so index.js's 503 branch never runs)", async () => {
    process.env.MONGODB_URI = "notmongo://nowhere";
    await expect(connectDB()).resolves.toBeUndefined();
  });

  it("MONGODB_URI unset → resolves undefined, no crash", async () => {
    delete process.env.MONGODB_URI;
    await expect(connectDB()).resolves.toBeUndefined();
  });
});
