import { prisma } from '@/lib/prisma';
import { billingService } from '@/services/billing.service';

type ServiceKey = 'PROJECT' | 'TEAM' | 'PROPOSAL' | 'REQUEST' | 'WORKSPACE' | 'SPACE';

type ChatContextType = 'project' | 'profile' | 'proposal' | 'team' | 'workspace' | 'space' | 'channel' | 'task' | 'list' | 'folder';

interface PlanLimits {
  maxProjects: number;
  maxTeams: number;
  maxApplicationRequests: number;
  maxSpaces: number;
  maxWorkspaces: number;
}

interface ResourceCounts {
  projectsOwned: number;
  teamsOwned: number;
  requestsSent: number;
  workspacesOwned: number;
  spacesOwned: number;
}

export class LimitGuard {
  private constructor() { }

  static async ensureCycle(userId: string, session?: any): Promise<void> {
    try {
      // Call backend to handle cycle transition if needed
      await billingService.subscriptions.checkCycle(userId, session);
    } catch (err) {
      // Non-blocking; log only
      console.warn('Cycle transition check failed:', err);
    }
  }

  static async getPlanLimits(userId: string): Promise<PlanLimits> {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'ON_HOLD'] } },
      include: { plan: { include: { feature: true } } },
    });
    const f = sub?.plan?.feature;
    return {
      maxProjects: f?.maxProjects ?? 0,
      maxTeams: f?.maxTeams ?? 0,
      maxApplicationRequests: f?.maxApplicationRequests ?? 0,
      maxSpaces: f?.maxSpaces ?? 0,
      maxWorkspaces: f?.maxWorkspaces ?? 0,
    };
  }

  static async getResourceCounts(userId: string): Promise<ResourceCounts> {
    const [projectsOwned, teamsOwned, requestsSent, workspacesOwned, spacesOwned] = await Promise.all([
      prisma.project?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
      prisma.team?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
      prisma.request?.count({ where: { senderId: userId } }) ?? Promise.resolve(0),
      (prisma as any).workspace?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
      (prisma as any).space?.count({ where: { ownerId: userId } }) ?? Promise.resolve(0),
    ]);
    return { projectsOwned, teamsOwned, requestsSent, workspacesOwned, spacesOwned };
  }

  private static isAtOrOverLimit(count: number, limit: number): boolean {
    // -1 (or any negative) means unlimited
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
    const over = (svc: ServiceKey): boolean => {
      switch (svc) {
        case 'PROJECT':
          return this.isAtOrOverLimit(counts.projectsOwned, limits.maxProjects);
        case 'TEAM':
          return this.isAtOrOverLimit(counts.teamsOwned, limits.maxTeams);
        case 'REQUEST':
          return this.isAtOrOverLimit(counts.requestsSent, limits.maxApplicationRequests);
        case 'WORKSPACE':
          return this.isAtOrOverLimit(counts.workspacesOwned, limits.maxWorkspaces);
        case 'SPACE':
          return this.isAtOrOverLimit(counts.spacesOwned, limits.maxSpaces);
        default:
          return false;
      }
    };
    if (over(service)) {
      throw new Error('You have reached your plan limit. Please upgrade to continue.');
    }
  }

  static async ensureCanModify(userId: string, service: ServiceKey): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const counts = await this.getResourceCounts(userId);
    const exceeds = (svc: ServiceKey): boolean => {
      switch (svc) {
        case 'PROJECT':
          return this.exceedsLimit(counts.projectsOwned, limits.maxProjects);
        case 'TEAM':
          return this.exceedsLimit(counts.teamsOwned, limits.maxTeams);
        case 'REQUEST':
          return this.exceedsLimit(counts.requestsSent, limits.maxApplicationRequests);
        case 'WORKSPACE':
          return this.exceedsLimit(counts.workspacesOwned, limits.maxWorkspaces);
        case 'SPACE':
          return this.exceedsLimit(counts.spacesOwned, limits.maxSpaces);
        default:
          return false;
      }
    };
    if (exceeds(service)) {
      throw new Error('Your current plan allows fewer items. Editing/publishing is blocked until you reduce items or upgrade.');
    }
  }

  static async ensureWithinChatLimit(
    _userId: string,
    _contextType: ChatContextType,
    _entityId: string
  ): Promise<void> {
    // Chat-per-entity limits removed; keep signature for callers (e.g. chat.ts)
    return;
  }
}
