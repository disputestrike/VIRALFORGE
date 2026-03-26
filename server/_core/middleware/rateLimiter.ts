/**
 * RATE LIMITING MIDDLEWARE
 * In-memory rate limiting (no Redis required)
 * For production at scale, switch to redis-based store
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  message?: string;
  keyFn?: (req: Request) => string;
}) {
  const store: RateLimitStore = {};

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (store[key].resetAt < now) delete store[key];
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyFn ? opts.keyFn(req) : (req.ip || "unknown");
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 1, resetAt: now + opts.windowMs };
    } else {
      store[key].count++;
    }

    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - store[key].count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(store[key].resetAt / 1000));

    if (store[key].count > opts.max) {
      return res.status(429).json({
        error: opts.message || "Too many requests. Please try again later.",
        retryAfter: Math.ceil((store[key].resetAt - now) / 1000),
      });
    }

    next();
  };
}

/** General API: 200 req/min per IP */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: "Too many API requests. Please slow down.",
});

/** AI endpoints: 30 req/min per IP */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "AI rate limit reached. Please wait before making more AI requests.",
});

/** Auth endpoints: 10 attempts/15min per IP (brute force protection) */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

/** Webhook ingestion: 100 req/min per IP */
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
});
