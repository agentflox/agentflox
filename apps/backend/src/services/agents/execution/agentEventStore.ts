/**
 * Agent Event Store
 *
 * Wires up the existing `AgentEvent` schema (agentEvents.ts) to persistent
 * storage so every step of every run is auditable and replayable.
 *
 * Storage strategy:
 *  PRIMARY  → Postgres `AgentRunEvent` table (append-only, survives crashes)
 *  SECONDARY → Redis sorted-set  run:{runId}:events  scored by timestamp ms
 *              (fast hot-path read within 1h window, then falls to Postgres)
 *
 * This replaces the lossy `redis.setex(runKey, 3600, ...)` single-key approach
 * which only kept the *latest* status and was evicted after 1 hour.
 */

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';
import { AgentEvent, EventType } from './agentEvents';

const REDIS_EVENT_TTL_SECONDS = 3_600; // 1-hour hot cache
const REDIS_EVENT_KEY_PREFIX = 'run:events:';
const SCHEMA_VERSION = '1.0';

// ─── Build ────────────────────────────────────────────────────────────────────

export function buildEvent(
    params: Omit<AgentEvent, 'event_id' | 'schema_version' | 'timestamp'>
): AgentEvent {
    return {
        event_id: randomUUID(),
        schema_version: SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        ...params,
    };
}

// ─── Persist ─────────────────────────────────────────────────────────────────

/**
 * Persist a single `AgentEvent` to:
 *  1. Postgres `AgentRunEvent` (durable, for replay/audit)
 *  2. Redis sorted-set (fast hot-path status reads)
 *
 * Never throws — failures are logged but must not block the response path.
 */
export async function persistEvent(event: AgentEvent): Promise<void> {
    const scoreMs = new Date(event.timestamp).getTime();

    // 1. Postgres  (primary durable store)
    try {
        await (prisma as any).agentRunEvent.create({
            data: {
                id: event.event_id,
                schemaVersion: event.schema_version,
                eventType: event.event_type,
                runId: event.run_id,
                tenantId: event.tenant_id,
                stepId: event.step_id ?? null,
                tool: event.tool ?? null,
                status: event.status,
                costUsd: event.cost_usd ?? null,
                tokens: event.tokens ?? null,
                timestamp: new Date(event.timestamp),
                payload: event.payload ?? null,
            },
        });
    } catch (err) {
        // Table may not exist yet if migration hasn't run — log and continue.
        console.error('[AgentEventStore] Postgres persist failed:', {
            eventId: event.event_id,
            eventType: event.event_type,
            runId: event.run_id,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    // 2. Redis sorted-set  (secondary hot-path read)
    try {
        const redisKey = `${REDIS_EVENT_KEY_PREFIX}${event.run_id}`;
        await redis.zadd(redisKey, scoreMs, JSON.stringify(event));
        await redis.expire(redisKey, REDIS_EVENT_TTL_SECONDS);
    } catch (err) {
        console.error('[AgentEventStore] Redis persist failed:', {
            eventId: event.event_id,
            runId: event.run_id,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Retrieve all events for a run, trying Redis first, then Postgres.
 * Returns events sorted by timestamp ascending.
 */
export async function getRunEvents(runId: string): Promise<AgentEvent[]> {
    // Try Redis hot-path first
    try {
        const redisKey = `${REDIS_EVENT_KEY_PREFIX}${runId}`;
        const raw = await redis.zrange(redisKey, 0, -1);
        if (raw && raw.length > 0) {
            return raw.map(r => JSON.parse(r) as AgentEvent);
        }
    } catch { /* fall through to Postgres */ }

    // Postgres cold-path (replay / post-TTL reads)
    try {
        const rows = await (prisma as any).agentRunEvent.findMany({
            where: { runId },
            orderBy: { timestamp: 'asc' },
        });
        return rows.map((r: any) => ({
            event_id: r.id,
            schema_version: r.schemaVersion,
            event_type: r.eventType as EventType,
            run_id: r.runId,
            tenant_id: r.tenantId,
            step_id: r.stepId ?? undefined,
            tool: r.tool ?? undefined,
            status: r.status,
            cost_usd: r.costUsd ?? undefined,
            tokens: r.tokens ?? undefined,
            timestamp: r.timestamp.toISOString(),
            payload: r.payload ?? undefined,
        } as AgentEvent));
    } catch (err) {
        console.error('[AgentEventStore] Postgres read failed for runId:', runId, err);
        return [];
    }
}

/**
 * Get the latest status event for a run (for SSE polling / run-status endpoint).
 */
export async function getRunStatus(runId: string): Promise<{
    status: AgentEvent['status'] | 'unknown';
    lastEventType: EventType | null;
    updatedAt: string | null;
}> {
    const events = await getRunEvents(runId);
    if (events.length === 0) return { status: 'unknown', lastEventType: null, updatedAt: null };
    const last = events[events.length - 1];
    return { status: last.status, lastEventType: last.event_type, updatedAt: last.timestamp };
}

// ─── Convenience emitters ─────────────────────────────────────────────────────

export async function emitRunInit(runId: string, tenantId: string, payload?: any): Promise<void> {
    await persistEvent(buildEvent({ event_type: 'INIT_RUN', run_id: runId, tenant_id: tenantId, status: 'pending', payload }));
}

export async function emitStepExecuted(
    runId: string, tenantId: string,
    stepId: string, tool?: string,
    tokens?: number, costUsd?: number,
    status: AgentEvent['status'] = 'success',
    payload?: any,
): Promise<void> {
    await persistEvent(buildEvent({ event_type: 'STEP_EXECUTED', run_id: runId, tenant_id: tenantId, step_id: stepId, tool, tokens, cost_usd: costUsd, status, payload }));
}

export async function emitRunCompleted(runId: string, tenantId: string, tokens?: number, payload?: any): Promise<void> {
    await persistEvent(buildEvent({ event_type: 'RUN_COMPLETED', run_id: runId, tenant_id: tenantId, status: 'success', tokens, payload }));
}

export async function emitRunFailed(runId: string, tenantId: string, payload?: any): Promise<void> {
    await persistEvent(buildEvent({ event_type: 'RUN_FAILED', run_id: runId, tenant_id: tenantId, status: 'failed', payload }));
}

export async function emitBudgetCancelled(runId: string, tenantId: string, payload?: any): Promise<void> {
    await persistEvent(buildEvent({ event_type: 'CANCELLED_BUDGET', run_id: runId, tenant_id: tenantId, status: 'cancelled', payload }));
}
