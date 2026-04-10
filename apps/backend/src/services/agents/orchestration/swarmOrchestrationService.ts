import { Injectable, Logger, Inject } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { AgentTaskStatus, WorkforceMode } from '@agentflox/database';
import { agentTaskOrchestrator } from './agentTaskOrchestrator';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { metrics } from '@/monitoring/metrics';
import logger, { createContextLogger } from '@/lib/logger';

export interface SwarmSession {
    id: string;
    workspaceId: string;
    coordinatorId: string;
    status: 'idle' | 'running' | 'paused' | 'stopped';
    config: any;
    conversationId: string; // Always equals sessionId
}

/** Types of swarm messages stored in aiMessage */
export type SwarmMessageType =
    | 'SESSION_STARTED'
    | 'SESSION_STOPPED'
    | 'COORDINATOR_INSPECT'
    | 'COORDINATOR_ASSIGN'
    | 'COORDINATOR_THINK'
    | 'AGENT_STARTED'
    | 'AGENT_PROGRESS'
    | 'AGENT_COMPLETED'
    | 'AGENT_FAILED'
    | 'TASK_QUEUED'
    | 'TASK_COMPLETED'
    | 'TASK_FAILED'
    | 'INTER_AGENT_MSG'
    | 'USER_INTERRUPT'
    | 'CYCLE_IDLE'
    | 'CYCLE_ERROR';

@Injectable()
export class SwarmOrchestrationService {
    private readonly logger = createContextLogger({ service: 'SwarmOrchestration' });
    private readonly sessions = new Map<string, SwarmSession>();
    private readonly timers = new Map<string, NodeJS.Timeout>();

    constructor(@Inject(EventEmitter2) private eventEmitter: EventEmitter2) {}

    /**
     * Start a new swarm session
     */
    async startSwarm(workspaceId: string, coordinatorId: string, sessionId: string, config: any = {}): Promise<string> {
        
        const session: SwarmSession = {
            id: sessionId,
            workspaceId,
            coordinatorId,
            status: 'running',
            conversationId: sessionId, // conversation == session
            config: { ...config, tickInterval: Math.max(2000, config?.tickInterval || 5000) }
        };

        this.sessions.set(sessionId, session);
        metrics.swarmSessionsActive.inc();
        this.logger.info(`Swarm session started`, { sessionId, workspaceId, coordinatorId });

        // Persist + emit
        await this.persistAndEmit(session, 'SESSION_STARTED', {
            label: '🚀 Swarm session started',
            detail: `Coordinator agent is initializing the workforce. Scanning for tasks…`,
            workspaceId,
            coordinatorId,
        });

        // Start the autonomous loop
        this.scheduleCycle(sessionId);

        return sessionId;
    }

    /**
     * Schedule the next coordinator cycle
     */
    private scheduleCycle(sessionId: string, delayMs: number = 5000) {
        const timer = setTimeout(() => this.executeCycle(sessionId), delayMs);
        this.timers.set(sessionId, timer);
    }

    /**
     * Execute a single coordinator cycle (The Tick)
     */
    private async executeCycle(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'running') return;

        try {
            this.logger.debug(`Executing swarm cycle`, { sessionId });

            const startTime = Date.now();

            // 1. Get available tasks specifically scoped to this Swarm Session
            const tasks = await agentTaskOrchestrator.getAvailableTasks(undefined, session.workspaceId, sessionId);
            
            // Update backlog metric
            metrics.swarmTaskBacklog.set({ workspace_id: session.workspaceId, status: 'OPEN' }, tasks.length);

            if (tasks.length === 0) {
                this.logger.debug(`No tasks in backlog. Backing off...`, { sessionId });
                await this.persistAndEmit(session, 'CYCLE_IDLE', {
                    label: '💤 Coordinator idle',
                    detail: 'No pending tasks found. Backing off for 30 seconds…',
                    nextTickIn: 30000,
                });
                this.scheduleCycle(sessionId, 30000);
                return;
            }

            // 2. Coordinator inspects the backlog
            this.logger.info(`Coordinator inspecting tasks`, { sessionId, coordinatorId: session.coordinatorId, taskCount: tasks.length });
            
            const taskList = tasks.slice(0, 5).map((t: any) => `• ${t.title} [${t.status}]${t.agentId ? ` → Agent ${t.agentId.slice(0, 8)}` : ''}`).join('\n');
            await this.persistAndEmit(session, 'COORDINATOR_INSPECT', {
                label: `🧠 Coordinator inspecting ${tasks.length} task${tasks.length !== 1 ? 's' : ''} in backlog`,
                detail: taskList,
                taskCount: tasks.length,
                taskIds: tasks.map((t: any) => t.id),
            });

            // 3. Assign unassigned tasks to agents
            const agentIds: string[] = session.config?.agentIds || [];
            let assignmentIdx = 0;
            for (const task of tasks) {
                if (task.agentId || !agentIds.length) continue;
                const targetAgent = agentIds[assignmentIdx % agentIds.length];
                assignmentIdx++;

                // Update task assignment
                try {
                    await (prisma.agentTask as any).update({
                        where: { id: task.id },
                        data: { agentId: targetAgent, status: AgentTaskStatus.QUEUED, updatedAt: new Date() },
                    });
                    await this.persistAndEmit(session, 'COORDINATOR_ASSIGN', {
                        label: `📋 Task assigned to Agent`,
                        detail: `"${task.title}" → Agent ${targetAgent.slice(0, 8)}…`,
                        taskId: task.id,
                        taskTitle: task.title,
                        agentId: targetAgent,
                        from: 'coordinator',
                        to: targetAgent,
                    });
                } catch (assignErr: any) {
                    this.logger.warn(`Could not assign task ${task.id}: ${assignErr.message}`);
                }
            }

            // 4. Scan for QUEUED tasks and simulate agent processing
            const queuedTasks = await agentTaskOrchestrator.getAvailableTasks(undefined, session.workspaceId, sessionId);
            for (const task of queuedTasks.filter((t: any) => t.status === 'QUEUED' || t.status === 'RUNNING')) {
                await this.persistAndEmit(session, 'AGENT_PROGRESS', {
                    label: `⚙️ Agent processing task`,
                    detail: `"${task.title}" — status: ${task.status}`,
                    taskId: task.id,
                    taskTitle: task.title,
                    agentId: task.agentId,
                    status: task.status,
                    from: task.agentId || 'agent',
                    to: 'coordinator',
                });
            }

            await this.writeAuditLog(sessionId, session.coordinatorId, 'CYCLE_INSPECT', {
                taskCount: tasks.length,
                taskIds: tasks.map((t: any) => t.id)
            });

            metrics.swarmCycleDuration.observe({ coordinator_id: session.coordinatorId }, (Date.now() - startTime) / 1000);
            
            const interval = session.config?.tickInterval || 5000;
            this.scheduleCycle(sessionId, interval);
        } catch (error: any) {
            this.logger.error(`Error in swarm cycle for session ${sessionId}:`, error);
            await this.writeAuditLog(sessionId, session.coordinatorId, 'CYCLE_ERROR', { error: error.message });
            await this.persistAndEmit(session, 'CYCLE_ERROR', {
                label: '⚠️ Coordinator cycle error',
                detail: error.message || 'Unknown error during cycle',
                error: error.message,
            });
            this.scheduleCycle(sessionId, 10000);
        }
    }

    /**
     * Persist a message to the aiMessage table AND emit over SSE
     */
    private async persistAndEmit(session: SwarmSession, type: SwarmMessageType, payload: any): Promise<void> {
        const timestamp = new Date().toISOString();
        const content = payload.label || type;
        const metadata = { swarmEvent: { type, payload, sessionId: session.id, timestamp } };

        // Persist to conversation (ignore errors — don't block the cycle)
        try {
            const conv = await prisma.aiConversation.findUnique({ where: { id: session.conversationId }, select: { id: true } });
            if (conv) {
                await prisma.aiMessage.create({
                    data: {
                        conversationId: session.conversationId,
                        role: 'ASSISTANT',
                        content,
                        metadata: metadata as any,
                    },
                });
                await prisma.aiConversation.update({
                    where: { id: session.conversationId },
                    data: { messageCount: { increment: 1 }, lastMessageAt: new Date(), updatedAt: new Date() },
                });
            }
        } catch (e: any) {
            this.logger.warn(`Failed to persist swarm message (${type}): ${e?.message}`);
        }

        // Always emit over SSE regardless of DB
        this.eventEmitter.emit('swarm.event', {
            sessionId: session.id,
            type,
            payload: { ...payload, timestamp },
            timestamp,
        });
    }

    /**
     * Persist an inter-agent message (called externally e.g. from task worker)
     */
    async recordInterAgentMessage(sessionId: string, from: string, to: string, content: string, extra: any = {}): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        await this.persistAndEmit(session, 'INTER_AGENT_MSG', {
            label: `💬 Agent → Agent`,
            detail: content,
            from,
            to,
            ...extra,
        });
    }

    /**
     * Record task completion (called from task worker)
     */
    async recordTaskCompleted(sessionId: string, taskId: string, taskTitle: string, agentId: string, result: any): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        const resultText = typeof result === 'string' ? result : (result?.summary || result?.output || JSON.stringify(result)).slice(0, 300);
        await this.persistAndEmit(session, 'TASK_COMPLETED', {
            label: `✅ Task completed`,
            detail: `"${taskTitle}" completed by Agent ${agentId.slice(0, 8)}…\nResult: ${resultText}`,
            taskId,
            taskTitle,
            agentId,
            result: resultText,
            from: agentId,
            to: 'coordinator',
        });
    }

    /**
     * Record task failure (called from task worker)
     */
    async recordTaskFailed(sessionId: string, taskId: string, taskTitle: string, agentId: string, error: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        await this.persistAndEmit(session, 'TASK_FAILED', {
            label: `❌ Task failed`,
            detail: `"${taskTitle}" failed — ${error}`,
            taskId,
            taskTitle,
            agentId,
            error,
            from: agentId,
            to: 'coordinator',
        });
    }

    /**
     * Write to the immutable audit log
     */
    private async writeAuditLog(sessionId: string, agentId: string, action: string, metadata: any) {
        try {
            await prisma.agentAuditLog.create({
                data: {
                    agentId,
                    action,
                    changes: {},
                    diff: {},
                    metadata: {
                        ...metadata,
                        sessionId,
                        timestamp: new Date().toISOString()
                    },
                    integrity: 'VERIFIED'
                }
            });
        } catch (error) {
            this.logger.error(`Failed to write audit log for session ${sessionId}:`, error);
        }
    }

    /**
     * Stop a swarm session
     */
    async stopSwarm(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'stopped';
            const timer = this.timers.get(sessionId);
            if (timer) clearTimeout(timer);
            
            this.timers.delete(sessionId);
            this.sessions.delete(sessionId);
            metrics.swarmSessionsActive.dec();
            
            this.logger.info(`Swarm session stopped.`, { sessionId });
            await this.persistAndEmit(session, 'SESSION_STOPPED', {
                label: '🛑 Swarm session stopped',
                detail: 'All agents have been recalled. Session closed.',
            });
        }
    }

    /** Get a running session (for external consumers like task workers) */
    getSession(sessionId: string): SwarmSession | undefined {
        return this.sessions.get(sessionId);
    }
}
