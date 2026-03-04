/**
 * Type-safe environment variable validation using Zod.
 * Imported ONCE in `src/lib/prisma.ts` and key server entry points.
 * Throws a clear error at startup if any required variable is missing.
 */
import { z } from 'zod';

const serverSchema = z.object({
  // ── Database ──
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // ── Auth ──
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),

  ADMIN_KEY: z
    .string()
    .min(8, 'ADMIN_KEY must be at least 8 characters long'),

  // ── Redis (optional — empty string or missing = disabled) ──
  REDIS_URL: z
    .preprocess(
      (v) => (v === '' || v === undefined ? undefined : v),
      z.string().url('REDIS_URL must be a valid Redis URL (e.g. rediss://)').optional()
    ),

  // ── Misc ──
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().url().optional()
  ),
  SENTRY_DSN: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().url().optional()
  ),
});


// Public env (accessible in browser) — must be prefixed NEXT_PUBLIC_
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ADMIN_KEY: z.string().optional(),
});

function validateEnv() {
  // In the browser (client bundle) only validate client-side vars
  if (typeof window !== 'undefined') {
    const parsed = clientSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_ADMIN_KEY: process.env.NEXT_PUBLIC_ADMIN_KEY,
    });
    if (!parsed.success) {
      console.error('❌ Invalid client environment variables:', parsed.error.flatten().fieldErrors);
    }
    return {} as z.infer<typeof serverSchema>;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  • ${key}: ${(msgs ?? []).join(', ')}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid/missing environment variables:\n${formatted}\n\nFix your .env file and restart the server.`
    );
  }

  return parsed.data;
}

export const env = validateEnv();
