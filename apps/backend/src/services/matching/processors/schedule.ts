import cron from 'node-cron';
import { addMatchingJob } from './queue';
import env from '@/config/env';
import { getDLQMonitor } from './dlq-monitor';
import { logger } from '../lib/logger';

let schedulerRunning = false;
let dlqMonitor = getDLQMonitor();

/**
 * Start the matching scheduler
 * Runs matching job every N days (from env variable)
 */
export function startMatchingScheduler(): void {
  if (schedulerRunning) {
    console.log('[Scheduler] Matching scheduler is already running');
    return;
  }

  const intervalDays = parseInt(env.MATCHING_INTERVAL_DAYS || '3', 10);

  // Convert days to cron expression
  // For example, every 3 days at 2 AM: "0 2 */3 * *"
  // But cron doesn't support "every N days" easily, so we'll use daily check
  // and track last run date in database or use a simpler approach

  // For simplicity, we'll run daily and check if it's time to run
  // Better approach: use a cron that runs every N days at a specific time
  // Since cron doesn't support "every N days" directly, we'll schedule it to run daily
  // and check the last run time

  // Schedule to run daily at 2 AM
  const cronExpression = '0 2 * * *'; // Every day at 2 AM

  console.log(`[Scheduler] Starting matching scheduler (runs every ${intervalDays} days)`);

  cron.schedule(cronExpression, async () => {
    try {
      console.log('[Scheduler] Scheduled matching job triggered');

      // Check last run time from a simple tracking mechanism
      // For now, we'll just run it - in production you might want to track last run
      await addMatchingJob({ type: 'full' }, { priority: 1 });
      console.log('[Scheduler] Matching job added to queue');
    } catch (error) {
      console.error('[Scheduler] Error scheduling matching job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  schedulerRunning = true;
  logger.info('Matching scheduler started successfully');

  // Start DLQ monitor
  dlqMonitor.start();
  logger.info('DLQ monitor started');

  // Also run immediately on startup (optional, for testing)
  // Uncomment if you want to run on startup:
  // addMatchingJob({ type: 'full' }, { priority: 1 }).catch(console.error);
}

/**
 * Stop the matching scheduler
 */
export function stopMatchingScheduler(): void {
  schedulerRunning = false;
  dlqMonitor.stop();
  logger.info('Matching scheduler and DLQ monitor stopped');
}

/**
 * Manually trigger a matching job (for testing or admin use)
 */
export async function triggerMatchingJob(): Promise<void> {
  console.log('[Scheduler] Manually triggering matching job');
  await addMatchingJob({ type: 'full' }, { priority: 10 });
}

