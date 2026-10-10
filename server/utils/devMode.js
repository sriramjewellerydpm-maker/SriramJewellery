/**
 * The single switch for every development-only relaxation.
 *
 * Inverted deliberately: ABSENCE MEANS ARMED. The previous shape keyed off
 * NODE_ENV === "development", which failed open — one mis-set variable
 * silently disarmed the rate limiters AND put email into console mode, where
 * live sign-in codes print into the deploy log. Both happened at once on a
 * real deployment, and nothing in the running system said so.
 *
 * A deployment can never opt in: Vercel sets VERCEL on every invocation, so
 * the opt-in is ignored there however the project is configured.
 *
 * Note what this does NOT gate: there is no development fallback for any
 * secret. A secret comes from the environment or the feature fails closed.
 */
export const insecureDevAllowed = () =>
  process.env.ALLOW_INSECURE_DEV === "true" && !process.env.VERCEL;

export default insecureDevAllowed;
