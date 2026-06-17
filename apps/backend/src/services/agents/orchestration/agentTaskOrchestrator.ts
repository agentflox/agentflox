import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { AgentTaskStatus, TaskPriority } from '@agentflox/database';
import { randomUUID } from 'crypto';
import { inngest } from '@/lib/inngest';

export interface CreateAgentTaskParams {
    agentId?: string; // Optional if assigning to a "pool"
    title: string;
    description?: string;
    taskType: any; // AgentTaskType
    priority?: TaskPriority;
    inputData?: any;
    requirements?: string[];
    dependsOn?: string[];
    assignedBy?: string;
    workspaceId?: string;
    metadata?: any;
}

@Injectable()
export class AgentTaskOrchestrator {
    private readonly logger = new Logger(AgentTaskOrchestrator.name);

    /**
     * Check if a task has circular dependencies
     */
    async validateNoDependencyCycles(taskId: string, proposedDependencies: string[]): Promise<boolean> {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = async (currentId: string): Promise<boolean> => {
            if (recStack.has(currentId)) return true; // Cycle detected!
            if (visited.has(currentId)) return false;

            visited.add(currentId);
            recStack.add(currentId);

            // Proposed dependencies apply for the target task; otherwise fetch from DB
            let dependencies: string[] = [];
            if (currentId === taskId) {
                dependencies = proposedDependencies;
            } else {
                const task = await prisma.agentTask.findUnique({
                    where: { id: currentId },
                    select: { dependsOn: true }
                });
                dependencies = (task?.dependsOn as string[]) || [];
            }

            for (const depId of dependencies) {
                if (await dfs(depId)) return true;
            }

            recStack.delete(currentId);
            return false;
        };

        return !(await dfs(taskId));
    }

    /**
     * Create a new task for an agent or a swarm
     */
    async createTask(params: CreateAgentTaskParams): Promise<any> {
        const id = randomUUID();

        // Check for circular dependencies before creation
        if (params.dependsOn && params.dependsOn.length > 0) {
            const isCyclic = !(await this.validateNoDependencyCycles(id, params.dependsOn));
            if (isCyclic) {
                throw new Error(`Circular dependency detected for task: "${params.title}"`);
            }
        }

        // Determine initial status based on dependencies
        const status = params.dependsOn && params.dependsOn.length > 0
            ? AgentTaskStatus.BLOCKED
            : AgentTaskStatus.PENDING;

        const task = await prisma.agentTask.create({
            data: {
                id,
                agentId: params.agentId || null, // Changed from 'swarm_pool' to null
                title: params.title,
                description: params.description,
                taskType: params.taskType,
                priority: params.priority || TaskPriority.NORMAL,
                inputData: params.inputData,
                requirements: params.requirements || [],
                dependsOn: params.dependsOn || [],
                blockedBy: params.dependsOn || [],
                status,
                assignedBy: params.assignedBy,
                workspaceId: params.workspaceId, // Moved out of metadata
                metadata: params.metadata || {} // Added metadata directly
            }
        });

        this.logger.log(`Created agent task ${task.id} (${status}) for agent ${params.agentId || 'Swarm Pool'}`); // Updated log message

        // If not blocked, trigger processing
        if (status === AgentTaskStatus.PENDING) {
            await this.triggerTaskProcessing(task.id);
            if (task.workspaceId) {
                try {
                    const { swarmOrchestrationService } = await import('./swarmOrchestrationService');
                    swarmOrchestrationService.wakeupSessionForWorkspace(task.workspaceId);
                } catch (e) {
                    this.logger.error(`Failed to wakeup swarm session on task creation for workspace ${task.workspaceId}`, e);
                }
            }
        }

        return task;
    }

    /**
     * Mark a task as completed and unblock dependents
     */
    async completeTask(taskId: string, result: any): Promise<void> {
        const task = await prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: AgentTaskStatus.COMPLETED,
                result,
                progress: 100,
                completedAt: new Date(), // Added completedAt
                updatedAt: new Date()
            }
        });

        this.logger.log(`Task ${taskId} completed. Checking for dependents to unblock...`);

        // Find tasks blocked by this one
        const dependents = await prisma.agentTask.findMany({
            where: {
                blockedBy: {
                    has: taskId
                }
            }
        });

        for (const dep of dependents) {
            const remainingBlockedBy = (dep.blockedBy as string[]).filter(id => id !== taskId);
            
            // Append the upstream result to the dependent task's inputData context
            const currentInputData = (dep.inputData as any) || {};
            const upstreamResults = currentInputData.upstreamResults || {};
            upstreamResults[taskId] = typeof result === 'string' ? result : JSON.stringify(result);
            
            const updatedInputData = {
                ...currentInputData,
                upstreamResults
            };

            if (remainingBlockedBy.length === 0) {
                // UNBLOCKED!
                await prisma.agentTask.update({
                    where: { id: dep.id },
                    data: {
                        status: AgentTaskStatus.PENDING,
                        blockedBy: [],
                        inputData: updatedInputData,
                        updatedAt: new Date()
                    }
                });

                this.logger.log(`Unblocked dependent task ${dep.id}`);
                await this.triggerTaskProcessing(dep.id);

                // Wake up the swarm coordinator so it picks up the newly unblocked task immediately
                if (dep.workspaceId) {
                    try {
                        const { swarmOrchestrationService } = await import('./swarmOrchestrationService');
                        await swarmOrchestrationService.wakeupSessionForWorkspace(dep.workspaceId);
                        this.logger.log(`Woke up swarm session for workspace ${dep.workspaceId} after unblocking task ${dep.id}`);
                    } catch (wakeupErr) {
                        this.logger.error(`Failed to wakeup swarm session after unblocking task ${dep.id}: ${wakeupErr}`);
                    }
                }
            } else {
                // Still blocked by others
                await prisma.agentTask.update({
                    where: { id: dep.id },
                    data: {
                        blockedBy: remainingBlockedBy,
                        inputData: updatedInputData,
                        updatedAt: new Date()
                    }
                });
            }
        }
    }

    /**
     * Mark a task as failed and cascade fail all downstream dependents using iterative BFS
     */
    async failTask(taskId: string, errorDetail: string): Promise<void> {
        await prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: AgentTaskStatus.FAILED,
                updatedAt: new Date(),
                metadata: {
                    error: errorDetail
                }
            }
        });

        this.logger.log(`Task ${taskId} failed. Cascading failure/cancellation to all downstream dependents...`);

        const visited = new Set<string>();
        const queue: string[] = [taskId];

        while (queue.length > 0) {
            const currentTaskId = queue.shift()!;
            if (visited.has(currentTaskId)) continue;
            visited.add(currentTaskId);

            // Find all tasks that depend directly on the current failed task
            const dependents = await prisma.agentTask.findMany({
                where: {
                    blockedBy: {
                        has: currentTaskId
                    },
                    status: {
                        notIn: [AgentTaskStatus.FAILED, AgentTaskStatus.CANCELLED, AgentTaskStatus.FAILED_PERMANENTLY]
                    }
                },
                select: { id: true, metadata: true }
            });

            for (const dep of dependents) {
                const updatedMetadata = {
                    ...(dep.metadata as object || {}),
                    failureOrigin: taskId,
                    error: `Upstream dependency task ${currentTaskId} failed: ${errorDetail}`
                };

                await prisma.agentTask.update({
                    where: { id: dep.id },
                    data: {
                        status: AgentTaskStatus.CANCELLED,
                        metadata: updatedMetadata,
                        updatedAt: new Date()
                    }
                });

                this.logger.log(`Cascaded cancellation to task ${dep.id} due to parent failure ${currentTaskId}`);
                queue.push(dep.id);
            }
        }
    }

    /**
     * Trigger agent execution for a pending task
     */
    public async triggerTaskProcessing(taskId: string): Promise<void> {
        const task = await prisma.agentTask.findUnique({
            where: { id: taskId }
        });

        if (!task || task.status !== AgentTaskStatus.PENDING) return;

        // If assigned to a specific agent, trigger that agent
        if (task.agentId) {
            try {
                await inngest.send({
                    name: 'agent/execute',
                    data: {
                        agentId: task.agentId,
                        userId: task.assignedBy || 'system',
                        executionId: randomUUID(), // New execution for this task
                        inputData: {
                            message: `Task Assignment: ${task.title}\nDescription: ${task.description}\nData: ${JSON.stringify(task.inputData)}`,
                            taskId: task.id
                        }
                    }
                });

                await prisma.agentTask.update({
                    where: { id: taskId },
                    data: { status: AgentTaskStatus.QUEUED }
                });
            } catch (inngestError) {
                const isDevFallbackAllowed = 
                    process.env.NODE_ENV === 'development' && 
                    process.env.ALLOW_LOCAL_SWARM_FALLBACK === 'true';

                if (isDevFallbackAllowed) {
                    this.logger.warn(`[SwarmFallback] Inngest unavailable. Invoking local in-memory fallback runner for task ${taskId}.`);
                    await prisma.agentTask.update({
                        where: { id: taskId },
                        data: { 
                            status: AgentTaskStatus.QUEUED,
                            metadata: {
                                ...(task.metadata as object || {}),
                                fallbackMode: true
                            }
                        }
                    });
                } else {
                    this.logger.error(`[SwarmError] Failed to dispatch task ${taskId} to Inngest. Outage detected.`, inngestError);
                    throw new Error(`Orchestrator dispatch failed: Inngest queue is unavailable.`);
                }
            }
        } else {
            // Task is in the pool (agentId is null). Manager agents or idle workers will pick it up via tools.
            this.logger.log(`Task ${taskId} is in the pool, awaiting pick up.`);
        }
    }

    /**
     * Get unblocked tasks for an agent or swarm
     */
    async getAvailableTasks(agentId?: string, workspaceId?: string): Promise<any[]> {
        const where: any = {
            status: AgentTaskStatus.PENDING,
            ...(workspaceId ? { workspaceId } : {}),
        };

        // When a specific agent is requesting tasks, only return tasks assigned to
        // that agent or unassigned tasks. When called from the swarm coordinator
        // (no agentId), return ALL pending tasks for the workspace so the
        // coordinator can inspect and assign them.
        if (agentId) {
            where.OR = [
                { agentId },
                { agentId: null },
            ];
        }

        return prisma.agentTask.findMany({
            where,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
            take: 50,
        });
    }

    /**
     * Atomically claim a task from the pool
     */
    async claimTask(taskId: string, agentId: string): Promise<boolean> {
        try {
            // Atomic update using status as a guard
            const result = await prisma.agentTask.updateMany({
                where: {
                    id: taskId,
                    status: AgentTaskStatus.PENDING,
                    OR: [
                        { agentId: null },
                        { agentId: agentId }
                    ]
                },
                data: {
                    agentId: agentId,
                    status: AgentTaskStatus.QUEUED,
                    updatedAt: new Date()
                }
            });

            if (result.count > 0) {
                this.logger.log(`Agent ${agentId} successfully claimed task ${taskId}`);

                // Trigger actual processing
                await this.triggerTaskProcessing(taskId);
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error(`Error claiming task ${taskId}:`, error);
            return false;
        }
    }

    /**
     * Reclaim tasks that have been stuck in QUEUED for too long (Zombie reaver with retry limits)
     */
    async reapZombieTasks(timeoutMs: number = 1000 * 60 * 15): Promise<number> {
        const threshold = new Date(Date.now() - timeoutMs);

        // Fetch zombie tasks
        const zombies = await prisma.agentTask.findMany({
            where: {
                status: AgentTaskStatus.QUEUED,
                updatedAt: {
                    lt: threshold
                }
            },
            take: 100,
        });

        if (zombies.length === 0) return 0;

        let reapedCount = 0;

        for (const zombie of zombies) {
            const metadata = (zombie.metadata as Record<string, any>) || {};
            const retryCount = (metadata.retryCount || 0) + 1;

            if (retryCount > 3) {
                // DLQ - Fail permanently
                await prisma.agentTask.update({
                    where: { id: zombie.id },
                    data: {
                        status: AgentTaskStatus.FAILED_PERMANENTLY,
                        metadata: {
                            ...metadata,
                            retryCount,
                            error: 'Task execution failed permanently after 3 retry attempts (Zombie Reaped).'
                        },
                        updatedAt: new Date()
                    }
                });
                this.logger.warn(`Zombie task ${zombie.id} failed permanently after 3 retries.`);
            } else {
                // Re-queue
                await prisma.agentTask.update({
                    where: { id: zombie.id },
                    data: {
                        status: AgentTaskStatus.PENDING,
                        metadata: {
                            ...metadata,
                            retryCount
                        },
                        updatedAt: new Date()
                    }
                });
                this.logger.log(`Reclaimed zombie task ${zombie.id} stuck in QUEUED state (attempt ${retryCount}/3).`);
                await this.triggerTaskProcessing(zombie.id);
                reapedCount++;
            }
        }

        return reapedCount;
    }
}

export const agentTaskOrchestrator = new AgentTaskOrchestrator();
