/**
 * RBAC Permission Cache using Redis
 *
 * Caches per-user permissions so that middleware and API routes
 * skip the DB lookup every request. Cache is invalidated when:
 *  - Admin changes a user's role  (call invalidateRbacCache(userId))
 *  - User logs out from all devices (call invalidateRbacCache(userId))
 *
 * Gracefully does nothing if REDIS_URL is not set.
 */
import { createClient } from 'redis';
import type { SessionPayload } from './auth-shared';

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const KEY_PREFIX = 'rbac:permissions:';

type RedisClient = ReturnType<typeof createClient>;

// ─── Singleton Redis client (shared with automation-queue if needed) ───
let client: RedisClient | null = null;
let connectPromise: Promise<void> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null; // Redis not configured — cache disabled

  if (client && client.isOpen) return client;

  if (!connectPromise) {
    const c = createClient({ url: redisUrl });
    c.on('error', () => { /* suppress background reconnect noise */ });
    connectPromise = c.connect().then(() => {
      client = c;
    }).catch(() => {
      connectPromise = null; // Allow retry on next call
    });
  }

  await connectPromise;
  return client;
}

// ─── Public API ───

/**
 * Get cached RBAC permissions for a userId.
 * Returns null if cache miss or Redis unavailable.
 */
export async function getCachedPermissions(
  userId: string
): Promise<SessionPayload['permissions'] | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;

    const raw = await redis.get(`${KEY_PREFIX}${userId}`);
    if (!raw) return null;

    return JSON.parse(raw) as SessionPayload['permissions'];
  } catch {
    return null; // Cache failure → fall through to DB
  }
}

/**
 * Store RBAC permissions for a userId in Redis.
 * Silently no-ops if Redis is unavailable.
 */
export async function setCachedPermissions(
  userId: string,
  permissions: SessionPayload['permissions']
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    await redis.setEx(
      `${KEY_PREFIX}${userId}`,
      CACHE_TTL_SECONDS,
      JSON.stringify(permissions)
    );
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Invalidate cached permissions for a userId.
 * Call this when a user's role/permissions change, or on logout-all.
 */
export async function invalidateRbacCache(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    await redis.del(`${KEY_PREFIX}${userId}`);
  } catch {
    // Non-fatal
  }
}

/**
 * Check if the RBAC cache is available (Redis connected).
 */
export async function isRbacCacheAvailable(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    return redis !== null && redis.isOpen;
  } catch {
    return false;
  }
}
