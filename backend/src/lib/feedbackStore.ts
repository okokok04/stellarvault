import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FeedbackRecord } from "../types/feedback.js";

/// Same JSON-file-or-memory pattern as lib/store.ts, kept as a separate
/// small file rather than a shared generic: the two records' update
/// semantics (escrow status transitions vs. feedback triage) are similar
/// but not identical, and duplicating ~70 lines is cheaper than the
/// abstraction would be to get right for both callers.

export interface FeedbackStore {
  list(): Promise<FeedbackRecord[]>;
  get(id: string): Promise<FeedbackRecord | undefined>;
  create(record: FeedbackRecord): Promise<FeedbackRecord>;
  update(
    id: string,
    patch: Partial<Pick<FeedbackRecord, "status">>,
  ): Promise<FeedbackRecord | undefined>;
  remove(id: string): Promise<boolean>;
}

export function createFeedbackFileStore(dataDir: string): FeedbackStore {
  const filePath = path.join(dataDir, "feedback.json");

  async function readAll(): Promise<FeedbackRecord[]> {
    try {
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw) as FeedbackRecord[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  async function writeAll(records: FeedbackRecord[]): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    await writeFile(filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  return {
    async list() {
      return readAll();
    },

    async get(id) {
      const records = await readAll();
      return records.find((record) => record.id === id);
    },

    async create(record) {
      const records = await readAll();
      records.push(record);
      await writeAll(records);
      return record;
    },

    async update(id, patch) {
      const records = await readAll();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return undefined;

      const updated: FeedbackRecord = {
        ...records[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      records[index] = updated;
      await writeAll(records);
      return updated;
    },

    async remove(id) {
      const records = await readAll();
      const next = records.filter((record) => record.id !== id);
      if (next.length === records.length) return false;
      await writeAll(next);
      return true;
    },
  };
}

/// In-memory variant used by tests so they never touch the filesystem.
export function createFeedbackMemoryStore(): FeedbackStore {
  const records = new Map<string, FeedbackRecord>();

  return {
    async list() {
      return Array.from(records.values());
    },
    async get(id) {
      return records.get(id);
    },
    async create(record) {
      records.set(record.id, record);
      return record;
    },
    async update(id, patch) {
      const existing = records.get(id);
      if (!existing) return undefined;
      const updated: FeedbackRecord = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      records.set(id, updated);
      return updated;
    },
    async remove(id) {
      return records.delete(id);
    },
  };
}
