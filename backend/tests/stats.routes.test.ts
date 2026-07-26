import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createFeedbackMemoryStore } from "../src/lib/feedbackStore.js";
import { createMemoryStore } from "../src/lib/store.js";
import type { OnChainPort } from "../src/routes/escrow.js";
import type { EscrowRecord } from "../src/types/escrow.js";

const onchain: OnChainPort = {
  lockFunds: async () => ({ lockTxHash: "x", scriptAddress: "y" }),
  releaseFunds: async () => "x",
  refundFunds: async () => "x",
  resolveFunds: async () => "x",
};

function escrow(overrides: Partial<EscrowRecord> = {}): EscrowRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    buyerAddress: "addr_test1buyer",
    sellerAddress: "addr_test1seller",
    arbiterAddress: "addr_test1arbiter",
    milestoneAmountLovelace: 5_000_000,
    deadlineUnixMs: Date.now() + 86_400_000,
    status: "locked",
    scriptAddress: "addr_test1script",
    lockTxHash: "tx",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("GET /stats", () => {
  it("aggregates escrow counts, locked value, and feedback rating", async () => {
    const store = createMemoryStore();
    const feedbackStore = createFeedbackMemoryStore();
    await store.create(escrow({ status: "locked", milestoneAmountLovelace: 5_000_000 }));
    await store.create(escrow({ status: "released", milestoneAmountLovelace: 3_000_000 }));
    const now = new Date().toISOString();
    await feedbackStore.create({
      id: "f1",
      rating: 4,
      message: "good",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    await feedbackStore.create({
      id: "f2",
      rating: 5,
      message: "great",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    const app = createApp({ store, onchain, feedbackStore });
    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body.totalEscrows).toBe(2);
    expect(res.body.escrowsByStatus).toEqual({ locked: 1, released: 1 });
    expect(res.body.totalLovelaceLocked).toBe(8_000_000);
    expect(res.body.totalFeedback).toBe(2);
    expect(res.body.averageRating).toBe(4.5);
  });

  it("returns a null average rating with no feedback yet", async () => {
    const app = createApp({
      store: createMemoryStore(),
      onchain,
      feedbackStore: createFeedbackMemoryStore(),
    });
    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body.totalEscrows).toBe(0);
    expect(res.body.averageRating).toBeNull();
  });
});
