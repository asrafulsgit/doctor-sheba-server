import { Request } from "express";
import { RateLimitOptions } from "../middlewares/rateLimiter";

const rateLimitConfig = {
  global: {
    limit: 5,
    windowMs: 15_000, // 1 minute
    keyPrefix: "rl:global",
    trustProxy: true,
  } satisfies RateLimitOptions,

   
  auth: {
    limit: 10,
    windowMs: 15 * 60_000, // 15 minutes
    keyPrefix: "rl:auth",
    trustProxy: true,
    onLimitReached: (_req: Request, res: any, { resetMs }: any) => {
      const retryAfterSec = Math.ceil((resetMs - Date.now()) / 1000);
      res.set("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: "Too Many Requests",
        message: "Too many login attempts. Please wait before trying again.",
        retryAfter: retryAfterSec,
      });
    },
  } satisfies RateLimitOptions,

  api: {
    limit: 1_000,
    windowMs: 60 * 60_000, // 1 hour
    keyPrefix: "rl:api",
    trustProxy: true,
    identifyBy: (req: Request): string =>
      (req as any).user?.id ?? req.ip ?? "unknown",
  } satisfies RateLimitOptions,
} as const;

export default rateLimitConfig;
