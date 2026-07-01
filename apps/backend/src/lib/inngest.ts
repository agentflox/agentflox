import { Inngest, EventSchemas } from 'inngest';
import { AgentExecutorRequestedEvent, AgentOperatorRequestedEvent, AgentExecutorCancelEvent, AgentOperatorCancelEvent } from '../services/agents/execution/agentEvents';

type Events = {
  'agent/execute': AgentExecuteEvent;
  'agent/scheduled': AgentScheduledEvent;
  'agent/executor.requested': AgentExecutorRequestedEvent;
  'agent/operator.requested': AgentOperatorRequestedEvent;
  'agent/executor.cancel': AgentExecutorCancelEvent;
  'agent/operator.cancel': AgentOperatorCancelEvent;
  'agent/message.processed': AgentMessageProcessedEvent;
  'tool/composite.execute': ToolCompositeExecuteEvent;
};

// Initialize Inngest client
export const inngest = new Inngest({
  id: 'agentflox-agents',
  name: 'Agentflox AI Agents',
  eventKey: process.env.INNGEST_EVENT_KEY || (process.env.NODE_ENV === 'development' ? 'local' : undefined),
  schemas: new EventSchemas().fromRecord<Events>(),
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

export type AgentMessageProcessedEvent = {
  name: 'agent/message.processed';
  data: {
    messageId: string;
    agentId: string;
    response: {
      result?: string;
      status: 'COMPLETED' | 'FAILED';
      finalState?: string;
      stepId?: string;
      [key: string]: unknown;
    };
    status: 'COMPLETED' | 'FAILED';
    timestamp: Date | string;
  };
};

export type ToolCompositeExecuteEvent = {
  name: 'tool/composite.execute';
  data: {
    toolId: string;
    input: any;
    userId: string;
    messageId?: string;
    stepId?: string;
  };
};
