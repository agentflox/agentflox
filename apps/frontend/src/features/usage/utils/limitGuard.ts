import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { billingService } from '@/services/billing.service';
import {
  computeRemaining,
  USAGE_CAP_UPGRADE_URL,
  type UsageCapKind,
  type UsageCapPayload,
  type UsageQuotaMeter,
} from '@/features/usage/types';

type ServiceKey = 'PROJECT' | 'TEAM' | 'PROPOSAL' | 'REQUEST' | 'WORKSPACE' | 'SPACE';

type ChatContextType =
  | 'project'
  | 'profile'
  | 'proposal'
  | 'team'
  | 'workspace'
  | 'space'
  | 'channel'
  | 'task'
  | 'list'
  | 'folder';

interface PlanLimits {
  maxProjects: number;
  maxTeams: number;
  maxApplicationRequests: number;
  maxSpaces: number;
  maxWorkspaces: number;
  maxExecutions: number;
  maxTokens: number;
}

interface ResourceCounts {
  projectsOwned: number;
  teamsOwned: number;
  requestsSent: number;
  workspacesOwned: number;
  spacesOwned: number;
}

function throwUsageCap(params: {
  kind: UsageCapKind;
  used: number;
  max: number;
  message: string;
}): never {
  const remaining = computeRemaining(params.used, params.max);
  const payload: UsageCapPayload = {
    code: 'USAGE_CAP',
    kind: params.kind,
    used: params.used,
    max: params.max,
    remaining,
    message: params.message,
    upgradeUrl: USAGE_CAP_UPGRADE_URL,
  };
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: params.message,
    cause: payload,
  });
}

export class LimitGuard {
  private constructor() {}

  static async ensureCycle(userId: string, session?: any): Promise<void> {
    try {
      await billingService.subscriptions.checkCycle(userId, session);
    } catch (err) {
      console.warn('Cycle transition check failed:', err);
    }
  }

  static async getPlanLimits(userId: string): Promise<PlanLimits> {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'ON_HOLD'] } },
      include: { plan: { include: { feature: true } } },
    });
    const f = sub?.plan?.feature as any;
    return {
      maxProjects: f?.maxProjects ?? 0,
      maxTeams: f?.maxTeams ?? 0,
      maxApplicationRequests: f?.maxApplicationRequests ?? 0,
      maxSpaces: f?.maxSpaces ?? 0,
      maxWorkspaces: f?.maxWorkspaces ?? 0,
      maxExecutions: f?.maxExecutions ?? 0,
      maxTokens: f?.maxTokens ?? 0,
    };
  }

  static async getResourceCounts(userId: string): Promise<ResourceCounts> {
    const [projectsOwned, teamsOwned, requestsSent, workspacesOwned, spacesOwned] =
      await Promise.all([
        prisma.project?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
        prisma.team?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
        prisma.request?.count({ where: { senderId: userId } }) ?? Promise.resolve(0),
        (prisma as any).workspace?.count({ where: { ownerId: userId } }) ??
          Promise.resolve(0),
        (prisma as any).space?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
      ]);
    return { projectsOwned, teamsOwned, requestsSent, workspacesOwned, spacesOwned };
  }

  static async getQuotaMeters(userId: string): Promise<{
    PROJECT: UsageQuotaMeter;
    TEAM: UsageQuotaMeter;
    SPACE: UsageQuotaMeter;
    WORKSPACE: UsageQuotaMeter;
    REQUEST: UsageQuotaMeter;
    EXECUTION: UsageQuotaMeter;
    TOKENS: UsageQuotaMeter;
  }> {
    const [limits, counts, usage] = await Promise.all([
      this.getPlanLimits(userId),
      this.getResourceCounts(userId),
      prisma.usage.findFirst({
        where: {
          userId,
          subscriptionId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const execMax = (usage as any)?.maxExecutions ?? limits.maxExecutions ?? 0;
    const execRemaining =
      (usage as any)?.remainingExecutions ??
      (execMax < 0 ? -1 : execMax);
    const execUsed =
      execMax < 0 ? 0 : Math.max(0, execMax - (typeof execRemaining === 'number' ? execRemaining : 0));

    const tokenMax = (usage as any)?.maxTokens ?? limits.maxTokens ?? 0;
    const tokenRemaining = (usage as any)?.remainingTokens ?? (tokenMax < 0 ? -1 : tokenMax);
    const tokenUsed =
      tokenMax < 0 ? 0 : Math.max(0, tokenMax - (typeof tokenRemaining === 'number' ? tokenRemaining : 0));

    const meter = (
      kind: UsageCapKind,
      used: number,
      max: number,
    ): UsageQuotaMeter => ({
      kind,
      used,
      max,
      remaining: computeRemaining(used, max),
    });

    return {
      PROJECT: meter('PROJECT', counts.projectsOwned, limits.maxProjects),
      TEAM: meter('TEAM', counts.teamsOwned, limits.maxTeams),
      SPACE: meter('SPACE', counts.spacesOwned, limits.maxSpaces),
      WORKSPACE: meter('WORKSPACE', counts.workspacesOwned, limits.maxWorkspaces),
      REQUEST: meter('REQUEST', counts.requestsSent, limits.maxApplicationRequests),
      EXECUTION: {
        kind: 'EXECUTION',
        used: execUsed,
        max: execMax,
        remaining: execMax < 0 ? -1 : Math.max(0, execRemaining),
      },
      TOKENS: {
        kind: 'TOKENS',
        used: tokenUsed,
        max: tokenMax,
        remaining: tokenMax < 0 ? -1 : Math.max(0, tokenRemaining),
      },
    };
  }

  private static isAtOrOverLimit(count: number, limit: number): boolean {
    if (limit < 0) return false;
    return count >= limit;
  }

  private static exceedsLimit(count: number, limit: number): boolean {
    if (limit < 0) return false;
    return count > limit;
  }

  static async ensureWithinCreateLimit(userId: string, service: ServiceKey): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const counts = await this.getResourceCounts(userId);

    const check = (
      kind: UsageCapKind,
      used: number,
      max: number,
      label: string,
    ) => {
      if (this.isAtOrOverLimit(used, max)) {
        throwUsageCap({
          kind,
          used,
          max,
          message: `You have reached your ${label} limit (${used}/${max}). Please upgrade to continue.`,
        });
      }
    };

    switch (service) {
      case 'PROJECT':
        check('PROJECT', counts.projectsOwned, limits.maxProjects, 'project');
        break;
      case 'TEAM':
        check('TEAM', counts.teamsOwned, limits.maxTeams, 'team');
        break;
      case 'REQUEST':
        check(
          'REQUEST',
          counts.requestsSent,
          limits.maxApplicationRequests,
          'application request',
        );
        break;
      case 'WORKSPACE':
        check('WORKSPACE', counts.workspacesOwned, limits.maxWorkspaces, 'workspace');
        break;
      case 'SPACE':
        check('SPACE', counts.spacesOwned, limits.maxSpaces, 'space');
        break;
      default:
        break;
    }
  }

  static async ensureCanModify(userId: string, service: ServiceKey): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const counts = await this.getResourceCounts(userId);

    const check = (
      kind: UsageCapKind,
      used: number,
      max: number,
      label: string,
    ) => {
      if (this.exceedsLimit(used, max)) {
        throwUsageCap({
          kind,
          used,
          max,
          message: `Your current plan allows fewer ${label}s. Editing is blocked until you reduce items or upgrade.`,
        });
      }
    };

    switch (service) {
      case 'PROJECT':
        check('PROJECT', counts.projectsOwned, limits.maxProjects, 'project');
        break;
      case 'TEAM':
        check('TEAM', counts.teamsOwned, limits.maxTeams, 'team');
        break;
      case 'REQUEST':
        check(
          'REQUEST',
          counts.requestsSent,
          limits.maxApplicationRequests,
          'application request',
        );
        break;
      case 'WORKSPACE':
        check('WORKSPACE', counts.workspacesOwned, limits.maxWorkspaces, 'workspace');
        break;
      case 'SPACE':
        check('SPACE', counts.spacesOwned, limits.maxSpaces, 'space');
        break;
      default:
        break;
    }
  }

  static async ensureWithinChatLimit(
    _userId: string,
    _contextType: ChatContextType,
    _entityId: string,
  ): Promise<void> {
    return;
  }
}
