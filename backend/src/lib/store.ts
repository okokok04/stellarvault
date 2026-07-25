import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EscrowRecord } from "../types/escrow.js";

/// Deliberately simple JSON-file store. The MVP needs durable, auditable
/// records of what the backend *believes* the on-chain state is — it is
/// never the source of truth (the ledger is), so a database is not worth
/// the operational cost yet. Swapping this for Postgres/SQLite later only
/// touches this one file.

export interface EscrowStore {
  list(): Promise<EscrowRecord[]>;
  get(id: string): Promise<EscrowRecord | undefined>;
  create(record: EscrowRecord): Promise<EscrowRecord>;
  update(
    id: string,
    patch: Partial<Omit<EscrowRecord, "id">>,
  ): Promise<EscrowRecord | undefined>;
}

export function createFileStore(dataDir: string): EscrowStore {
  const filePath = path.join(dataDir, "escrows.json");

  async function readAll(): Promise<EscrowRecord[]> {
    try {
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw) as EscrowRecord[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  async function writeAll(records: EscrowRecord[]): Promise<void> {
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

      const updated: EscrowRecord = {
        ...records[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      records[index] = updated;
      await writeAll(records);
      return updated;
    },
  };
}

/// In-memory variant used by tests so they never touch the filesystem.
export function createMemoryStore(): EscrowStore {
  const records = new Map<string, EscrowRecord>();

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
      const updated: EscrowRecord = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      records.set(id, updated);
      return updated;
    },
  };
}
