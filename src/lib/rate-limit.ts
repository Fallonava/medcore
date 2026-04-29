/**
 * rate-limit.ts
 *
 * Hybrid rate limiter:
 *  - Primary: Redis-based (if REDIS_URL set and not on Edge)
 *  - Fallback: In-memory Map (Edge runtime or Redis unavailable)
 */

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

async function getRedis(): Promise<any | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    // Dynamic import — prevents Edge bundler from pulling in redis package
    const { createClient } = await import('redis');
    const c = createClient({ url: redisUrl });
    c.on('error', () => {});
    await c.connect();
    return c;
  } catch {
    return null;
  }
}

async function checkRateLimitRedis(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  const key = `rl:${identifier}`;
  const now = Date.now();
  const windowSec = Math.ceil(windowMs / 1000);

  const multi = redis.multi();
  multi.zRemRangeByScore(key, '-inf', String(now - windowMs));
  multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  multi.zCard(key);
  multi.expire(key, windowSec);

  const results = await multi.exec();
  const count = (results[2] as number) ?? 0;
  return count <= limit;
}

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

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    if (process.env.REDIS_URL) {
      const result = await checkRateLimitRedis(identifier, limit, windowMs);
      if (result !== false) return result;
    }
  } catch {
    // Redis error → fall through to in-memory
  }
  return checkRateLimitMemory(identifier, limit, windowMs);
}
