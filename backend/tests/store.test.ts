import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileStore, createMemoryStore } from "../src/lib/store.js";
import type { EscrowRecord } from "../src/types/escrow.js";

function sampleRecord(overrides: Partial<EscrowRecord> = {}): EscrowRecord {
  return {
    id: "escrow-1",
    buyerAddress: "addr_test1buyer",
    sellerAddress: "addr_test1seller",
    arbiterAddress: "addr_test1arbiter",
    milestoneAmountLovelace: 5_000_000,
    deadlineUnixMs: Date.now() + 86_400_000,
    status: "locked",
    scriptAddress: "addr_test1script",
    lockTxHash: "deadbeef",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("createMemoryStore", () => {
  it("creates, lists, gets, and updates records", async () => {
    const store = createMemoryStore();
    const record = sampleRecord();

    await store.create(record);
    expect(await store.list()).toHaveLength(1);
    expect(await store.get(record.id)).toEqual(record);

    const updated = await store.update(record.id, { status: "released" });
    expect(updated?.status).toBe("released");
    expect((await store.get(record.id))?.status).toBe("released");
  });

  it("returns undefined when updating an unknown id", async () => {
    const store = createMemoryStore();
    expect(await store.update("missing", { status: "released" })).toBeUndefined();
  });
});

describe("createFileStore", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "stellarvault-store-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("persists records to escrows.json across store instances", async () => {
    const first = createFileStore(dataDir);
    await first.create(sampleRecord());

    const second = createFileStore(dataDir);
    const records = await second.list();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("escrow-1");
  });

  it("returns an empty list when no file exists yet", async () => {
    const store = createFileStore(dataDir);
    expect(await store.list()).toEqual([]);
  });
});
