/**
 * ═══════════════════════════════════════════════════════
 * AGENT FSM ORCHESTRATOR  (3.2 Deterministic FSM)
 * ═══════════════════════════════════════════════════════
 *
 * This is the CONTROL layer. The FSM is the single source of
 * truth for run state. Every state is explicit, every transition
 * is declared and logged BEFORE execution, and no state is
 * allowed to loop implicitly.
 *
 * The four roles never mix here:
 *   THINK  → Each "Think" node calls an LLM and returns a proposal.
 *             The LLM's proposal is a data structure, not a decision.
 *   CONTROL → This class decides what happens next (transitions).
 *   EXECUTE → Tools are invoked by stateless worker functions.
 *   GOVERN  → agentGovernanceGate is consulted before every transition.
 *
 * FSM Pipeline:
 *   INIT
 *   → LOAD_CONTEXT
 *   → PLAN              (THINK: LLM generates a structured plan)
 *   → VALIDATE_PLAN     (THINK: LLM critiques the plan)
 *   → EXECUTE_STEP      (EXECUTE: tool workers run step N)
 *   → CRITIQUE_STEP     (THINK: LLM evaluates result of step N)
 *   → [RETRY_STEP | PARALLEL_FORK | HUMAN_REVIEW | back to EXECUTE_STEP]
 *   → MERGE_BRANCH      (on fork join)
 *   → COMPLETE | FAILED | CANCELLED_BUDGET | CANCELLED_POLICY
 */

import { openai } from '@/lib/openai';
import { randomUUID } from 'crypto';
import type { FSMState, ForkFailurePolicy } from './agentArchitecture';
import { appendEvent, reconstructRunState } from './agentEventStore';
import { agentModelRouter } from './agentModelRouter';
import { agentGovernanceGate } from './agentGovernanceGate';
import { ToolInvocationGate } from '../core/toolInvocationGate';
import { GuardrailService } from '../safety/guardrailService';
import { PermissionService } from '../../permissions/permission.service';
import { agentBuilderContextService } from '../state/agentBuilderContextService';
import { getToolByName } from '../registry/toolRegistry';
import { agentSkillService } from '../core/agentSkillService';
import { sharedMemoryService } from '../core/sharedMemory';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function streamThinking(ctx: any, message: string) {
    const wfExecId = ctx.executionContext?.executionId;
    if (wfExecId) {
        const nodeId = ctx.executionContext?.step?.id || ctx.agentName || ctx.agentId;
        await redis.publish(`workforce:run:${wfExecId}`, JSON.stringify({
            type: 'thinking',
            message,
            node: nodeId
        })).catch(() => { });
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FSMContext {
    runId: string;
    tenantId: string; // maps to userId in single-tenant; orgId in enterprise
    agentId: string;
    userId: string;
    workspaceId?: string;
    message: string;
    conversationId?: string;
    executionContext?: { executionId: string };
    agentName?: string;
    agentSystemPrompt?: string;
}

export interface ExecutionPlanStep {
    id: string;
    description: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    dependsOn: string[];
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    result?: unknown;
    error?: string;
    retries: number;
}

interface ExecutionPlan {
    id: string;
    goal: string;
    steps: ExecutionPlanStep[];
    requiresApproval: boolean;
    approvalReason?: string;
    forkPolicy?: ForkFailurePolicy;
}

interface CritiqueResult {
    pass: boolean;
    confidence: number; // 0–1
    issue?: string;
    shouldRetry: boolean;
    shouldEscalate: boolean;
}

export interface FSMRunResult {
    runId: string;
    finalState: FSMState;
    response: string;
    plan?: ExecutionPlan;
    stepResults: Array<{ stepId: string; success: boolean; result?: unknown; error?: string }>;
    totalCostUsd: number;
    totalTokens: number;
}

// ── The FSM Orchestrator ──────────────────────────────────────────────────────

export class AgentFSMOrchestrator {
    private readonly toolGate: ToolInvocationGate;

    constructor() {
        const permissionService = new PermissionService();
        const guardrailService = new GuardrailService(permissionService);
        this.toolGate = new ToolInvocationGate(guardrailService);
    }

    /**
     * Main entry point. Runs the FSM end-to-end for a single agent request.
     * Each state is idempotent — re-entering is safe after a crash.
     *
     * The step parameter is the Inngest `step` object for durable execution.
     * Every discrete FSM state runs inside its own `step.run()` so Inngest
     * can provide per-state crash recovery with zero token double-billing.
     */
    async run(
        ctx: FSMContext,
        step: any // Inngest step object
    ): Promise<FSMRunResult> {
        const { runId, tenantId, agentId, userId, workspaceId, message, conversationId } = ctx;

        // ─── Crash Recovery: Check if this run was already partially completed ────
        const { lastFsmState, totalCostUsd: recoveredCost, totalTokens: recoveredTokens,
            stepCount: recoveredStepCount, isTerminated } = await reconstructRunState(runId);

        if (isTerminated) {
            // Run already reached a terminal state — return idempotent cached result
            console.log(`[FSM] Run ${runId} already terminated at ${lastFsmState} — returning early (idempotent).`);
            const finalState = lastFsmState as FSMState ?? 'COMPLETE';
            return this.buildTerminalResult(runId, finalState, [], 0, 0);
        }

        // ─── Accumulators — governance tracks these across ALL state transitions ─
        let accumulatedCost = recoveredCost;
        let accumulatedTokens = recoveredTokens;
        let transitionCount = 0;
        let toolInvocations = 0;
        const stepResults: Array<{ stepId: string; success: boolean; result?: unknown; error?: string }> = [];

        // ─── STATE: INIT ──────────────────────────────────────────────────────────
        if (!lastFsmState || lastFsmState === 'INIT') {
            await streamThinking(ctx, 'Initializing agent execution...');

            await appendEvent({
                runId, tenantId, fsmState: 'INIT',
                eventType: 'INIT_RUN', status: 'pending',
            });

            // Governance: entry check
            const entryCheck = await agentGovernanceGate.checkRunEntry({ tenantId, agentId, userId });
            if (!entryCheck.allowed) {
                await appendEvent({ runId, tenantId, fsmState: 'CANCELLED_POLICY', eventType: 'CANCELLED_POLICY', status: 'cancelled', payload: { reason: entryCheck.reason } });
                return this.buildTerminalResult(runId, 'CANCELLED_POLICY', stepResults, accumulatedCost, accumulatedTokens, `Policy violation: ${entryCheck.reason}`);
            }
            await agentGovernanceGate.registerActiveRun(tenantId, runId);
        }

        let plan: ExecutionPlan | null = null;
        let finalResponse = '';

        try {
            transitionCount++;

            // ─── STATE: LOAD_CONTEXT ───────────────────────────────────────────────
            const context: { tools: any[]; memories: string[]; userCtx: any } = await step.run(
                `fsm-${runId}-load-context`,
                async () => {
                    await appendEvent({ runId, tenantId, fsmState: 'LOAD_CONTEXT', eventType: 'CONTEXT_LOADED', status: 'pending' });

                    const [userCtx, memories, agentTools] = await Promise.all([
                        agentBuilderContextService.fetchUserContext(userId).catch(() => null),
                        sharedMemoryService.query(agentId, message, ['global'], 5).catch(() => []),
                        this.loadAgentTools(agentId),
                    ]);

                    await appendEvent({ runId, tenantId, fsmState: 'LOAD_CONTEXT', eventType: 'CONTEXT_LOADED', status: 'success' });

                    return {
                        tools: agentTools,
                        memories: (memories as any[]).map((m: any) => m.content ?? ''),
                        userCtx,
                    };
                }
            );

            // Governance mid-run check
            const govCheck1 = await this.governanceCheck({ runId, tenantId, accumulatedCost, accumulatedTokens, transitionCount, toolInvocations });
            if (!govCheck1.allowed) return await this.cancelRun(runId, tenantId, govCheck1.category!, govCheck1.reason!, stepResults, accumulatedCost, accumulatedTokens);

            // ─── STATE: PLAN ──────────────────────────────────────────────────────
            transitionCount++;
            await streamThinking(ctx, 'Drafting execution plan...');
            plan = await step.run(
                `fsm-${runId}-plan`,
                async () => {
                    await appendEvent({ runId, tenantId, fsmState: 'PLAN', eventType: 'PLAN_GENERATED', status: 'pending' });

                    const planResult = await this.thinkPlan(ctx, context.tools, context.memories, context.userCtx);
                    accumulatedCost += planResult.costUsd;
                    accumulatedTokens += planResult.tokens;

                    await appendEvent({ runId, tenantId, fsmState: 'PLAN', eventType: 'PLAN_GENERATED', status: 'success', costUsd: planResult.costUsd, tokens: planResult.tokens, payload: { planId: planResult.plan.id, steps: planResult.plan.steps.length } });

                    return planResult.plan;
                }
            );

            if (!plan) throw new Error('Plan generation returned null');

            // ─── Human review gate ────────────────────────────────────────────────
            if (plan.requiresApproval) {
                await appendEvent({ runId, tenantId, fsmState: 'WAITING_FOR_APPROVAL', eventType: 'HUMAN_REVIEW_REQUESTED', status: 'pending', payload: { reason: plan.approvalReason } });
                finalResponse = `⏸ This action requires human approval: ${plan.approvalReason ?? 'Sensitive operation detected.'}`;
                await appendEvent({ runId, tenantId, fsmState: 'COMPLETE', eventType: 'RUN_COMPLETED', status: 'success' });
                return this.buildTerminalResult(runId, 'WAITING_FOR_APPROVAL', stepResults, accumulatedCost, accumulatedTokens, finalResponse, plan);
            }

            // ─── STATE: VALIDATE_PLAN ─────────────────────────────────────────────
            transitionCount++;
            const planValidation = await step.run(
                `fsm-${runId}-validate-plan`,
                async () => {
                    await appendEvent({ runId, tenantId, fsmState: 'VALIDATE_PLAN', eventType: 'PLAN_VALIDATED', status: 'pending' });

                    // 1. Native deterministic validation: prevent hallucinated tools
                    const validTools = new Set(context.tools.map(t => t.name));
                    for (const s of plan!.steps) {
                        if (s.toolName && !validTools.has(s.toolName)) {
                            const issue = `The plan references an undefined tool '${s.toolName}'. You MUST ONLY use the tools provided in the AVAILABLE TOOLS list.`;
                            await appendEvent({ runId, tenantId, fsmState: 'VALIDATE_PLAN', eventType: 'PLAN_VALIDATED', status: 'failed', payload: { issue } });
                            return { pass: false, confidence: 1, issue, shouldRetry: true, shouldEscalate: false };
                        }
                    }

                    // 2. Semantic validation via LLM critique
                    const critique = await this.critiquePlan(plan!, ctx, context.tools);
                    accumulatedCost += critique.costUsd;
                    accumulatedTokens += critique.tokens;

                    await appendEvent({ runId, tenantId, fsmState: 'VALIDATE_PLAN', eventType: 'PLAN_VALIDATED', status: critique.result.pass ? 'success' : 'failed', costUsd: critique.costUsd, tokens: critique.tokens });

                    return critique.result;
                }
            );

            if (!planValidation.pass) {
                if (planValidation.shouldEscalate) {
                    finalResponse = `⚠ Plan validation failed: ${planValidation.issue}`;
                    await appendEvent({ runId, tenantId, fsmState: 'HUMAN_REVIEW', eventType: 'HUMAN_REVIEW_REQUESTED', status: 'failed', payload: { issue: planValidation.issue } });
                    return this.buildTerminalResult(runId, 'HUMAN_REVIEW', stepResults, accumulatedCost, accumulatedTokens, finalResponse, plan);
                }
                if (planValidation.shouldRetry) {
                    // Retry planning once — not an infinite loop, a declared single retry transition
                    plan = await step.run(`fsm-${runId}-plan-retry`, async () => {
                        const retried = await this.thinkPlan(ctx, context.tools, context.memories, context.userCtx, planValidation.issue);
                        accumulatedCost += retried.costUsd;
                        accumulatedTokens += retried.tokens;
                        return retried.plan;
                    });
                }
            }

            // ─── STATE: EXECUTE_STEP (parallel topology) ──────────────────────────
            // Final safety sanitization: strip any remaining hallucinatory tools after retry
            const validToolNames = new Set(context.tools.map(t => t.name));
            plan!.steps.forEach(s => {
                if (s.toolName && !validToolNames.has(s.toolName)) {
                    console.warn(`[FSM] Stripping hallucinated tool ${s.toolName} from step ${s.id}`);
                    s.toolName = undefined;
                }
            });

            // Execute steps in dependency order — parallel where dependencies allow.
            const pendingSteps = [...plan!.steps];
            const completedIds = new Set<string>();
            let hasDeadlock = false;

            while (pendingSteps.some(s => s.status === 'PENDING') && !hasDeadlock) {
                transitionCount++;

                // Governance check before each batch
                const govMidCheck = await this.governanceCheck({ runId, tenantId, accumulatedCost, accumulatedTokens, transitionCount, toolInvocations });
                if (!govMidCheck.allowed) return await this.cancelRun(runId, tenantId, govMidCheck.category!, govMidCheck.reason!, stepResults, accumulatedCost, accumulatedTokens);

                // Find steps whose dependencies are all satisfied
                const executableSteps = pendingSteps.filter(s =>
                    s.status === 'PENDING' &&
                    s.dependsOn.every(depId => completedIds.has(depId))
                );

                if (executableSteps.length === 0) {
                    const remainingPending = pendingSteps.filter(s => s.status === 'PENDING');
                    if (remainingPending.length > 0) {
                        console.error(`[FSM] Deadlock detected in run ${runId}. ${remainingPending.length} steps unexecutable.`);
                        hasDeadlock = true;
                    }
                    break;
                }

                // Execute this batch in parallel via discrete step.run calls
                const batchResults = await Promise.all(
                    executableSteps.map(s => step.run(
                        `fsm-${runId}-execute-step-${s.id}`,
                        async () => {
                            toolInvocations++;
                            await streamThinking(ctx, `Executing tool: ${s.toolName || 'THINK'}`);
                            return this.executeStep(s, ctx);
                        }
                    ))
                );

                // Process batch results and run per-step CRITIQUE
                for (let i = 0; i < batchResults.length; i++) {
                    const planStep = executableSteps[i];

                    const toolResult = batchResults[i];

                    accumulatedCost += toolResult.costUsd ?? 0;
                    accumulatedTokens += toolResult.tokens ?? 0;

                    stepResults.push({
                        stepId: planStep.id,
                        success: toolResult.success,
                        result: toolResult.result,
                        error: toolResult.error,
                    });

                    await appendEvent({
                        runId, tenantId,
                        fsmState: 'EXECUTE_STEP',
                        eventType: 'STEP_EXECUTED',
                        status: toolResult.success ? 'success' : 'failed',
                        stepId: planStep.id,
                        tool: planStep.toolName,
                        costUsd: toolResult.costUsd,
                        tokens: toolResult.tokens,
                        payload: { result: toolResult.result, error: toolResult.error },
                    });

                    if (toolResult.success) {
                        planStep.status = 'COMPLETED';
                        planStep.result = toolResult.result;
                        completedIds.add(planStep.id);

                        // ─── STATE: CRITIQUE_STEP ─────────────────────────────────────
                        // After each successful step, a Critic LLM validates the result.
                        // This catches hallucinated tool invocations.
                        await streamThinking(ctx, `Evaluating output from ${planStep.toolName || 'THINK'}...`);
                        const critique = await step.run(
                            `fsm-${runId}-critique-${planStep.id}`,
                            async () => {
                                const cr = await this.critiqueStep(planStep, toolResult.result, ctx);
                                accumulatedCost += cr.costUsd;
                                accumulatedTokens += cr.tokens;
                                await appendEvent({ runId, tenantId, fsmState: 'CRITIQUE_STEP', eventType: 'STEP_CRITIQUED', stepId: planStep.id, status: cr.result.pass ? 'success' : 'failed' });
                                return cr.result;
                            }
                        );

                        if (!critique.pass && critique.shouldRetry && planStep.retries < 2) {
                            // ─── STATE: RETRY_STEP ────────────────────────────────────
                            planStep.status = 'PENDING';
                            planStep.retries++;
                            completedIds.delete(planStep.id);
                            console.log(`[FSM] Retrying step ${planStep.id} (attempt ${planStep.retries})`);
                        }
                    } else {
                        planStep.status = 'FAILED';
                        planStep.error = toolResult.error;
                        // Hard failure — stop the batch loop
                        break;
                    }
                }

                // Break if any step permanently failed
                if (pendingSteps.some(s => s.status === 'FAILED')) break;
            }

            // ─── STATE: COMPLETE or FAILED ────────────────────────────────────────
            const allSucceeded = plan!.steps.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');
            const finalFsmState: FSMState = hasDeadlock ? 'FAILED' : (allSucceeded ? 'COMPLETE' : 'FAILED');

            finalResponse = await step.run(
                `fsm-${runId}-generate-response`,
                async () => this.generateFinalResponse(ctx, plan!, stepResults)
            );

            await appendEvent({ runId, tenantId, fsmState: finalFsmState, eventType: allSucceeded ? 'RUN_COMPLETED' : 'RUN_FAILED', status: allSucceeded ? 'success' : 'failed', costUsd: accumulatedCost, tokens: accumulatedTokens });

            return {
                runId,
                finalState: finalFsmState,
                response: finalResponse,
                plan: plan ?? undefined,
                stepResults,
                totalCostUsd: accumulatedCost,
                totalTokens: accumulatedTokens,
            };

        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            await appendEvent({ runId, tenantId, fsmState: 'FAILED', eventType: 'RUN_FAILED', status: 'failed', payload: { error: errMsg } }).catch(() => { });
            return this.buildTerminalResult(runId, 'FAILED', stepResults, accumulatedCost, accumulatedTokens, `Run failed: ${errMsg}`, plan ?? undefined);
        } finally {
            await agentGovernanceGate.deregisterActiveRun(tenantId, runId);
        }
    }

    // ── THINK Layer — LLM calls return proposals, never decisions ───────────────

    private async thinkPlan(
        ctx: FSMContext,
        tools: any[],
        memories: string[],
        userCtx: any,
        critiqueFeedback?: string
    ): Promise<{ plan: ExecutionPlan; costUsd: number; tokens: number }> {
        const spec = await agentModelRouter.resolve('PLAN');

        const stream = await openai.chat.completions.create({
            model: spec.effectiveId,
            temperature: spec.temperature,
            max_tokens: spec.maxOutputTokens,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a planning engine. Generate a step-by-step execution plan as structured JSON.
You MUST output valid JSON matching this schema:
{
  "id": "string",
  "goal": "string",
  "steps": [{ "id": "string", "description": "string", "toolName": "string|null", "toolArgs": {}, "dependsOn": ["step_id"], "status": "PENDING", "retries": 0 }],
  "requiresApproval": false,
  "approvalReason": "string|null"
}

Rules:
- Only reference tools that are in the AVAILABLE TOOLS list.
- Mark requiresApproval=true for any step that deletes, publishes, or sends data externally.
- Steps without toolName are THINK or INFORM steps — do not hallucinate tools.
- Do NOT decompose tasks into unnecessary subtasks (e.g. splitting a single article writing task into intro/body/conclusion steps). If a tool can accomplish the task in one go, use it exactly once with a comprehensive prompt.
- Keep the plan minimal. ${critiqueFeedback ? `Previous critique: ${critiqueFeedback}` : ''}`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        message: ctx.message,
                        availableTools: tools.map(t => ({
                            name: t.name,
                            description: t.description,
                            parameters: t.functionSchema?.parameters || {}
                        })),
                        relevantMemories: memories.slice(0, 5),
                        workspaceContext: userCtx,
                    }),
                },
            ],
            stream: true,
            stream_options: { include_usage: true },
        });

        const wfExecId = ctx.executionContext?.executionId;
        let finalContent = '';
        let tokens = 0;
        let costUsd = 0;
        
        for await (const chunk of stream) {
            const textChunk = chunk.choices[0]?.delta?.content || '';
            if (textChunk) {
                finalContent += textChunk;
            }
            if (chunk.usage) {
                tokens = chunk.usage.prompt_tokens + chunk.usage.completion_tokens;
                costUsd = agentModelRouter.estimateCost('PLAN', chunk.usage.prompt_tokens);
            }
        }

        const rawPlan = JSON.parse(finalContent || '{}');
        const plan: ExecutionPlan = {
            id: rawPlan.id ?? randomUUID(),
            goal: rawPlan.goal ?? ctx.message,
            requiresApproval: rawPlan.requiresApproval ?? false,
            approvalReason: rawPlan.approvalReason ?? undefined,
            steps: (rawPlan.steps ?? []).map((s: any): ExecutionPlanStep => ({
                id: s.id ?? randomUUID(),
                description: s.description ?? '',
                toolName: s.toolName ?? undefined,
                toolArgs: s.toolArgs ?? {},
                dependsOn: s.dependsOn ?? [],
                status: 'PENDING',
                retries: 0,
            })),
        };

        return { plan, costUsd, tokens };
    }

    private async critiquePlan(
        plan: ExecutionPlan,
        ctx: FSMContext,
        tools: any[]
    ): Promise<{ result: CritiqueResult; costUsd: number; tokens: number }> {
        const spec = await agentModelRouter.resolve('CRITIQUE');

        const completion = await openai.chat.completions.create({
            model: spec.effectiveId,
            temperature: spec.temperature,
            max_tokens: spec.maxOutputTokens,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a plan critic. Evaluate the plan for safety, correctness, and minimal scope.
Reply with JSON: { "pass": bool, "confidence": 0-1, "issue": "string|null", "shouldRetry": bool, "shouldEscalate": bool }
Fail if plan is unnecessarily destructive or goal doesn't match the user message.
IMPORTANT: Steps without a toolName are completely valid THINK steps. DO NOT fail or escalate just because a step lacks a tool. Only escalate for severe safety violations.`,
                }, { role: 'user', content: JSON.stringify({ userMessage: ctx.message, plan }) },
            ],
        });

        const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{"pass":true,"confidence":0.9,"shouldRetry":false,"shouldEscalate":false}');

        return {
            result: { pass: parsed.pass ?? true, confidence: parsed.confidence ?? 0.9, issue: parsed.issue, shouldRetry: parsed.shouldRetry ?? false, shouldEscalate: parsed.shouldEscalate ?? false },
            costUsd: agentModelRouter.estimateCost('CRITIQUE', usage.prompt_tokens),
            tokens: usage.prompt_tokens + usage.completion_tokens,
        };
    }

    private async critiqueStep(
        step: ExecutionPlanStep,
        result: unknown,
        ctx: FSMContext
    ): Promise<{ result: CritiqueResult; costUsd: number; tokens: number }> {
        const spec = await agentModelRouter.resolve('CRITIQUE');

        const stream = await openai.chat.completions.create({
            model: spec.effectiveId,
            temperature: spec.temperature,
            max_tokens: 256,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `Evaluate whether this tool result satisfies the step goal. JSON: { "pass": bool, "issue": "string|null", "shouldRetry": bool, "shouldEscalate": bool, "confidence": 0-1 }`,
                },
                { role: 'user', content: JSON.stringify({ stepDescription: step.description, toolName: step.toolName, result: String(result ?? '').slice(0, 400) }) },
            ],
            stream: true,
            stream_options: { include_usage: true },
        });

        const wfExecId = ctx.executionContext?.executionId;
        let finalContent = '';
        let tokens = 0;
        let costUsd = 0;
        
        for await (const chunk of stream) {
            const textChunk = chunk.choices[0]?.delta?.content || '';
            if (textChunk) {
                finalContent += textChunk;
            }
            if (chunk.usage) {
                tokens = chunk.usage.prompt_tokens + chunk.usage.completion_tokens;
                costUsd = agentModelRouter.estimateCost('CRITIQUE', chunk.usage.prompt_tokens);
            }
        }

        const parsed = JSON.parse(finalContent || '{"pass":true,"shouldRetry":false,"shouldEscalate":false,"confidence":0.9}');

        return {
            result: { pass: parsed.pass ?? true, confidence: parsed.confidence ?? 0.9, issue: parsed.issue, shouldRetry: parsed.shouldRetry ?? false, shouldEscalate: parsed.shouldEscalate ?? false },
            costUsd,
            tokens,
        };
    }

    // ── EXECUTE Layer — Stateless, idempotent tool workers ─────────────────────

    private async executeStep(
        planStep: ExecutionPlanStep,
        ctx: FSMContext
    ): Promise<{ success: boolean; result?: unknown; error?: string; costUsd?: number; tokens?: number }> {
        if (!planStep.toolName) {
            const spec = await agentModelRouter.resolve('FORMAT' as any);
            const stream = await openai.chat.completions.create({
                model: spec.effectiveId,
                temperature: spec.temperature,
                max_tokens: 1500,
                messages: [
                    {
                        role: 'system',
                        content: `You are executing a THINK/INFORM step. Perform the following task based on the context provided. Output only the result.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            task: planStep.description,
                            context: ctx.message,
                        }),
                    },
                ],
                stream: true,
                stream_options: { include_usage: true },
            });

            const wfExecId = ctx.executionContext?.executionId;
            const nodeId = (ctx.executionContext as any)?.step?.id || ctx.agentName || ctx.agentId;
            let finalContent = '';
            let tokens = 0;
            let costUsd = 0;

            for await (const chunk of stream) {
                const textChunk = chunk.choices[0]?.delta?.content || '';
                if (textChunk) {
                    finalContent += textChunk;
                    if (wfExecId) {
                        redis.publish(`workforce:run:${wfExecId}`, JSON.stringify({
                            type: 'token',
                            message: textChunk,
                            node: nodeId
                        })).catch(() => { });
                    }
                }
                if (chunk.usage) {
                    tokens = chunk.usage.prompt_tokens + chunk.usage.completion_tokens;
                    costUsd = agentModelRouter.estimateCost('FORMAT' as any, chunk.usage.prompt_tokens);
                }
            }

            return {
                success: true,
                result: finalContent || `Completed: ${planStep.description}`,
                costUsd,
                tokens,
            };
        }

        // Safety gate: validate tool is permitted in this FSM state
        const safetyCheck = await agentGovernanceGate.checkActionSafety({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            userId: ctx.userId,
            toolName: planStep.toolName,
            fsmState: 'EXECUTE_STEP',
        });

        if (!safetyCheck.allowed) {
            return { success: false, error: `Safety policy denied: ${safetyCheck.reason}` };
        }

        try {
            const gateResult = await this.toolGate.invoke({
                executionId: ctx.runId,
                agentId: ctx.agentId,
                userId: ctx.userId,
                workspaceId: ctx.workspaceId,
                toolName: planStep.toolName,
                parameters: planStep.toolArgs ?? {},
                stepId: planStep.id,
            });

            if (gateResult.status === 'approval_required') {
                return { success: false, error: `Approval required: ${gateResult.approvalReason}` };
            }

            return {
                success: gateResult.status === 'success',
                result: gateResult.result,
                error: gateResult.error,
                costUsd: 0,
                tokens: 0,
            };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async loadAgentTools(agentId: string): Promise<any[]> {
        try {
            const tools = await agentSkillService.getAvailableTools(agentId);
            if (tools.length > 0) {
                return tools;
            }
        } catch { /* fallback */ }

        // Fallback: load agent's directly assigned AgentTool records and resolve via SystemTool.
        // We intentionally do NOT fall back to getAllTools() — that would expose the entire
        // tool registry to the LLM and cause it to hallucinate calls to tools the agent doesn't own.
        try {
            const { prisma } = await import('@/lib/prisma');
            const agentToolRecords = await prisma.agentTool.findMany({
                where: { agentId, isActive: true },
                select: { name: true },
            });
            if (agentToolRecords.length > 0) {
                const names = agentToolRecords.map(t => t.name);
                return await prisma.systemTool.findMany({
                    where: { name: { in: names }, isActive: true },
                });
            }
        } catch (err) {
            console.error(`[AgentFSMOrchestrator] Failed to load AgentTool fallback for agent ${agentId}:`, err);
        }

        console.warn(`[AgentFSMOrchestrator] Agent ${agentId} has no tools assigned — returning empty list.`);
        return [];
    }

    private async generateFinalResponse(
        ctx: FSMContext,
        plan: ExecutionPlan,
        stepResults: Array<{ stepId: string; success: boolean; result?: unknown; error?: string }>
    ): Promise<string> {
        const spec = await agentModelRouter.resolve('FORMAT');
        try {
            const stream = await openai.chat.completions.create({
                model: spec.effectiveId,
                temperature: 0.3,
                max_tokens: 512,
                messages: [
                    {
                        role: 'system',
                        content: `You are a summarization engine. Write a concise, factual summary of the agent execution for the user. Be direct. Under 150 words. Plain text.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            goal: plan.goal,
                            steps: plan.steps.map(s => ({ id: s.id, description: s.description, status: s.status })),
                            results: stepResults,
                        }),
                    },
                ],
                stream: true,
            });

            const wfExecId = ctx.executionContext?.executionId;
            const nodeId = (ctx.executionContext as any)?.step?.id || ctx.agentName || ctx.agentId;
            let finalContent = '';

            for await (const chunk of stream) {
                const textChunk = chunk.choices[0]?.delta?.content || '';
                if (textChunk) {
                    finalContent += textChunk;
                    if (wfExecId) {
                        redis.publish(`workforce:run:${wfExecId}`, JSON.stringify({
                            type: 'token',
                            message: textChunk,
                            node: nodeId
                        })).catch(() => { });
                    }
                }
            }

            return finalContent || 'Execution completed.';
        } catch {
            const succeeded = stepResults.filter(r => r.success).length;
            return `Completed ${succeeded}/${stepResults.length} steps for: ${ctx.message}`;
        }
    }

    private async governanceCheck(params: {
        runId: string; tenantId: string;
        accumulatedCost: number; accumulatedTokens: number;
        transitionCount: number; toolInvocations: number;
    }): Promise<{ allowed: boolean; reason?: string; category?: 'BUDGET' | 'QUOTA' | 'POLICY' | 'SAFETY' }> {
        return agentGovernanceGate.checkMidRunBudget({
            runId: params.runId,
            tenantId: params.tenantId,
            accumulatedCostUsd: params.accumulatedCost,
            accumulatedTokens: params.accumulatedTokens,
            transitionCount: params.transitionCount,
            toolInvocations: params.toolInvocations,
        });
    }

    private async cancelRun(
        runId: string, tenantId: string,
        category: 'BUDGET' | 'QUOTA' | 'POLICY' | 'SAFETY',
        reason: string,
        stepResults: any[], cost: number, tokens: number
    ): Promise<FSMRunResult> {
        const fsmState: FSMState = category === 'BUDGET' ? 'CANCELLED_BUDGET' : 'CANCELLED_POLICY';
        await appendEvent({ runId, tenantId, fsmState, eventType: fsmState === 'CANCELLED_BUDGET' ? 'CANCELLED_BUDGET' : 'CANCELLED_POLICY', status: 'cancelled', payload: { reason } }).catch(() => { });
        return this.buildTerminalResult(runId, fsmState, stepResults, cost, tokens, `Execution cancelled [${category}]: ${reason}`);
    }

    private buildTerminalResult(
        runId: string, finalState: FSMState,
        stepResults: any[], cost: number, tokens: number,
        response?: string, plan?: ExecutionPlan
    ): FSMRunResult {
        return {
            runId,
            finalState,
            response: response ?? 'Execution complete.',
            plan,
            stepResults,
            totalCostUsd: cost,
            totalTokens: tokens,
        };
    }
}

export const agentFSMOrchestrator = new AgentFSMOrchestrator();
