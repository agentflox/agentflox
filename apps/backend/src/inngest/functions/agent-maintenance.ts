import { inngest } from '@/lib/inngest';
import { agentTaskOrchestrator } from '@/services/agents/orchestration/agentTaskOrchestrator';

/**
 * Agent Maintenance: Zombie Reaper
 * 
 * Runs every 15 minutes to reclaim tasks stuck in 'QUEUED' state.
 * This handles cases where a worker claimed a task but crashed before completion.
 */
export const agentZombieReaper = inngest.createFunction(
    { id: 'agent-zombie-reaper', name: 'Agent Zombie Reaper' },
    { cron: '*/15 * * * *' }, // Every 15 minutes
    async ({ step }) => {
        const reapedCount = await step.run('reap-zombies', async () => {
            return agentTaskOrchestrator.reapZombieTasks();
        });

        return { reapedCount };
    }
);
