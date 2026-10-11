import { describe, it, expect } from "vitest";
import {
  UNCERTAIN_SUFFIX,
  certainFailure,
  classifyMutationError,
} from "../../src/utils/mutationError.js";

/** What axios hands a rejected mutation. */
const axiosError = (status, body) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data: body },
});

/** What axios hands one that never got an answer. */
const networkError = () =>
  Object.assign(new Error("Network Error"), { request: {} });

describe("what a failed admin save means", () => {
  it("a refusal is certain, and quotes the server's own reason", () => {
    const result = classifyMutationError(
      axiosError(409, { error: "A category with that name already exists" }),
      "fallback"
    );
    expect(result.certain).toBe(true);
    expect(result.status).toBe(409);
    // The owner can act on this; "request failed with status code 409" is not.
    expect(result.message).toBe("A category with that name already exists");
  });

  it("falls back to our own words when the server sends none", () => {
    const result = classifyMutationError(axiosError(400, {}), "The rate was rejected.");
    expect(result.certain).toBe(true);
    expect(result.message).toBe("The rate was rejected.");
  });

  it("a 500 is NOT reported as a certain failure", () => {
    const result = classifyMutationError(axiosError(500, {}), "fallback");
    // Nobody can say from here whether the write landed before it broke.
    expect(result.certain).toBe(false);
    expect(result.message).toContain(UNCERTAIN_SUFFIX);
    expect(result.message).not.toMatch(/did not save|failed to save/i);
  });

  it("no answer at all is uncertain and says to check", () => {
    const result = classifyMutationError(networkError(), "fallback");
    expect(result.certain).toBe(false);
    expect(result.status).toBeNull();
    expect(result.message).toContain("Could not reach the server");
    expect(result.message).toContain("refresh the page and check");
  });

  it("a timeout is treated the same as a dropped connection", () => {
    const timeout = Object.assign(new Error("timeout of 0ms exceeded"), {
      code: "ECONNABORTED",
    });
    expect(classifyMutationError(timeout, "fallback").certain).toBe(false);
  });

  it("our own failures stay certain despite having no response", () => {
    // An image that would not upload, or a 200 that did not confirm the write.
    // Without the flag these look exactly like an unreachable server.
    const result = classifyMutationError(
      certainFailure('"ring.jpg" could not be uploaded, so nothing was saved.'),
      "fallback"
    );
    expect(result.certain).toBe(true);
    expect(result.message).toBe('"ring.jpg" could not be uploaded, so nothing was saved.');
    expect(result.message).not.toContain(UNCERTAIN_SUFFIX);
  });

  it("every uncertain case tells the owner to check rather than to retry", () => {
    for (const error of [axiosError(502, {}), axiosError(503, {}), networkError()]) {
      const { certain, message } = classifyMutationError(error, "fallback");
      expect(certain).toBe(false);
      // Being told "it failed" is what turns one save into two.
      expect(message).toContain("may or may not have been saved");
    }
  });

  it("never puts axios's own wording on screen", () => {
    // The regression this guards: falling through to error.message produced
    // "Request failed with status code 400", which tells the owner nothing.
    for (const status of [400, 401, 403, 409, 422]) {
      const { message } = classifyMutationError(
        axiosError(status, {}),
        "The category could not be created."
      );
      expect(message).toBe("The category could not be created.");
      expect(message).not.toMatch(/status code/i);
    }
  });

  it("survives being handed nothing", () => {
    expect(classifyMutationError(undefined, "fallback").certain).toBe(false);
    expect(classifyMutationError(null, "fallback").message).toContain("Could not reach");
  });
});
