import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFeedbackFileStore,
  createFeedbackMemoryStore,
} from "../src/lib/feedbackStore.js";
import type { FeedbackRecord } from "../src/types/feedback.js";

function sampleRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "feedback-1",
    rating: 5,
    message: "Loved how clear the escrow states were.",
    status: "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("createFeedbackMemoryStore", () => {
  it("creates, lists, gets, and updates status", async () => {
    const store = createFeedbackMemoryStore();
    const record = sampleRecord();

    await store.create(record);
    expect(await store.list()).toHaveLength(1);
    expect(await store.get(record.id)).toEqual(record);

    const updated = await store.update(record.id, { status: "triaged" });
    expect(updated?.status).toBe("triaged");
  });

  it("returns undefined when updating an unknown id", async () => {
    const store = createFeedbackMemoryStore();
    expect(await store.update("missing", { status: "triaged" })).toBeUndefined();
  });

  it("removes a record and reports whether anything was removed", async () => {
    const store = createFeedbackMemoryStore();
    await store.create(sampleRecord());

    expect(await store.remove("feedback-1")).toBe(true);
    expect(await store.list()).toHaveLength(0);
    expect(await store.remove("feedback-1")).toBe(false);
  });
});

describe("createFeedbackFileStore", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "stellarvault-feedback-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("persists records to feedback.json across store instances", async () => {
    const first = createFeedbackFileStore(dataDir);
    await first.create(sampleRecord());

    const second = createFeedbackFileStore(dataDir);
    const records = await second.list();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("feedback-1");
  });

  it("returns an empty list when no file exists yet", async () => {
    const store = createFeedbackFileStore(dataDir);
    expect(await store.list()).toEqual([]);
  });

  it("removes a record and persists the removal", async () => {
    const store = createFeedbackFileStore(dataDir);
    await store.create(sampleRecord());

    expect(await store.remove("feedback-1")).toBe(true);
    expect(await createFeedbackFileStore(dataDir).list()).toEqual([]);
  });
});
