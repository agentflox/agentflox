import os
import re

path = r'c:\Users\datng\agentflox\apps\backend\src\services\agents\orchestration\swarmOrchestrationService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add redis and bullmq imports
imports = '''
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
'''
content = re.sub(r'import \{ EventEmitter \} from \'events\';.*?import \{ inngest \} from \'@/lib/inngest\';', imports.strip(), content, flags=re.DOTALL)

# 2. BullMQ Setup
bullmq_setup = '''
export const swarmCycleQueue = new Queue('swarm-cycles', { connection: redis });

const swarmCycleWorker = new Worker('swarm-cycles', async (job: Job) => {
    const { sessionId } = job.data;
    await swarmOrchestrationService.executeCycle(sessionId);
}, { connection: redis, concurrency: 100 });

swarmCycleWorker.on('error', err => {
    console.error('[SwarmWorker] Error:', err);
});
'''
content = content.replace('export class SwarmOrchestrationService {', bullmq_setup + '\nexport class SwarmOrchestrationService {')

# 3. Replace sessions map and timers
content = re.sub(r'    private readonly sessions = new Map<string, SwarmSession>\(\);\s+private readonly timers = new Map<string, NodeJS\.Timeout>\(\);', '', content)

# 4. Modify constructor to setup redisSub bridging
constructor_replacement = '''
    constructor() {
        this.eventBus.setMaxListeners(0); // Unlimited listeners, no memory leak warnings
        
        // Bridge Redis pub/sub to local eventBus
        redisSub.subscribe('swarm.events', (err, count) => {
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
    }

    async getSession(sessionId: string): Promise<SwarmSession | undefined> {
        const data = await redis.hget('swarm:sessions', sessionId);
        if (data) return JSON.parse(data) as SwarmSession;
        return undefined;
    }

    async saveSession(session: SwarmSession) {
        await redis.hset('swarm:sessions', session.id, JSON.stringify(session));
    }
'''
content = re.sub(r'    constructor\(\) \{.*?\}', constructor_replacement.strip(), content, flags=re.DOTALL)

# 5. Fix startSwarm
content = content.replace('this.sessions.set(sessionId, session);', 'await this.saveSession(session);')
content = content.replace('this.scheduleCycle(sessionId);', 'await this.scheduleCycle(sessionId);')

# 6. Fix scheduleCycle
schedule_replacement = '''
    async scheduleCycle(sessionId: string, delayMs: number = 5000) {
        await swarmCycleQueue.add('tick', { sessionId }, { delay: delayMs, jobId: `tick-${sessionId}`, removeOnComplete: true });
    }
'''
content = re.sub(r'    private scheduleCycle\(sessionId: string, delayMs: number = 5000\) \{.*?\}', schedule_replacement.strip(), content, flags=re.DOTALL)

# 7. Fix executeCycle
content = content.replace('private async executeCycle(sessionId: string)', 'async executeCycle(sessionId: string)')
content = content.replace('const session = this.sessions.get(sessionId);', 'const session = await this.getSession(sessionId);')

# 8. Fix writes to session state
content = content.replace('(session.config as any)._reportedInFlight = alreadyReported;', 'await redis.sadd(`swarm:reported:${sessionId}`, ...Array.from(alreadyReported));')
content = content.replace('const alreadyReported: Set<string> = (session.config as any)?._reportedInFlight || new Set();', '''
            const reportedArray = await redis.smembers(`swarm:reported:${sessionId}`);
            const alreadyReported: Set<string> = new Set(reportedArray);
'''.strip())
content = content.replace('alreadyReported.delete(t.id); // Remove from in-flight tracker', 'await redis.srem(`swarm:reported:${sessionId}`, t.id); // Remove from in-flight tracker')

# 9. Fix _taskResults
content = content.replace('const taskResults: Record<string, any> = (session.config as any)._taskResults || {};', 'const taskResultsStr = await redis.hget(`swarm:taskresults`, sessionId);\n        const taskResults: Record<string, any> = taskResultsStr ? JSON.parse(taskResultsStr) : {};')
content = content.replace('(session.config as any)._taskResults = taskResults;', 'await redis.hset(`swarm:taskresults`, sessionId, JSON.stringify(taskResults));')

# 10. Fix _crossChecked
content = content.replace('const crossChecked: Set<string> = (session.config as any)._crossChecked || new Set();', 'const crossCheckedArr = await redis.smembers(`swarm:crosscheck:${sessionId}`);\n        const crossChecked: Set<string> = new Set(crossCheckedArr);')
content = content.replace('(session.config as any)._crossChecked = crossChecked;', 'await redis.sadd(`swarm:crosscheck:${sessionId}`, taskId);')

# 11. Fix lengthThresholdMet removal
content = re.sub(r'const lengthThresholdMet = resultText\.length > 50; // Fallback legacy gate.*?shouldCrossCheck = isLowConfidence \|\| hasUncertaintyFlags \|\| isCriticalLowConfidence \|\| lengthThresholdMet;', 'shouldCrossCheck = isLowConfidence || hasUncertaintyFlags || isCriticalLowConfidence;', content, flags=re.DOTALL)

# 12. persistAndEmit batched inserts
# Just replace await prisma.aiMessage.create with prisma.aiMessage.create (fire and forget)
content = content.replace('await prisma.aiMessage.create(', 'prisma.aiMessage.create(')
content = content.replace('await prisma.aiConversation.update(', 'prisma.aiConversation.update(')

# 13. redisPub.publish
content = content.replace('''        this.eventBus.emit('swarm.event', {
            sessionId: session.id,
            type,
            payload: { ...payload, timestamp },
            timestamp,
        });''', '''        const evt = {
            sessionId: session.id,
            type,
            payload: { ...payload, timestamp },
            timestamp,
        };
        // Emit locally for convenience
        this.eventBus.emit('swarm.event', evt);
        // Publish to redis for all replicas
        redisPub.publish('swarm.events', JSON.stringify(evt));''')

# Fix emitLiveProgress
content = content.replace('''        this.eventBus.emit('swarm.event', {
            sessionId,
            type: 'AGENT_LIVE_PROGRESS',
            payload: { agentId, taskId, detail, category, timestamp: new Date().toISOString() }
        });''', '''        const evt = {
            sessionId,
            type: 'AGENT_LIVE_PROGRESS',
            payload: { agentId, taskId, detail, category, timestamp: new Date().toISOString() }
        };
        this.eventBus.emit('swarm.event', evt);
        redisPub.publish('swarm.events', JSON.stringify(evt));''')

# 14. Fix broadcast methods
content = content.replace('for (const session of this.sessions.values()) {', '''
        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (!session) continue;
''')

# 15. Fix wakeupSessionForWorkspace
content = content.replace('''    wakeupSessionForWorkspace(workspaceId: string): void {
        for (const session of this.sessions.values()) {
            if (session.workspaceId === workspaceId && session.status === 'running') {
                const timer = this.timers.get(session.id);
                if (timer) {
                    clearTimeout(timer);
                }
                console.log(`[SwarmDebug] Wakeup triggered for session: ${session.id} in workspace: ${workspaceId}. Executing cycle immediately.`);
                this.executeCycle(session.id);
            }
        }
    }''', '''    async wakeupSessionForWorkspace(workspaceId: string): Promise<void> {
        const sessionKeys = await redis.hkeys('swarm:sessions');
        for (const sessionId of sessionKeys) {
            const session = await this.getSession(sessionId);
            if (session && session.workspaceId === workspaceId && session.status === 'running') {
                console.log(`[SwarmDebug] Wakeup triggered for session: ${session.id} in workspace: ${workspaceId}.`);
                await swarmCycleQueue.remove(`tick-${session.id}`); // Remove delayed job
                await this.scheduleCycle(session.id, 0); // Execute immediately
            }
        }
    }''')

# 16. Fix stopSwarm
content = content.replace('''    async stopSwarm(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'stopped';
            const timer = this.timers.get(sessionId);
            if (timer) clearTimeout(timer);
            
            this.timers.delete(sessionId);
            this.sessions.delete(sessionId);''', '''    async stopSwarm(sessionId: string) {
        const session = await this.getSession(sessionId);
        if (session) {
            session.status = 'stopped';
            await this.saveSession(session);
            await swarmCycleQueue.remove(`tick-${sessionId}`);
            await redis.hdel('swarm:sessions', sessionId);''')

# Also fix recordInterAgentMessage (which uses getSession)
content = content.replace('const session = this.sessions.get(sessionId);', 'const session = await this.getSession(sessionId);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done modifying swarmOrchestrationService.ts')
