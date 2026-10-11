/**
 * What the admin UI now relies on from every mutating route.
 *
 * The forms treat a 2xx whose body does not confirm the write as a FAILURE —
 * the old code showed its success dialog inside `if (res.data.success)`, so a
 * response without that flag produced no dialog at all and the owner was left
 * guessing. Reporting a false failure instead would be just as bad, so the
 * shape each route actually answers with is pinned here rather than assumed.
 *
 * It also pins the status class of a refusal: the client calls a 4xx a certain
 * failure and quotes the server's reason, and anything else "may or may not
 * have been saved". A route that answered 500 for a validation problem would
 * put the wrong one of those on screen.
 */
import { describe, it, expect } from "vitest";
import { useApp } from "../helpers/app.js";
import { seedRates, createProduct, makeAdmin, seedCatalog } from "../helpers/factories.js";

const ctx = useApp();

describe("admin mutations confirm their writes", () => {
  it("PATCH /api/rates answers success on a save and 400 on a refusal", async () => {
    const { token } = await makeAdmin();

    const ok = await ctx.api(token).patch("/api/rates").send({ gold: 7250 });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    // An implausible rate — the per-10-gram price typed into a per-gram field.
    const refused = await ctx.api(token).patch("/api/rates").send({ gold: 72500 });
    expect(refused.status).toBe(400);
    // Quoted verbatim by the client, so it has to be a sentence, not a code.
    expect(typeof refused.body.error).toBe("string");
    expect(refused.body.error.length).toBeGreaterThan(10);
  });

  it("POST and PATCH /api/products confirm the write", async () => {
    const { token } = await makeAdmin();
    await seedCatalog();

    const created = await ctx.api(token).post("/api/products").send({
      name: "Contract ring",
      category: "Gold",
      weight: 5,
      metalType: "gold",
      img: "https://example.com/a.jpg",
      size: "12",
      carate: 22,
    });
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const product = await createProduct("gold", { productId: "contract-patch" });
    const updated = await ctx.api(token).patch(`/api/products/${product._id}`).send({ weight: 9 });
    expect(updated.status).toBe(200);
    expect(updated.body.success).toBe(true);
  });

  it("DELETE /api/products confirms the write", async () => {
    const { token } = await makeAdmin();
    const product = await createProduct("gold", { productId: "contract-delete" });
    const res = await ctx.api(token).delete(`/api/products/${product._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/categories confirms the write, and refuses with 400", async () => {
    const { token } = await makeAdmin();

    const created = await ctx
      .api(token)
      .post("/api/categories")
      .send({ categoryName: "Contract", categoryPic: "https://example.com/c.jpg" });
    expect(created.status).toBe(201);
    // The client accepts either flag here, because this route answers insertedId.
    expect(created.body.success || created.body.insertedId).toBeTruthy();

    const refused = await ctx.api(token).post("/api/categories").send({});
    expect(refused.status).toBe(400);
  });

  it("a refusal is always a 4xx, never a 500", async () => {
    const { token } = await makeAdmin();
    await seedRates();

    // Each of these is a validation problem, not a server fault. The client
    // says "it did not save" for 4xx and "it may have saved" for 5xx, so the
    // distinction decides which sentence the owner reads.
    const refusals = [
      ctx.api(token).patch("/api/rates").send({ gold: 1 }),
      ctx.api(token).patch("/api/rates").send({ gold: "not a number" }),
      ctx.api(token).post("/api/categories").send({ categoryName: "x".repeat(101) }),
      ctx.api(token).post("/api/products").send({}),
    ];

    for (const res of await Promise.all(refusals)) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });
});
