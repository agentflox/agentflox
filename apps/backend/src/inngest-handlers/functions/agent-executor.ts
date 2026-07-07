import { inngest } from '@/lib/inngest';
import { agentExecutorService } from '../../services/agents/arch/agentExecutorService';
import { prisma } from '@/lib/prisma';
import { AgentTaskStatus } from '@agentflox/database';

export const agentExecutorWorkflow = inngest.createFunction(
    {
        id: 'agent-executor-workflow',
        name: 'Agent Executor ReAct Loop',
        retries: 2,
        concurrency: [
            // Fairness: each user can run at most 2 agents simultaneously
            { limit: 2, key: 'event.data.userId' },
            // Reality ceiling: matches IN-XS plan cap (5 account-wide)
            { limit: 5, scope: 'account', key: '"global-agent-ceiling"' },
        ],
        triggers: [{ event: 'agent/executor.requested' }],
        cancelOn: [
            {
                event: 'agent/executor.cancel',
                match: 'data.sessionId',
            }
        ],
    },
    async ({ event, step }) => {
        const data = event.data as {
            runId: string;
            conversationId: string;
            agentId: string;
            message: string;
            userId: string;
            idempotencyKey?: string;
            sessionId?: string;
        };

        const result = await agentExecutorService.executeWorkflow(step, data);

        // If this was triggered by a swarm task, update the task to COMPLETED
        if (data.idempotencyKey?.startsWith('swarm-task-')) {
            const taskId = data.idempotencyKey.replace('swarm-task-', '');
            await step.run(`mark-swarm-task-complete-${taskId}`, async () => {
                console.log(`[Inngest-Swarm] Completing swarm task step ${taskId}. Result payload:`, JSON.stringify(result).slice(0, 300));
                
                const swarmOutputSummary = (result as any)?.response || 'Task completed';

                // Load task to inspect pipeline state
                let agentTask;
                try {
                    agentTask = await prisma.agentTask.findUnique({
                        where: { id: taskId },
                        select: { metadata: true }
                    });
                } catch (err) {
                    console.error(`[Inngest-Swarm] Failed to load agentTask ${taskId}:`, err);
                }

                const metadata = (agentTask?.metadata as any) || {};
                const pipeline = metadata.pipeline || [];
                const currentStepIndex = metadata.currentStepIndex ?? 0;
                const isFinalStep = pipeline.length === 0 || currentStepIndex >= pipeline.length - 1;

                if (!isFinalStep) {
                    // Update intermediate step artifacts, increment index, and set status to PENDING
                    const currentAgentType = pipeline[currentStepIndex];
                    const nextStepIndex = currentStepIndex + 1;
                    
                    const updatedMetadata = {
                        ...metadata,
                        artifacts: {
                            ...(metadata.artifacts || {}),
                            [currentAgentType]: swarmOutputSummary,
                        },
                        stepStatus: 'completed',
                        currentStepIndex: nextStepIndex,
                    };

                    await prisma.agentTask.update({
                        where: { id: taskId },
                        data: {
                            status: AgentTaskStatus.PENDING, // Set to PENDING so coordinator cycle picks it up!
                            progress: Math.round((nextStepIndex / pipeline.length) * 100),
                            metadata: updatedMetadata,
                            updatedAt: new Date(),
                        }
                    });

                    // Trigger/wakeup coordinator cycle for next step
                    try {
                        const { swarmOrchestrationService } = await import('../../services/agents/orchestration/swarmOrchestrationService');
                        const { redis } = await import('@/lib/redis');
                        const sessionKeys = await redis.hkeys('swarm:sessions');
                        for (const sessionId of sessionKeys) {
                            const session = await swarmOrchestrationService.getSession(sessionId);
                            if (session && session.workspaceId) {
                                await swarmOrchestrationService.wakeupSessionForWorkspace(session.workspaceId);
                            }
                        }
                    } catch (e) {
                        console.error('[Inngest-Swarm] Failed to wakeup session for next step', e);
                    }

                    console.log(`[Inngest-Swarm] Step ${currentStepIndex} (${currentAgentType}) completed. Task ${taskId} reset to PENDING for step ${nextStepIndex} (${pipeline[nextStepIndex]})`);
                    return { success: true, stepCompleted: currentStepIndex, nextStep: nextStepIndex };
                }

                // If it is the final step, run the existing backlog task completion logic!
                // Sync with original backlog task if it exists
                try {
                    const originalTaskId = (agentTask?.metadata as any)?.originalTaskId;
                    if (originalTaskId) {
                        console.log(`[Inngest-Swarm] Found originalTaskId ${originalTaskId} for swarm task ${taskId}`);
                        const backlogTask = await prisma.task.findUnique({
                            where: { id: originalTaskId },
                            select: { id: true, listId: true, spaceId: true, workspaceId: true, statusId: true }
                        });
                        
                        if (backlogTask) {
                            let completedStatus = await prisma.taskStatus.findFirst({
                                where: {
                                    listId: backlogTask.listId || undefined,
                                    type: 'COMPLETED'
                                }
                            });
                            
                            if (!completedStatus && backlogTask.spaceId) {
                                completedStatus = await prisma.taskStatus.findFirst({
                                    where: {
                                        spaceId: backlogTask.spaceId,
                                        type: 'COMPLETED'
                                    }
                                });
                            }
                            
                            if (!completedStatus && backlogTask.workspaceId) {
                                completedStatus = await prisma.taskStatus.findFirst({
                                    where: {
                                        workspaceId: backlogTask.workspaceId,
                                        type: 'COMPLETED'
                                    }
                                });
                            }
                            
                            if (!completedStatus) {
                                completedStatus = await prisma.taskStatus.findFirst({
                                    where: {
                                        type: 'COMPLETED'
                                    }
                                });
                            }
                            
                            if (completedStatus) {
                                await prisma.$transaction(async (tx) => {
                                    // 1. Update backlog task status
                                    await tx.task.update({
                                        where: { id: originalTaskId },
                                        data: {
                                            statusId: completedStatus!.id
                                        }
                                    });
                                    
                                    // 2. Create the status change activity log
                                    await tx.taskActivity.create({
                                        data: {
                                            taskId: originalTaskId,
                                            userId: data.userId,
                                            action: 'STATUS_CHANGED',
                                            field: 'statusId',
                                            oldValue: backlogTask.statusId ? String(backlogTask.statusId) : undefined,
                                            newValue: completedStatus!.id
                                        }
                                    });
                                    
                                    // 3. Create a task comment with the swarm execution output/result/summary
                                    const commentContent = `### 🤖 Swarm Agent Execution Result\n\n${swarmOutputSummary}`;
                                    await tx.taskComment.create({
                                        data: {
                                            taskId: originalTaskId,
                                            userId: data.userId,
                                            content: commentContent
                                        }
                                    });
                                    
                                    // 4. Create the COMMENTED activity log
                                    await tx.taskActivity.create({
                                        data: {
                                            taskId: originalTaskId,
                                            userId: data.userId,
                                            action: 'COMMENTED',
                                            field: 'comment'
                                        }
                                    });
                                });
                                console.log(`[Inngest-Swarm] Backlog task ${originalTaskId} successfully updated to completed status and activities recorded.`);
                            } else {
                                console.warn(`[Inngest-Swarm] No COMPLETED status found to update backlog task ${originalTaskId}`);
                            }
                        }
                    }
                } catch (err: any) {
                    console.error(`[Inngest-Swarm] Failed to update backlog task or log activity for swarm task ${taskId}:`, err.message);
                }

                try {
                    const { agentTaskOrchestrator } = await import('../../services/agents/orchestration/agentTaskOrchestrator');
                    await agentTaskOrchestrator.completeTask(taskId, {
                        summary: swarmOutputSummary,
                        runId: data.runId,
                    });
                    console.log(`[Inngest-Swarm] Task ${taskId} successfully updated to COMPLETED via agentTaskOrchestrator`);
                    return { success: true, task: { id: taskId, status: AgentTaskStatus.COMPLETED } };
                } catch (err: any) {
                    console.error(`[Inngest-Swarm] agentTaskOrchestrator.completeTask failed for task ${taskId}:`, err.message);
                    return { success: false, error: err.message };
                }
            });
        }

        return result;
    }
);
