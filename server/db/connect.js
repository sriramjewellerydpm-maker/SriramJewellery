import mongoose from "mongoose";
import { insecureDevAllowed } from "../utils/devMode.js";
import { BCRYPT_SALT_ROUNDS } from "../utils/passwords.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Create the first administrator, once, from ADMIN_PASSWORD.
 *
 * Skipped silently when one already exists or the variable is unset, so it is
 * safe to call on every boot and on every environment.
 */
const seedAdministrator = async () => {
  const { User } = await import("../models/User.js");

  // No literal fallback password. A default that lives in the source tree is a
  // published password: the account's email sits beside it, so anyone reading
  // the repo could sign in. Seeding is skipped rather than run with a
  // guessable credential.
  const existingAdmin = await User.findOne({ role: "ADMIN" }).select("_id").lean();
  if (existingAdmin) return;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Only when there is genuinely no administrator — otherwise this fired on
    // every boot of a healthy deployment that had (correctly) removed the
    // variable after the account was created.
    console.warn(
      "⚠️  No administrator exists and ADMIN_PASSWORD is not set. Set it and redeploy to create one, " +
        "or use server/scripts/resetAdminPassword.js."
    );
    return;
  }

  const bcrypt = await import("bcrypt");
  await User.create({
    name: "Admin",
    email: "admin@buildwithus",
    passwordHash: await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS),
    role: "ADMIN",
    photoURL: "/placeholder-user.png",
  });
  console.log("   ✅ Admin user created: admin@buildwithus (password from ADMIN_PASSWORD)");

  // A convenience account with a shared password has no business in a
  // production database, so it follows the same opt-in as the demo catalogue.
  const testPassword = process.env.TEST_USER_PASSWORD;
  if (testPassword && insecureDevAllowed()) {
    if (!(await User.findOne({ email: "user@test.com" }).select("_id").lean())) {
      await User.create({
        name: "Test User",
        email: "user@test.com",
        passwordHash: await bcrypt.hash(testPassword, BCRYPT_SALT_ROUNDS),
        role: "USER",
        photoURL: "/placeholder-user.png",
      });
      console.log("   ✅ Test user created: user@test.com (password from TEST_USER_PASSWORD)");
    }
  }
};

const seedInitialData = async () => {
  try {
    const { Product } = await import("../models/Product.js");
    const { Category } = await import("../models/Category.js");
    const { GoldRate } = await import("../models/GoldRate.js");
    const { User } = await import("../models/User.js");

    // ── Administrator bootstrap ──────────────────────────────────────────
    //
    // Deliberately OUTSIDE the demo-data gate below. It used to sit inside
    // `productCount === 0`, which meant a deployment whose catalogue was
    // already populated could never create its first administrator — and a
    // deployment whose catalogue was EMPTIED would re-run the whole block.
    // It is idempotent (it does nothing when an admin exists) and inert
    // unless ADMIN_PASSWORD is deliberately set, so it is safe anywhere.
    await seedAdministrator();

    // ── Demo catalogue ───────────────────────────────────────────────────
    //
    // Local development only. This used to run on any deployment whose
    // products collection was empty, which made an ordinary admin action —
    // deleting the last product — re-seed demo jewellery into a live shop.
    //
    // The rates were the dangerous half. getRates() builds its map with
    // `rateMap[r.metalType] = r.ratePerGram` over an unordered find(), so the
    // LAST document for a metal wins, and GoldRate has no uniqueness on
    // metalType. A re-seed therefore appended a second gold document at the
    // demo rate and it silently became the effective one: every price on the
    // storefront and every amount charged at checkout would move to it.
    if (!insecureDevAllowed()) return;

    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log("🌱 Database is empty. Seeding demo products, categories and rates (local development only)...");

      // ─── Insert Gold/Silver Rates (per-metal format) ─────────────────────
      await GoldRate.create({
        metalType: "gold",
        ratePerGram: 7250,
        updatedAt: new Date(),
      });
      await GoldRate.create({
        metalType: "silver",
        ratePerGram: 95,
        updatedAt: new Date(),
      });

      // ─── Insert Categories ───────────────────────────────────────────────
      await Category.create({ categoryName: "Gold", productCount: 3 });
      await Category.create({ categoryName: "Silver", productCount: 2 });
      await Category.create({ categoryName: "Diamond", productCount: 2 });

      // ─── Insert Products — aligned with PRD data model ───────────────────
      const productsData = [
        {
          productId: "p1",
          name: "Heritage Gold Jhumkas",
          category: "Gold",
          metalType: "gold",
          img: "/images/p1-jhumkas.jpg",
          description: "Intricately designed gold Jhumka earrings featuring tiny gold beads and detailed filigree work. A timeless addition to your jewelry box.",
          rating: 5,
          isFlashSale: false,
          flashSale: false,
          featured: true,
          newArrival: true,
          stock: 12,
          sold: 25,
          weight: 12.5,
          wastagePercent: 12,
          gstPercent: 3,
          isQuoteOnly: false,
          isFixedPrice: true,
        },
        {
          productId: "p2",
          name: "Artisanal Textured Silver Bracelet",
          category: "Silver",
          metalType: "silver",
          img: "/images/p2-bracelet.jpg",
          description: "A moody, elegant textured silver bracelet with intricate engravings. Perfect for daily wear or special occasions.",
          rating: 4.8,
          isFlashSale: true,
          flashSale: true,
          featured: true,
          newArrival: false,
          stock: 8,
          sold: 19,
          weight: 22.0,
          wastagePercent: 10,
          gstPercent: 3,
          isQuoteOnly: false,
          isFixedPrice: true,
        },
        {
          productId: "p3",
          name: "Imperial Diamond Necklace",
          category: "Diamond",
          img: "/images/p3-necklace.jpg",
          description: "Exquisite diamond and precious gemstone necklace with brilliant layout. An opulent piece that glows with high-end luxury.",
          rating: 5,
          isFlashSale: false,
          flashSale: false,
          featured: true,
          newArrival: true,
          stock: 2,
          sold: 5,
          isQuoteOnly: true,
          isFixedPrice: false,
          metalType: "gold",
        },
        {
          productId: "p4",
          name: "Vintage Gold Pendant",
          category: "Gold",
          metalType: "gold",
          img: "/images/p4-pendant.jpg",
          description: "Traditional gold pendant with heritage markings. Evokes antique artistry.",
          rating: 4.6,
          isFlashSale: false,
          flashSale: false,
          featured: false,
          newArrival: true,
          stock: 15,
          sold: 10,
          weight: 6.2,
          wastagePercent: 8,
          gstPercent: 3,
          isQuoteOnly: false,
          isFixedPrice: true,
        },
        {
          productId: "p5",
          name: "Royal Diamond Rings Set",
          category: "Diamond",
          img: "/images/p5-rings.jpg",
          description: "A gorgeous set of matching diamond engagement/wedding bands featuring brilliant cuts.",
          rating: 4.9,
          isFlashSale: true,
          flashSale: true,
          featured: false,
          newArrival: false,
          stock: 5,
          sold: 14,
          isQuoteOnly: true,
          isFixedPrice: false,
          metalType: "gold",
        },
      ];

      await Product.insertMany(productsData);
      console.log("🎉 Seeding complete successfully!");
    }
  } catch (err) {
    console.error("❌ Failed to seed data:", err);
  }
};

// Serverless invocations reuse a warm container but each cold start re-runs this
// module. Cache the connection promise on globalThis so concurrent requests share
// one connection attempt instead of each opening their own (or racing an
// in-flight one and querying before mongoose is ready).
const globalCache = globalThis.__mongooseCache || (globalThis.__mongooseCache = { conn: null, promise: null });

const establishConnection = async () => {
  let mongoURI = process.env.MONGODB_URI;

  try {
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined.");
    }
    console.log("Connecting to MongoDB at:", mongoURI.replace(/\/\/[^@]+@/, "//<redacted>@"));
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedInitialData();
    return conn;
  } catch (error) {
    // The in-memory fallback is a local-development convenience only. It downloads
    // a mongod binary at runtime, which cannot work on a read-only serverless
    // filesystem — so never attempt it (or exit the process) outside development.
    if (process.env.NODE_ENV !== "development") {
      console.error(
        `❌ MongoDB connection failed: ${error.message}. Set MONGODB_URI. Database-backed routes will return errors until this is configured.`
      );
      return;
    }

    console.warn(`⚠️ Local MongoDB connection failed (${error.message}). Falling back to in-memory MongoDB...`);
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      const inMemoryURI = mongoServer.getUri();
      console.log("Starting in-memory MongoDB server at:", inMemoryURI);
      const conn = await mongoose.connect(inMemoryURI);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      await seedInitialData();
      // Must return the connection, exactly as the Atlas path does. Without it
      // connectDB caches `undefined`, its `if (globalCache.conn && ...)` guard
      // never passes, and every request re-enters this function — spinning up a
      // fresh MongoMemoryServer and re-seeding it. Reads still look fine because
      // seeding repopulates, but anything written at runtime (OTP hashes, carts,
      // orders) lands in a database that is discarded before the next request.
      return conn;
    } catch (fallbackError) {
      console.error(`❌ In-memory MongoDB fallback failed: ${fallbackError.message}`);
    }
  }
};

/**
 * Returns a live mongoose connection, reusing the cached one when the container
 * is warm. Safe to await on every request — concurrent callers share a single
 * in-flight connection attempt rather than each starting their own.
 */
const connectDB = async () => {
  // readyState 1 === connected. Anything else means we need to (re)connect.
  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = establishConnection().finally(() => {
      // Clear the in-flight marker so a failed attempt can be retried on the
      // next request instead of permanently caching the failure.
      globalCache.promise = null;
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
};

export default connectDB;
