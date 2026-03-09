import { Counter, Histogram, Gauge, register } from 'prom-client';

export const metrics = {
    socketConnections: new Gauge({
        name: 'socket_connections_total',
        help: 'Total number of active socket connections'
    }),

    messagesProcessed: new Counter({
        name: 'messages_processed_total',
        help: 'Total messages processed',
        labelNames: ['type', 'status']
    }),

    messageLatency: new Histogram({
        name: 'message_processing_duration_seconds',
        help: 'Message processing latency',
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    }),

    deliveryRate: new Counter({
        name: 'message_delivery_total',
        help: 'Message delivery tracking',
        labelNames: ['status']
    }),

    redisOperations: new Histogram({
        name: 'redis_operation_duration_seconds',
        help: 'Redis operation latency',
        labelNames: ['operation'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
    }),

    // Agent Execution Metrics
    agentExecutions: new Counter({
        name: 'agent_executions_total',
        help: 'Total number of agent executions',
        labelNames: ['agent_id', 'status', 'trigger']
    }),

    agentExecutionDuration: new Histogram({
        name: 'agent_execution_duration_seconds',
        help: 'Agent execution duration',
        labelNames: ['agent_id', 'agent_type', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    }),

    agentExecutionSteps: new Histogram({
        name: 'agent_execution_steps_count',
        help: 'Number of steps per execution',
        labelNames: ['agent_id'],
        buckets: [1, 2, 5, 10, 20, 50]
    }),

    // Tool Invocation Metrics
    toolInvocations: new Counter({
        name: 'tool_invocations_total',
        help: 'Total number of tool invocations',
        labelNames: ['tool_name', 'status', 'agent_id']
    }),

    toolInvocationDuration: new Histogram({
        name: 'tool_invocation_duration_seconds',
        help: 'Tool invocation duration',
        labelNames: ['tool_name', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    }),

    toolApprovalRequests: new Counter({
        name: 'tool_approval_requests_total',
        help: 'Total number of tool approval requests',
        labelNames: ['tool_name', 'agent_id', 'reason']
    }),

    toolRateLimitHits: new Counter({
        name: 'tool_rate_limit_hits_total',
        help: 'Number of times rate limit was hit',
        labelNames: ['tool_name', 'limiter_type']
    }),

    // Gate Health Metrics
    gateHealthChecks: new Counter({
        name: 'gate_health_checks_total',
        help: 'Tool invocation gate health checks',
        labelNames: ['component', 'status']
    }),

    gateDegradedMode: new Gauge({
        name: 'gate_degraded_mode_active',
        help: 'Whether gate is in degraded mode (1=yes, 0=no)',
        labelNames: ['reason']
    }),

    // Circuit Breaker Metrics
    circuitBreakerState: new Gauge({
        name: 'circuit_breaker_state',
        help: 'Circuit breaker state (0=closed, 0.5=half-open, 1=open)',
        labelNames: ['service']
    }),

    // Message Creation Metrics
    messagesCreated: new Counter({
        name: 'messages_created_total',
        help: 'Total messages created',
        labelNames: ['status']
    }),

    // Rate Limiting Metrics  
    rateLimitHits: new Counter({
        name: 'rate_limit_hits_total',
        help: 'Number of times rate limit was hit',
        labelNames: ['operation']
    }),

    // Approval Flow Metrics
    approvalActions: new Counter({
        name: 'approval_actions_total',
        help: 'Approval actions taken',
        labelNames: ['action', 'agent_id']
    }),

    approvalWaitTime: new Histogram({
        name: 'approval_wait_time_seconds',
        help: 'Time spent waiting for approval',
        labelNames: ['agent_id'],
        buckets: [10, 30, 60, 300, 600, 1800, 3600]
    }),

    // New Agent Metrics
    agentExecutionTotal: new Counter({
        name: 'agent_execution_total_v2',
        help: 'Total agent executions with type',
        labelNames: ['agent_id', 'agent_type', 'status']
    }),

    agentTokenUsage: new Histogram({
        name: 'agent_token_usage_total',
        help: 'Total token usage per agent',
        labelNames: ['agent_id'],
        buckets: [100, 500, 1000, 5000, 10000, 50000]
    }),

    agentCost: new Histogram({
        name: 'agent_cost_usd',
        help: 'Total cost in USD per agent/user',
        labelNames: ['agent_id', 'user_id'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
    }),

    agentExecutionSuccess: new Counter({
        name: 'agent_execution_success_total',
        help: 'Total successful agent executions',
        labelNames: ['agent_id']
    }),

    agentExecutionFailure: new Counter({
        name: 'agent_execution_failure_total',
        help: 'Total failed agent executions',
        labelNames: ['agent_id']
    }),

    // Builder Metrics
    builderInteractionDuration: new Histogram({
        name: 'builder_interaction_duration_seconds',
        help: 'Time spent in builder interactions',
        labelNames: ['stage', 'user_id'],
        buckets: [0.5, 1, 2, 5, 10, 30, 60]
    }),

    builderFieldsExtracted: new Histogram({
        name: 'builder_fields_extracted_count',
        help: 'Number of fields extracted during builder sessions',
        labelNames: ['stage'],
        buckets: [0, 1, 2, 5, 10, 20]
    })
};

// Health check endpoint helper
export function getMetrics() {
    return register.metrics();
}

export const contentType = register.contentType;

