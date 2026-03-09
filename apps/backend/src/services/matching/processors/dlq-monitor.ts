import { matchingQueue } from './queue';
import { logger } from '../lib/logger';
import { queueDepth, matchingErrors } from '../lib/metrics';
import { isTransientError } from '../lib/retry';

export class DLQMonitor {
    private readonly DLQ_THRESHOLD = 100;
    private readonly CHECK_INTERVAL_MS = 300000; // 5 minutes
    private readonly AUTO_RETRY_AFTER_MS = 3600000; // 1 hour
    private intervalId?: NodeJS.Timeout;
    private isRunning = false;

    /**
     * Start monitoring the Dead Letter Queue
     */
    start(): void {
        if (this.isRunning) {
            logger.warn('DLQ monitor is already running');
            return;
        }

        this.isRunning = true;
        logger.info({
            threshold: this.DLQ_THRESHOLD,
            checkInterval: this.CHECK_INTERVAL_MS,
            autoRetryAfter: this.AUTO_RETRY_AFTER_MS,
        }, 'Starting DLQ monitor');

        // Run immediately on start
        this.checkDLQ().catch(err => {
            logger.error({ error: err.message }, 'Initial DLQ check failed');
        });

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.checkDLQ().catch(err => {
                logger.error({ error: err.message }, 'DLQ check failed');
            });
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isRunning = false;
        logger.info('DLQ monitor stopped');
    }

    /**
     * Check DLQ depth and take action
     */
    private async checkDLQ(): Promise<void> {
        try {
            const failedJobs = await matchingQueue.getFailed(0, -1);
            const dlqDepth = failedJobs.length;

            // Update metrics
            queueDepth.set({ queue_name: 'matching_dlq' }, dlqDepth);

            logger.debug({ dlqDepth }, 'DLQ check completed');

            // Alert if threshold exceeded
            if (dlqDepth > this.DLQ_THRESHOLD) {
                logger.error({
                    dlqDepth,
                    threshold: this.DLQ_THRESHOLD,
                    oldestJobAge: this.getOldestJobAge(failedJobs),
                }, 'DLQ threshold exceeded');

                // Increment error metric
                matchingErrors.inc({
                    entity_type: 'queue',
                    error_type: 'dlq_threshold',
                    operation: 'monitor',
                });

                // TODO: Send alert via Slack/PagerDuty/Email
                await this.sendAlert(`Matching DLQ has ${dlqDepth} failed jobs (threshold: ${this.DLQ_THRESHOLD})`);
            }

            // Auto-retry transient failures after cooldown
            await this.retryTransientFailures(failedJobs);

        } catch (error: any) {
            logger.error({ error: error.message }, 'Error checking DLQ');
            matchingErrors.inc({
                entity_type: 'queue',
                error_type: 'monitor_error',
                operation: 'checkDLQ',
            });
        }
    }

    /**
     * Retry jobs that failed due to transient errors after cooldown period
     */
    private async retryTransientFailures(failedJobs: any[]): Promise<void> {
        const now = Date.now();
        const cooldownMs = this.AUTO_RETRY_AFTER_MS;
        let retriedCount = 0;

        for (const job of failedJobs) {
            try {
                const jobAge = now - job.timestamp;
                const failedReason = job.failedReason || '';

                // Only retry if:
                // 1. Job is old enough (past cooldown)
                // 2. Error is transient
                // 3. Haven't exceeded max retries
                if (
                    jobAge > cooldownMs &&
                    this.isTransientFailure(failedReason) &&
                    job.attemptsMade < 5 // Max 5 total attempts
                ) {
                    logger.info({
                        jobId: job.id,
                        jobAge: Math.round(jobAge / 1000),
                        attemptsMade: job.attemptsMade,
                        failedReason: failedReason.substring(0, 100),
                    }, 'Auto-retrying transient failure from DLQ');

                    await job.retry();
                    retriedCount++;
                }
            } catch (error: any) {
                logger.warn({
                    jobId: job.id,
                    error: error.message,
                }, 'Failed to retry job from DLQ');
            }
        }

        if (retriedCount > 0) {
            logger.info({ retriedCount }, 'Auto-retried jobs from DLQ');
        }
    }

    /**
     * Check if failure reason indicates a transient error
     */
    private isTransientFailure(reason: string): boolean {
        if (!reason) return false;

        const transientPatterns = [
            'timeout',
            'ECONNRESET',
            'ETIMEDOUT',
            'rate_limit',
            'temporarily_unavailable',
            'service_unavailable',
            '503',
            '504',
            'ENOTFOUND',
        ];

        const reasonLower = reason.toLowerCase();
        return transientPatterns.some(pattern => reasonLower.includes(pattern.toLowerCase()));
    }

    /**
     * Get age of oldest job in milliseconds
     */
    private getOldestJobAge(jobs: any[]): number {
        if (jobs.length === 0) return 0;

        const oldestTimestamp = Math.min(...jobs.map(j => j.timestamp || Date.now()));
        return Date.now() - oldestTimestamp;
    }

    /**
     * Send alert to operations team
     * TODO: Integrate with actual alerting system (Slack, PagerDuty, etc.)
     */
    private async sendAlert(message: string): Promise<void> {
        // For now, just log at ERROR level
        // In production, integrate with:
        // - Slack webhook
        // - PagerDuty
        // - Email service
        // - SMS gateway

        logger.error({
            alert: true,
            alertType: 'dlq_threshold',
            message,
        }, 'DLQ ALERT');

        // Example Slack integration (uncomment when configured):
        /*
        try {
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 Matching Service Alert`,
              blocks: [{
                type: 'section',
                text: { type: 'mrkdwn', text: message }
              }]
            })
          });
        } catch (error) {
          logger.error({ error }, 'Failed to send Slack alert');
        }
        */
    }

    /**
     * Get DLQ statistics
     */
    async getStats(): Promise<{
        depth: number;
        oldestJobAge: number;
        averageAttempts: number;
        transientFailureCount: number;
    }> {
        try {
            const failedJobs = await matchingQueue.getFailed(0, -1);

            const transientFailureCount = failedJobs.filter(job =>
                this.isTransientFailure(job.failedReason || '')
            ).length;

            const averageAttempts = failedJobs.length > 0
                ? failedJobs.reduce((sum, job) => sum + (job.attemptsMade || 0), 0) / failedJobs.length
                : 0;

            return {
                depth: failedJobs.length,
                oldestJobAge: this.getOldestJobAge(failedJobs),
                averageAttempts: Math.round(averageAttempts * 10) / 10,
                transientFailureCount,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to get DLQ stats');
            return {
                depth: 0,
                oldestJobAge: 0,
                averageAttempts: 0,
                transientFailureCount: 0,
            };
        }
    }

    /**
     * Manually clear all failed jobs (use with caution!)
     */
    async clearDLQ(): Promise<number> {
        try {
            const failedJobs = await matchingQueue.getFailed(0, -1);
            const count = failedJobs.length;

            for (const job of failedJobs) {
                await job.remove();
            }

            logger.warn({ clearedCount: count }, 'DLQ cleared manually');
            return count;
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to clear DLQ');
            throw error;
        }
    }
}

// Singleton instance
let dlqMonitorInstance: DLQMonitor | null = null;

export function getDLQMonitor(): DLQMonitor {
    if (!dlqMonitorInstance) {
        dlqMonitorInstance = new DLQMonitor();
    }
    return dlqMonitorInstance;
}
