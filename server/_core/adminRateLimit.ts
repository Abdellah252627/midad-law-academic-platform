import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getClientKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return address || req.ip || req.socket.remoteAddress || "unknown";
}

export function adminRateLimit(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/admin")) return next();
  const now = Date.now();
  const key = getClientKey(req);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - bucket.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > MAX_REQUESTS) {
    res.status(429).json({ error: "تم تجاوز عدد المحاولات المسموح بها مؤقتاً. حاول بعد دقيقة." });
    return;
  }
  next();
}

export function resetAdminRateLimitForTests() {
  buckets.clear();
}

export const adminRateLimitConfig = { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS } as const;
