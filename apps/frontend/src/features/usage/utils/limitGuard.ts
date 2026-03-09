import { prisma } from '@/lib/prisma';
import { billingService } from '@/services/billing.service';

type ServiceKey = 'PROJECT' | 'TEAM' | 'PROPOSAL' | 'REQUEST';

type ChatContextType = 'project' | 'profile' | 'proposal' | 'team' | 'workspace' | 'space' | 'channel' | 'task' | 'list' | 'folder';

interface PlanLimits {
  maxProjects: number;
  maxTeams: number;
  maxProposals: number;
  maxRequests: number;
  maxChatsPerProject: number;
  maxChatsPerProfile: number;
  maxChatsPerProposal: number;
  maxChatsPerTeam: number;
}

interface ResourceCounts {
  projectsOwned: number;
  teamsOwned: number;
  proposalsOwned: number;
  requestsSent: number;
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
      maxProposals: f?.maxProposals ?? 0,
      maxRequests: f?.maxRequests ?? 0,
      maxChatsPerProject: f?.maxChatsPerProject ?? 0,
      maxChatsPerProfile: f?.maxChatsPerProfile ?? 0,
      maxChatsPerProposal: f?.maxChatsPerProposal ?? 0,
      maxChatsPerTeam: f?.maxChatsPerTeam ?? 0,
    };
  }

  static async getResourceCounts(userId: string): Promise<ResourceCounts> {
    const [projectsOwned, teamsOwned, proposalsOwned, requestsSent] = await Promise.all([
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.team.count({ where: { ownerId: userId } }),
      prisma.proposal.count({ where: { userId } }),
      prisma.request.count({ where: { senderId: userId } }),
    ]);
    return { projectsOwned, teamsOwned, proposalsOwned, requestsSent };
  }

  static async ensureWithinCreateLimit(userId: string, service: ServiceKey): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const counts = await this.getResourceCounts(userId);
    const over = (svc: ServiceKey): boolean => {
      switch (svc) {
        case 'PROJECT':
          return counts.projectsOwned >= limits.maxProjects;
        case 'TEAM':
          return counts.teamsOwned >= limits.maxTeams;
        case 'PROPOSAL':
          return counts.proposalsOwned >= limits.maxProposals;
        case 'REQUEST':
          return counts.requestsSent >= limits.maxRequests;
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
          return counts.projectsOwned > limits.maxProjects;
        case 'TEAM':
          return counts.teamsOwned > limits.maxTeams;
        case 'PROPOSAL':
          return counts.proposalsOwned > limits.maxProposals;
        case 'REQUEST':
          return counts.requestsSent > limits.maxRequests;
      }
    };
    if (exceeds(service)) {
      throw new Error('Your current plan allows fewer items. Editing/publishing is blocked until you reduce items or upgrade.');
    }
  }

  static async ensureWithinChatLimit(
    userId: string,
    contextType: ChatContextType,
    entityId: string
  ): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const db = prisma as any;

    let currentCount = 0;
    let limit = 0;

    switch (contextType) {
      case 'project':
        currentCount = await db.aiConversation.count({
          where: { userId, projectId: entityId },
        });
        limit = limits.maxChatsPerProject;
        break;
      case 'profile':
        // For profile chats, we check conversations where userId matches (user chatting about their own profile)
        // Note: If you add a profileId field to AiConversation schema, update this query
        currentCount = await db.aiConversation.count({
          where: {
            userId,
            projectId: null,
            proposalId: null,
            teamId: null,
          },
        });
        limit = limits.maxChatsPerProfile;
        break;
      case 'proposal':
        currentCount = await db.aiConversation.count({
          where: { userId, proposalId: entityId },
        });
        limit = limits.maxChatsPerProposal;
        break;
      case 'team':
        currentCount = await db.aiConversation.count({
          where: { userId, teamId: entityId },
        });
        limit = limits.maxChatsPerTeam;
        break;
      case 'task':
        currentCount = await db.aiConversation.count({
          where: { userId, taskId: entityId },
        });
        limit = limits.maxChatsPerProject; // reuse project limit for task chats
        break;
      case 'list':
        currentCount = await db.aiConversation.count({
          where: { userId, listId: entityId },
        });
        limit = limits.maxChatsPerProject;
        break;
      case 'folder':
        currentCount = await db.aiConversation.count({
          where: { userId, folderId: entityId },
        });
        limit = limits.maxChatsPerProject;
        break;
    }

    if (limit > 0 && currentCount >= limit) {
      throw new Error(
        `You have reached the maximum number of chats for this ${contextType}. Please upgrade your plan to create more chats.`
      );
    }
  }
}


