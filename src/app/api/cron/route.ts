export const runtime = 'edge';

import { NextResponse } from 'next/server';

/**
 * Cloudflare Cron Trigger endpoint.
 *
 * ── Free Tier Strategy ────────────────────────────────────────────────────
 * Cloudflare Workers Free = 10ms CPU time per request.
 * runAutomation() melakukan banyak query DB → pasti > 10ms.
 *
 * Solusi: gunakan ctx.waitUntil() untuk menjalankan heavy work di luar
 * batas CPU time request, lalu return 200 segera.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function GET(req: Request) {
  // Verify the cron secret to prevent unauthorized invocations
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use Cloudflare's waitUntil to run heavy DB work AFTER returning response.
  // This bypasses the 10ms CPU time limit for the request itself.
  const ctx = (req as any).cf?.ctx;
  if (ctx?.waitUntil) {
    ctx.waitUntil(runAutomationAsync());
  } else {
    // Fallback for local dev: fire-and-forget
    runAutomationAsync().catch(console.error);
  }

  // Return immediately — Cloudflare free tier stays happy ✓
  return NextResponse.json({
    ok: true,
    message: 'Cron triggered',
    timestamp: new Date().toISOString()
  });
}

async function runAutomationAsync() {
  try {
    const { runAutomation } = await import('@/lib/automation');
    const result = await runAutomation();
    console.log(`[cron] Done — applied: ${result.applied}, failed: ${result.failed}`);
  } catch (err: any) {
    console.error(`[cron] Error: ${err.message}`);
  }
}
