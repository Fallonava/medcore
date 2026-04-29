export const runtime = 'edge';
import { getAutomationQueue } from '@/lib/automation-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const queue = getAutomationQueue();
        const metrics = await queue.getMetrics();
        const cbMetrics = queue.getCircuitBreakerState();
        const failedJobs = await queue.getFailedJobs(5);

        return Response.json({
            success: true,
            queue: metrics,
            circuitBreaker: cbMetrics,
            failedJobs: failedJobs,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[queue metrics] error:', error);
        return Response.json({
            success: false,
            error: (error as any)?.message,
            queue: { active: 0, delayed: 0, failed: 0, completed: 0, waiting: 0 }
        });
    }
}
