import { Inngest } from 'inngest';
import { AgentExecutorRequestedEvent, AgentOperatorRequestedEvent } from './services/agents/execution/agentEvents';

type Events = {
  'agent/execute': AgentExecuteEvent;
  'agent/scheduled': AgentScheduledEvent;
  'agent/executor.requested': AgentExecutorRequestedEvent;
  'agent/operator.requested': AgentOperatorRequestedEvent;
};

// Initialize Inngest client
export const inngest = new Inngest<Events>({
  id: 'agentflox-agents',
  name: 'Agentflox AI Agents',
  eventKey: process.env.INNGEST_EVENT_KEY || (process.env.NODE_ENV === 'development' ? 'local' : undefined),
});

// Event types for agent execution
export type AgentExecuteEvent = {
  name: 'agent/execute';
  data: {
    executionId: string;
    agentId: string;
    userId: string;
    inputData?: any;
    executionContext?: any;
  };
};

export type AgentScheduledEvent = {
  name: 'agent/scheduled';
  data: {
    agentId: string;
    schedule: string;
  };
};

