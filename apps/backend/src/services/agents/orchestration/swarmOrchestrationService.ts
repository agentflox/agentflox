import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';
import { AgentTaskStatus } from '@agentflox/database';
import { agentTaskOrchestrator } from './agentTaskOrchestrator';
import { randomUUID } from 'crypto';
import { metrics } from '@/monitoring/metrics';
import { createContextLogger } from '@/lib/logger';
import { inngest } from '@/lib/inngest';
import { redis, redisPub, redisSub } from '@/lib/redis';
import { Queue, Worker, Job } from 'bullmq';
import { swarmMessageBuffer } from './swarmMessageBuffer';
import { openai } from '@/lib/openai';

// ── Phase 3 constants ────────────────────────────────────────────────────────
/** Max concurrent tasks dispatched per workspace per cycle */
const MAX_CONCURRENT_PER_WORKSPACE = 20;
/** How many consecutive TASK_FAILED events before an agent is circuit-broken */
const CIRCUIT_BREAKER_THRESHOLD = 3;
/** How long a tripped circuit stays open (ms) */
const CIRCUIT_BREAKER_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** TTL for a running session in Redis (seconds). Renewed on every cycle. */
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

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
    | 'TASK_CROSS_CHECK'
    | 'INTER_AGENT_MSG'
    | 'USER_INTERRUPT'
    | 'CYCLE_IDLE'
    | 'CYCLE_COMPLETED'
    | 'CYCLE_ERROR'
    | 'AGENT_LIVE_PROGRESS';


// ── BullMQ queue with retry + DLQ policy ────────────────────────────────────
export const swarmCycleQueue = new Queue('swarm-cycles', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },  // keep last 100 completed jobs
        removeOnFail: { count: 500 },      // keep last 500 failed for inspection
    },
});

export const swarmDLQ = new Queue('swarm-cycles-dlq', { connection: redis });

const swarmCycleWorker = new Worker('swarm-cycles', async (job: Job) => {
    const { sessionId } = job.data;
    await swarmOrchestrationService.executeCycle(sessionId);
}, { connection: redis, concurrency: 100 });

swarmCycleWorker.on('error', err => {
    console.error('[SwarmWorker] Error:', err);
});

// Move exhausted jobs to DLQ
swarmCycleWorker.on('failed', async (job, err) => {
    if (!job) return;
    const isExhausted = (job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 1);
    if (isExhausted) {
        console.error(`[SwarmWorker] Job ${job.id} exhausted retries, moving to DLQ:`, err?.message);
        await swarmDLQ.add('dead', { ...job.data, lastError: err?.message, failedAt: new Date().toISOString() });
    }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function gracefulShutdown(signal: string) {
    console.log(`[Swarm] ${signal} received — draining worker and flushing message buffer...`);
    await swarmCycleWorker.close();
    await swarmMessageBuffer.stop();
    console.log('[Swarm] Graceful shutdown complete.');
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

export const TASK_PIPELINES: Record<string, string[]> = {
    "code_feature": ["code_agent", "review_agent"],
    "blog_post": ["blog_agent", "blog_review_agent"],
    "report": ["report_agent", "review_agent"],
};

export function getFriendlyStepName(step: string, agentNamesMap?: Record<string, string>): string {
    if (agentNamesMap && agentNamesMap[step]) {
        return agentNamesMap[step];
    }
    const map: Record<string, string> = {
        blog_agent: "Blog agent",
        blog_review_agent: "Blog review",
        code_agent: "Code agent",
        review_agent: "Review agent",
        report_agent: "Report agent",
        general_agent: "General agent",
    };
    return map[step] || step.replace(/_/g, ' ');
}

export function determineBestPipelineForTask(task: any, profiles: any[]): { type: string; pipeline: string[] } {
    if (!profiles || profiles.length === 0) return { type: 'general', pipeline: ['general_agent'] };

    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
    const taskWords = new Set(taskText.split(/[\s,._-]+/).filter(w => w.length > 3));

    let bestAgent = profiles[0];
    let highestScore = -1;

    for (const p of profiles) {
        let score = 0;
        const profileText = `${p.name} ${p.description || ''} ${p.agentType || ''}`.toLowerCase();
        const profileWords = profileText.split(/[\s,._-]+/).filter(w => w.length > 3);

        // Semantic capability matching
        const caps = (p.capabilities || []).map((c: any) => String(c).toLowerCase());
        for (const cap of caps) {
            if (taskText.includes(cap) || cap.includes(taskText)) score += 50;
        }

        // Jaccard Intersection / Union
        let intersectionSize = 0;
        for (const word of profileWords) {
            if (taskWords.has(word)) {
                intersectionSize++;
            }
        }

        // Exact Role Keyword overrides (if task asks for review, favor reviewer, etc)
        if (taskText.includes('review') && (profileText.includes('review') || profileText.includes('critic') || profileText.includes('qa'))) {
            score += 100;
        }
        if (taskText.includes('write') && (profileText.includes('write') || profileText.includes('content') || profileText.includes('creator'))) {
            score += 100;
        }

        const unionSize = taskWords.size + profileWords.length - intersectionSize;
        const jaccardScore = unionSize > 0 ? (intersectionSize / unionSize) * 50 : 0;
        score += jaccardScore;

        if (score > highestScore) {
            highestScore = score;
            bestAgent = p;
        }
    }

    return { type: 'dynamic', pipeline: [bestAgent.id] };
}

export function findAgentForType(type: string, profiles: any[]): any {
    if (!profiles || profiles.length === 0) return undefined;

    // First, check for exact UUID ID match (dynamic pipeline mapping)
    if (profiles.some(p => p.id === type)) {
        return profiles.find(p => p.id === type);
    }

    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    const cleanType = normalizedType.replace(/_/g, ' ').toLowerCase();

    // Exact agentType / agentRole matching via an alias map
    const typeMap: Record<string, string[]> = {
        code_agent: ['DEVELOPER', 'CODE_AGENT', 'CODE', 'CODE_GENERATOR', 'SOFTWARE_ENGINEER'],
        review_agent: ['CRITIC', 'REVIEWER', 'REVIEW_AGENT', 'QA_TESTER', 'CODE_REVIEWER'],
        blog_agent: ['WRITER', 'BLOG_AGENT', 'CONTENT', 'CONTENT_CREATOR', 'COPYWRITER'],
        blog_review: ['CRITIC', 'REVIEWER', 'EDITOR', 'CONTENT_CREATOR', 'BLOG_REVIEWER'],
        blog_review_agent: ['CRITIC', 'REVIEWER', 'EDITOR', 'CONTENT_CREATOR', 'BLOG_REVIEWER'],
        report_agent: ['RESEARCHER', 'ANALYST', 'REPORT_AGENT'],
        general_agent: ['GENERAL', 'ASSISTANT', 'GENERALIST'],
    };

    // Semantic keyword map — keywords that indicate an agent can handle this step
    const keywordMap: Record<string, string[]> = {
        code_agent: ['code', 'develop', 'engineer', 'program', 'software', 'implement', 'build'],
        review_agent: ['review', 'critic', 'qa', 'test', 'quality', 'audit', 'check'],
        blog_agent: ['blog', 'write', 'writer', 'content', 'article', 'post', 'copy'],
        blog_review: ['review', 'edit', 'editor', 'proofread', 'revise', 'blog'],
        blog_review_agent: ['review', 'edit', 'editor', 'proofread', 'revise', 'blog'],
        report_agent: ['report', 'research', 'analyse', 'analyze', 'analyst', 'summary'],
        general_agent: ['general', 'assistant', 'helper', 'task'],
    };

    const targetTypes = typeMap[normalizedType] || [normalizedType, type];
    const keywords = keywordMap[normalizedType] || [cleanType];

    let bestAgent = undefined;
    let highestScore = -1;

    for (const p of profiles) {
        let score = 0;
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const prompt = (p.systemPrompt || '').toLowerCase();
        const caps = (p.capabilities || []).map((c: any) => String(c).toLowerCase());

        // 1. Exact agentType match
        if (p.agentType && targetTypes.some(t => p.agentType.toUpperCase() === t.toUpperCase())) {
            score += 100;
        }

        // 2. Exact name match
        if (name === cleanType) {
            score += 90;
        }

        // 3. Name contains cleanType (e.g. "code agent" in "senior code agent")
        if (name.includes(cleanType)) {
            score += 70;
        }

        // 4. Name contains all words of cleanType
        const cleanTypeWords = cleanType.split(' ');
        if (cleanTypeWords.every(w => name.includes(w))) {
            score += 50;
        }

        // 5. Name contains individual key words from cleanType (excluding common words like 'agent')
        const significantWords = cleanTypeWords.filter(w => w !== 'agent');
        for (const w of significantWords) {
            if (name.includes(w)) {
                score += 30;
            }
        }

        // 6. Keywords match in Name
        for (const kw of keywords) {
            if (name.includes(kw)) {
                score += 20;
            }
        }

        // 7. Keywords match in capabilities
        for (const kw of keywords) {
            if (caps.some((c: string) => c.includes(kw))) {
                score += 15;
            }
        }

        // 8. Keywords match in description
        for (const kw of keywords) {
            if (desc.includes(kw)) {
                score += 5;
            }
        }

        // 9. Keywords match in system prompt
        for (const kw of keywords) {
            if (prompt.includes(kw)) {
                score += 1;
            }
        }

        if (score > highestScore) {
            highestScore = score;
            bestAgent = p;
        }
    }

    if (highestScore > 0) {
        return bestAgent;
    }

    // Last resort: if only one agent in swarm, use it (avoids total failure)
    if (profiles.length === 1) return profiles[0];

    return undefined;
}

export class SwarmOrchestrationService {
    private readonly logger = createContextLogger({ service: 'SwarmOrchestration' });

    /** Node EventEmitter used for SSE fan-out. Listeners are added per-request. */
    readonly eventBus = new EventEmitter();

    constructor() {
        this.eventBus.setMaxListeners(0);

        // Bridge Redis pub/sub to local eventBus
        redisSub.subscribe('swarm.events', (err) => {
            if (err) console.error('[SwarmRedis] Subscribe error:', err);
        });
        redisSub.on('message', (channel, message) => {
            if (channel === 'swarm.events') {
                try {
                    const evt = JSON.parse(message);
                    this.eventBus.emit('swarm.event', evt);
                } catch (e) {
                    console.error('[SwarmRedis] Parse error:', e);
                }
            }
        });

        // Start the batched DB-write flusher (Phase 3)
        swarmMessageBuffer.start();
    }

    // ── Phase 3 helpers ──────────────────────────────────────────────────────

    /**
     * Per-workspace concurrency gate.
     * Returns true if the workspace has capacity for more dispatches this cycle.
     * Uses an atomic Redis INCR with a 10-second sliding window.
     */
    private async checkWorkspaceRateLimit(workspaceId: string): Promise<boolean> {
        const key = `swarm:ratelimit:${workspaceId}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, 10_000); // 10-second window
        return count <= MAX_CONCURRENT_PER_WORKSPACE;
    }

    /**
     * Circuit breaker — trip an agent after CIRCUIT_BREAKER_THRESHOLD failures.
     * Tripped agents are skipped by the task dispatcher until TTL expires.
     */
    async recordAgentFailure(agentId: string, sessionId: string): Promise<void> {
        const key = `swarm:cb:${sessionId}:${agentId}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, CIRCUIT_BREAKER_TTL_MS);
        if (count >= CIRCUIT_BREAKER_THRESHOLD) {
            this.logger.warn(`[CircuitBreaker] Agent ${agentId} tripped in session ${sessionId} (${count} failures).`);
        }
    }

    async isAgentCircuitBroken(agentId: string, sessionId: string): Promise<boolean> {
        const key = `swarm:cb:${sessionId}:${agentId}`;
        const count = await redis.get(key);
        return (parseInt(count ?? '0', 10)) >= CIRCUIT_BREAKER_THRESHOLD;
    }

    async resetAgentCircuit(agentId: string, sessionId: string): Promise<void> {
        await redis.del(`swarm:cb:${sessionId}:${agentId}`);
    }

    async getSession(sessionId: string): Promise<SwarmSession | undefined> {
        const data = await redis.hget('swarm:sessions', sessionId);
        if (data) return JSON.parse(data) as SwarmSession;
        return undefined;
    }

    async saveSession(session: SwarmSession) {
        await redis.hset('swarm:sessions', session.id, JSON.stringify(session));
        // Renew session TTL every time it is saved
        await redis.expire('swarm:sessions', SESSION_TTL_SECONDS);
    }

    /**
     * Start a new swarm session
     */
    async startSwarm(workspaceId: string, coordinatorId: string, sessionId: string, config: any = {}): Promise<string> {
        console.log(`[SwarmDebug] Starting swarm session: ${sessionId}`, { workspaceId, coordinatorId, config });

        const session: SwarmSession = {
            id: sessionId,
            workspaceId,
            coordinatorId,
            status: 'running',
            conversationId: sessionId, // conversation == session
            config: { ...config, tickInterval: Math.max(2000, config?.tickInterval || 5000) }
        };

        await this.saveSession(session);
        metrics.swarmSessionsActive.inc();
        this.logger.info(`Swarm session started`, { sessionId, workspaceId, coordinatorId });

        // Persist + emit
        console.log(`[SwarmDebug] Persisting SESSION_STARTED for ${sessionId}`);
        await this.persistAndEmit(session, 'SESSION_STARTED', {
            label: '🚀 Swarm session started',
            detail: `Coordinator agent is initializing the workforce. Scanning for tasks…`,
            workspaceId,
            coordinatorId,
        });

        // Start the autonomous loop
        console.log(`[SwarmDebug] Scheduling first cycle for ${sessionId}`);
        await this.scheduleCycle(sessionId);

        return sessionId;
    }

    /**
     * Schedule the next coordinator cycle
     */
    async scheduleCycle(sessionId: string, delayMs: number = 5000) {
        await swarmCycleQueue.add('tick', { sessionId }, { delay: delayMs, jobId: `tick-${sessionId}`, removeOnComplete: true });
    }

    /**
     * Execute a single coordinator cycle (The Tick)
     */
    async executeCycle(sessionId: string) {
        const session = await this.getSession(sessionId);
        if (!session) {
            console.log(`[SwarmDebug] Cycle execution failed: Session ${sessionId} not found in map.`);
            return;
        }
        if (session.status !== 'running') {
            console.log(`[SwarmDebug] Cycle execution skipped: Session ${sessionId} status is ${session.status}.`);
            return;
        }

        try {
            console.log(`[SwarmDebug] === Executing Swarm Cycle for ${sessionId} ===`);
            this.logger.debug(`Executing swarm cycle`, { sessionId });

            const startTime = Date.now();

            // Phase 3: Renew session TTL so long-running sessions don't expire
            await this.saveSession(session);

            // 1. Get available tasks specifically scoped to this Swarm Session
            console.log(`[SwarmDebug] Fetching available tasks for workspace: ${session.workspaceId}`);
            const allPendingTasks = await agentTaskOrchestrator.getAvailableTasks(undefined, session.workspaceId);
            const currentSessionPendingTasks = allPendingTasks.filter((t: any) => t.metadata?.sessionId === sessionId);
            console.log(`[SwarmDebug] Found ${currentSessionPendingTasks.length} pending tasks in backlog for this session.`);

            // Ensure we don't prematurely stop if there are in-flight tasks for this session
            const inFlightCount = await prisma.agentTask.count({
                where: {
                    workspaceId: session.workspaceId,
                    status: { in: [AgentTaskStatus.QUEUED, AgentTaskStatus.RUNNING] },
                    metadata: { path: ['sessionId'], equals: sessionId }
                }
            });

            // Separate unassigned (need assignment) vs already-assigned-but-stuck-pending
            const unassignedTasks = currentSessionPendingTasks.filter((t: any) => !t.agentId);
            const tasks = currentSessionPendingTasks; // full list for inspect

            // Update backlog metric
            metrics.swarmTaskBacklog.set({ workspace_id: session.workspaceId, status: 'OPEN' }, tasks.length);

            const blockedTasks = await prisma.agentTask.findMany({
                where: {
                    workspaceId: session.workspaceId,
                    status: AgentTaskStatus.BLOCKED,
                    metadata: { path: ['sessionId'], equals: sessionId }
                }
            });
            const backlogTasks = [...unassignedTasks, ...blockedTasks];

            if (tasks.length === 0 && inFlightCount === 0 && blockedTasks.length === 0) {
                // We purposefully DO NOT stop the session here. 
                // We keep it running (polling) so the user can interact conversationally 
                // and inject new tasks via chat messages without having to restart.
                await this.scheduleCycle(sessionId, session.config?.tickInterval || 5000);
                return;
            }

            // 2. Coordinator inspects the backlog (show unassigned + blocked)
            if (backlogTasks.length > 0) {
                console.log(`[SwarmDebug] Coordinator inspecting ${backlogTasks.length} backlog task(s)...`);
                const taskList = backlogTasks.slice(0, 5).map((t: any) => `• ${t.title} [${t.status}]`).join('\n');
                await this.persistAndEmit(session, 'COORDINATOR_INSPECT', {
                    label: `🧠 Coordinator inspecting ${backlogTasks.length} backlog task${backlogTasks.length !== 1 ? 's' : ''}`,
                    detail: taskList,
                    taskCount: backlogTasks.length,
                    taskIds: backlogTasks.map((t: any) => t.id),
                });
            }

            // 3. Assign unassigned tasks to agents and fire executor
            const agentIds: string[] = session.config?.agentIds || [];
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validAgentIds = agentIds.filter(id => uuidRegex.test(id));

            // Fetch agent names + descriptions + tools for AI capability routing
            let agentProfiles: any[] = [];
            let agentNamesMap: Record<string, string> = {};
            try {
                if (validAgentIds.length > 0) {
                    agentProfiles = await prisma.aiAgent.findMany({
                        where: { id: { in: validAgentIds } },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            agentType: true,
                            systemPrompt: true,
                            capabilities: true,
                            tools: {
                                select: {
                                    name: true,
                                    description: true
                                }
                            }
                        }
                    }) as any;
                    agentNamesMap = agentProfiles.reduce((acc: any, a) => ({ ...acc, [a.id]: a.name || `Agent ${a.id.slice(0, 8)}` }), {});
                }
            } catch (e) {
                this.logger.warn(`Failed to fetch agent profiles: ${e}`);
            }

            console.log(`[SwarmDebug] Available agents for assignment:`, validAgentIds);

            let assignmentIdx = 0;
            for (const task of unassignedTasks) {
                if (!validAgentIds.length) {
                    console.log(`[SwarmDebug] Skipping task ${task.id}: No valid agent UUIDs configured.`);
                    break;
                }

                // Phase 3: Per-workspace concurrency gate
                const hasCapacity = await this.checkWorkspaceRateLimit(session.workspaceId);
                if (!hasCapacity) {
                    this.logger.warn(`[RateLimit] Workspace ${session.workspaceId} hit max concurrent tasks (${MAX_CONCURRENT_PER_WORKSPACE}). Deferring remaining tasks.`);
                    break;
                }

                // Read task pipeline metadata
                const metadata = (task.metadata as any) || {};
                let pipeline = metadata.pipeline;
                let pipelineType = metadata.pipelineType;
                let currentStepIndex = metadata.currentStepIndex ?? 0;
                let revisionCount = metadata.revision_count ?? 0;
                let artifacts = metadata.artifacts || {};

                if (!pipeline || pipeline.length === 0) {
                    const derived = determineBestPipelineForTask(task, agentProfiles);
                    pipeline = derived.pipeline;
                    pipelineType = derived.type;
                    currentStepIndex = 0;
                    revisionCount = 0;
                    artifacts = {};
                }

                const currentAgentType = pipeline[currentStepIndex];
                let targetAgent = findAgentForType(currentAgentType, agentProfiles);

                // Handle missing agent capability
                if (!targetAgent) {
                    console.warn(`[SwarmCoordinator] No active agent found capable of step "${currentAgentType}" in pipeline.`);

                    await this.persistAndEmit(session, 'TASK_FAILED', {
                        label: `❌ Pipeline execution stalled`,
                        detail: `Stalled on step "${getFriendlyStepName(currentAgentType)}": No active agent in the swarm is capable of handling this type of task. Please add a specialist agent to the swarm.`,
                        taskId: task.id,
                        taskTitle: task.title,
                        error: `No capable agent found in swarm configuration for step: ${getFriendlyStepName(currentAgentType)}`,
                    });

                    await (prisma.agentTask as any).update({
                        where: { id: task.id },
                        data: {
                            status: AgentTaskStatus.FAILED,
                            updatedAt: new Date(),
                            metadata: {
                                ...metadata,
                                pipeline,
                                pipelineType,
                                currentStepIndex,
                                stepStatus: 'failed',
                                error: `No active agent in swarm capable of handling step "${getFriendlyStepName(currentAgentType, agentNamesMap)}"`
                            }
                        }
                    });
                    continue;
                }

                let targetAgentId = targetAgent.id;

                // Phase 3: Circuit breaker — skip agents that are tripped
                if (await this.isAgentCircuitBroken(targetAgentId, sessionId)) {
                    this.logger.warn(`[CircuitBreaker] Agent ${targetAgentId} is circuit-broken, skipping task ${task.id}`);
                    const healthyAgent = await this._findHealthyAgent(validAgentIds, sessionId);
                    if (!healthyAgent) {
                        this.logger.warn(`[CircuitBreaker] All agents are tripped for session ${sessionId}. Deferring.`);
                        break;
                    }
                    targetAgentId = healthyAgent;
                }

                const agentDisplayName = agentNamesMap[targetAgentId] || `Agent ${targetAgentId.slice(0, 8)}…`;
                console.log(`[SwarmDebug] Assigning task ${task.id} ("${task.title}") to agent ${targetAgentId} [Pipeline: ${pipelineType}, Step: ${currentAgentType}]`);

                // Context passing: pass immediate previous step artifact or the original spec
                const previousStep = currentStepIndex > 0 ? pipeline[currentStepIndex - 1] : null;
                const prevArtifact = currentStepIndex > 0 ? artifacts[`step_${currentStepIndex - 1}`] : null;

                let detailText = `Pipeline Active: **${pipeline.map(stepId => getFriendlyStepName(stepId, agentNamesMap)).join(' → ')}**\n\n`;
                if (currentStepIndex > 0 && previousStep) {
                    detailText += `📥 **Context Handoff**: Output of step **${getFriendlyStepName(previousStep, agentNamesMap)}** passed as input to **${agentDisplayName}**.\n\n`;
                }
                detailText += `👉 Coordinator selected **${agentDisplayName}** to handle step **${getFriendlyStepName(currentAgentType, agentNamesMap)}**.`;

                // Emit coordinator thinking / dispatch envelope details
                await this.persistAndEmit(session, 'COORDINATOR_THINK', {
                    label: currentStepIndex === 0
                        ? `🧠 Coordinator starting pipeline`
                        : `🧠 Coordinator dispatching handoff`,
                    detail: detailText,
                    taskId: task.id,
                    taskTitle: task.title,
                    agentId: targetAgentId,
                    agentName: agentDisplayName,
                    message_type: currentAgentType.toUpperCase(),
                    to_agent: currentAgentType,
                    status: 'pending',
                });

                try {
                    console.log(`[SwarmDebug] Updating task ${task.id} to QUEUED and assigning to ${targetAgentId}`);
                    // Update task to QUEUED with assigned agent and pipeline metadata
                    await (prisma.agentTask as any).update({
                        where: { id: task.id },
                        data: {
                            agentId: targetAgentId,
                            status: AgentTaskStatus.QUEUED,
                            updatedAt: new Date(),
                            metadata: {
                                ...metadata,
                                pipeline,
                                pipelineNames: pipeline.map((stepId: string) => getFriendlyStepName(stepId, agentNamesMap)),
                                pipelineType,
                                currentStepIndex,
                                revision_count: revisionCount,
                                max_revisions: 3,
                                artifacts,
                                stepStatus: 'running',
                            }
                        },
                    });

                    const runId = randomUUID();
                    const taskConversationId = `swarm-task-conv-${task.id}`;

                    // Build executor prompt instructions with context mapping (Context window bloat prevention)
                    let executorPrompt = `Swarm Task Assignment:\nTitle: ${task.title}\nDescription: ${task.description || task.title}\n\n`;

                    const inputDataObj = (task.inputData as any) || {};
                    if (inputDataObj.originalTask) {
                        const ot = inputDataObj.originalTask;
                        executorPrompt += `--- Original Task Context ---\n`;
                        if (ot.status?.name) executorPrompt += `Status: ${ot.status.name}\n`;
                        if (ot.priority) executorPrompt += `Priority: ${ot.priority}\n`;
                        if (ot.dueDate) executorPrompt += `Due Date: ${ot.dueDate}\n`;
                        if (ot.timeEstimate) executorPrompt += `Time Estimate: ${ot.timeEstimate}ms\n`;
                        if (ot.tags?.length > 0) executorPrompt += `Tags: ${ot.tags.map((t: any) => t.name).join(', ')}\n`;

                        // Attachments
                        if (ot.attachments?.length > 0) {
                            executorPrompt += `Attachments:\n${ot.attachments.map((a: any) => `- ${a.name} (${a.url})`).join('\n')}\n`;
                        }

                        // Checklists
                        if (ot.checklists?.length > 0) {
                            executorPrompt += `Checklists:\n`;
                            for (const cl of ot.checklists) {
                                executorPrompt += ` - ${cl.name}:\n`;
                                if (cl.items) {
                                    for (const item of cl.items) {
                                        executorPrompt += `    * [${item.resolved ? 'X' : ' '}] ${item.name}\n`;
                                    }
                                }
                            }
                        }

                        executorPrompt += `--- End Original Task Context ---\n\n`;
                    }

                    if (inputDataObj.upstreamResults && Object.keys(inputDataObj.upstreamResults).length > 0) {
                        executorPrompt += `--- Context from Upstream Dependent Tasks ---\n`;
                        for (const [upTaskId, upResult] of Object.entries(inputDataObj.upstreamResults)) {
                            executorPrompt += `Upstream Task Result:\n${upResult}\n\n`;
                        }
                        executorPrompt += `--- End Upstream Context ---\n\n`;
                    }

                    if (prevArtifact) {
                        executorPrompt += `--- Input Artifact from previous step "${getFriendlyStepName(previousStep!, agentNamesMap)}" ---\n${prevArtifact}\n--- End Artifact ---\n\n`;
                    }
                    executorPrompt += `You are working as part of a multi-agent swarm. Peer agents available: ${agentProfiles.filter(p => p.id !== targetAgentId).map(p => p.name).join('; ') || 'none'}. Complete your assigned step thoroughly: "${getFriendlyStepName(currentAgentType, agentNamesMap)}".`;

                    console.log(`[SwarmDebug] Dispatching inngest event agent/executor.requested for runId: ${runId}`);
                    const inngestRes = await inngest.send({
                        name: 'agent/executor.requested',
                        data: {
                            runId,
                            conversationId: taskConversationId,
                            agentId: targetAgentId,
                            message: executorPrompt,
                            userId: session.config?.userId || task.assignedBy || 'system',
                            idempotencyKey: `swarm-task-${task.id}`,
                            sessionId,
                        },
                    });
                    console.log(`[SwarmDebug] Inngest send response:`, inngestRes);

                    await this.persistAndEmit(session, 'COORDINATOR_ASSIGN', {
                        label: `📋 Dispatching task → ${agentDisplayName} started`,
                        detail: `“${task.title}” → ${agentDisplayName} (step: ${getFriendlyStepName(currentAgentType)})`,
                        taskId: task.id,
                        taskTitle: task.title,
                        agentId: targetAgentId,
                        agentName: agentDisplayName,
                        runId,
                        from: 'coordinator',
                        to: targetAgentId,
                    });
                } catch (assignErr: any) {
                    console.error(`[SwarmDebug] Caught error assigning task ${task.id}:`, assignErr);
                    this.logger.warn(`Could not assign task ${task.id}: ${assignErr.message}`);
                }
            }

            await this.writeAuditLog(sessionId, session.coordinatorId, 'CYCLE_INSPECT', {
                taskCount: tasks.length,
                taskIds: tasks.map((t: any) => t.id)
            });

            // 4. Report progress on QUEUED/RUNNING tasks (only if we know their IDs from this session)
            // Avoid querying by metadata JSON path (unreliable); use known task IDs instead
            const allKnownTaskIds = tasks.map((t: any) => t.id);
            const reportedArray = await redis.smembers(`swarm:reported:${sessionId}`);
            const alreadyReported: Set<string> = new Set(reportedArray);

            if (allKnownTaskIds.length > 0) {
                const inFlightTasks = await (prisma.agentTask as any).findMany({
                    where: {
                        id: { in: allKnownTaskIds },
                        status: { in: [AgentTaskStatus.QUEUED, AgentTaskStatus.RUNNING] },
                    },
                    select: { id: true, title: true, agentId: true, status: true, progress: true },
                });

                // Only emit once per task (avoid per-cycle spam)
                for (const t of inFlightTasks) {
                    if (!alreadyReported.has(t.id)) {
                        alreadyReported.add(t.id);
                        const agentDisplayName = agentNamesMap[t.agentId] || `Agent ${t.agentId?.slice(0, 8) || 'Unknown'}`;
                        await this.persistAndEmit(session, 'AGENT_PROGRESS', {
                            label: `⚙️ ${agentDisplayName} working on task`,
                            detail: `Starting execution for task: "${t.title}". Gathering context and preparing tools...`,
                            taskId: t.id,
                            taskTitle: t.title,
                            agentId: t.agentId,
                            agentName: agentDisplayName,
                            status: t.status,
                            from: t.agentId || 'agent',
                            to: 'coordinator',
                        });
                    }
                }
                // Guard: redis SADD requires at least one member — skip if set is empty
                if (alreadyReported.size > 0) {
                    await redis.sadd(`swarm:reported:${sessionId}`, ...Array.from(alreadyReported));
                }

                // 5. Report newly completed tasks
                const completedTasks = await (prisma.agentTask as any).findMany({
                    where: {
                        id: { in: allKnownTaskIds },
                        status: AgentTaskStatus.COMPLETED,
                    },
                    select: { id: true, title: true, agentId: true, result: true, metadata: true },
                });
                for (const t of completedTasks) {
                    if ((t.metadata as any)?.reported) continue;
                    const resultText = typeof t.result === 'string'
                        ? t.result
                        : (t.result as any)?.summary || (t.result as any)?.output || JSON.stringify(t.result || {});
                    const agentDisplayName = agentNamesMap[t.agentId] || `Agent ${t.agentId?.slice(0, 8) || 'Unknown'}`;
                    await this.persistAndEmit(session, 'TASK_COMPLETED', {
                        label: `✅ Task completed by ${agentDisplayName}`,
                        detail: `"${t.title}"\n${String(resultText)}`,
                        taskId: t.id,
                        taskTitle: t.title,
                        agentId: t.agentId,
                        agentName: agentDisplayName,
                        from: t.agentId || 'agent',
                        to: 'coordinator',
                    });
                    // Mark reported to suppress duplicates
                    await (prisma.agentTask as any).update({
                        where: { id: t.id },
                        data: { metadata: { ...(t.metadata as any), reported: true } },
                    });
                    await redis.srem(`swarm:reported:${sessionId}`, t.id); // Remove from in-flight tracker
                }
            }


            metrics.swarmCycleDuration.observe({ coordinator_id: session.coordinatorId }, (Date.now() - startTime) / 1000);

            // Slow tick when there is still unassigned or in-flight work; otherwise back off
            const hasWork = unassignedTasks.length > 0 || ((session.config as any)?._reportedInFlight?.size ?? 0) > 0;
            const interval = hasWork ? (session.config?.tickInterval || 7000) : 30000;
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
     * Persist a message to the aiMessage table (via batched buffer) AND emit over SSE.
     * The message buffer flushes every 2s with createMany — single DB round-trip per session.
     */
    private async persistAndEmit(session: SwarmSession, type: SwarmMessageType, payload: any): Promise<void> {
        const timestamp = new Date().toISOString();
        const content = payload.label || type;
        const metadata = { swarmEvent: { type, payload, sessionId: session.id, timestamp } };

        console.log(`[SwarmDebug] [${type}] Emitting event for session ${session.id}`, { label: payload.label });

        // Phase 3: Buffer the DB write instead of calling prisma directly
        // swarmMessageBuffer flushes with createMany every 2s or when buffer hits 20 messages
        swarmMessageBuffer.push(session.conversationId, content, metadata).catch(err =>
            this.logger.warn(`Buffer push failed (${type}): ${err?.message}`)
        );

        // Always emit over SSE regardless of DB
        const evt = {
            sessionId: session.id,
            type,
            payload: { ...payload, timestamp },
            timestamp,
        };
        // Emit locally for convenience
        this.eventBus.emit('swarm.event', evt);
        // Publish to redis for all replicas
        redisPub.publish('swarm.events', JSON.stringify(evt));
    }

    /**
     * Persist an inter-agent message (called externally e.g. from task worker)
     */
    async recordInterAgentMessage(sessionId: string, from: string, to: string, content: string, extra: any = {}): Promise<void> {
        const session = await this.getSession(sessionId);
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
     * Record task completion with cross-check routing.
     */
    async recordTaskCompleted(sessionId: string, taskId: string, taskTitle: string, agentId: string, result: any, suggestedActions?: any[], artifacts: any[] = []): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) {
            // Try broadcasting to all active sessions
            await this.broadcastTaskCompletedForTask(taskId, taskTitle, agentId, result, suggestedActions, artifacts);
            return;
        }
        await this._recordTaskCompletedOnSession(session, taskId, taskTitle, agentId, result, suggestedActions, artifacts);
    }

    private async _recordTaskCompletedOnSession(session: SwarmSession, taskId: string, taskTitle: string, agentId: string, result: any, suggestedActions?: any[], artifacts: any[] = []): Promise<void> {
        // Resolve agent name
        let agentName = `Agent ${agentId.slice(0, 8)}`;
        try {
            const agent = await prisma.aiAgent.findUnique({ where: { id: agentId }, select: { name: true } });
            if (agent?.name) agentName = agent.name;
        } catch { /* non-fatal */ }

        const resultText = typeof result === 'string' ? result : (result?.summary || result?.output || JSON.stringify(result));

        // Load task to inspect pipeline state
        let dbTask;
        try {
            dbTask = await prisma.agentTask.findUnique({
                where: { id: taskId },
                select: { metadata: true }
            });
        } catch (err) {
            this.logger.error(`Failed to load task for completion inspection: ${err}`);
        }

        const metadata = (dbTask?.metadata as any) || {};
        const pipeline = metadata.pipeline || [];
        const currentStepIndex = metadata.currentStepIndex ?? 0;
        const isFinalStep = pipeline.length === 0 || currentStepIndex >= pipeline.length - 1;

        if (!isFinalStep) {
            // This is an intermediate step completion!
            const currentAgentType = pipeline[currentStepIndex];

            // Post Step Completed / Progress event to the bus
            await this.persistAndEmit(session, 'AGENT_PROGRESS', {
                label: `✅ ${agentName} finished step "${getFriendlyStepName(currentAgentType)}"`,
                detail: `Step output generated (${resultText.length} chars). Handing off to next stage.`,
                taskId,
                taskTitle,
                agentId,
                agentName,
                status: 'completed',
                from: agentId,
                to: 'coordinator',
            });

            // Store intermediate result in session task results for tracking
            const taskResultsStr = await redis.hget(`swarm:taskresults`, session.id);
            const taskResults: Record<string, any> = taskResultsStr ? JSON.parse(taskResultsStr) : {};
            taskResults[`${taskId}_step_${currentStepIndex}`] = { result: resultText, agentId, agentName, completedAt: new Date().toISOString() };
            await redis.hset(`swarm:taskresults`, session.id, JSON.stringify(taskResults));

            // Advance pipeline and clear agent for assignment in the next cycle!
            const nextStepIndex = currentStepIndex + 1;
            const artifacts = metadata.artifacts || {};
            artifacts[`step_${currentStepIndex}`] = resultText;

            try {
                await (prisma.agentTask as any).update({
                    where: { id: taskId },
                    data: {
                        agentId: null,
                        status: AgentTaskStatus.PENDING,
                        metadata: {
                            ...metadata,
                            currentStepIndex: nextStepIndex,
                            artifacts,
                        }
                    }
                });
            } catch (err) {
                this.logger.error(`Failed to update intermediate task state: ${err}`);
            }

            console.log(`[SwarmOrchestration] Intermediate step ${currentStepIndex} (${currentAgentType}) completed by agent ${agentId} for task ${taskId}. Handing off to step ${nextStepIndex}.`);
            return;
        }

        // Otherwise, it is the final step! Mark the task fully completed!
        await this.persistAndEmit(session, 'TASK_COMPLETED', {
            label: `✅ Task completed by ${agentName}`,
            detail: `"${taskTitle}" completed!\n\n${resultText}`,
            taskId,
            taskTitle,
            agentId,
            agentName,
            result: resultText,
            suggestedActions,
            artifacts,
            from: agentId,
            to: 'coordinator',
        });

        try {
            await agentTaskOrchestrator.completeTask(taskId, resultText);
        } catch (err) {
            this.logger.error(`Failed to mark AgentTask completed in DB: ${err}`);
        }

        // Schedule an immediate coordinator cycle to pick up any newly unblocked tasks
        // Use a short delay (1.5s) to let DB writes settle before the cycle queries
        try {
            await this.scheduleCycle(session.id, 1500);
        } catch (err) {
            this.logger.warn(`Failed to schedule immediate cycle after task completion: ${err}`);
        }

        if (metadata.originalTaskId) {
            try {
                const originalTaskId = metadata.originalTaskId;
                const taskObj = await prisma.task.findUnique({
                    where: { id: originalTaskId },
                    include: { list: { include: { statuses: true } } }
                });

                if (taskObj?.list?.statuses) {
                    const completedStatus = taskObj.list.statuses.find(s => ['completed', 'done', 'finished'].includes(s.name.toLowerCase()));
                    await (prisma as any).$transaction(async (tx: any) => {
                        if (completedStatus) {
                            await tx.task.update({
                                where: { id: originalTaskId },
                                data: { statusId: completedStatus.id }
                            });
                            await tx.taskActivity.create({
                                data: {
                                    taskId: originalTaskId,
                                    userId: session.config?.userId || 'system',
                                    action: "STATUS_CHANGED",
                                    newValue: completedStatus.name,
                                }
                            });
                        }
                        await tx.taskActivity.create({
                            data: {
                                taskId: originalTaskId,
                                userId: session.config?.userId || 'system',
                                action: "COMMENTED",
                                newValue: `Swarm Execution Summary:\n\n${resultText.slice(0, 5000)}`,
                            }
                        });
                    });
                    console.log(`[SwarmOrchestration] Updated original backlog task ${originalTaskId} and activity log`);
                } else {
                    await (prisma as any).taskActivity.create({
                        data: {
                            taskId: originalTaskId,
                            userId: session.config?.userId || 'system',
                            action: "COMMENTED",
                            newValue: `Swarm Execution Summary:\n\n${resultText.slice(0, 5000)}`,
                        }
                    });
                }
            } catch (err) {
                console.error(`Failed to update original backlog task: ${err}`);
            }
        }

        // Store result in session for cross-checking / synthesis
        const taskResultsStr = await redis.hget(`swarm:taskresults`, session.id);
        const taskResults: Record<string, any> = taskResultsStr ? JSON.parse(taskResultsStr) : {};
        taskResults[taskId] = { result: resultText, agentId, agentName, completedAt: new Date().toISOString() };
        await redis.hset(`swarm:taskresults`, session.id, JSON.stringify(taskResults));

        // Coordinator decides next step
        await this._coordinatorEvaluateCompletion(session, taskId, taskTitle, agentId, agentName, resultText);
    }

    /**
     * Coordinator evaluates a completed task and optionally routes for cross-check.
     */
    private async _coordinatorEvaluateCompletion(
        session: SwarmSession, taskId: string, taskTitle: string,
        agentId: string, agentName: string, resultText: string
    ): Promise<void> {
        const agentIds: string[] = session.config?.agentIds || [];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validAgentIds = agentIds.filter(id => uuidRegex.test(id));
        const peers = validAgentIds.filter(id => id !== agentId);

        // Fetch task to check output metadata confidence score
        let confidenceScore = 1.0;
        let selfReflectiveFlags: string[] = [];
        let taskType = 'CUSTOM';
        try {
            const dbTask = await prisma.agentTask.findUnique({
                where: { id: taskId },
                select: { taskType: true, metadata: true }
            });
            if (dbTask) {
                taskType = dbTask.taskType;
                const metadata = (dbTask.metadata as Record<string, any>) || {};
                confidenceScore = typeof metadata.confidenceScore === 'number' ? metadata.confidenceScore : 1.0;
                selfReflectiveFlags = Array.isArray(metadata.selfReflectiveFlags) ? metadata.selfReflectiveFlags : [];
            }
        } catch (err) {
            this.logger.warn(`Failed to inspect task metadata for confidence: ${err}`);
        }

        const crossCheckedArr = await redis.smembers(`swarm:crosscheck:${session.id}`);
        const crossChecked: Set<string> = new Set(crossCheckedArr);

        // 1. Primary Trigger: Confidence Score below threshold or self-reflective uncertainty flags
        // 2. Secondary Trigger: High-value task types with confidence below strict threshold (0.95)
        const criticalTaskTypes = ['REVIEW_CODE', 'ANALYZE_DATA', 'RESEARCH', 'GENERATE_REPORT'];
        const isCriticalType = criticalTaskTypes.includes(taskType);

        let shouldCrossCheck = peers.length > 0 && !crossChecked.has(taskId);
        if (shouldCrossCheck) {
            const hasUncertaintyFlags = selfReflectiveFlags.length > 0;
            const isLowConfidence = confidenceScore < 0.85;
            const isCriticalLowConfidence = isCriticalType && confidenceScore < 0.95;
            shouldCrossCheck = isLowConfidence || hasUncertaintyFlags || isCriticalLowConfidence;
        }

        if (shouldCrossCheck) {
            crossChecked.add(taskId);
            await redis.sadd(`swarm:crosscheck:${session.id}`, taskId);

            // Resolve peer profiles to perform weighted Jaccard keyword capability matching
            let reviewerAgentId = peers[0];
            let reviewerName = `Agent ${reviewerAgentId.slice(0, 8)}`;
            try {
                const peerProfiles = await prisma.aiAgent.findMany({
                    where: { id: { in: peers } },
                    select: { id: true, name: true, description: true, agentType: true }
                });

                if (peerProfiles.length > 0) {
                    // Match peer profiles based on similarity to completed task title + description + result snippet
                    const taskText = `${taskTitle} ${resultText.slice(0, 200)}`.toLowerCase();
                    const taskWords = new Set(taskText.split(/\s+/).filter(w => w.length > 4));

                    let highestScore = -1;
                    let matchedProfile = peerProfiles[0];

                    for (const profile of peerProfiles) {
                        const profileText = `${profile.name} ${profile.description || ''} ${profile.agentType}`.toLowerCase();
                        const profileWords = profileText.split(/\s+/).filter(w => w.length > 4);

                        // Jaccard Intersection / Union
                        let intersectionSize = 0;
                        for (const word of profileWords) {
                            if (taskWords.has(word)) {
                                intersectionSize++;
                            }
                        }
                        const unionSize = taskWords.size + profileWords.length - intersectionSize;
                        const jaccardScore = unionSize > 0 ? (intersectionSize / unionSize) : 0;

                        if (jaccardScore > highestScore) {
                            highestScore = jaccardScore;
                            matchedProfile = profile;
                        }
                    }

                    reviewerAgentId = matchedProfile.id;
                    reviewerName = matchedProfile.name || `Agent ${reviewerAgentId.slice(0, 8)}`;
                }
            } catch (peerErr) {
                this.logger.warn(`Failed to execute capability matching for QA peer selection: ${peerErr}`);
                // Fallback to round-robin/first peer if matching throws
                reviewerAgentId = peers[0];
            }

            await this.persistAndEmit(session, 'COORDINATOR_THINK', {
                label: `🧠 Coordinator routing for cross-check`,
                detail: `Task “${taskTitle}” completed with confidence ${confidenceScore} (uncertainty: ${selfReflectiveFlags.join(', ') || 'none'}). Dynamic routing matched expert **${reviewerName}** for review.`,
                taskId,
                taskTitle,
                from: agentId,
                to: reviewerAgentId,
                reviewerName,
            });

            // Fire cross-check as a new swarm task conversation
            const crossCheckRunId = randomUUID();
            const crossCheckConvId = `swarm-task-conv-${taskId}-review-${crossCheckRunId.slice(0, 8)}`;
            await inngest.send({
                name: 'agent/executor.requested',
                data: {
                    runId: crossCheckRunId,
                    conversationId: crossCheckConvId,
                    agentId: reviewerAgentId,
                    message: `Cross-Check Assignment from Coordinator:\n\nPlease review the following work completed by ${agentName} for task “${taskTitle}”.\n\n--- Work to Review ---\n${resultText.slice(0, 800)}\n--- End of Work ---\n\nProvide a quality assessment: Is this correct and complete? If not, identify issues.`,
                    userId: session.config?.userId || 'system',
                    idempotencyKey: `swarm-crosscheck-${taskId}-${reviewerAgentId}`,
                    sessionId: session.id,
                },
            });

            await this.persistAndEmit(session, 'TASK_CROSS_CHECK', {
                label: `🔍 ${reviewerName} reviewing ${agentName}’s work`,
                detail: `Cross-checking “${taskTitle}”`,
                taskId,
                taskTitle,
                reviewerAgentId,
                reviewerName,
                originalAgentId: agentId,
                originalAgentName: agentName,
                from: 'coordinator',
                to: reviewerAgentId,
            });
        } else {
            // No cross-check needed — coordinator acknowledges completion
            await this.persistAndEmit(session, 'COORDINATOR_THINK', {
                label: `🧠 Coordinator acknowledging completion`,
                detail: `Task “${taskTitle}” by ${agentName} accepted (confidence: ${confidenceScore}). No peer review needed.`,
                taskId,
                taskTitle,
                agentId,
                agentName,
            });
        }
    }

    /**
     * Record task failure (called from task worker)
     */
    async recordTaskFailed(sessionId: string, taskId: string, taskTitle: string, agentId: string, error: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) return;

        // Phase 3: Increment circuit breaker counter for this agent
        await this.recordAgentFailure(agentId, sessionId);
        const tripped = await this.isAgentCircuitBroken(agentId, sessionId);
        if (tripped) {
            this.logger.warn(`[CircuitBreaker] Agent ${agentId} circuit TRIPPED after repeated failures in session ${sessionId}`);
        }

        await this.persistAndEmit(session, 'TASK_FAILED', {
            label: `❌ Task failed${tripped ? ' (agent circuit-broken)' : ''}`,
            detail: `"${taskTitle}" failed — ${error}${tripped ? `\n⚡ Agent paused for ${CIRCUIT_BREAKER_TTL_MS / 60000} minutes.` : ''}`,
            taskId,
            taskTitle,
            agentId,
            error,
            circuitTripped: tripped,
            from: agentId,
            to: 'coordinator',
        });
    }

    /**
     * Phase 3: Find the first agent in the pool that is NOT circuit-broken.
     * Returns undefined if all agents are currently tripped.
     */
    private async _findHealthyAgent(agentIds: string[], sessionId: string): Promise<string | undefined> {
        for (const id of agentIds) {
            const broken = await this.isAgentCircuitBroken(id, sessionId);
            if (!broken) return id;
        }
        return undefined;
    }

    /**
     * Emit a live progress event without persisting it to the database.
     * category: 'step' | 'thinking' | 'tool_call' | 'tool_result' | 'comm'
     */
    emitLiveProgress(sessionId: string, agentId: string, taskId: string, detail: string, category: string = 'step') {
        const evt = {
            sessionId,
            type: 'AGENT_LIVE_PROGRESS',
            payload: { agentId, taskId, detail, category, timestamp: new Date().toISOString() }
        };
        this.eventBus.emit('swarm.event', evt);
        redisPub.publish('swarm.events', JSON.stringify(evt));
    }

    /**
     * Emit live progress for a task to any active local session.
     */
    async emitLiveProgressForTask(taskId: string, agentId: string, detail: string, category: string = 'step') {
        const task = await prisma.agentTask.findUnique({
            where: { id: taskId },
            select: { metadata: true, workspaceId: true }
        });
        const targetSessionId = (task?.metadata as any)?.sessionId;

        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;

            if (targetSessionId && session.id !== targetSessionId) continue;
            if (!targetSessionId && task?.workspaceId && session.workspaceId !== task.workspaceId) continue;

            this.emitLiveProgress(session.id, agentId, taskId, detail, category);
            if (targetSessionId) break;
        }
    }

    /**
     * Broadcast task completion to all active sessions (no sessionId lookup required).
     */
    async broadcastTaskCompletedForTask(taskId: string, taskTitle: string, agentId: string, result: string, suggestedActions?: any[], artifacts: any[] = []) {
        const task = await prisma.agentTask.findUnique({
            where: { id: taskId },
            select: { metadata: true, workspaceId: true }
        });
        const targetSessionId = (task?.metadata as any)?.sessionId;

        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;

            if (targetSessionId && session.id !== targetSessionId) continue;
            if (!targetSessionId && task?.workspaceId && session.workspaceId !== task.workspaceId) continue;

            await this.recordTaskCompleted(session.id, taskId, taskTitle, agentId, result, suggestedActions, artifacts);
            if (targetSessionId) break;
        }
    }

    /**
     * Broadcast task failure to all active sessions.
     */
    async broadcastTaskFailedForTask(taskId: string, taskTitle: string, agentId: string, error: string) {
        const task = await prisma.agentTask.findUnique({
            where: { id: taskId },
            select: { metadata: true, workspaceId: true }
        });
        const targetSessionId = (task?.metadata as any)?.sessionId;

        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;

            if (targetSessionId && session.id !== targetSessionId) continue;
            if (!targetSessionId && task?.workspaceId && session.workspaceId !== task.workspaceId) continue;

            await this.recordTaskFailed(session.id, taskId, taskTitle, agentId, error);
            if (targetSessionId) break;
        }
    }

    /**
     * Broadcast an inter-agent message to any active local session.
     */
    async broadcastInterAgentMessage(fromAgentId: string, toAgentId: string, content: string) {
        let fromName = `Agent ${fromAgentId.slice(0, 8)}`;
        let toName = `Agent ${toAgentId.slice(0, 8)}`;

        try {
            const agents = await prisma.aiAgent.findMany({
                where: { id: { in: [fromAgentId, toAgentId] } },
                select: { id: true, name: true }
            });
            const fromAgent = agents.find(a => a.id === fromAgentId);
            const toAgent = agents.find(a => a.id === toAgentId);
            if (fromAgent?.name) fromName = fromAgent.name;
            if (toAgent?.name) toName = toAgent.name;
        } catch (e) {
            this.logger.warn(`Failed to resolve agent names for broadcast: ${e}`);
        }


        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;

            await this.persistAndEmit(session, 'INTER_AGENT_MSG', {
                label: `💬 Agent message`,
                detail: content,
                from: fromAgentId,
                to: toAgentId,
                fromName,
                toName,
                content: content,
            });
            // Also stream inline on the sender's agent card
            this.emitLiveProgress(session.id, fromAgentId, `comm-${fromAgentId}`, `→ ${toName}: ${content.slice(0, 120)}`, 'comm');
        }
    }

    /**
     * Wake up any running swarm sessions scoped to a specific workspace.
     * This bypasses the long backoff timer if a new task has been created or assigned.
     */
    async wakeupSessionForWorkspace(workspaceId: string): Promise<void> {

        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;

            if (session.workspaceId === workspaceId && session.status === 'running') {
                await swarmCycleQueue.remove(`tick-${session.id}`);
                console.log(`[SwarmDebug] Wakeup triggered for session: ${session.id} in workspace: ${workspaceId}. Executing cycle immediately.`);
                await this.scheduleCycle(session.id, 0);
            }
        }
    }

    /**
     * Write to the immutable audit log
     */
    private async writeAuditLog(sessionId: string, agentId: string, action: string, metadata: any) {
        // Only write audit log if agentId is a valid UUID, as the database schema requires it.
        // 'coordinator' or other internal virtual agent IDs will be skipped.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(agentId)) {
            return;
        }

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
        const session = await this.getSession(sessionId);
        if (session) {
            session.status = 'stopped';
            await this.saveSession(session);
            await swarmCycleQueue.remove(`tick-${sessionId}`);
            await redis.hdel('swarm:sessions', sessionId);
            metrics.swarmSessionsActive.dec();

            // Cancel running agent executor and operator workflows in Inngest for this session
            await inngest.send([
                {
                    name: 'agent/executor.cancel',
                    data: { sessionId }
                },
                {
                    name: 'agent/operator.cancel',
                    data: { sessionId }
                }
            ]).catch(err => {
                this.logger.error(`Failed to dispatch Inngest cancellation events for session ${sessionId}:`, err);
            });

            this.logger.info(`Swarm session stopped.`, { sessionId });
            await this.persistAndEmit(session, 'SESSION_STOPPED', {
                label: '🛑 Swarm session stopped',
                detail: 'All agents have been recalled. Session closed. Active workflows terminated.',
            });
        }
    }


}

export const swarmOrchestrationService = new SwarmOrchestrationService();
