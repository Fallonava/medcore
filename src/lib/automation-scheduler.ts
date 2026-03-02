import cron from 'node-cron';
import { runAutomation } from './automation';
import { initializeAutomationQueue } from './automation-queue';

/**
 * Singleton to prevent multiple cron jobs during Fast Refresh/HMR
 */
const GLOBAL_CRON_KEY = Symbol.for('automation.scheduler.initialized');

export async function initAutomationScheduler() {
    // Skip ONLY if running in Vercel (Vercel uses its own external Cron Service)
    // On EC2/self-hosted production, node-cron harus jalan
    if (process.env.VERCEL) {
        return;
    }

    // @ts-ignore
    if (globalThis[GLOBAL_CRON_KEY]) {
        return;
    }
    // @ts-ignore
    globalThis[GLOBAL_CRON_KEY] = true;

    console.log('[automation scheduler] Initializing for the first time...');

    try {
        // Initialize queue system (with Redis)
        await initializeAutomationQueue();
    } catch (err) {
        console.warn('[automation scheduler] queue init failed, will use direct updates:', err);
        // Continue without queue - fallback to direct Prisma updates
    }

    // run every 30 seconds
    const schedule = '*/30 * * * * *';
    cron.schedule(schedule, async () => {
        try {
            const { applied, failed } = await runAutomation();
            if (applied || failed) {
                console.log(`[automation scheduler] cron run: applied=${applied} failed=${failed}`);
            }
        } catch (err) {
            console.error('[automation scheduler] cron execution error:', err);
        }
    });

    console.log(`[automation scheduler] Registered cron job: ${schedule}`);
}
