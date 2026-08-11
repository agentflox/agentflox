import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { inngest } from '@/lib/inngest';
import logger from '@/lib/logger';
import { agentRegistryService } from './agentRegistry';
import { agentCommunicationService } from './agentCommunication';
import { executeTool } from '../core/toolExecutor';
import { getAllToolsSync } from '../registry/toolRegistry';
import { agentExecutorService } from '../arch/agentExecutorService';
import { completeWithDefaultModel } from '@/services/models';

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
     * Map arbitrary workflow context to tool input schema using AI
     */
    private async mapContextToSchemaWithAI(
        context: any,
        schema: any,
        toolName: string,
        userId: string,
    ): Promise<any> {
        if (!schema || !schema.parameters) return context;

        try {
            const prompt = `You are an intelligent data mapper. Your job is to extract and map data from the provided context into the required JSON schema for the tool "${toolName}".
1. YOU MUST EXTRACT THE DATA FROM THE CONTEXT provided below.
2. DO NOT use 'default' values from the schema if the context provides a relevant topic, task, or description.
3. Only if the context is completely empty or completely irrelevant should you fallback to inferring or using a default.
4. Return ONLY valid JSON matching the schema.

Target JSON Schema:
${JSON.stringify(schema.parameters, null, 2)}

Available Context Data:
${typeof context === 'object' ? JSON.stringify(context, null, 2) : context}
`;
            const { completion } = await completeWithDefaultModel({
                userId,
                request: {
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0,
                    max_tokens: 1024,
                    stream: false,
                },
                usageContext: {
                    action: 'GENERATE',
                    metadata: { source: 'workflow_schema_map', toolName },
                },
                skipEntitlement: true,
            });

            const content = completion.choices[0]?.message?.content;
            if (content) {
                const mapped = JSON.parse(content);
                return { ...context, ...mapped };
            }
        } catch (error) {
            logger.warn({ event: 'AI_MAPPING_FAILED', toolName, error: String(error) });
        }
        return context; // fallback to original
    }

    /**
     * Start a workflow execution
     */
    async startWorkflow(
        workflowId: string,
        input: any,
        userId: string,
        opts?: { executionId?: string; rootRunId?: string },
    ): Promise<any> {
        // 1. Get and Validate workflow
        const workflow = await prisma.agentWorkflow.findUnique({
            where: { id: workflowId }
        });

        if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

        const definition = workflow.definition as any;
        this.validateWorkflow(definition);

        const executionId = opts?.executionId ?? randomUUID();
        const rootRunId = opts?.rootRunId ?? executionId;

        // 2. Create execution record
        const execution = await prisma.agentWorkflowExecution.create({
            data: {
                id: executionId,
                workflowId,
                status: 'RUNNING',
                context: { input, rootRunId },
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
                    input,
                    rootRunId,
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
    ): Promise<{ messageId: string; agentId: string; nativeResult?: any }> {
        const execution = await prisma.agentWorkflowExecution.findUnique({
            where: { id: executionId },
            include: { workflow: true }
        });

        if (!execution || !execution.workflow) {
            throw new Error(`Workflow execution ${executionId} not found`);
        }

        const rootRunId =
            ((execution.context as any)?.rootRunId as string | undefined) ?? executionId;

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

        // Native Task Node Execution: taskId with no agentId → activate task, log activity, forward as context
        if (!step.agentId && (step as any).taskId && (step.executionMode as string | undefined) !== 'PLACEHOLDER') {
            const taskId = (step as any).taskId;
            const syntheticMessageId = `native-task-activate-${executionId}-${stepId}`;

            logger.info({
                traceId: executionId,
                executionId,
                workflowId: execution.workflowId,
                stepId,
                event: 'NATIVE_TASK_ACTIVATION',
                taskId,
            });

            // Fetch the full task record from DB
            const taskRecord = await prisma.task.findUnique({
                where: { id: taskId },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    priority: true,
                    dueDate: true,
                    createdAt: true,
                    status: { select: { name: true, color: true } },
                    assignees: {
                        select: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            // Build a structured context payload that the next agent can use
            const previousOutput = typeof input === 'object' && input !== null ? input : { raw: input };
            const taskContext = taskRecord
                ? {
                    taskId: taskRecord.id,
                    title: taskRecord.title,
                    description: taskRecord.description ?? '',
                    priority: taskRecord.priority,
                    dueDate: taskRecord.dueDate?.toISOString() ?? null,
                    status: taskRecord.status?.name ?? null,
                    assignees: taskRecord.assignees
                        .map((a) => a.user?.name)
                        .filter(Boolean),
                    // Include upstream output so the downstream agent has full context
                    upstreamOutput: previousOutput,
                }
                : { taskId, upstreamOutput: previousOutput };

            // Write a TaskActivity entry so the task's activity feed shows the workflow ran through it
            if (taskRecord) {
                try {
                    const activityNote =
                        `Workforce node activated this task.\n\n` +
                        `**Upstream output:**\n${typeof previousOutput.result === 'string'
                            ? previousOutput.result.slice(0, 3000)
                            : JSON.stringify(previousOutput, null, 2).slice(0, 3000)
                        }`;

                    await (prisma as any).taskActivity.create({
                        data: {
                            taskId,
                            userId,
                            action: 'COMMENTED',
                            newValue: activityNote,
                        },
                    });
                } catch (actErr) {
                    logger.warn({ event: 'TASK_ACTIVITY_WRITE_FAILED', taskId, error: String(actErr) });
                }
            }

            const nativeResponse = {
                result: taskContext,
                status: 'COMPLETED',
                stepId,
                taskId,
            };

            await redis.set(
                dispatchKey,
                JSON.stringify({ messageId: syntheticMessageId, agentId: '' }),
                'EX',
                60 * 60 * 24
            );
            return { messageId: syntheticMessageId, agentId: '', nativeResult: nativeResponse };
        }

        // Native Tool Execution (bypassing AI agent)
        if (!step.agentId && (step as any).toolId && (step.executionMode as string | undefined) !== 'PLACEHOLDER') {
            const toolId = (step as any).toolId;
            const syntheticMessageId = `native-tool-execute-${executionId}-${stepId}`;

            // Parse parameters from input
            let parameters: any = {};
            if (typeof input === 'string') {
                try { parameters = JSON.parse(input); }
                catch { parameters = { input }; }
            } else if (typeof input === 'object' && input !== null) {
                parameters = input;
            }

            // Unwrap response envelope from the previous workflow step.
            // Each step's output is wrapped as { result: <actual data>, status: "COMPLETED", stepId: "..." }.
            // We strip that wrapper so the tool's {{inputs.*}} variables resolve against the actual upstream data
            // (e.g. task description, title, etc.) rather than the envelope.
            if (
                parameters &&
                typeof parameters === 'object' &&
                'result' in parameters &&
                'status' in parameters &&
                typeof parameters.status === 'string' &&
                parameters.result !== undefined &&
                parameters.result !== null
            ) {
                parameters = parameters.result;
            }

            // First: try system tool registry (built-in tools by name/id)
            const tools = getAllToolsSync();
            const toolDef = tools.find(t => t.name === toolId || t.id === toolId);

            if (toolDef) {
                logger.info({
                    traceId: executionId,
                    executionId,
                    workflowId: execution.workflowId,
                    stepId,
                    event: 'NATIVE_SYSTEM_TOOL_EXECUTION',
                    toolName: toolDef.name,
                });

                // Use AI to map upstream data into exactly what the tool needs
                const mappedParameters = await this.mapContextToSchemaWithAI(parameters, toolDef.functionSchema, toolDef.name, userId);

                const result = await executeTool(
                    { toolName: toolDef.name, parameters: mappedParameters },
                    userId
                );

                const nativeResponse = {
                    result: result.success ? result.result : undefined,
                    error: result.error,
                    status: result.success ? 'COMPLETED' : 'FAILED',
                    stepId,
                };

                await redis.set(dispatchKey, JSON.stringify({ messageId: syntheticMessageId, agentId: '' }), 'EX', 60 * 60 * 24);
                return { messageId: syntheticMessageId, agentId: '', nativeResult: nativeResponse };
            }

            // Second: try CompositeTool (database-stored tools by UUID)
            const compositeTool = await prisma.compositeTool.findUnique({
                where: { id: toolId },
                select: { id: true, name: true, functionSchema: true },
            });

            if (compositeTool) {
                logger.info({
                    traceId: executionId,
                    executionId,
                    workflowId: execution.workflowId,
                    stepId,
                    event: 'NATIVE_COMPOSITE_TOOL_EXECUTION',
                    toolId: compositeTool.id,
                    toolName: compositeTool.name,
                });

                // Use AI to map upstream data into what the composite tool needs
                const mappedParameters = await this.mapContextToSchemaWithAI(parameters, compositeTool.functionSchema, compositeTool.name, userId);

                await inngest.send({
                    name: 'tool/composite.execute',
                    data: {
                        toolId: compositeTool.id,
                        input: mappedParameters,
                        userId,
                        messageId: syntheticMessageId,
                        stepId,
                        rootRunId,
                        billingExempt: true,
                    }
                });

                await redis.set(dispatchKey, JSON.stringify({ messageId: syntheticMessageId, agentId: '' }), 'EX', 60 * 60 * 24);
                return { messageId: syntheticMessageId, agentId: '' };
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

        // Build a rich prompt so the agent receives task context in a readable format
        let agentContent = `Workflow Step: ${step.name}`;
        const inputObj = typeof input === 'object' && input !== null ? input : {};

        if (inputObj.taskId && inputObj.title) {
            // Upstream was a task node — format a structured brief for the agent
            const lines: string[] = [
                `## Task: ${inputObj.title}`,
            ];
            if (inputObj.description) lines.push(`\n${inputObj.description}`);
            lines.push('');
            if (inputObj.status) lines.push(`**Status:** ${inputObj.status}`);
            if (inputObj.priority) lines.push(`**Priority:** ${inputObj.priority}`);
            if (inputObj.dueDate) lines.push(`**Due:** ${new Date(inputObj.dueDate).toLocaleDateString()}`);
            if (inputObj.assignees?.length) lines.push(`**Assignees:** ${inputObj.assignees.join(', ')}`);

            const upstream = inputObj.upstreamOutput;
            if (upstream) {
                const upText =
                    typeof upstream.result === 'string'
                        ? upstream.result
                        : JSON.stringify(upstream.result ?? upstream, null, 2);
                if (upText && upText.length > 2) {
                    lines.push('');
                    lines.push('---');
                    lines.push('**Context from previous step:**');
                    lines.push(upText.slice(0, 6000));
                }
            }

            agentContent = lines.join('\n');
        } else if (inputObj.result !== undefined || inputObj.response !== undefined) {
            // Generic upstream result — handle both FSM output shape {response} and legacy {result}
            const rawValue = inputObj.result ?? inputObj.response;
            const resultText =
                typeof rawValue === 'string'
                    ? rawValue
                    : JSON.stringify(rawValue ?? inputObj, null, 2);
            agentContent = `Workflow Step: ${step.name}\n\n**Input from previous step:**\n${resultText.slice(0, 6000)}`;
        } else if (typeof input === 'string' && input.length > 0) {
            agentContent = `Workflow Step: ${step.name}\n\n**Input from previous step:**\n${input.slice(0, 6000)}`;
        }

        // Send message to agent via Inngest durable execution
        const messageId = randomUUID();
        const response = await agentExecutorService.triggerExecution(
            selectedAgent.id,
            userId, // Use original userId
            {
                message: agentContent,
                fromAgent: 'system',
            },
            {
                step,
                input,
                context: execution.context,
                executionId,
                messageId // So the executor can emit the processed event back to us
            }
        );

        // Record idempotent dispatch record
        await redis.set(
            dispatchKey,
            JSON.stringify({ messageId, agentId: selectedAgent.id }),
            'EX',
            60 * 60 * 24
        );

        return { messageId, agentId: selectedAgent.id };
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
                // Consider success when step did not explicitly error
                if (!safeResult) return false;
                if (safeResult.status && typeof safeResult.status === 'string') {
                    if (safeResult.status === 'PLACEHOLDER_SKIPPED') return true;
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
