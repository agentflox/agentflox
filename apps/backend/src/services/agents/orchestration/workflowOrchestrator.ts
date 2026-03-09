import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { inngest } from '@/lib/inngest';
import logger from '@/lib/logger';
import { agentRegistryService } from './agentRegistry';
import { agentCommunicationService } from './agentCommunication';

/**
 * Workflow Orchestration Service
 * Executes complex multi-step workflows involving multiple agents
 */

export interface WorkflowStep {
    id: string;
    name: string;
    capability: string;
    requiredTags?: string[];
    condition?: string;
    required: boolean;
    parallel?: boolean;
    timeout?: number;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'COMPLETED_CONDITIONAL';
    startTime: Date;
    endTime?: Date;
    context: Record<string, any>;
    error?: string;
}

export interface StepResult {
    stepId: string;
    status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
    result?: any;
    error?: string;
    agentId?: string;
    duration: number;
}

@Injectable()
export class WorkflowOrchestrationService {
    /**
     * Start a workflow execution
     */
    async startWorkflow(workflowId: string, input: any, userId: string): Promise<any> {
        // 1. Get and Validate workflow
        const workflow = await prisma.agentWorkflow.findUnique({
            where: { id: workflowId }
        });

        if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

        const definition = workflow.definition as any;
        this.validateWorkflow(definition);

        // 2. Create execution record
        const execution = await prisma.agentWorkflowExecution.create({
            data: {
                id: randomUUID(),
                workflowId,
                status: 'RUNNING',
                context: { input },
                startTime: new Date(),
            }
        });

        // 2. Trigger via Inngest for durability (best-effort in local dev)
        try {
            await inngest.send({
                name: 'agent/workflow.execute',
                data: {
                    executionId: execution.id,
                    workflowId,
                    userId,
                    input
                }
            });
        } catch (err) {
            // In local development, Inngest may not be running; don't fail the workflow start.
            console.error('[WorkflowOrchestrator] Failed to send workflow to Inngest', err);
        }

        return execution;
    }

    /**
     * Dispatch a workflow step to an agent (Non-blocking)
     */
    async dispatchWorkflowStep(
        executionId: string,
        stepId: string,
        input: any,
        userId: string
    ): Promise<{ messageId: string; agentId: string }> {
        const execution = await prisma.agentWorkflowExecution.findUnique({
            where: { id: executionId },
            include: { workflow: true }
        });

        if (!execution || !execution.workflow) {
            throw new Error(`Workflow execution ${executionId} not found`);
        }

        const workflowDefinition = execution.workflow.definition as any;
        const step = workflowDefinition.steps?.find((s: any) => s.id === stepId);

        if (!step) {
            throw new Error(`Step ${stepId} not found in workflow ${execution.workflowId}`);
        }

        const dispatchKey = `workflow:step-dispatch:${executionId}:${stepId}`;

        // Idempotency: if we have already dispatched this step, reuse the previous messageId/agentId
        const existingDispatch = await redis.get(dispatchKey);
        if (existingDispatch) {
            try {
                const parsed = JSON.parse(existingDispatch) as { messageId: string; agentId: string };
                logger.info({
                    traceId: executionId,
                    executionId,
                    workflowId: execution.workflowId,
                    stepId,
                    event: 'DISPATCH_REUSED',
                    status: 'success',
                });
                return { messageId: parsed.messageId, agentId: parsed.agentId || '' };
            } catch {
                // fall through and recompute dispatch
            }
        }

        // Use explicit agentId when present (e.g. from workforce graph)
        let selectedAgent: any = null;
        if (step.agentId) {
            selectedAgent = await agentRegistryService.getAgent(step.agentId);
        }
        if (!selectedAgent) {
            const agents = await agentRegistryService.discoverAgents({
                capability: step.capability ?? 'GENERAL',
                status: 'ACTIVE',
            });
            selectedAgent = await this.selectBestAgent(agents);
        }

        // If still no agent:
        if (!selectedAgent) {
            const stepIdStr = step.id || stepId;
            const isToolLike =
                typeof stepIdStr === 'string' &&
                (stepIdStr.startsWith('toolNode') ||
                    stepIdStr.startsWith('taskNode') ||
                    stepIdStr.startsWith('conditionNode'));

            // Tool / task / condition nodes may be explicitly marked as PLACEHOLDER
            const executionMode = (step.executionMode as string | undefined) ?? 'LIVE';

            if (isToolLike && executionMode === 'PLACEHOLDER') {
                const syntheticMessageId = `placeholder-skip-${executionId}-${stepId}`;

                logger.warn({
                    traceId: executionId,
                    executionId,
                    workflowId: execution.workflowId,
                    stepId,
                    stepType: 'tool/task/condition',
                    event: 'SKIPPED',
                    status: 'PLACEHOLDER_SKIPPED',
                    message: 'Step is configured as PLACEHOLDER and has no executor',
                });

                await inngest.send({
                    name: 'agent/message.processed',
                    data: {
                        messageId: syntheticMessageId,
                        agentId: null,
                        response: {
                            skipped: true,
                            status: 'PLACEHOLDER_SKIPPED',
                            reason: 'NO_EXECUTOR_PLACEHOLDER',
                            stepId,
                        },
                        status: 'COMPLETED',
                        timestamp: new Date(),
                    },
                });

                // Record idempotent dispatch record
                await redis.set(
                    dispatchKey,
                    JSON.stringify({ messageId: syntheticMessageId, agentId: '' }),
                    'EX',
                    60 * 60 * 24
                );

                return { messageId: syntheticMessageId, agentId: '' };
            }

            // Otherwise this is a configuration error – fail loudly so it is fixed.
            throw new Error(
                `No executor configured for workflow step ${stepId} (type: ${stepIdStr}, capability: ${step.capability ?? 'GENERAL'}, agentId: ${step.agentId ?? 'none'})`
            );
        }

        logger.info({
            traceId: executionId,
            executionId,
            workflowId: execution.workflowId,
            stepId,
            stepType: step.id || 'unknown',
            agentId: selectedAgent.id,
            event: 'DISPATCHED',
            status: 'pending',
        });

        // Send message to agent (Asynchronous)
        const response = await agentCommunicationService.sendMessage(
            'system', // From system
            selectedAgent.id,
            {
                type: 'REQUEST',
                content: `Workflow Step: ${step.name}`,
                data: { step, input, context: execution.context, executionId }
            },
            {
                synchronous: false,
                priority: 'HIGH'
            }
        );

        // Record idempotent dispatch record
        await redis.set(
            dispatchKey,
            JSON.stringify({ messageId: response.messageId, agentId: selectedAgent.id }),
            'EX',
            60 * 60 * 24
        );

        return { messageId: response.messageId, agentId: selectedAgent.id };
    }

    /**
     * Finalize the execution of a step when the agent responds
     */
    async finalizeStepExecution(
        executionId: string,
        stepId: string,
        result: any
    ): Promise<any> {
        // Optimistic locking merge on context using executionVersion
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const execution = await prisma.agentWorkflowExecution.findUnique({
                where: { id: executionId },
                select: { context: true, executionVersion: true, workflowId: true }
            });

            if (!execution) {
                throw new Error(`Workflow execution ${executionId} not found`);
            }

            const mergedContext = this.mergeStepResult(
                (execution.context as any) || {},
                stepId,
                result
            );

            const updated = await prisma.agentWorkflowExecution.updateMany({
                where: { id: executionId, executionVersion: execution.executionVersion },
                data: {
                    context: mergedContext,
                    executionVersion: { increment: 1 }
                }
            });

            if (updated.count > 0) {
                logger.info({
                    traceId: executionId,
                    executionId,
                    workflowId: execution.workflowId,
                    stepId,
                    event: 'FINALIZED',
                    status: 'success',
                });
                return result;
            }

            // Version conflict – back off and retry
            await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }

        throw new Error(
            `Could not update execution context for ${executionId} / step ${stepId} after ${maxAttempts} attempts`
        );
    }

    private mergeStepResult(
        existingContext: any,
        stepId: string,
        result: any
    ): any {
        const ctx = existingContext ? { ...existingContext } : {};
        const steps = { ...(ctx.steps || {}) };
        steps[stepId] = result;
        ctx.steps = steps;

        if (result && typeof result === 'object' && (result as any).output) {
            ctx.output = {
                ...(ctx.output || {}),
                ...(result as any).output
            };
        }

        return ctx;
    }

    /**
     * Select best agent from candidates based on current load
     */
    private async selectBestAgent(agents: any[]): Promise<any> {
        if (agents.length === 0) return null;
        if (agents.length === 1) return agents[0];

        const agentIds = agents.map(a => a.id);
        const scores = await redis.zmscore('agent_loads', ...agentIds);

        const agentLoads = agents.map((agent, index) => {
            const score = parseInt(scores[index] || '0', 10);
            return { agent, load: score };
        });

        agentLoads.sort((a, b) => a.load - b.load);
        return agentLoads[0].agent;
    }

    /**
     * Evaluate condition expression
     */
    public evaluateCondition(
        condition: string,
        result: any,
        context: any
    ): boolean {
        // Normalize and sanitize result to avoid prototype pollution and unsafe access
        let safeResult: any;
        try {
            safeResult = JSON.parse(JSON.stringify(result ?? {}));
        } catch {
            safeResult = {};
        }

        const getPath = (obj: any, path: string): any => {
            if (!path) return obj;
            return path.split('.').reduce((acc, key) => {
                if (acc == null || typeof acc !== 'object') return undefined;
                return acc[key];
            }, obj as any);
        };

        try {
            if (condition === 'success') {
                // Consider success when step did not explicitly error or mark as skipped
                if (!safeResult) return false;
                if (safeResult.status && typeof safeResult.status === 'string') {
                    return safeResult.status.toLowerCase() !== 'error' && safeResult.skipped !== true;
                }
                return true;
            }

            if (condition === 'failure') {
                if (!safeResult) return false;
                if (safeResult.status && typeof safeResult.status === 'string') {
                    return safeResult.status.toLowerCase() === 'error';
                }
                return Boolean(safeResult.error);
            }

            if (condition === 'always') {
                return true;
            }

            if (condition.startsWith('data.')) {
                const path = condition.substring(5); // everything after "data."
                const value = getPath(safeResult, path);
                return Boolean(value);
            }

            // Unknown condition kinds are treated as configuration errors, not "true".
            throw new Error(
                `Unknown workflow condition "${condition}". Expected "success", "failure", "always" or "data.<path>".`
            );
        } catch (err) {
            console.error('[WorkflowOrchestrator] Condition evaluation failed', {
                condition,
                error: err instanceof Error ? err.message : String(err),
            });
            return false;
        }
    }

    /**
     * Validate workflow graph for cycles and reachability
     */
    private validateWorkflow(definition: any): void {
        const steps = definition.steps || [];
        const startStepId = definition.startStepId || steps[0]?.id;

        if (!startStepId) throw new Error('Workflow has no starting step');

        if (this.hasCycle(steps, startStepId)) {
            throw new Error('Infinite loop detected in workflow definition. Cycle found.');
        }
    }

    private hasCycle(steps: any[], startStepId: string): boolean {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const check = (nodeId: string): boolean => {
            if (recStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;

            visited.add(nodeId);
            recStack.add(nodeId);

            const step = steps.find(s => s.id === nodeId);
            if (step?.next) {
                for (const edge of (step.next as any[])) {
                    if (check(edge.to)) return true;
                }
            }

            recStack.delete(nodeId);
            return false;
        };

        return check(startStepId);
    }
}

export const workflowOrchestrationService = new WorkflowOrchestrationService();
