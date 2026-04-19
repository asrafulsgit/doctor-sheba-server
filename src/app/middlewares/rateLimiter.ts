import { Request, Response, NextFunction, RequestHandler } from "express";
import { checkSlidingWindow, SlidingWindowResult } from "../config/rateLimit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitInfo {
  limit: number;
  windowMs: number;
  resetMs: number;
  remaining: number;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  keyPrefix?: string;
  identifyBy?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response, info: RateLimitInfo) => void;
  skipIf?: (req: Request) => boolean;
  trustProxy?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req: Request, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function defaultOnLimitReached(
  _req: Request,
  res: Response,
  { limit, resetMs }: RateLimitInfo,
): void {
  const retryAfterSec = Math.ceil((resetMs - Date.now()) / 1000);

  res.set({
    "Retry-After": String(retryAfterSec),
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
  });

  res.status(429).json({
    success: false,
    error: "Too Many Requests",
    message: `Rate limit exceeded. Try again in ${retryAfterSec}s.`,
    retryAfter: retryAfterSec,
  });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRateLimitMiddleware(
  opts: RateLimitOptions = {},
): RequestHandler {
  const {
    limit = 100,
    windowMs = 60_000,
    keyPrefix = "rl:global",
    identifyBy,
    onLimitReached = defaultOnLimitReached,
    skipIf,
    trustProxy = false,
  } = opts;

  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (skipIf?.(req)) return next();

    const identifier = identifyBy
      ? identifyBy(req)
      : getClientIp(req, trustProxy);

    const redisKey = `${keyPrefix}:${identifier}`;

    let result: SlidingWindowResult;

    try {
      result = await checkSlidingWindow({ key: redisKey, limit, windowMs });
    } catch (err) {
      // Fail open — Redis outage should not cause downtime
      console.error(
        "[RateLimiter] Redis check failed, failing open:",
        (err as Error).message,
      );
      return next(err);
    }

    const { allowed, remaining, resetMs } = result;

    if (allowed) {
      res.set({
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
      });
      return next();
    }

    onLimitReached(req, res, { limit, windowMs, resetMs, remaining });
  };
}
