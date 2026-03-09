import { inngest } from '@/lib/inngest';

/**
 * Dead-letter queue handler for agent background tasks.
 *
 * Any failure inside runInBackground() in Builder/Executor/Operator is forwarded
 * here as an Inngest event. Inngest's retry policy provides automatic backoff
 * so transient issues (DB hiccups, network blips) are retried without losing
 * the original intent.
 */
export const agentBackgroundDlq = inngest.createFunction(
  {
    id: 'agent-background-dlq',
    name: 'Agent Background Task DLQ',
    retries: 5,
  },
  { event: 'agent/background.failed' },
  async ({ event, step }) => {
    const { label, error, service, occurredAt } = event.data as {
      label: string;
      error: string;
      service: string;
      occurredAt?: string;
    };

    // For now we simply log; in the future this can route into a dedicated
    // audit log, metrics system, or re-drive logic per label.
    await step.run('log-background-failure', async () => {
      console.error('[AgentBackgroundDLQ] Background task failed', {
        service,
        label,
        error,
        occurredAt,
      });
    });

    return { success: true };
  }
);

