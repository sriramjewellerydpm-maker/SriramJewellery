/**
 * Wrong guesses allowed against one issued code before it is destroyed.
 *
 * Five matches otpVerifyLimiter's intent and tolerates mistyping six digits.
 * Past it the code dies early, so an attacker must request a new one for every
 * five guesses — which puts them back under otpLimiter and
 * otpRecipientLimiter. Those are per-address and per-IP rather than
 * per-process, so unlike the limiter's memory store they cannot be widened by
 * spreading load across warm instances.
 */
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Count one wrong guess against `hash`, and destroy the code at the cap.
 *
 * Both writes are filtered on the hash that was actually guessed at, which is
 * what makes this safe under concurrency:
 *
 *  - two guesses in flight — MongoDB applies the updates one at a time and the
 *    hash is unchanged between them, so both count.
 *  - a guess in flight while another request burns the code — the filter
 *    misses and the guess is not counted. Correct: the code is already dead,
 *    and counting it would charge the attempt to whatever replaces it.
 *  - a guess in flight while the customer requests a NEW code — the filter
 *    misses on both the increment and the burn, so a freshly issued code
 *    survives. Filtering the burn on `_id` alone would wipe it, locking out a
 *    customer who did nothing but ask for another code.
 */
export const countFailedGuess = async (Model, selector, hash, burn) => {
  const after = await Model.findOneAndUpdate(
    { ...selector, otpHash: hash },
    { $inc: { otpAttempts: 1 } },
    { new: true, projection: { otpAttempts: 1 } }
  );
  if (after && after.otpAttempts >= OTP_MAX_ATTEMPTS) {
    // A pending signup has nothing worth keeping once its code is dead, so it
    // is removed outright; an account keeps its row and loses only the code.
    if (burn) await Model.updateOne({ ...selector, otpHash: hash }, burn);
    else await Model.deleteOne({ ...selector, otpHash: hash });
  }
};

