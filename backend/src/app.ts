import cors from "cors";
import express, { type Express } from "express";
import type { EscrowStore } from "./lib/store.js";
import { createEscrowRouter, type OnChainPort } from "./routes/escrow.js";

export function createApp(deps: {
  store: EscrowStore;
  onchain: OnChainPort;
}): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "stellarvault-backend" });
  });

  app.use("/escrows", createEscrowRouter(deps));

  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  return app;
}
