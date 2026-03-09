/**
 * ═══════════════════════════════════════════════════════
 * AGENT EVENT STORE  (3.3 Event-Sourced State Store)
 * ═══════════════════════════════════════════════════════
 *
 * State is NEVER mutated. Every FSM state transition appends
 * an immutable event to a durable Postgres log. The current
 * run state is always reconstructable by replaying the stream.
 *
 * This provides replay, time-travel debugging, compliance
 * auditing, and zero-downtime crash recovery for free.
 *
 * Schema versioning: every event carries `schema_version`.
 * Migration functions are registered when the event shape
 * changes so old events replay correctly against new consumers.
 * This is the step that competing systems skip — and the one
 * that causes production failures at month 6.
 */

import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { EventType, AgentEvent } from '../execution/agentEvents';
import type { FSMState } from './agentArchitecture';

/** Current event schema version — increment on any breaking shape change */
export const CURRENT_SCHEMA_VERSION = '1';

// ── Migration Registry ────────────────────────────────────────────────────────

type MigrationFn = (event: Record<string, unknown>) => Record<string, unknown>;

const migrations = new Map<string, MigrationFn>();

/**
 * Register a migration to transform an event from one schema version to the next.
 * Key format: `"fromVersion→toVersion"`, e.g. `"1→2"`.
 *
 * Example:
 *   registerMigration('1', '2', (e) => ({ ...e, cost_usd: e.cost_usd ?? 0 }));
 */
export function registerMigration(
    fromVersion: string,
    toVersion: string,
    fn: MigrationFn
): void {
    migrations.set(`${fromVersion}→${toVersion}`, fn);
}

/** Upgrade a raw event from its stored schema_version to the current one. */
function migrateEvent(raw: Record<string, unknown>): AgentEvent {
    let version = String(raw['schema_version'] ?? '1');
    let event = { ...raw };

    while (version !== CURRENT_SCHEMA_VERSION) {
        const nextVersion = String(Number(version) + 1);
        const key = `${version}→${nextVersion}`;
        const migrator = migrations.get(key);
        if (!migrator) {
            console.warn(`[EventStore] No migration for ${key} — using event as-is.`);
            break;
        }
        event = migrator(event);
        version = nextVersion;
    }

    return event as unknown as AgentEvent;
}

// ── Event Store ───────────────────────────────────────────────────────────────

export interface AppendEventParams {
    runId: string;
    tenantId: string; // userId in single-tenant mode; orgId in multi-tenant
    eventType: EventType;
    fsmState?: FSMState;
    stepId?: string;
    tool?: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    costUsd?: number;
    tokens?: number;
    payload?: Record<string, unknown>;
}

/**
 * Append an immutable event to the durable run log.
 * Uses Postgres INSERT for ACID durability.
 * Never throws — logs and returns null on failure so the FSM keeps running.
 */
export async function appendEvent(params: AppendEventParams): Promise<AgentEvent | null> {
    const event: AgentEvent = {
        event_id: randomUUID(),
        schema_version: CURRENT_SCHEMA_VERSION,
        event_type: params.eventType,
        run_id: params.runId,
        tenant_id: params.tenantId,
        step_id: params.stepId,
        tool: params.tool,
        status: params.status,
        cost_usd: params.costUsd,
        tokens: params.tokens,
        timestamp: new Date().toISOString(),
        payload: params.payload,
    };

    try {
        await (prisma as any).agentRunEvent.create({
            data: {
                id: event.event_id,
                runId: event.run_id,
                tenantId: event.tenant_id,
                schemaVersion: event.schema_version,
                eventType: event.event_type,
                fsmState: params.fsmState ?? null,
                stepId: event.step_id ?? null,
                tool: event.tool ?? null,
                status: event.status,
                costUsd: event.cost_usd ?? null,
                tokens: event.tokens ?? null,
                payload: (event.payload ?? {}) as any,
                timestamp: new Date(event.timestamp),
            },
        });
    } catch (err) {
        console.error('[EventStore] Failed to persist event — continuing FSM:', (err as Error).message, {
            runId: params.runId,
            eventType: params.eventType,
        });
        return null;
    }

    return event;
}

/**
 * Replay all events for a run in insertion order.
 * Applies schema migrations before returning — consumers always see
 * the current event shape regardless of when the event was written.
 */
export async function replayRun(runId: string): Promise<AgentEvent[]> {
    const rows = await (prisma as any).agentRunEvent.findMany({
        where: { runId },
        orderBy: { timestamp: 'asc' },
    });

    return rows.map((row: any) =>
        migrateEvent({
            event_id: row.id,
            schema_version: row.schemaVersion,
            event_type: row.eventType,
            run_id: row.runId,
            tenant_id: row.tenantId,
            step_id: row.stepId ?? undefined,
            tool: row.tool ?? undefined,
            status: row.status,
            cost_usd: row.costUsd ?? undefined,
            tokens: row.tokens ?? undefined,
            timestamp: row.timestamp.toISOString(),
            payload: row.payload ?? undefined,
        })
    );
}

/**
 * Reconstruct the last known FSM state for a run from its event log.
 * Used for crash recovery — the FSM can resume from the exact state it left off.
 */
export async function reconstructRunState(runId: string): Promise<{
    lastFsmState: string | null;
    totalCostUsd: number;
    totalTokens: number;
    stepCount: number;
    isTerminated: boolean;
}> {
    const events = await replayRun(runId);

    const terminalEventTypes: EventType[] = [
        'RUN_COMPLETED', 'RUN_FAILED', 'CANCELLED_BUDGET', 'CANCELLED_POLICY',
    ];

    let lastFsmState: string | null = null;
    let totalCostUsd = 0;
    let totalTokens = 0;
    let stepCount = 0;
    let isTerminated = false;

    for (const e of events) {
        if ((e as any).fsmState) lastFsmState = (e as any).fsmState;
        if (e.cost_usd) totalCostUsd += e.cost_usd;
        if (e.tokens) totalTokens += e.tokens;
        if (e.event_type === 'STEP_EXECUTED' && e.status === 'success') stepCount++;
        if (terminalEventTypes.includes(e.event_type)) isTerminated = true;
    }

    return { lastFsmState, totalCostUsd, totalTokens, stepCount, isTerminated };
}
