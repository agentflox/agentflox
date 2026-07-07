import { inngest } from '@/lib/inngest';
import { agentOperatorService } from '../../services/agents/arch/agentOperatorService';

export const agentOperatorWorkflow = inngest.createFunction(
    {
        id: 'agent-operator-workflow',
        name: 'Agent Operator ReAct Loop',
        retries: 2,
        concurrency: [
            // Fairness: each user can run at most 2 agents simultaneously
            { limit: 2, key: 'event.data.userId' },
            // Reality ceiling: matches IN-XS plan cap (5 account-wide)
            { limit: 5, scope: 'account', key: '"global-agent-ceiling"' },
        ],
        triggers: [{ event: 'agent/operator.requested'  }],
        cancelOn: [
            {
                event: 'agent/operator.cancel',
                match: 'data.sessionId',
            }
        ],
  },
  async ({ event, step }) => {
        const data = event.data as {
            runId: string;
            conversationId: string;
            agentId: string;
            message: string;
            userId: string;
            idempotencyKey?: string;
            sessionId?: string;
        };
        return await agentOperatorService.executeWorkflow(step, data);
    }
);
