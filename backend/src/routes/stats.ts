import { Router } from "express";
import type { FeedbackStore } from "../lib/feedbackStore.js";
import type { EscrowStore } from "../lib/store.js";
import type { EscrowStatus } from "../types/escrow.js";

/// A small transparency endpoint, not a new source of truth: everything
/// here is a live aggregate over the escrow and feedback stores, so it
/// can never drift from what GET /escrows and GET /feedback themselves
/// show.
export function createStatsRouter(deps: {
  store: EscrowStore;
  feedbackStore: FeedbackStore;
}): Router {
  const { store, feedbackStore } = deps;
  const router = Router();

  router.get("/", async (_req, res) => {
    const [escrows, feedback] = await Promise.all([store.list(), feedbackStore.list()]);

    const escrowsByStatus = escrows.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<EscrowStatus, number>,
    );

    const totalLovelaceLocked = escrows.reduce(
      (sum, e) => sum + e.milestoneAmountLovelace,
      0,
    );

    const averageRating =
      feedback.length === 0
        ? null
        : Math.round(
            (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 10,
          ) / 10;

    res.json({
      totalEscrows: escrows.length,
      escrowsByStatus,
      totalLovelaceLocked,
      totalFeedback: feedback.length,
      averageRating,
    });
  });

  return router;
}
