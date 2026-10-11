import { describe, it, expect } from "vitest";
import {
  productionConfigProblems,
  runStartupChecks,
} from "../../server/utils/startupChecks.js";

/**
 * The failure being guarded against: a production deploy that takes money but
 * cannot verify Razorpay's webhooks, so every confirmation is rejected and a
 * customer who closes the tab after paying never gets their order. It boots
 * fine and looks fine, which is exactly what happened with the JWT fallback.
 */
describe("production configuration", () => {
  const prod = (extra) => ({ NODE_ENV: "production", ...extra });

  it("refuses when Razorpay is live and the webhook secret is missing", () => {
    const problems = productionConfigProblems(prod({ RAZORPAY_KEY_ID: "rzp_live_x" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/RAZORPAY_WEBHOOK_SECRET/);
    expect(() => runStartupChecks(prod({ RAZORPAY_KEY_ID: "rzp_live_x" }))).toThrow(
      /Refusing to start/
    );
  });

  it("is satisfied once the secret is set", () => {
    expect(
      productionConfigProblems(prod({ RAZORPAY_KEY_ID: "rzp_live_x", RAZORPAY_WEBHOOK_SECRET: "s" }))
    ).toEqual([]);
  });

  it("does not take the shop down when payments are not configured at all", () => {
    // No Razorpay keys means no money is being taken, so there are no webhooks
    // to verify. Refusing to boot here would break the whole site to protect
    // nothing — the guard is about live payments WITHOUT verification.
    expect(productionConfigProblems(prod({}))).toEqual([]);
    expect(() => runStartupChecks(prod({}))).not.toThrow();
  });

  it("never blocks development, where the webhook is not reachable anyway", () => {
    expect(
      productionConfigProblems({ NODE_ENV: "development", RAZORPAY_KEY_ID: "rzp_test_x" })
    ).toEqual([]);
    expect(productionConfigProblems({ RAZORPAY_KEY_ID: "rzp_test_x" })).toEqual([]);
  });
});
