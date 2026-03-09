import { inngest } from '@/lib/inngest';
import { redis } from '@/lib/redis';
import { agentBuilderService } from '../../services/agents/arch/agentBuilderService';

/**
 * Agent Builder Workflow (Inngest)
 *
 * Durable, async wrapper around AgentBuilderService.processMessage. Matches
 * the Executor/Operator pattern: HTTP enqueues an event and receives runId,
 * while this function performs the heavy LLM work and records status to Redis.
 */
export const agentBuilderWorkflow = inngest.createFunction(
  {
    id: 'agent-builder-workflow',
    name: 'Agent Builder Workflow',
    retries: 2,
    concurrency: {
      limit: 10,
    },
  },
  { event: 'agent/builder.requested' },
  async ({ event }) => {
    const { runId, conversationId, message, userId, idempotencyKey } = event.data as {
      runId: string;
      conversationId: string;
      message: string;
      userId: string;
      idempotencyKey?: string;
    };

    const runKey = `agent_run:${runId}`;

    try {
      const result = await agentBuilderService.processMessage(
        conversationId,
        message,
        userId,
        undefined,
        undefined,
        idempotencyKey
      );

      await redis.setex(
        runKey,
        3600,
        JSON.stringify({ status: 'completed', payload: result })
      );

      return result;
    } catch (e: any) {
      await redis.setex(
        runKey,
        3600,
        JSON.stringify({ status: 'error', message: e?.message || 'Error occurred' })
      );
      throw e;
    }
  }
);

