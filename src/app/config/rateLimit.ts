/**
 * slidingWindowRateLimit
 *
 * Uses a Redis Sorted Set per identifier where each member is a unique
 * request ID and the score is the request timestamp (ms).
 *
 * On every request:
 *   1. Remove all entries outside the current window  (ZREMRANGEBYSCORE)
 *   2. Count remaining entries                         (ZCARD)
 *   3. If count >= limit → reject with 429
 *   4. Otherwise add the new entry + set key TTL       (ZADD + EXPIRE)
 *
 * All four Redis ops run inside a single MULTI/EXEC pipeline → atomic.
 */

/**
 * rateLimiter.ts — Redis sliding-window core logic
 */

import { v4 as uuidv4 } from "uuid";
import { redisClient } from "./redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlidingWindowOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface SlidingWindowResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetMs: number;
}

// ─── Core sliding-window check ────────────────────────────────────────────────

export async function checkSlidingWindow({
  key,
  limit,
  windowMs,
}: SlidingWindowOptions): Promise<SlidingWindowResult> {
  const client = redisClient;

  const now = Date.now();
  const windowStart = now - windowMs;
  const requestId = `${now}-${uuidv4()}`;

  const pipeline = client.multi();
  pipeline.zRemRangeByScore(key, "-inf", windowStart);
  pipeline.zCard(key);
  pipeline.zAdd(key, { score: now, value: requestId });
  pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

  const results = await pipeline.exec();
  // results = [removeResult, countBeforeAdd, addResult, expireResult]
  const countBeforeAdd = Number(results[1] as unknown) || 0;

  const count = countBeforeAdd + 1;
  const allowed = countBeforeAdd < limit;
  const remaining = Math.max(0, limit - count);

  const oldest = await client.zRangeWithScores(key, 0, 0);
  const resetMs =
    oldest.length > 0 ? Number(oldest[0].score) + windowMs : now + windowMs;

  if (!allowed) {
    await client.zRem(key, requestId);
  }

  return {
    allowed,
    count: allowed ? count : countBeforeAdd,
    remaining,
    resetMs,
  };
}
