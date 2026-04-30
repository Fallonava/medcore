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
  return checkRateLimitMemory(identifier, limit, windowMs);
}
