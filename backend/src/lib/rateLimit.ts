import type { NextFunction, Request, Response } from "express";

/// Minimal in-memory sliding-window rate limiter. Good enough for a
/// single-instance MVP fronting an open feedback form on the public
/// internet; not distributed, and resets on restart -- swap for a
/// shared store (Redis) if this ever runs on more than one instance.
export function createRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);

    if (recent.length >= opts.max) {
      res.status(429).json({ error: "Too many requests — try again later." });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
