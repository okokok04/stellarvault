import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { z } from "zod";
import { createRateLimiter } from "../lib/rateLimit.js";
import type { EscrowStore } from "../lib/store.js";
import type { EscrowRecord, EscrowStatus } from "../types/escrow.js";

/// The API only ever talks to on-chain logic through this narrow port,
/// so tests can substitute a fake and never touch Blockfrost/the ledger.
export interface OnChainPort {
  lockFunds(input: {
    buyerAddress: string;
    sellerAddress: string;
    arbiterAddress: string;
    milestoneAmountLovelace: number;
    deadlineUnixMs: number;
  }): Promise<{ lockTxHash: string; scriptAddress: string }>;
  releaseFunds(scriptAddress: string, lockTxHash: string): Promise<string>;
  refundFunds(scriptAddress: string, lockTxHash: string): Promise<string>;
  resolveFunds(
    scriptAddress: string,
    lockTxHash: string,
    paySeller: boolean,
  ): Promise<string>;
}

const createSchema = z.object({
  buyerAddress: z.string().min(1),
  sellerAddress: z.string().min(1),
  arbiterAddress: z.string().min(1),
  milestoneAmountLovelace: z.number().int().positive(),
  deadlineUnixMs: z.number().int().positive(),
});

const resolveSchema = z.object({
  paySeller: z.boolean(),
});

export function createEscrowRouter(deps: {
  store: EscrowStore;
  onchain: OnChainPort;
  escrowRateLimit?: { windowMs: number; max: number };
}): Router {
  const { store, onchain } = deps;
  const router = Router();

  // Every mutating route here submits a real on-chain transaction paid
  // for by the shared service wallet — unlike feedback, spam here has a
  // real (if testnet) fee cost and can exhaust the wallet's UTxOs.
  // Tighter default than feedback's: 20 per 10 minutes per IP.
  const escrowRateLimit = createRateLimiter(
    deps.escrowRateLimit ?? { windowMs: 10 * 60 * 1000, max: 20 },
  );

  router.get("/", async (_req, res) => {
    res.json(await store.list());
  });

  router.get("/:id", async (req, res) => {
    const escrow = await store.get(req.params.id);
    if (!escrow) {
      res.status(404).json({ error: "escrow not found" });
      return;
    }
    res.json(escrow);
  });

  router.post("/", escrowRateLimit, async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const { lockTxHash, scriptAddress } = await onchain.lockFunds(
        parsed.data,
      );
      const now = new Date().toISOString();
      const record: EscrowRecord = {
        id: randomUUID(),
        ...parsed.data,
        status: "locked",
        scriptAddress,
        lockTxHash,
        createdAt: now,
        updatedAt: now,
      };
      await store.create(record);
      res.status(201).json(record);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  async function transition(
    id: string,
    nextStatus: EscrowStatus,
    settle: (escrow: EscrowRecord) => Promise<string>,
    res: Response,
  ) {
    const escrow = await store.get(id);
    if (!escrow) {
      res.status(404).json({ error: "escrow not found" });
      return;
    }
    if (escrow.status !== "locked") {
      res.status(409).json({
        error: `escrow is already ${escrow.status}, cannot transition`,
      });
      return;
    }

    try {
      const settleTxHash = await settle(escrow);
      const updated = await store.update(id, {
        status: nextStatus,
        settleTxHash,
      });
      res.json(updated);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  }

  router.post("/:id/release", escrowRateLimit, async (req, res) => {
    await transition(
      req.params.id,
      "released",
      (escrow) => onchain.releaseFunds(escrow.scriptAddress, escrow.lockTxHash),
      res,
    );
  });

  router.post("/:id/refund", escrowRateLimit, async (req, res) => {
    await transition(
      req.params.id,
      "refunded",
      (escrow) => onchain.refundFunds(escrow.scriptAddress, escrow.lockTxHash),
      res,
    );
  });

  router.post("/:id/resolve", escrowRateLimit, async (req, res) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    await transition(
      req.params.id,
      "resolved",
      (escrow) =>
        onchain.resolveFunds(
          escrow.scriptAddress,
          escrow.lockTxHash,
          parsed.data.paySeller,
        ),
      res,
    );
  });

  return router;
}
