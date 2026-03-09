// Event-Sourced State Store types
export type EventType =
    | 'INIT_RUN'
    | 'CONTEXT_LOADED'
    | 'PLAN_GENERATED'
    | 'PLAN_VALIDATED'
    | 'STEP_EXECUTED'
    | 'STEP_CRITIQUED'
    | 'FORK_STARTED'
    | 'BRANCH_MERGED'
    | 'RUN_COMPLETED'
    | 'RUN_FAILED'
    | 'CANCELLED_BUDGET'
    | 'CANCELLED_POLICY'
    | 'HUMAN_REVIEW_REQUESTED'
    | 'HUMAN_REVIEW_COMPLETED';

export interface AgentEvent {
    event_id: string;
    schema_version: string;
    event_type: EventType;
    run_id: string;
    tenant_id: string;
    step_id?: string;
    tool?: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    cost_usd?: number;
    tokens?: number;
    timestamp: string;
    payload?: any;
}

// Inngest Event Types
export type AgentExecutorRequestedEvent = {
    name: 'agent/executor.requested';
    data: {
        runId: string;
        conversationId: string;
        agentId: string;
        userId: string; // Acts as tenant_id in user-scoped scenarios
        message: string;
        idempotencyKey?: string;
    };
};

export type AgentOperatorRequestedEvent = {
    name: 'agent/operator.requested';
    data: {
        runId: string;
        conversationId: string;
        agentId: string;
        userId: string;
        message: string;
        idempotencyKey?: string;
    };
};
