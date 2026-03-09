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
     * Create a new task for an agent or a swarm
     */
    async createTask(params: CreateAgentTaskParams): Promise<any> {
        const id = randomUUID();

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

            if (remainingBlockedBy.length === 0) {
                // UNBLOCKED!
                await prisma.agentTask.update({
                    where: { id: dep.id },
                    data: {
                        status: AgentTaskStatus.PENDING,
                        blockedBy: [],
                        updatedAt: new Date()
                    }
                });

                this.logger.log(`Unblocked dependent task ${dep.id}`);
                await this.triggerTaskProcessing(dep.id);
            } else {
                // Still blocked by others
                await prisma.agentTask.update({
                    where: { id: dep.id },
                    data: {
                        blockedBy: remainingBlockedBy,
                        updatedAt: new Date()
                    }
                });
            }
        }
    }

    /**
     * Trigger agent execution for a pending task
     */
    public async triggerTaskProcessing(taskId: string): Promise<void> {
        const task = await prisma.agentTask.findUnique({
            where: { id: taskId }
            // Removed include block
        });

        if (!task || task.status !== AgentTaskStatus.PENDING) return;

        // If assigned to a specific agent, trigger that agent
        if (task.agentId) { // Changed condition from 'task.agentId && task.agentId !== 'swarm_pool'' to 'task.agentId'
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
        } else {
            // Task is in the pool (agentId is null). Manager agents or idle workers will pick it up via tools.
            this.logger.log(`Task ${taskId} is in the pool, awaiting pick up.`);
        }
    }

    /**
     * Get unblocked tasks for an agent or swarm
     */
    async getAvailableTasks(agentId?: string, workspaceId?: string): Promise<any[]> { // Changed agentId to optional
        return prisma.agentTask.findMany({
            where: {
                status: AgentTaskStatus.PENDING,
                workspaceId: workspaceId || undefined, // Added workspaceId filtering
                OR: [
                    { agentId: agentId || null }, // Changed 'swarm_pool' to null
                    { agentId: null } // Changed 'swarm_pool' to null
                ],
                // Removed comment about metadata filtering
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ]
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
     * Reclaim tasks that have been stuck in QUEUED for too long (Zombie reaver)
     */
    async reapZombieTasks(timeoutMs: number = 1000 * 60 * 15): Promise<number> {
        const threshold = new Date(Date.now() - timeoutMs);

        const result = await prisma.agentTask.updateMany({
            where: {
                status: AgentTaskStatus.QUEUED,
                updatedAt: {
                    lt: threshold
                }
            },
            data: {
                status: AgentTaskStatus.PENDING,
                updatedAt: new Date()
            }
        });

        if (result.count > 0) {
            this.logger.log(`Reclaimed ${result.count} zombie tasks stuck in QUEUED state.`);

            // Trigger processing for these tasks again
            const reapedTasks = await prisma.agentTask.findMany({
                where: {
                    status: AgentTaskStatus.PENDING,
                    updatedAt: {
                        gte: new Date(Date.now() - 1000) // Tasks we just updated
                    }
                },
                select: { id: true }
            });

            for (const task of reapedTasks) {
                await this.triggerTaskProcessing(task.id);
            }
        }

        return result.count;
    }
}

export const agentTaskOrchestrator = new AgentTaskOrchestrator();
