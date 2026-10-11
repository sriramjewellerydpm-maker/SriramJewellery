import { describe, it, expect } from "vitest";
import {
  FREE_DELIVERY_OVER,
  deliveryChargeFor,
  deliveryExplanation,
} from "../../shared/delivery.js";

const line = (deliveryCharge, unitPrice, quantity = 1) => ({
  deliveryCharge,
  unitPrice,
  quantity,
});

/**
 * The shop sets these per product, so the tests use them the same way.
 *
 * Silver, deliberately. A 1g GOLD coin is already over ₹5,000 at today's
 * rate, so the shop's own waiver sends it free and its delivery charge never
 * applies — see the test for that at the end.
 */
const coin1g = (q = 1) => line(50, 95, q);
const coin8g = (q = 1) => line(100, 760, q);
const bangle = (price) => line(0, price);

describe("what delivery costs", () => {
  it("charges what the shop set on each product", () => {
    expect(deliveryChargeFor([coin1g()])).toBe(50);
    expect(deliveryChargeFor([coin8g()])).toBe(100);
    expect(deliveryChargeFor([coin1g(), coin8g()])).toBe(150);
  });

  it("charges per unit, not per line", () => {
    expect(deliveryChargeFor([coin1g(3)])).toBe(150);
  });

  it("charges nothing for a product left at zero", () => {
    expect(deliveryChargeFor([bangle(4000)])).toBe(0);
    expect(deliveryChargeFor([bangle(4000), bangle(900)])).toBe(0);
  });

  it("waives the whole parcel when it holds a piece over ₹5,000", () => {
    // The shop's rule: one dear piece carries everything, coins included.
    expect(deliveryChargeFor([bangle(80000), coin1g()])).toBe(0);
    expect(deliveryChargeFor([bangle(5001), coin8g(4)])).toBe(0);
  });

  it("treats ₹5,000 exactly as not over ₹5,000", () => {
    expect(deliveryChargeFor([bangle(5000), coin1g()])).toBe(50);
    expect(deliveryChargeFor([bangle(5001), coin1g()])).toBe(0);
    expect(FREE_DELIVERY_OVER).toBe(5000);
  });

  it("a dear item waives delivery even when it is the charged one", () => {
    // Worth stating plainly: at today's gold rate a 1g gold coin is already
    // over ₹5,000, so the waiver sends it free however the shop prices its
    // delivery. In practice only silver coins are ever charged.
    expect(deliveryChargeFor([line(50, 7250)])).toBe(0);
  });

  it("ignores a nonsensical charge rather than billing it", () => {
    expect(deliveryChargeFor([line(-20, 100)])).toBe(0);
    expect(deliveryChargeFor([line(NaN, 100)])).toBe(0);
    expect(deliveryChargeFor([line("abc", 100)])).toBe(0);
    expect(deliveryChargeFor([line(null, 100)])).toBe(0);
  });

  it("survives an empty or malformed basket rather than throwing", () => {
    expect(deliveryChargeFor([])).toBe(0);
    expect(deliveryChargeFor()).toBe(0);
    expect(deliveryChargeFor(null)).toBe(0);
    expect(deliveryChargeFor([{}, null])).toBe(0);
  });

  it("says why, in words the customer can act on", () => {
    expect(deliveryExplanation([coin1g(), bangle(100)])).toMatch(/charged on some items/);
    expect(deliveryExplanation([bangle(80000), coin1g()])).toMatch(/includes a piece over ₹5,000/);
    expect(deliveryExplanation([bangle(900)])).toBe("Free delivery.");
  });
});
