/**
 * Configuration that must not be missing on a real deployment.
 *
 * The precedent is the JWT fallback: a secret quietly defaulting to something
 * usable meant production ran for a while with forgeable tokens and nothing
 * said so. A deployment that takes money while unable to verify Razorpay's
 * webhooks is the same shape of fault — it works, right up until it matters.
 *
 * Pure in `env` so the suite can exercise every branch without touching the
 * real environment.
 */

/** @returns {string[]} one sentence per problem; empty when the config is sound. */
export const productionConfigProblems = (env = process.env) => {
  const problems = [];
  if (env.NODE_ENV !== "production") return problems;

  // Only when payments are actually switched on. A deployment with no Razorpay
  // keys takes no money, so there are no webhooks to verify and refusing to
  // boot over a missing secret would take the whole shop down to protect
  // nothing. The fault being guarded against is live payments WITHOUT
  // verification, not a missing variable in the abstract.
  if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_WEBHOOK_SECRET) {
    problems.push(
      "RAZORPAY_WEBHOOK_SECRET is not set while Razorpay is configured. " +
        "Payment confirmations would arrive unverified and be rejected, so a " +
        "customer who closes the tab after paying would never get their order. " +
        "Create the webhook in the Razorpay dashboard and set the secret."
    );
  }

  return problems;
};

/**
 * Throws rather than exits: under a serverless host there is no process to
 * exit, and a module that fails to initialise fails every request loudly,
 * which is the same outcome and far easier to read in the logs.
 */
export const runStartupChecks = (env = process.env) => {
  const problems = productionConfigProblems(env);
  if (!problems.length) return;
  throw new Error(
    `Refusing to start — production configuration is incomplete:\n` +
      problems.map((p) => `  • ${p}`).join("\n")
  );
};
