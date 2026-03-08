/**
 * Rate Limiter Tests
 *
 * Tests the in-memory fallback rate limiter (Redis not available in test).
 */

// Ensure no REDIS_URL so we use the in-memory fallback
delete process.env.REDIS_URL;

import { checkRateLimit } from '@/lib/rate-limit';

describe('Rate Limiter (In-Memory Fallback)', () => {

  it('should allow requests within the limit', async () => {
    const id = `test-allow-${Date.now()}`;
    const result = await checkRateLimit(id, 5, 60_000);
    expect(result).toBe(true);
  });

  it('should count requests incrementally', async () => {
    const id = `test-count-${Date.now()}`;
    const limit = 3;
    const windowMs = 60_000;

    // First 3 requests should be allowed
    expect(await checkRateLimit(id, limit, windowMs)).toBe(true);
    expect(await checkRateLimit(id, limit, windowMs)).toBe(true);
    expect(await checkRateLimit(id, limit, windowMs)).toBe(true);

    // 4th request should be blocked
    expect(await checkRateLimit(id, limit, windowMs)).toBe(false);
  });

  it('should track different identifiers independently', async () => {
    const idA = `test-a-${Date.now()}`;
    const idB = `test-b-${Date.now()}`;

    // Exhaust limit for A
    await checkRateLimit(idA, 1, 60_000);
    await checkRateLimit(idA, 1, 60_000); // should be blocked

    // B should still be allowed
    expect(await checkRateLimit(idB, 1, 60_000)).toBe(true);
  });

  it('should reset after window expires', async () => {
    const id = `test-expire-${Date.now()}`;
    const windowMs = 100; // 100ms window

    // Exhaust the limit
    await checkRateLimit(id, 1, windowMs);
    expect(await checkRateLimit(id, 1, windowMs)).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again
    expect(await checkRateLimit(id, 1, windowMs)).toBe(true);
  });

  it('should handle limit of 0 (always blocked)', async () => {
    const id = `test-zero-${Date.now()}`;
    // Even the first request exceeds a limit of 0
    const result = await checkRateLimit(id, 0, 60_000);
    expect(result).toBe(false);
  });

  it('should handle high concurrency', async () => {
    const id = `test-concurrent-${Date.now()}`;
    const limit = 10;
    const windowMs = 60_000;

    // Fire 15 concurrent requests
    const results = await Promise.all(
      Array.from({ length: 15 }, () => checkRateLimit(id, limit, windowMs))
    );

    const allowed = results.filter(Boolean).length;
    const blocked = results.filter((r) => !r).length;

    expect(allowed).toBe(limit);
    expect(blocked).toBe(5);
  });
});
