/**
 * Tenant Concurrency Quota
 *
 * Enforces a per-user (tenant) limit on simultaneous agent runs.
 * Uses a Redis sorted-set keyed by userId, scored by epoch-ms expiry.
 *
 * Strategy:
 *  1. Prune expired slots (score < now).
 *  2. Count remaining active slots.
 *  3. If count >= limit → throw QuotaExceededError.
 *  4. Otherwise → add a slot with TTL expiry score and proceed.
 *  5. Slot is removed on run completion (best-effort).
 *
 * This is intentionally lenient (not a hard distributed mutex) — it
 * provides soft admission control that keeps costs bounded without
 * risking liveness issues under Redis degradation.
 */

import { redis } from '@/lib/redis';
import { AgentBuilderError } from '../arch/agentBuilderService';

/** Maximum concurrent agent runs a single user may have active. */
const DEFAULT_CONCURRENCY_LIMIT = 5;

/** How long (in ms) a run slot is considered "active" before it expires. */
const RUN_SLOT_TTL_MS = 5 * 60 * 1_000; // 5 minutes

const KEY_PREFIX = 'tenant:quota:runs:';

export class TenantConcurrencyQuota {
    private readonly limit: number;

    constructor(limit = DEFAULT_CONCURRENCY_LIMIT) {
        this.limit = limit;
    }

    /**
     * Acquire a run slot for `userId`. Throws `AgentBuilderError` if the
     * user is already at their concurrent-run limit.
     *
     * Returns a `release()` function — callers MUST call it when the run
     * ends (success OR error). Use try/finally.
     */
    async acquire(
        userId: string,
        runId: string,
    ): Promise<() => Promise<void>> {
        const key = `${KEY_PREFIX}${userId}`;
        const nowMs = Date.now();
        const expiryScore = nowMs + RUN_SLOT_TTL_MS;

        try {
            // Prune expired slots (score < now) and count live ones atomically.
            const pipe = redis.pipeline();
            pipe.zremrangebyscore(key, '-inf', nowMs - 1);   // remove expired
            pipe.zcard(key);                                   // count active
            const results = await pipe.exec() as [Error | null, any][];

            const activeCount: number = results[1]?.[1] ?? 0;

            if (activeCount >= this.limit) {
                throw new AgentBuilderError(
                    'TENANT_CONCURRENCY_EXCEEDED',
                    `User ${userId} has ${activeCount} active runs (limit: ${this.limit})`,
                    `You have reached the maximum of ${this.limit} concurrent agent runs. ` +
                    `Please wait for a running task to complete before starting a new one.`,
                    { userId, activeCount, limit: this.limit }
                );
            }

            // Claim a slot.
            await redis.zadd(key, expiryScore, runId);
            // Ensure the set itself expires to prevent unbounded growth.
            await redis.expire(key, Math.ceil(RUN_SLOT_TTL_MS / 1_000) + 60);
        } catch (err) {
            if (err instanceof AgentBuilderError) throw err;
            // Redis failure → fail-open (log and allow). Quota is advisory, not a hard lock.
            console.warn('[TenantConcurrencyQuota] Redis error during acquire — allowing run:', err);
        }

        const release = async (): Promise<void> => {
            try {
                await redis.zrem(key, runId);
            } catch (err) {
                console.warn('[TenantConcurrencyQuota] Failed to release run slot:', { userId, runId, err });
                // Non-fatal: the slot will expire on its own via TTL score.
            }
        };

        return release;
    }
}

/** Singleton instance — reuse across all services. */
export const tenantConcurrencyQuota = new TenantConcurrencyQuota();
