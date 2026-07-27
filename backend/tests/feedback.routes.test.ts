import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createFeedbackMemoryStore } from "../src/lib/feedbackStore.js";
import { createMemoryStore } from "../src/lib/store.js";
import type { OnChainPort } from "../src/routes/escrow.js";

function buildApp(feedbackRateLimit?: { windowMs: number; max: number }) {
  const onchain: OnChainPort = {
    lockFunds: async () => ({ lockTxHash: "x", scriptAddress: "y" }),
    releaseFunds: async () => "x",
    refundFunds: async () => "x",
    resolveFunds: async () => "x",
  };
  const feedbackStore = createFeedbackMemoryStore();
  const app = createApp({
    store: createMemoryStore(),
    onchain,
    feedbackStore,
    feedbackRateLimit,
  });
  return { app, feedbackStore };
}

const validPayload = {
  rating: 4,
  message: "Locking felt smooth; the deadline picker is confusing on mobile.",
  walletAddress: "addr_test1feedbackuser",
  contact: "someone@example.com",
};

describe("POST /feedback", () => {
  it("rejects an invalid payload", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/feedback").send({ rating: 9 });
    expect(res.status).toBe(400);
  });

  it("creates feedback and never echoes contact back", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/feedback").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("new");
    expect(res.body.rating).toBe(4);
    expect(res.body.contact).toBeUndefined();
  });

  it("rate-limits repeated submissions from the same client", async () => {
    const { app } = buildApp({ windowMs: 60_000, max: 2 });

    await request(app).post("/feedback").send(validPayload);
    await request(app).post("/feedback").send(validPayload);
    const third = await request(app).post("/feedback").send(validPayload);

    expect(third.status).toBe(429);
  });
});

describe("GET /feedback", () => {
  it("lists feedback without leaking contact details", async () => {
    const { app } = buildApp();
    await request(app).post("/feedback").send(validPayload);

    const res = await request(app).get("/feedback");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].message).toBe(validPayload.message);
    expect(res.body[0].contact).toBeUndefined();
  });
});

describe("GET /feedback/export.csv", () => {
  it("returns a CSV attachment without contact details", async () => {
    const { app } = buildApp();
    await request(app).post("/feedback").send(validPayload);

    const res = await request(app).get("/feedback/export.csv");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("feedback.csv");
    expect(res.text).toContain("id,rating,message,walletAddress,status,createdAt,updatedAt");
    expect(res.text).toContain(validPayload.message);
    expect(res.text).not.toContain(validPayload.contact);
  });
});

describe("PATCH /feedback/:id/status", () => {
  it("updates status through the triage lifecycle", async () => {
    const { app } = buildApp();
    const created = await request(app).post("/feedback").send(validPayload);

    const res = await request(app)
      .patch(`/feedback/${created.body.id}/status`)
      .send({ status: "triaged" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("triaged");
  });

  it("404s on an unknown id", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .patch("/feedback/does-not-exist/status")
      .send({ status: "triaged" });
    expect(res.status).toBe(404);
  });

  it("rejects an invalid status value", async () => {
    const { app } = buildApp();
    const created = await request(app).post("/feedback").send(validPayload);
    const res = await request(app)
      .patch(`/feedback/${created.body.id}/status`)
      .send({ status: "not-a-real-status" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /feedback/:id", () => {
  it("removes a feedback item", async () => {
    const { app } = buildApp();
    const created = await request(app).post("/feedback").send(validPayload);

    const res = await request(app).delete(`/feedback/${created.body.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get("/feedback");
    expect(list.body).toHaveLength(0);
  });

  it("404s on an unknown id", async () => {
    const { app } = buildApp();
    const res = await request(app).delete("/feedback/does-not-exist");
    expect(res.status).toBe(404);
  });
});
