/**
 * rate-limit.ts
 *
 * Hybrid rate limiter:
 *  - Primary: Redis-based (persistent, survives restarts, works in multi-instance)
 *  - Fallback: In-memory Map (if Redis is unavailable)
 *
 * Usage:
 *   const allowed = await checkRateLimit('login_1.2.3.4', 5, 15 * 60 * 1000);
 */

import { createClient } from 'redis';

// ─── Singleton Redis client (shared with rbac-cache if possible) ───
let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnectPromise: Promise<void> | null = null;

async function getRedis(): Promise<ReturnType<typeof createClient> | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (redisClient && redisClient.isOpen) return redisClient;

  if (!redisConnectPromise) {
    const c = createClient({ url: redisUrl });
    c.on('error', () => { /* suppress background reconnect noise */ });
    redisConnectPromise = c.connect().then(() => {
      redisClient = c;
    }).catch(() => {
      redisConnectPromise = null; // Allow retry on next call
    });
  }

  await redisConnectPromise;
  return redisClient;
}

// ─── In-memory fallback store ───
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryCleanup() {
  const now = Date.now();
  if (memoryStore.size > 500) {
    for (const [key, val] of memoryStore) {
      if (val.resetAt < now) memoryStore.delete(key);
    }
  }
}

// ─── Redis-based rate limit check ───
async function checkRateLimitRedis(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false; // Signal: redis unavailable, use fallback

  const key = `rl:${identifier}`;
  const now = Date.now();
  const windowSec = Math.ceil(windowMs / 1000);

  // Remove expired entries, add current timestamp, count entries in window
  const multi = redis.multi();
  multi.zRemRangeByScore(key, '-inf', String(now - windowMs));
  multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  multi.zCard(key);
  multi.expire(key, windowSec);

  const results = await multi.exec();
  // zCard result is at index 2
  const count = (results[2] as number) ?? 0;

  return count <= limit;
}

// ─── In-memory fallback ───
function checkRateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  let record = memoryStore.get(identifier);

  if (!record || record.resetAt < now) {
    record = { count: 1, resetAt: now + windowMs };
  } else {
    record.count += 1;
  }

  memoryStore.set(identifier, record);
  memoryCleanup();

  return record.count <= limit;
}

// ─── Public API ───
/**
 * Check if an identifier is within the rate limit.
 * Uses Redis if available, falls back to in-memory.
 *
 * @param identifier  Unique key (e.g. "login_192.168.1.1")
 * @param limit       Max requests allowed in the window
 * @param windowMs    Window duration in milliseconds
 * @returns true if request is allowed, false if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    if (process.env.REDIS_URL) {
      return await checkRateLimitRedis(identifier, limit, windowMs);
    }
  } catch {
    // Redis error → fall through to in-memory fallback
  }

  return checkRateLimitMemory(identifier, limit, windowMs);
}
