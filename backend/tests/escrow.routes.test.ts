import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createFeedbackMemoryStore } from "../src/lib/feedbackStore.js";
import { createMemoryStore } from "../src/lib/store.js";
import type { OnChainPort } from "../src/routes/escrow.js";

function buildAppWithFakeOnchain() {
  const onchain: OnChainPort = {
    lockFunds: vi.fn().mockResolvedValue({
      lockTxHash: "fake-lock-tx",
      scriptAddress: "addr_test1scriptfake",
    }),
    releaseFunds: vi.fn().mockResolvedValue("fake-release-tx"),
    refundFunds: vi.fn().mockResolvedValue("fake-refund-tx"),
    resolveFunds: vi.fn().mockResolvedValue("fake-resolve-tx"),
  };
  const store = createMemoryStore();
  const feedbackStore = createFeedbackMemoryStore();
  const app = createApp({ store, onchain, feedbackStore });
  return { app, onchain, store };
}

const validPayload = {
  buyerAddress: "addr_test1buyer",
  sellerAddress: "addr_test1seller",
  arbiterAddress: "addr_test1arbiter",
  milestoneAmountLovelace: 10_000_000,
  deadlineUnixMs: Date.now() + 7 * 86_400_000,
};

describe("GET /health", () => {
  it("reports ok", async () => {
    const { app } = buildAppWithFakeOnchain();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /escrows", () => {
  it("rejects an invalid payload before touching the chain", async () => {
    const { app, onchain } = buildAppWithFakeOnchain();
    const res = await request(app)
      .post("/escrows")
      .send({ buyerAddress: "addr_test1buyer" });

    expect(res.status).toBe(400);
    expect(onchain.lockFunds).not.toHaveBeenCalled();
  });

  it("locks funds and persists a new escrow record", async () => {
    const { app, onchain } = buildAppWithFakeOnchain();
    const res = await request(app).post("/escrows").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("locked");
    expect(res.body.lockTxHash).toBe("fake-lock-tx");
    expect(onchain.lockFunds).toHaveBeenCalledWith(validPayload);
  });
});

describe("escrow lifecycle transitions", () => {
  let app: ReturnType<typeof buildAppWithFakeOnchain>["app"];
  let onchain: OnChainPort;
  let escrowId: string;

  beforeEach(async () => {
    const built = buildAppWithFakeOnchain();
    app = built.app;
    onchain = built.onchain;

    const created = await request(app).post("/escrows").send(validPayload);
    escrowId = created.body.id;
  });

  it("releases funds to the seller", async () => {
    const res = await request(app).post(`/escrows/${escrowId}/release`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("released");
    expect(res.body.settleTxHash).toBe("fake-release-tx");
    expect(onchain.releaseFunds).toHaveBeenCalledWith(
      "addr_test1scriptfake",
      "fake-lock-tx",
    );
  });

  it("refuses a second transition once already settled", async () => {
    await request(app).post(`/escrows/${escrowId}/release`);
    const second = await request(app).post(`/escrows/${escrowId}/refund`);
    expect(second.status).toBe(409);
  });

  it("resolves a dispute in favor of the requested side", async () => {
    const res = await request(app)
      .post(`/escrows/${escrowId}/resolve`)
      .send({ paySeller: false });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
    expect(onchain.resolveFunds).toHaveBeenCalledWith(
      "addr_test1scriptfake",
      "fake-lock-tx",
      false,
    );
  });

  it("404s on an unknown escrow id", async () => {
    const res = await request(app).post("/escrows/does-not-exist/release");
    expect(res.status).toBe(404);
  });
});
