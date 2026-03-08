/**
 * Automation Queue using BullMQ
 * Handles retry logic, rate limiting, and backoff for doctor updates
 */

import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import { CircuitBreaker } from './circuit-breaker';

export interface DoctorUpdateJob {
    id: string | number;
    status: 'BUKA' | 'PENUH' | 'OPERASI' | 'CUTI' | 'TIDAK_PRAKTEK' | 'SELESAI' | string;
    attemptNumber?: number;
}

export interface QueueMetrics {
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    waiting: number;
}

class AutomationQueueManager {
    private queue: Queue<DoctorUpdateJob> | null = null;
    private worker: Worker<DoctorUpdateJob> | null = null;
    private redis: ReturnType<typeof createClient> | null = null;
    private circuitBreaker: CircuitBreaker;
    private isInitialized = false;

    constructor() {
        this.circuitBreaker = new CircuitBreaker({
            failureThreshold: 5,
            successThreshold: 3,
            timeout: 30000, // 30 seconds
            name: 'AutomationQueue'
        });
    }

    /**
     * Initialize queue, worker, and scheduler
     * Should be called once on server startup
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // In Vercel or production environments, avoid attempting local Redis connections if no URL
            if (!process.env.REDIS_URL && (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production')) {
                console.log('[AutomationQueue] Skipped initialization (no REDIS_URL in production/vercel). Using direct API fallback.');
                this.isInitialized = true;
                return;
            }

            // Create Redis connection
            const redisUrl = process.env.REDIS_URL || `redis://localhost:6379`;
            this.redis = createClient({
                url: redisUrl
            });

            // Log a one-time warning so operators can diagnose Redis issues
            // without flooding logs on every reconnect attempt
            let errorLogged = false;
            this.redis.on('error', (err) => {
                if (!this.isInitialized && !errorLogged) {
                    console.warn('[AutomationQueue] Redis connection error:', err.message);
                    errorLogged = true;
                }
            });

            await this.redis.connect();

            // Create queue
            this.queue = new Queue('doctor-updates', {
                connection: this.redis as any
            });

            // Create worker with concurrency limit (rate limiting)
            this.worker = new Worker('doctor-updates', this.processJob.bind(this), {
                connection: this.redis as any,
                concurrency: 5  // Process max 5 jobs concurrently
            });

            // Event handlers
            this.worker.on('completed', (job) => {
                console.log(`[Queue] Job ${job.id} completed`);
            });

            this.worker.on('failed', (job, error) => {
                console.warn(`[Queue] Job ${job?.id} failed:`, error?.message);
            });

            this.worker.on('error', (error) => {
                console.error('[Queue] Worker error:', error);
            });

            this.isInitialized = true;
            console.log('[AutomationQueue] Initialized successfully');
        } catch (error) {
            console.error('[AutomationQueue] Initialization failed:', error);
            // Continue without queue (fallback to direct updates)
        }
    }

    /**
     * Add a doctor update job to the queue
     * Returns job ID if queued, throws if queue unavailable
     */
    async addJob(update: DoctorUpdateJob): Promise<string> {
        if (!this.queue) {
            throw new Error('Queue not initialized');
        }

        const job = await this.queue.add('update', update, {
            attempts: 5,  // Retry up to 5 times
            backoff: {
                type: 'exponential',
                delay: 2000  // Start with 2s, exponentially increase
            },
            removeOnComplete: true,
            removeOnFail: false
        });

        return job.id || '';
    }

    /**
     * Batch add multiple jobs
     */
    async addBatch(updates: DoctorUpdateJob[]): Promise<string[]> {
        if (!this.queue) {
            throw new Error('Queue not initialized');
        }

        const jobs = await this.queue.addBulk(
            updates.map(u => ({
                name: 'update',
                data: u,
                opts: {
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: true,
                    removeOnFail: false
                }
            }))
        );

        return jobs.map(j => j.id || '');
    }

    /**
     * Process a doctor update job with circuit breaker protection
     */
    private async processJob(job: any): Promise<void> {
        const update = job.data as DoctorUpdateJob;

        try {
            await this.circuitBreaker.execute(async () => {
                const { prisma } = await import('./prisma');

                // Apply update to database
                const result = await prisma.doctor.update({
                    where: { id: String(update.id) },
                    data: { status: update.status as any }
                });

                console.log(`[Queue] Updated doctor ${update.id} to ${update.status}`);
                return result;
            });
        } catch (error) {
            console.error(`[Queue] Failed to process job ${job.id}:`, error);
            throw error; // Re-throw to trigger BullMQ retry
        }
    }

    /**
     * Get queue metrics
     */
    async getMetrics(): Promise<QueueMetrics> {
        if (!this.queue) {
            return { active: 0, delayed: 0, failed: 0, completed: 0, waiting: 0 };
        }

        const counts = await this.queue.getJobCounts();
        return {
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0
        };
    }

    /**
     * Get failed jobs for inspection
     */
    async getFailedJobs(limit = 20): Promise<any[]> {
        if (!this.queue) return [];

        const jobs = await this.queue.getFailed(0, limit);
        return jobs.map(j => ({
            id: j.id,
            data: j.data,
            error: j.failedReason,
            attempts: j.attemptsMade,
            timestamp: j.finishedOn
        }));
    }

    /**
     * Retry a failed job
     */
    async retryJob(jobId: string): Promise<boolean> {
        if (!this.queue) return false;

        try {
            const job = await this.queue.getJob(jobId);
            if (!job) return false;

            await job.retry();
            return true;
        } catch (error) {
            console.error('Failed to retry job:', error);
            return false;
        }
    }

    /**
     * Cleanup queue resources
     */
    async close() {
        if (this.worker) await this.worker.close();
        if (this.queue) await this.queue.close();
        if (this.redis) await this.redis.quit();
        this.isInitialized = false;
    }

    getCircuitBreakerState() {
        return this.circuitBreaker.getMetrics();
    }

    isReady() {
        return this.isInitialized && this.queue !== null;
    }
}

// Singleton instance
let queueManager: AutomationQueueManager | null = null;

export function getAutomationQueue(): AutomationQueueManager {
    if (!queueManager) {
        queueManager = new AutomationQueueManager();
    }
    return queueManager;
}

export async function initializeAutomationQueue() {
    const queue = getAutomationQueue();
    await queue.initialize();
}
