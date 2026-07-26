import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../src/lib/rateLimit.js";

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
    const next = vi.fn();
    const req = { ip: "1.1.1.1" } as Request;

    limiter(req, mockRes(), next as NextFunction);
    limiter(req, mockRes(), next as NextFunction);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("blocks with 429 once the limit is exceeded", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = vi.fn();
    const req = { ip: "2.2.2.2" } as Request;

    limiter(req, mockRes(), next as NextFunction);
    const res = mockRes();
    limiter(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("tracks separate IPs independently", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const next = vi.fn();

    limiter({ ip: "3.3.3.3" } as Request, mockRes(), next as NextFunction);
    limiter({ ip: "4.4.4.4" } as Request, mockRes(), next as NextFunction);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
