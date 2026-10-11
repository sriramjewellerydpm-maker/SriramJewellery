/**
 * The bcrypt cost factor, in one place.
 *
 * It was previously declared three times (auth.js, users.js,
 * resetAdminPassword.js) and written as a bare 12 twice more in db/connect.js.
 * Raising it therefore meant five edits, and the two literals would not be
 * found by searching for the constant's name — so the seeded administrator
 * would quietly keep being hashed at the old cost.
 *
 * Changing this does NOT invalidate existing hashes: bcrypt stores the cost
 * inside the hash, so old passwords keep verifying at whatever they were made
 * with and are re-hashed at the new cost the next time they are set.
 *
 * 12 is the current figure. Raise it when hardware makes it cheap to; the only
 * ceiling is how long a sign-in may take, since the cost is paid on every
 * verification, not just on writes.
 */
export const BCRYPT_SALT_ROUNDS = 12;

export default BCRYPT_SALT_ROUNDS;
