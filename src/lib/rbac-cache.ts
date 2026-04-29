/**
 * RBAC Permission Cache
 *
 * On Cloudflare Edge: Redis is not available, all functions are no-ops
 * (graceful fallback to DB lookup on every request).
 * On self-hosted/EC2: Uses Redis via REDIS_URL if set.
 */
import type { SessionPayload } from './auth-shared';

const CACHE_TTL_SECONDS = 5 * 60;
const KEY_PREFIX = 'rbac:permissions:';

async function getRedisClient(): Promise<any | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    // Dynamic import so Edge runtime doesn't try to bundle the redis package
    const { createClient } = await import('redis');
    const c = createClient({ url: redisUrl });
    c.on('error', () => {});
    await c.connect();
    return c;
  } catch {
    return null;
  }
}

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
    return null;
  }
}

export async function setCachedPermissions(
  userId: string,
  permissions: SessionPayload['permissions']
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.setEx(`${KEY_PREFIX}${userId}`, CACHE_TTL_SECONDS, JSON.stringify(permissions));
  } catch {}
}

export async function invalidateRbacCache(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.del(`${KEY_PREFIX}${userId}`);
  } catch {}
}

export async function isRbacCacheAvailable(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    return redis !== null;
  } catch {
    return false;
  }
}
