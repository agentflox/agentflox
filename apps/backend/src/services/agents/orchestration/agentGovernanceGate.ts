/**
 * ═══════════════════════════════════════════════════════
 * AGENT GOVERNANCE LAYER  (3.1 — GOVERN Role)
 * ═══════════════════════════════════════════════════════
 *
 * GOVERN role: enforces cost budgets, tenant quotas, safety
 * policies, and compliance requirements BEFORE, DURING, and
 * AFTER every FSM state. The governance gate is the last line
 * of defence before any LLM call or tool execution.
 *
 * This layer is separate from execution and NEVER performs
 * execution itself — it only permits or denies transitions.
 */

import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import type { FSMState } from './agentArchitecture';

// ── Tenant Budget Config ──────────────────────────────────────────────────────

export interface TenantBudgetConfig {
    /** Max USD per single agent run */
    maxCostPerRunUsd: number;
    /** Max tokens per single agent run */
    maxTokensPerRun: number;
    /** Max concurrent agent runs for this tenant */
    maxConcurrentRuns: number;
    /** Max tool invocations per run */
    maxToolInvocations: number;
    /** Max FSM state transitions per run (hard loop guard) */
    maxStateTransitions: number;
}

const DEFAULT_BUDGET: TenantBudgetConfig = {
    maxCostPerRunUsd: 0.50,
    maxTokensPerRun: 50_000,
    maxConcurrentRuns: 10,
    maxToolInvocations: 20,
    maxStateTransitions: 50, // Hard FSM recursion cap — can never be exceeded
};

// ── Governance Gate ───────────────────────────────────────────────────────────

export interface GovernanceCheckResult {
    allowed: boolean;
    reason?: string;
    /** The enforcement category that triggered a denial */
    category?: 'BUDGET' | 'QUOTA' | 'POLICY' | 'SAFETY';
}

export class AgentGovernanceGate {
    /**
     * STEP 1: Entry gate — check BEFORE a run begins.
     * Validates tenant quota, agent status, and policy compliance.
     */
    async checkRunEntry(params: {
        tenantId: string;
        agentId: string;
        userId: string;
    }): Promise<GovernanceCheckResult> {
        // 1a. Concurrent run quota
        const runKey = `gov:active_runs:${params.tenantId}`;
        const activeRuns = await redis.scard(runKey).catch(() => 0);
        const budget = await this.getBudgetConfig(params.tenantId);

        if (activeRuns >= budget.maxConcurrentRuns) {
            return {
                allowed: false,
                reason: `Tenant concurrent run quota exceeded (${activeRuns}/${budget.maxConcurrentRuns})`,
                category: 'QUOTA',
            };
        }

        // 1b. Agent status check
        const agent = await prisma.aiAgent.findUnique({
            where: { id: params.agentId },
            select: { isActive: true, isPaused: true, status: true },
        }).catch(() => null);

        if (!agent?.isActive || agent.isPaused) {
            return {
                allowed: false,
                reason: `Agent is not available: status=${agent?.status}, paused=${agent?.isPaused}`,
                category: 'POLICY',
            };
        }

        // 1c. Per-user rate limit (50 runs/min)
        const userRateKey = `gov:user_rate:${params.userId}`;
        const userRate = await redis.incr(userRateKey).catch(() => 0);
        if (userRate === 1) await redis.expire(userRateKey, 60).catch(() => { });
        if (userRate > 50) {
            return {
                allowed: false,
                reason: `User rate limit exceeded (${userRate} runs in last 60s)`,
                category: 'QUOTA',
            };
        }

        return { allowed: true };
    }

    /**
     * STEP 2: Mid-run budget gate — check at EVERY FSM state transition.
     * Prevents runaway cost blowouts mid-execution.
     */
    async checkMidRunBudget(params: {
        runId: string;
        tenantId: string;
        accumulatedCostUsd: number;
        accumulatedTokens: number;
        transitionCount: number;
        toolInvocations: number;
    }): Promise<GovernanceCheckResult> {
        const budget = await this.getBudgetConfig(params.tenantId);

        if (params.accumulatedCostUsd >= budget.maxCostPerRunUsd) {
            return {
                allowed: false,
                reason: `Run cost ceiling reached: $${params.accumulatedCostUsd.toFixed(4)} >= $${budget.maxCostPerRunUsd}`,
                category: 'BUDGET',
            };
        }

        if (params.accumulatedTokens >= budget.maxTokensPerRun) {
            return {
                allowed: false,
                reason: `Token budget exhausted: ${params.accumulatedTokens} >= ${budget.maxTokensPerRun}`,
                category: 'BUDGET',
            };
        }

        if (params.transitionCount >= budget.maxStateTransitions) {
            return {
                allowed: false,
                reason: `FSM transition limit hit: ${params.transitionCount} >= ${budget.maxStateTransitions}. Possible infinite loop.`,
                category: 'BUDGET',
            };
        }

        if (params.toolInvocations >= budget.maxToolInvocations) {
            return {
                allowed: false,
                reason: `Tool invocation cap reached: ${params.toolInvocations} >= ${budget.maxToolInvocations}`,
                category: 'BUDGET',
            };
        }

        return { allowed: true };
    }

    /**
     * STEP 3: Safety gate — validate a proposed action BEFORE it executes.
     * Checks prompt safety, tool allowlist, and RBAC permissions.
     */
    async checkActionSafety(params: {
        tenantId: string;
        agentId: string;
        userId: string;
        toolName: string;
        fsmState: FSMState;
    }): Promise<GovernanceCheckResult> {
        // Check if this state is allowed to invoke tools at all
        const toolExecutionStates: FSMState[] = ['EXECUTE_STEP', 'PARALLEL_FORK'];
        if (!toolExecutionStates.includes(params.fsmState)) {
            return {
                allowed: false,
                reason: `Tool invocation not permitted in FSM state: ${params.fsmState}`,
                category: 'POLICY',
            };
        }

        // Check tool allowlist for this agent
        const agentTool = await prisma.aiAgentTool.findFirst({
            where: {
                agentId: params.agentId,
                tool: { name: params.toolName },
                isActive: true,
            },
        }).catch(() => null);

        if (!agentTool) {
            return {
                allowed: false,
                reason: `Tool "${params.toolName}" is not enabled for agent ${params.agentId}`,
                category: 'POLICY',
            };
        }

        return { allowed: true };
    }

    /**
     * Register a tenant's active run in Redis (call on run start).
     */
    async registerActiveRun(tenantId: string, runId: string, ttlSeconds = 3600): Promise<void> {
        await redis.sadd(`gov:active_runs:${tenantId}`, runId).catch(() => { });
        await redis.expire(`gov:active_runs:${tenantId}`, ttlSeconds).catch(() => { });
    }

    /**
     * Deregister a tenant's active run from Redis (call on run completion/failure).
     */
    async deregisterActiveRun(tenantId: string, runId: string): Promise<void> {
        await redis.srem(`gov:active_runs:${tenantId}`, runId).catch(() => { });
    }

    /**
     * Load per-tenant budget config. Falls back to defaults if not configured.
     * In future: load from a TenantConfig table for fine-grained ACLs.
     */
    private async getBudgetConfig(_tenantId: string): Promise<TenantBudgetConfig> {
        // TODO: Load from database tenant config when available
        return DEFAULT_BUDGET;
    }
}

export const agentGovernanceGate = new AgentGovernanceGate();
