import { AgentEvent } from '../../execution/agentEvents';

/**
 * 3.1 The Governing Philosophy
 * Roles that must never be mixed.
 */
export interface IThinker {
    // LLMs think. They receive context, reason over it, and emit structured proposals.
    generateProposal(context: any): Promise<any>;
}

export interface IController {
    // The FSM controls. Every state transition is declared, validated, and logged.
    transition(currentState: FSMState, action: string, payload: any): Promise<FSMState>;
}

export interface IExecutor {
    // Workers execute. Stateless, horizontally scalable, idempotent.
    executeTool(toolName: string, args: any, idempotencyKey: string): Promise<any>;
}

export interface IGovernor {
    // The governance layer bounds execution.
    checkBudget(tenantId: string, runId: string): Promise<{ allowed: boolean; reason?: string }>;
    checkPolicy(action: any, tenantId: string): Promise<{ valid: boolean; reason?: string }>;
}

/**
 * 3.2 Deterministic Finite State Machine
 */
export type FSMState =
    // Core Pipeline
    | 'INIT'
    | 'LOAD_CONTEXT'
    | 'PLAN'
    | 'VALIDATE_PLAN'
    | 'EXECUTE_STEP'
    | 'CRITIQUE_STEP'
    // Branching & Forks
    | 'RETRY_STEP'
    | 'PARALLEL_FORK'
    | 'MERGE_BRANCH'
    | 'HUMAN_REVIEW'
    // Terminal States
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCELLED_BUDGET'
    | 'CANCELLED_POLICY'
    // Advanced States
    | 'SUBGRAPH_START'
    | 'SUBGRAPH_END'
    | 'WAITING_FOR_APPROVAL'
    | 'WAITING_FOR_INPUT'
    | 'TIMEOUT_EXPIRED';

/**
 * 3.3 Event-Sourced State Store
 */
export interface IEventStore {
    /**
     * Appends an immutable event to the durable log.
     * Forces schema_version for forward/backward compatibility.
     */
    append(event: AgentEvent): Promise<void>;

    /**
     * Hydrates the current FSM state purely from the event log.
     */
    replay(runId: string): Promise<any>;

    /**
     * Registers a migration function to upgrade old events.
     */
    registerMigration(fromVersion: string, toVersion: string, migrator: (e: any) => any): void;
}

/**
 * 3.4 Multi-Layer Memory Architecture
 */
export interface IMultiLayerMemory {
    // Working Memory: current run state, last N steps, active plan (Redis TTL)
    getWorkingMemory(runId: string): Promise<any>;

    // Semantic Memory: vector-indexed knowledge, past run summaries (pgvector)
    getSemanticMemory(query: string, scope: 'tenant' | 'user' | 'agent'): Promise<any>;

    // Tool Memory: execution history, latency profiles, idempotency
    getToolMemory(toolName: string): Promise<any>;

    // User Memory: preferences, interaction history
    getUserMemory(userId: string): Promise<any>;

    // Org Memory: shared org knowledge, approved tool sets
    getOrgMemory(tenantId: string): Promise<any>;
}

/**
 * 3.5 Parallel and Hierarchical Execution
 */
export type ForkFailurePolicy = 'REQUIRE_ALL' | 'REQUIRE_N' | 'BEST_EFFORT';

export interface IForkDefinition {
    branches: Array<{ branchId: string; subPlan: any }>;
    failurePolicy: ForkFailurePolicy;
    nRequired?: number;
    compensationActions?: Array<string>;
}

/**
 * 3.6 Model Strategy Layer
 */
export type ModelTier =
    | 'PLAN'      // Highest-tier: Claude Opus, GPT-4o
    | 'CRITIQUE'  // Mid-tier
    | 'FORMAT'    // Cheapest capable
    | 'EMBED'     // Embedding only
    | 'ROUTING';  // Switch triggers

export interface IModelStrategy {
    /**
     * Maps FSM step types to model tiers based on declared rules.
     */
    routeToModel(tier: ModelTier, context?: any): Promise<string>;
}
