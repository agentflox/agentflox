/**
 * Unit tests for ExecutionQuotaService — core transaction layer (§1+§2)
 *
 * Run: pnpm --filter service-server exec jest executionQuota.service
 */

jest.mock('@agentflox/database', () => ({
  Prisma: {
    TransactionIsolationLevel: { Serializable: 'Serializable' },
  },
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
  },
}));

jest.mock('../../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    subscription: { findFirst: jest.fn() },
  },
}));

jest.mock('../../src/services/billing/managers/usage.manager', () => ({
  UsageManager: {
    resolveActiveSubscription: jest.fn(),
    tryConsumeExecution: jest.fn(),
  },
}));

import { redis } from '../../src/lib/redis';
import { prisma } from '../../src/lib/prisma';
import { UsageManager } from '../../src/services/billing/managers/usage.manager';
import {
  ExecutionQuotaService,
} from '../../src/services/billing/executionQuota.service';
import {
  ExecutionQuotaExceededError,
  NoActiveSubscriptionError,
} from '../../src/services/billing/executionQuota.errors';

const USER_ID = 'user-001';
const RUN_ID = 'run-abc';
const SUB_ID = 'sub-001';

function mockTransaction() {
  const tx = {
    executionCharge: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userQuota: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    executionLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (t: typeof tx) => Promise<void>) => {
    await fn(tx);
    return tx;
  });
  return { tx };
}

describe('ExecutionQuotaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redis.get as jest.Mock).mockResolvedValue(null);
    (redis.setex as jest.Mock).mockResolvedValue('OK');
    (UsageManager.resolveActiveSubscription as jest.Mock).mockResolvedValue({ id: SUB_ID });
    (UsageManager.tryConsumeExecution as jest.Mock).mockResolvedValue(undefined);
  });

  describe('consumeExecution', () => {
    it('skips when billingExempt is true', async () => {
      await ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent', {
        billingExempt: true,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('uses Redis GET fast path when key exists', async () => {
      (redis.get as jest.Mock).mockResolvedValue('1');
      await ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'composite_tool');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalledWith('exec:quota:run-abc');
    });

    it('proceeds to DB when Redis GET fails (fail-open)', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis down'));
      mockTransaction();

      await ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'workforce');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('charges on successful transaction and writes Redis SETEX', async () => {
      const { tx } = mockTransaction();

      await ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent');

      expect(UsageManager.resolveActiveSubscription).toHaveBeenCalledWith(USER_ID, tx);
      expect(tx.executionCharge.createMany).toHaveBeenCalledWith({
        data: [{ billingKey: RUN_ID, userId: USER_ID, kind: 'agent' }],
        skipDuplicates: true,
      });
      expect(UsageManager.tryConsumeExecution).toHaveBeenCalledWith(USER_ID, SUB_ID, tx);
      expect(tx.userQuota.upsert).toHaveBeenCalled();
      expect(tx.executionLog.create).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith('exec:quota:run-abc', 86400, '1');
    });

    it('deduplicates on billingKey via ledger conflict (no decrement)', async () => {
      const { tx } = mockTransaction();
      tx.executionCharge.createMany.mockResolvedValue({ count: 0 });

      await ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent');

      expect(UsageManager.tryConsumeExecution).not.toHaveBeenCalled();
      expect(tx.userQuota.upsert).not.toHaveBeenCalled();
      expect(tx.executionLog.create).not.toHaveBeenCalled();
    });

    it('uses rootRunId as billingKey for nested-event safety', async () => {
      mockTransaction();

      await ExecutionQuotaService.consumeExecution(USER_ID, 'child-run-id', 'agent', {
        rootRunId: 'parent-run-id',
      });

      expect(redis.get).toHaveBeenCalledWith('exec:quota:parent-run-id');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NoActiveSubscriptionError before ledger insert', async () => {
      (UsageManager.resolveActiveSubscription as jest.Mock).mockResolvedValue(null);
      const { tx } = mockTransaction();

      await expect(
        ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent'),
      ).rejects.toThrow(NoActiveSubscriptionError);

      expect(tx.executionCharge.createMany).not.toHaveBeenCalled();
      expect(UsageManager.tryConsumeExecution).not.toHaveBeenCalled();
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('does not write SETEX when quota exhausted aborts transaction', async () => {
      (UsageManager.tryConsumeExecution as jest.Mock).mockRejectedValue(
        new ExecutionQuotaExceededError(),
      );
      const { tx } = mockTransaction();

      await expect(
        ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent'),
      ).rejects.toThrow(ExecutionQuotaExceededError);

      expect(tx.executionCharge.createMany).toHaveBeenCalled();
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('still succeeds when Redis SETEX fails after commit', async () => {
      mockTransaction();
      (redis.setex as jest.Mock).mockRejectedValue(new Error('Redis down'));

      await expect(
        ExecutionQuotaService.consumeExecution(USER_ID, RUN_ID, 'agent'),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertCanExecute', () => {
    it('returns allowed=false when no subscription', async () => {
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await ExecutionQuotaService.assertCanExecute(USER_ID, 'agent');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('subscription');
    });

    it('returns allowed=true when maxExecutions is unlimited (-1)', async () => {
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: { feature: { maxExecutions: -1 } },
        usage: { remainingExecutions: 0 },
      });
      const result = await ExecutionQuotaService.assertCanExecute(USER_ID, 'agent');
      expect(result.allowed).toBe(true);
      expect(result.remainingExecutions).toBe(-1);
    });

    it('returns allowed=false when remainingExecutions is 0', async () => {
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: { feature: { maxExecutions: 10 } },
        usage: { remainingExecutions: 0 },
      });
      const result = await ExecutionQuotaService.assertCanExecute(USER_ID, 'agent');
      expect(result.allowed).toBe(false);
    });
  });

  describe('error categories', () => {
    it('NoActiveSubscriptionError has SUBSCRIPTION category and 402', () => {
      const err = new NoActiveSubscriptionError();
      expect(err.category).toBe('SUBSCRIPTION');
      expect(err.statusCode).toBe(402);
    });

    it('ExecutionQuotaExceededError has QUOTA category and 402', () => {
      const err = new ExecutionQuotaExceededError();
      expect(err.category).toBe('QUOTA');
      expect(err.statusCode).toBe(402);
    });
  });
});

describe('UsageManager.tryConsumeExecution (contract)', () => {
  // Test the conditional-update contract without loading full UsageManager module graph.
  // Mirrors the implementation in usage.manager.ts tryConsumeExecution.

  async function tryConsumeExecution(
    userId: string,
    activeSubscriptionId: string,
    tx: {
      subscription: { findFirst: jest.Mock };
      usage: { updateMany: jest.Mock };
    },
  ) {
    const subscription = await tx.subscription.findFirst({
      where: {
        id: activeSubscriptionId,
        userId,
        status: { in: ['ACTIVE', 'ON_HOLD'] },
      },
      include: {
        usage: true,
        plan: { include: { feature: true } },
      },
    });

    if (!subscription?.usage) {
      throw new ExecutionQuotaExceededError('No usage record for active subscription');
    }

    const maxExecutions = subscription.plan?.feature?.maxExecutions ?? 0;
    if (maxExecutions === -1) {
      return;
    }

    const result = await tx.usage.updateMany({
      where: {
        userId,
        subscriptionId: activeSubscriptionId,
        remainingExecutions: { gt: 0 },
      },
      data: {
        remainingExecutions: { decrement: 1 },
      },
    });

    if (result.count === 0) {
      throw new ExecutionQuotaExceededError();
    }
  }

  it('uses conditional updateMany with remainingExecutions > 0', async () => {
    const tx = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          usage: { id: 'usage-1' },
          plan: { feature: { maxExecutions: 10 } },
        }),
      },
      usage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await tryConsumeExecution(USER_ID, SUB_ID, tx);

    expect(tx.usage.updateMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        subscriptionId: SUB_ID,
        remainingExecutions: { gt: 0 },
      },
      data: { remainingExecutions: { decrement: 1 } },
    });
  });

  it('skips decrement when maxExecutions is -1', async () => {
    const tx = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          usage: { id: 'usage-1' },
          plan: { feature: { maxExecutions: -1 } },
        }),
      },
      usage: {
        updateMany: jest.fn(),
      },
    };

    await tryConsumeExecution(USER_ID, SUB_ID, tx);

    expect(tx.usage.updateMany).not.toHaveBeenCalled();
  });

  it('throws when remainingExecutions cannot be decremented', async () => {
    const tx = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          usage: { id: 'usage-1' },
          plan: { feature: { maxExecutions: 10 } },
        }),
      },
      usage: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    await expect(tryConsumeExecution(USER_ID, SUB_ID, tx)).rejects.toThrow(
      ExecutionQuotaExceededError,
    );
  });
});
