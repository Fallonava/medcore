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

export async function getCachedPermissions(
  userId: string
): Promise<SessionPayload['permissions'] | null> {
  return null;
}

export async function setCachedPermissions(
  userId: string,
  permissions: SessionPayload['permissions']
): Promise<void> {
  // No-op for Edge
}

export async function invalidateRbacCache(userId: string): Promise<void> {
  // No-op for Edge
}

export async function isRbacCacheAvailable(): Promise<boolean> {
  return false;
}
