import { Prisma, SubscriptionStatus } from '@agentflox/database';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import {
  ConcurrentRunsExceededError,
  ExecutionQuotaExceededError,
  NoActiveSubscriptionError,
} from './executionQuota.errors';
import { UsageManager } from './managers/usage.manager';

export type ExecutionKind =
  | 'composite_tool'
  | 'workforce'
  | 'agent'
  | 'swarm'
  | 'chat';

export type ExecutionLogContext = {
  toolId?: string | null;
  toolName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  workforceId?: string | null;
  workforceName?: string | null;
  conversationId?: string | null;
  workspaceId?: string | null;
  spaceId?: string | null;
  runId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
};

const REDIS_QUOTA_PREFIX = 'exec:quota:';
const REDIS_QUOTA_TTL_SECONDS = 86400;
const REDIS_ACTIVE_SET = (userId: string) => `exec:active:${userId}`;
const REDIS_ACTIVE_TTL_KEY = (billingKey: string) => `exec:active:ttl:${billingKey}`;
/** Default max run wall-clock + buffer (matches agent Inngest 10m timeout). */
const DEFAULT_ACTIVE_TTL_SECONDS = 15 * 60;
const SWARM_ACTIVE_TTL_SECONDS = 24 * 60 * 60;

function buildExecutionLabel(kind: ExecutionKind, ctx?: ExecutionLogContext): string {
  if (ctx?.label?.trim()) return ctx.label.trim();
  if (ctx?.toolName) return `Tool · ${ctx.toolName}`;
  if (ctx?.agentName) {
    return kind === 'chat' ? `Chat · ${ctx.agentName}` : `Agent · ${ctx.agentName}`;
  }
  if (ctx?.workforceName) {
    return kind === 'swarm'
      ? `Swarm · ${ctx.workforceName}`
      : `Workforce · ${ctx.workforceName}`;
  }
  switch (kind) {
    case 'composite_tool':
      return 'Tool run';
    case 'workforce':
      return 'Workforce run';
    case 'swarm':
      return 'Swarm session';
    case 'chat':
      return 'Agent chat';
    default:
      return 'Agent run';
  }
}

export class ExecutionQuotaService {
  /** Fast-path hint only — not authoritative. */
  static async assertCanExecute(
    userId: string,
    _kind: ExecutionKind,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingExecutions: number;
    category?: 'QUOTA' | 'SUBSCRIPTION';
  }> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD],
        },
      },
      include: {
        usage: true,
        plan: { include: { feature: true } },
      },
    });

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No active subscription',
        remainingExecutions: 0,
        category: 'SUBSCRIPTION',
      };
    }

    const maxExecutions = subscription.plan?.feature?.maxExecutions ?? 0;
    if (maxExecutions === -1) {
      return { allowed: true, remainingExecutions: -1 };
    }

    const remaining = subscription.usage?.remainingExecutions ?? 0;
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Execution quota exhausted',
        remainingExecutions: 0,
        category: 'QUOTA',
      };
    }

    return { allowed: true, remainingExecutions: remaining };
  }

  static async consumeExecution(
    userId: string,
    runId: string,
    kind: ExecutionKind,
    opts?: {
      billingExempt?: boolean;
      rootRunId?: string;
      context?: ExecutionLogContext;
    },
  ): Promise<void> {
    if (opts?.billingExempt) {
      return;
    }

    const billingKey = opts?.rootRunId ?? runId;
    const ctx = opts?.context;

    try {
      const cached = await redis.get(`${REDIS_QUOTA_PREFIX}${billingKey}`);
      if (cached) {
        return;
      }
    } catch (err) {
      console.warn('[ExecutionQuotaService] Redis GET skipped:', err);
    }

    // Concurrent-run gate (best-effort Redis; fail-open on Redis errors)
    await this.assertConcurrentCapacity(userId, kind);

    await prisma.$transaction(
      async (tx) => {
        const activeSub = await UsageManager.resolveActiveSubscription(userId, tx);
        if (!activeSub) {
          throw new NoActiveSubscriptionError();
        }

        const inserted = await tx.executionCharge.createMany({
          data: [{ billingKey, userId, kind }],
          skipDuplicates: true,
        });
        if (inserted.count === 0) {
          return;
        }

        await UsageManager.tryConsumeExecution(userId, activeSub.id, tx);

        await tx.userQuota.upsert({
          where: { userId },
          create: {
            userId,
            totalExecutionsUsed: 1,
          },
          update: {
            totalExecutionsUsed: { increment: 1 },
          },
        });

        await tx.executionLog.create({
          data: {
            userId,
            billingKey,
            kind,
            status: 'STARTED',
            runId: ctx?.runId ?? runId,
            label: buildExecutionLabel(kind, ctx),
            toolId: ctx?.toolId ?? null,
            toolName: ctx?.toolName ?? null,
            agentId: ctx?.agentId ?? null,
            agentName: ctx?.agentName ?? null,
            workforceId: ctx?.workforceId ?? null,
            workforceName: ctx?.workforceName ?? null,
            conversationId: ctx?.conversationId ?? null,
            workspaceId: ctx?.workspaceId ?? null,
            spaceId: ctx?.spaceId ?? null,
            metadata: (ctx?.metadata as Prisma.InputJsonValue) ?? undefined,
            startedAt: new Date(),
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    try {
      await redis.setex(`${REDIS_QUOTA_PREFIX}${billingKey}`, REDIS_QUOTA_TTL_SECONDS, '1');
    } catch (err) {
      console.warn('[ExecutionQuotaService] Redis SETEX skipped:', err);
    }

    await this.registerActiveRun(userId, billingKey, kind);
  }

  /** Optional status update when a run finishes (best-effort). */
  static async finalizeExecutionLog(
    billingKey: string,
    update: {
      status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
      durationMs?: number;
      errorMessage?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await prisma.executionLog.updateMany({
        where: { billingKey },
        data: {
          status: update.status,
          finishedAt: new Date(),
          ...(typeof update.durationMs === 'number' ? { durationMs: update.durationMs } : {}),
          ...(update.errorMessage !== undefined ? { errorMessage: update.errorMessage } : {}),
          ...(update.metadata
            ? { metadata: update.metadata as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (err) {
      console.warn('[ExecutionQuotaService] finalizeExecutionLog skipped:', err);
    }
  }

  /** Call from finally / onComplete / onFailure handlers. */
  static async deregisterActiveRun(userId: string, billingKey: string): Promise<void> {
    try {
      await redis.srem(REDIS_ACTIVE_SET(userId), billingKey);
      await redis.del(REDIS_ACTIVE_TTL_KEY(billingKey));
    } catch (err) {
      console.warn('[ExecutionQuotaService] Redis SREM skipped:', err);
    }
  }

  private static async assertConcurrentCapacity(
    userId: string,
    kind: ExecutionKind,
  ): Promise<void> {
    try {
      await this.pruneExpiredActiveRuns(userId);

      const maxConcurrent = await this.resolveMaxConcurrentRuns(userId);
      const active = await redis.scard(REDIS_ACTIVE_SET(userId));
      if (active >= maxConcurrent) {
        throw new ConcurrentRunsExceededError(
          `Concurrent execution limit reached (${active}/${maxConcurrent})`,
        );
      }
    } catch (err) {
      if (err instanceof ConcurrentRunsExceededError) throw err;
      console.warn('[ExecutionQuotaService] concurrent check skipped:', err);
    }
  }

  private static async registerActiveRun(
    userId: string,
    billingKey: string,
    kind: ExecutionKind,
  ): Promise<void> {
    const ttl =
      kind === 'swarm' ? SWARM_ACTIVE_TTL_SECONDS : DEFAULT_ACTIVE_TTL_SECONDS;
    try {
      await redis.sadd(REDIS_ACTIVE_SET(userId), billingKey);
      await redis.expire(REDIS_ACTIVE_SET(userId), Math.max(ttl, SWARM_ACTIVE_TTL_SECONDS));
      await redis.setex(REDIS_ACTIVE_TTL_KEY(billingKey), ttl, '1');
    } catch (err) {
      console.warn('[ExecutionQuotaService] Redis SADD skipped:', err);
    }
  }

  /** Lazy cleanup: drop set members whose TTL companion key expired. */
  private static async pruneExpiredActiveRuns(userId: string): Promise<void> {
    const members = await redis.smembers(REDIS_ACTIVE_SET(userId));
    for (const member of members) {
      const alive = await redis.exists(REDIS_ACTIVE_TTL_KEY(member));
      if (!alive) {
        await redis.srem(REDIS_ACTIVE_SET(userId), member);
      }
    }
  }

  private static async resolveMaxConcurrentRuns(userId: string): Promise<number> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD] },
      },
      include: { plan: { include: { feature: true } } },
    });
    const max = subscription?.plan?.feature?.maxConcurrentRuns;
    return typeof max === 'number' && max > 0 ? max : 10;
  }
}

export {
  ConcurrentRunsExceededError,
  ExecutionQuotaExceededError,
  NoActiveSubscriptionError,
} from './executionQuota.errors';
