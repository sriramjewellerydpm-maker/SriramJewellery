import mongoose from "mongoose";

const GoldRateSchema = new mongoose.Schema({
  metalType: { type: String, enum: ["gold", "silver"], required: true },
  ratePerGram: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

// One document per metal, enforced by the database rather than by every
// writer remembering to upsert.
//
// getRates() builds its map with `rateMap[r.metalType] = r.ratePerGram` over an
// unordered find(), so a second document for a metal silently becomes the
// effective rate — and the rate decides what every customer is charged. The
// admin route already upserts; this closes the hole for anything that does not,
// and makes a stray create() fail loudly instead of repricing the shop.
GoldRateSchema.index({ metalType: 1 }, { unique: true });

export const GoldRate = mongoose.model("GoldRate", GoldRateSchema);
