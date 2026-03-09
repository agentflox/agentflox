import { inngest } from '@/lib/inngest';
import { agentOperatorService } from '../../services/agents/arch/agentOperatorService';

export const agentOperatorWorkflow = inngest.createFunction(
    {
        id: 'agent-operator-workflow',
        name: 'Agent Operator ReAct Loop',
        retries: 2,
        concurrency: {
            limit: 10,
        }
    },
    { event: 'agent/operator.requested' },
    async ({ event, step }) => {
        return await agentOperatorService.executeWorkflow(step, event.data);
    }
);
