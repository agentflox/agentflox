import { serve } from 'inngest/express';
import { inngest } from '@/lib/inngest';
import { executeAgent } from './functions/agent-execution';
import { executeWorkflow, executeWorkflowStep } from './functions/workflow-execution';
import { agentExecutorWorkflow } from './functions/agent-executor';
import { agentOperatorWorkflow } from './functions/agent-operator';
import { agentZombieReaper } from './functions/agent-maintenance';
import { agentBackgroundDlq } from './functions/agent-background-dlq';

// Create Inngest serve handler
export const inngestHandler = serve({
  client: inngest,
  functions: [
    executeAgent,
    executeWorkflow,
    executeWorkflowStep,
    agentExecutorWorkflow,
    agentOperatorWorkflow,
    agentZombieReaper,
    agentBackgroundDlq,
  ],
});

