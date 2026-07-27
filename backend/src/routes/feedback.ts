import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { toCsv } from "../lib/csv.js";
import type { FeedbackStore } from "../lib/feedbackStore.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import type { FeedbackRecord } from "../types/feedback.js";

const CSV_COLUMNS: Array<keyof Omit<FeedbackRecord, "contact">> = [
  "id",
  "rating",
  "message",
  "walletAddress",
  "status",
  "createdAt",
  "updatedAt",
];

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(1).max(2000),
  walletAddress: z.string().trim().min(1).optional(),
  contact: z.string().trim().min(1).max(200).optional(),
});

const statusSchema = z.object({
  status: z.enum(["new", "triaged", "actioned", "wont_fix"]),
});

/// Strip `contact` (an email/handle a submitter may have left) before
/// this ever leaves the server in a list response — feedback content
/// is useful to show publicly on a dashboard; a reachable contact
/// detail is not something to broadcast back out unauthenticated.
function toPublic(record: FeedbackRecord) {
  const { contact: _contact, ...rest } = record;
  return rest;
}

export function createFeedbackRouter(deps: {
  store: FeedbackStore;
  rateLimit?: { windowMs: number; max: number };
}): Router {
  const { store } = deps;
  const router = Router();

  // 10 submissions per 10 minutes per IP by default — generous for a
  // genuine tester leaving feedback about a few different escrows,
  // tight enough to blunt a script hammering an open, unauthenticated
  // POST endpoint. Overridable so tests can use a small window/max.
  const feedbackRateLimit = createRateLimiter(
    deps.rateLimit ?? { windowMs: 10 * 60 * 1000, max: 10 },
  );

  router.get("/", async (_req, res) => {
    const records = await store.list();
    res.json(records.map(toPublic));
  });

  // Same privacy rule as the JSON list: contact never leaves the server.
  router.get("/export.csv", async (_req, res) => {
    const records = await store.list();
    const csv = toCsv(records.map(toPublic), CSV_COLUMNS);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="feedback.csv"');
    res.send(csv);
  });

  router.post("/", feedbackRateLimit, async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const now = new Date().toISOString();
    const record: FeedbackRecord = {
      id: randomUUID(),
      ...parsed.data,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };
    await store.create(record);
    res.status(201).json(toPublic(record));
  });

  router.patch("/:id/status", async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const updated = await store.update(req.params.id, { status: parsed.data.status });
    if (!updated) {
      res.status(404).json({ error: "feedback not found" });
      return;
    }
    res.json(toPublic(updated));
  });

  // Moderation: remove spam/abuse. No auth yet (see docs/FEEDBACK.md) --
  // anyone can delete anyone's feedback, same as anyone can triage it.
  router.delete("/:id", async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "feedback not found" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
