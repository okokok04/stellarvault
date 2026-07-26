import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { FeedbackStore } from "../lib/feedbackStore.js";
import type { FeedbackRecord } from "../types/feedback.js";

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

export function createFeedbackRouter(deps: { store: FeedbackStore }): Router {
  const { store } = deps;
  const router = Router();

  router.get("/", async (_req, res) => {
    const records = await store.list();
    res.json(records.map(toPublic));
  });

  router.post("/", async (req, res) => {
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

  return router;
}
