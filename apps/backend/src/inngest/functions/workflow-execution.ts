
import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { workflowOrchestrationService } from '../../services/agents/orchestration/workflowOrchestrator';

/**
 * Workflow execution orchestrator
 * Handles Model 2 (Event-Graph/Flow) execution
 */
export const executeWorkflow = inngest.createFunction(
    { id: 'execute-workflow', name: 'Execute Agent Workflow', retries: 3 },
    { event: 'agent/workflow.execute' },
    async ({ event, step }) => {
        const { executionId, workflowId, userId, input } = event.data;

        // 1. Get workflow definition
        const workflow = await step.run('get-workflow-definition', async () => {
            return prisma.agentWorkflow.findUnique({
                where: { id: workflowId }
            });
        });

        if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

        const definition = workflow.definition as any;
        const startStepId = definition.startStepId || definition.steps?.[0]?.id;

        if (!startStepId) throw new Error(`No starting step found for workflow ${workflowId}`);

        // 2. Queue the first step
        await step.sendEvent('trigger-first-step', {
            name: 'agent/workflow.step.execute',
            data: {
                executionId,
                workflowId,
                stepId: startStepId,
                userId,
                input
            }
        });

        return { executionId, status: 'STARTED' };
    }
);

const MAX_DEPTH = 50;
const STEP_TIMEOUT = '10m';
const MAX_FANOUT = 10;

export const executeWorkflowStep = inngest.createFunction(
    { id: 'execute-workflow-step', name: 'Execute Workflow Step', retries: 2 },
    { event: 'agent/workflow.step.execute' },
    async ({ event, step }) => {
        const { executionId, workflowId, stepId, userId, input, depth = 0 } = event.data;

        // 1. Safety Check: Depth limit
        if (depth > MAX_DEPTH) {
            await step.run('fail-execution-budget', async () => {
                await prisma.agentWorkflowExecution.update({
                    where: { id: executionId },
                    data: {
                        status: 'FAILED',
                        endTime: new Date(),
                        error: `Workflow recursion depth exceeded (max ${MAX_DEPTH} steps)`
                    }
                });
            });
            // Graceful termination instead of throwing (to avoid retry storms)
            return { stepId, status: 'TERMINATED_MAX_DEPTH' };
        }

        // 2. Dispatch the step (non-blocking)
        const dispatch = await step.run('dispatch-step', async () => {
            return workflowOrchestrationService.dispatchWorkflowStep(executionId, stepId, input, userId);
        });

        logger.info({
            traceId: executionId,
            executionId,
            workflowId,
            stepId,
            event: 'STEP_DISPATCHED',
            status: 'pending',
            depth,
            messageId: dispatch.messageId,
        });

        // 3. Wait for the agent response event (Durable wait) with explicit timeout.
        // Use `if` (not `match`) so we correlate against the dispatched messageId that
        // is only known after dispatch-step runs, not from the triggering event.
        const responseEvent = await step.waitForEvent('wait-for-agent-response', {
            event: 'agent/message.processed',
            timeout: STEP_TIMEOUT,
            if: `async.data.messageId == "${dispatch.messageId}"`,
        });

        if (!responseEvent) {
            await step.run('handle-step-timeout', async () => {
                await prisma.agentWorkflowExecution.update({
                    where: { id: executionId },
                    data: {
                        status: 'FAILED',
                        endTime: new Date(),
                        error: `Step ${stepId} timed out waiting for agent response`
                    }
                });
            });
            logger.warn({
                traceId: executionId,
                executionId,
                workflowId,
                stepId,
                event: 'STEP_TIMEOUT',
                status: 'timeout',
                depth,
                messageId: dispatch.messageId,
            });
            return { stepId, status: 'TIMEOUT', messageId: dispatch.messageId };
        }

        const result = responseEvent.data.response;

        // 4. Finalize the step (update context)
        await step.run('finalize-step-logic', async () => {
            return workflowOrchestrationService.finalizeStepExecution(executionId, stepId, result);
        });
        logger.info({
            traceId: executionId,
            executionId,
            workflowId,
            stepId,
            event: 'STEP_FINALIZED',
            status: 'success',
            depth,
        });

        // 5. Find next steps based on definition
        const nextSteps = await step.run('evaluate-next-steps', async () => {
            const workflow = await prisma.agentWorkflow.findUnique({
                where: { id: workflowId }
            });
            if (!workflow) return [];

            const definition = workflow.definition as any;
            const currentStep = definition.steps?.find((s: any) => s.id === stepId);

            if (!currentStep || !currentStep.next) return [];

            // Filter next steps by condition
            return currentStep.next.filter((edge: any) => {
                const condition = edge.condition || 'success';
                return workflowOrchestrationService.evaluateCondition(condition, result, {});
            });
        });

        // 6. Fan-out next steps with incremented depth (bounded)
        if (nextSteps.length > 0) {
            if (nextSteps.length > MAX_FANOUT) {
                throw new Error(
                    `Fan-out from step ${stepId} has ${nextSteps.length} branches which exceeds limit of ${MAX_FANOUT}`
                );
            }

            const events = nextSteps.map((edge: any) => ({
                name: 'agent/workflow.step.execute',
                data: {
                    executionId,
                    workflowId,
                    stepId: edge.to,
                    userId,
                    input: result,
                    depth: depth + 1
                }
            }));

            await step.sendEvent('trigger-next-steps', events);
            logger.info({
                traceId: executionId,
                executionId,
                workflowId,
                stepId,
                event: 'STEP_FANOUT',
                status: 'success',
                depth,
                nextSteps: nextSteps.map((e: any) => e.to),
            });
        } else {
            // Workflow complete or reached leaf node
            await step.run('finalize-execution', async () => {
                await prisma.agentWorkflowExecution.update({
                    where: { id: executionId },
                    data: { status: 'COMPLETED', endTime: new Date() }
                });
            });
        }

        return { stepId, status: 'COMPLETED' };
    }
);
