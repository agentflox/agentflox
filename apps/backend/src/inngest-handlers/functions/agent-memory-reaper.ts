import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { sharedLongTermMemoryWhereAll } from '@/services/agents/core/memoryPolicy';

/**
 * Daily reaper: purge expired AgentMemory rows and shared CUSTOM embeddings
 * matched by the memory-exclusive filter + stored metadata.expiresAt.
 * Does NOT delete Document pages (stale-until-clear).
 */
export const agentMemoryReaper = inngest.createFunction(
  {
    id: 'agent-memory-reaper',
    name: 'Agent Memory Reaper',
    triggers: [{ cron: '0 4 * * *' }],
  },
  async ({ step }) => {
    const flag = process.env.AGENT_MEMORY_REAPER_V1;
    const enabled =
      flag === undefined ||
      flag === '' ||
      flag === '1' ||
      flag.toLowerCase() === 'true' ||
      flag === 'yes';
    if (!enabled) {
      return { skipped: true, reason: 'AGENT_MEMORY_REAPER_V1 disabled' };
    }

    const now = new Date();

    const agentMemories = await step.run('reap-agent-memories', async () => {
      const result = await prisma.agentMemory.deleteMany({
        where: {
          expiresAt: { not: null, lt: now },
        },
      });
      return result.count;
    });

    const embeddings = await step.run('reap-shared-embeddings', async () => {
      // Prisma JSON filter for expiresAt < now is awkward; use raw for ISO compare
      const result = await prisma.$executeRaw`
        DELETE FROM vector_embeddings
        WHERE source_type = 'CUSTOM'
          AND (
            metadata->>'kind' = 'agent_long_term_memory'
            OR metadata->>'type' IN ('fact', 'experience', 'pattern')
          )
          AND metadata ? 'expiresAt'
          AND (metadata->>'expiresAt')::timestamptz < ${now}
      `;
      return Number(result) || 0;
    });

    // Keep TypeScript aware the WhereAll helper is the canonical filter shape
    void sharedLongTermMemoryWhereAll;

    return { agentMemories, embeddings };
  }
);
