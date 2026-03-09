import { inngest } from '@/lib/inngest';
import { agentExecutorService } from '../../services/agents/arch/agentExecutorService';

export const agentExecutorWorkflow = inngest.createFunction(
    {
        id: 'agent-executor-workflow',
        name: 'Agent Executor ReAct Loop',
        retries: 2,
        concurrency: {
            limit: 10,
        }
    },
    { event: 'agent/executor.requested' },
    async ({ event, step }) => {
        return await agentExecutorService.executeWorkflow(step, event.data);
    }
);
