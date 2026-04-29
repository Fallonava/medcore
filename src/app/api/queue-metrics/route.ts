export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// BullMQ/Redis queue is not available in Cloudflare Edge runtime.
// Return empty metrics — Cloudflare Cron Trigger handles automation scheduling.
export async function GET() {
    return Response.json({
        success: true,
        queue: { active: 0, delayed: 0, failed: 0, completed: 0, waiting: 0 },
        circuitBreaker: { state: 'disabled', reason: 'Edge runtime — no Redis available' },
        failedJobs: [],
        timestamp: new Date().toISOString(),
        note: 'Queue metrics disabled on Cloudflare Edge. Use /api/automation-logs instead.'
    });
}
