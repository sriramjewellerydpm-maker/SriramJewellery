/**
 * What a failed admin save means, said honestly.
 *
 * The three cases are not the same and the shop owner has to act differently
 * in each, so they are not collapsed into "something went wrong":
 *
 *  - the server refused it (4xx) — it definitely did not save, and the reason
 *    is usually something they can fix
 *  - the server broke (5xx) — nobody can say from here whether the write
 *    landed before it broke
 *  - nothing came back at all — same, and it is usually the connection
 *
 * Claiming certain failure in the last two is the mistake this avoids: told
 * "it failed", the owner re-enters and re-saves, and a write that did land
 * becomes two.
 */

import { getErrorMessage } from "./errorMessage";

/**
 * The server's own words for a refusal, or null.
 *
 * Deliberately NOT getErrorMessage, which falls back to error.message — on an
 * axios rejection that is "Request failed with status code 400", which is the
 * raw upstream string this is meant to keep off the screen.
 */
const serverReason = (error) => {
  const body = error?.response?.data;
  const candidates = [body?.error, body?.message];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object" && typeof candidate.message === "string") {
      return candidate.message;
    }
  }
  return null;
};

export const UNCERTAIN_SUFFIX =
  "The change may or may not have been saved — refresh the page and check before trying again.";

/**
 * A failure we know the extent of, raised by us rather than by the transport —
 * an image that would not upload, or a 200 whose body did not confirm the
 * write. Flagged so it is not reported as an unreachable server.
 */
export const certainFailure = (message) =>
  Object.assign(new Error(message), { certain: true });

export const classifyMutationError = (error, fallback) => {
  if (error?.certain === true) {
    return { certain: true, status: null, message: getErrorMessage(error, fallback) };
  }

  const status = error?.response?.status;

  if (typeof status === "number" && status >= 400 && status < 500) {
    return {
      certain: true,
      status,
      // The server's own words: "Name already exists" is actionable where
      // "request failed with status code 409" is not — and when it sends none,
      // our fallback, never axios's internal string.
      message: serverReason(error) || fallback,
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      certain: false,
      status,
      message: `The server could not complete the change. ${UNCERTAIN_SUFFIX}`,
    };
  }

  // No response: offline, DNS, a dropped connection, or a timeout.
  return {
    certain: false,
    status: null,
    message: `Could not reach the server. ${UNCERTAIN_SUFFIX}`,
  };
};
