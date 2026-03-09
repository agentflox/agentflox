import { 
  PrismaClient, 
  Prisma, 
  SubscriptionStatus, 
  PurchaseStatus, 
  Usage, 
  Payment, 
  PaymentStatus, 
  PlanType, 
  Subscription, 
  NotificationType 
} from '@agentflox/database/src/generated/prisma';
import { SubscriptionManager, PlanManager } from '../../billing/utils';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
import emailService, { EmailServiceError } from '@/utils/email/emailService';
import { EmailResponse } from '@/utils/email/types';

interface UsageState {
  subscription: {
    id: string | null;
    status: SubscriptionStatus;
    planName?: string;
    projects: {
      used: number;
      limit: number;
      remaining: number;
      percentageUsed: number;
    };
    teams: {
      used: number;
      limit: number;
      remaining: number;
      percentageUsed: number;
    };
    proposals: {
      used: number;
      limit: number;
      remaining: number;
      percentageUsed: number;
    };
    requests: {
      used: number;
      limit: number;
      remaining: number;
      percentageUsed: number;
    };
    isApproachingLimit: boolean;
  };

  creditPackages: {
    active: Array<{
      id: string;
      name: string;
      creditsUsed: number;
      creditLimit: number;
      percentageUsed: number;
      remainingCredits: number;

      projectsUsed: number;
      projectLimit: number;
      remainingProjects: number;

      proposalsUsed: number;
      proposalLimit: number;
      remainingProposals: number;

      teamsUsed: number;
      teamLimit: number;
      remainingTeams: number;

      requestsUsed: number;
      requestLimit: number;
      remainingRequests: number;

      isExpiringSoon: boolean;
      expiresAt?: Date;
    }>;
    expired: Array<{
      id: string;
      name: string;
      expiredAt: Date;
    }>;
  };

  totalUsage: {
    creditsUsed: number;
    creditLimit: number;
    remainingCredits: number;
    percentageUsed: number;

    projectsUsed: number;
    projectLimit: number;
    remainingProjects: number;

    proposalsUsed: number;
    proposalLimit: number;
    remainingProposals: number;

    teamsUsed: number;
    teamLimit: number;
    remainingTeams: number;

    requestsUsed: number;
    requestLimit: number;
    remainingRequests: number;

    isOverLimit: boolean;
    isApproachingLimit: boolean;
  };
}

enum Service {
  PROJECT = 'PROJECT',
  PROPOSAL = 'PROPOSAL',
  TEAM = 'TEAM',
  REQUEST = 'REQUEST',
  CHAT = 'CHAT'
}

export class UsageManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;

  // Credit conversion rates for each service
  private static readonly CREDIT_CONVERSION = {
    [Service.PROJECT]: 10,
    [Service.PROPOSAL]: 5,
    [Service.TEAM]: 15,
    [Service.REQUEST]: 1
  };

  static readonly Errors = {
    USER_NOT_FOUND: 'User not found',
    SUBSCRIPTION_NOT_FOUND: 'No active subscription found',
    PAYMENT_NOT_FOUND: 'No previous payment found for subscription',
    INVALID_PLAN: 'Invalid subscription plan',
    TRANSACTION_FAILED: 'Transaction failed',
    PAYMENT_FAILED: 'Payment processing failed',
    INVALID_DATES: 'Invalid subscription dates',
    MISSING_PARAMETERS: 'Missing required parameters',
    NO_EMAIL_PROVIDED: 'No email provided for notification',
    INSUFFICIENT_CREDITS: 'Insufficient credits available'
  } as const;

  private static async executeTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await prisma.$transaction(operation, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    return emailRegex.test(email);
  }

  private static async retry<T>(
    operation: () => Promise<T>,
    retries = UsageManager.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && (error instanceof Prisma.PrismaClientKnownRequestError)) {
        await new Promise(resolve => setTimeout(resolve, UsageManager.RETRY_DELAY));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Main method to update service usage
   * Deducts from subscription first, then from credit packages
   */
  static async updateServiceUsage(
    userId: string,
    userName: string,
    service: Service,
    amount: number = 1,
    email?: string
  ): Promise<void> {
    if (!userId) {
      throw new Error(this.Errors.USER_NOT_FOUND);
    }

    try {
      // Get current usage state
      const usageState = await this.getUsageState(userId);

      // Check if usage notification needed
      await this.handleUsageNotification(usageState, userId, userName, email);

      // Perform the deduction in a transaction
      await prisma.$transaction(async (tx) => {
        const remainingAmount = await this.deductFromSubscription(
          tx,
          userId,
          userName,
          service,
          amount,
          email
        );

        if (remainingAmount > 0) {
          await this.deductFromCreditPackages(
            tx,
            userId,
            userName,
            service,
            remainingAmount,
            email
          );
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error: any) {
      throw new Error(`Failed to update service usage: ${error.message}`);
    }
  }

  /**
   * Deduct usage from subscription first
   */
  private static async deductFromSubscription(
    tx: Prisma.TransactionClient,
    userId: string,
    userName: string,
    service: Service,
    amount: number,
    email?: string
  ): Promise<number> {
    // Get active subscription
    const subscription = await tx.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD]
        }
      },
      include: {
        plan: {
          include: {
            feature: true
          }
        },
        usage: true
      }
    });

    if (!subscription || !subscription.plan?.feature) {
      return amount; // No subscription, return full amount
    }

    const feature = subscription.plan.feature;
    const usage = subscription.usage;

    if (!usage) {
      // Create usage record if it doesn't exist
      const newUsage = await tx.usage.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          maxProjects: feature.maxProjects,
          remainingProjects: feature.maxProjects,
          maxTeams: feature.maxTeams,
          remainingTeams: feature.maxTeams,
          maxProposals: feature.maxProposals,
          remainingProposals: feature.maxProposals,
          maxRequests: feature.maxRequests,
          remainingRequests: feature.maxRequests,
          maxCredits: feature.maxCredits,
          remainingCredits: feature.maxCredits,
          maxTokens: feature.maxTokens || 0,
          remainingTokens: feature.maxTokens || 0,
          maxChatsPerProject: feature.maxChatsPerProject || 0,
          remainingChatsPerProject: feature.maxChatsPerProject || 0,
          maxChatsPerProfile: feature.maxChatsPerProfile || 0,
          remainingChatsPerProfile: feature.maxChatsPerProfile || 0,
          maxChatsPerProposal: feature.maxChatsPerProposal || 0,
          remainingChatsPerProposal: feature.maxChatsPerProposal || 0,
          maxChatsPerTeam: feature.maxChatsPerTeam || 0,
          remainingChatsPerTeam: feature.maxChatsPerTeam || 0,
        }
      });

      return amount;
    }

    // Get current limits and usage
    const serviceField = this.getServiceField(service);
    const currentRemaining = (usage as any)[`remaining${serviceField}`] as number;
    
    if (currentRemaining <= 0) {
      return amount; // No remaining quota in subscription
    }

    // Calculate how much we can deduct from subscription
    const amountToDeduct = Math.min(currentRemaining, amount);
    const creditsToDeduct = amountToDeduct * this.CREDIT_CONVERSION[service];

    // Update usage
    await tx.usage.update({
      where: { id: usage.id },
      data: {
        [`remaining${serviceField}`]: currentRemaining - amountToDeduct,
        remainingCredits: Math.max(0, usage.remainingCredits - creditsToDeduct)
      }
    });

    // Check if subscription limit reached
    const updatedUsage = await tx.usage.findUnique({
      where: { id: usage.id }
    });

    if (updatedUsage && (updatedUsage as any)[`remaining${serviceField}`] === 0) {
      await this.handleSubscriptionLimitReached(
        userId,
        userName,
        service,
        subscription,
        email
      );
    }

    return amount - amountToDeduct;
  }

  /**
   * Deduct remaining usage from credit packages
   */
  private static async deductFromCreditPackages(
    tx: Prisma.TransactionClient,
    userId: string,
    userName: string,
    service: Service,
    remainingAmount: number,
    email?: string
  ): Promise<void> {
    const activePackages = await tx.creditPurchase.findMany({
      where: {
        userId,
        status: PurchaseStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { purchasedAt: 'asc' }, // FIFO
      include: {
        package: {
          include: {
            feature: true
          }
        },
        usage: true
      }
    });

    if (!activePackages.length) {
      throw new Error(this.Errors.INSUFFICIENT_CREDITS);
    }

    let amountLeft = remainingAmount;

    for (const purchase of activePackages) {
      if (amountLeft <= 0) break;

      const feature = purchase.package.feature;
      const usage = purchase.usage;

      if (!usage || !feature) continue;

      const serviceField = this.getServiceField(service);
      const currentRemaining = (usage as any)[`remaining${serviceField}`] as number;

      if (currentRemaining <= 0) continue;

      // Calculate deduction
      const amountToDeduct = Math.min(currentRemaining, amountLeft);
      const creditsToDeduct = amountToDeduct * this.CREDIT_CONVERSION[service];

      // Update usage
      await tx.usage.update({
        where: { id: usage.id },
        data: {
          [`remaining${serviceField}`]: currentRemaining - amountToDeduct,
          remainingCredits: Math.max(0, usage.remainingCredits - creditsToDeduct)
        }
      });

      amountLeft -= amountToDeduct;

      // Check if package is depleted
      const updatedUsage = await tx.usage.findUnique({
        where: { id: usage.id }
      });

      if (updatedUsage && updatedUsage.remainingCredits <= 0) {
        await this.handlePackageExpired(
          userId,
          userName,
          purchase,
          await this.getActivePackages(tx, userId, purchase.id),
          email
        );
      }
    }

    if (amountLeft > 0) {
      throw new Error(this.Errors.INSUFFICIENT_CREDITS);
    }
  }

  /**
   * Get field name for service (Projects, Teams, etc.)
   */
  private static getServiceField(service: Service): string {
    const fieldMap = {
      [Service.PROJECT]: 'Projects',
      [Service.PROPOSAL]: 'Proposals',
      [Service.TEAM]: 'Teams',
      [Service.REQUEST]: 'Requests',
      [Service.CHAT]: 'Tokens'
    };
    return fieldMap[service];
  }

  /**
   * Update chat token usage
   */
  static async updateChatUsage(
    userId: string,
    userName: string,
    inputTokens: number,
    outputTokens: number,
    requestCount: number,
    email?: string
  ): Promise<void> {
    if (!userId || inputTokens < 0 || outputTokens < 0) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const totalTokens = inputTokens + outputTokens;
    try {
      await prisma.$transaction(async (tx) => {
        // Get active subscription
        const subscription = await tx.subscription.findFirst({
          where: {
            userId,
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD]
            }
          },
          include: {
            plan: {
              include: {
                feature: true
              }
            },
            usage: true
          }
        });

        if (subscription?.usage && subscription.plan?.feature) {
          const usage = subscription.usage;
          const feature = subscription.plan.feature;
          const maxTokens = feature.maxTokens || 0;

          if (maxTokens > 0 && (usage.remainingTokens || 0) < totalTokens) {
            // Try credit packages
          } else {
            await tx.usage.update({
              where: { id: usage.id },
              data: {
                inputTokensUsed: { increment: inputTokens },
                outputTokensUsed: { increment: outputTokens },
                totalTokensUsed: { increment: totalTokens },
                remainingTokens: { decrement: totalTokens },
                chatRequestsMade: { increment: requestCount }
              }
            });
            return;
          }
        }

        // Check credit packages
        const activePackages = await tx.creditPurchase.findMany({
          where: {
            userId,
            status: PurchaseStatus.ACTIVE,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          orderBy: { purchasedAt: 'asc' },
          include: {
            package: {
              include: {
                feature: true
              }
            },
            usage: true
          }
        });

        let tokensLeft = totalTokens;
        if (subscription?.usage) {
          const subRemaining = subscription.usage.remainingTokens || 0;
          if (subRemaining > 0) {
            const tokensFromSub = Math.min(subRemaining, totalTokens);
            await tx.usage.update({
              where: { id: subscription.usage.id },
              data: {
                inputTokensUsed: { increment: inputTokens },
                outputTokensUsed: { increment: outputTokens },
                totalTokensUsed: { increment: tokensFromSub },
                remainingTokens: { decrement: tokensFromSub },
              }
            });
            tokensLeft = totalTokens - tokensFromSub;
          }
        }

        for (const purchase of activePackages) {
          if (tokensLeft <= 0) break;

          const usage = purchase.usage;
          const feature = purchase.package.feature;

          if (!usage || !feature) continue;

          const currentRemaining = usage.remainingTokens || 0;
          if (currentRemaining <= 0) continue;

          const tokensToDeduct = Math.min(currentRemaining, tokensLeft);
          const creditsToDeduct = Math.ceil(tokensToDeduct / 100); // 1 credit per 100 tokens

          await tx.usage.update({
            where: { id: usage.id },
            data: {
              inputTokensUsed: { increment: inputTokens },
              outputTokensUsed: { increment: outputTokens },
              totalTokensUsed: { increment: tokensToDeduct },
              remainingTokens: { decrement: tokensToDeduct },
              remainingCredits: Math.max(0, (usage.remainingCredits || 0) - creditsToDeduct)
            }
          });

          tokensLeft -= tokensToDeduct;
        }

        if (tokensLeft > 0) {
          throw new Error(this.Errors.INSUFFICIENT_CREDITS);
        }
      }, {
        timeout: this.TRANSACTION_TIMEOUT,
        maxWait: this.MAX_WAIT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error: any) {
      throw new Error(`Failed to update chat token usage: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient tokens for a chat request
   */
  static async checkTokenLimit(userId: string, requiredTokens: number): Promise<{ allowed: boolean; remaining: number; maxTokens: number }> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD] },
        },
        include: {
          plan: {
            include: {
              feature: true,
            },
          },
          usage: true,
        },
      });

      if (!subscription?.plan?.feature) {
        return { allowed: false, remaining: 0, maxTokens: 0 };
      }

      const maxTokens = subscription.plan.feature.maxTokens || 0;
      const remainingTokens = subscription.usage?.remainingTokens ?? 0;

      // Check credit packages if subscription doesn't have enough
      if (remainingTokens < requiredTokens && maxTokens > 0) {
        const activePackages = await prisma.creditPurchase.findMany({
          where: {
            userId,
            status: PurchaseStatus.ACTIVE,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          include: {
            usage: true,
          }
        });

        let totalRemaining = remainingTokens;
        for (const purchase of activePackages) {
          if (purchase.usage) {
            totalRemaining += purchase.usage.remainingTokens || 0;
          }
        }

        return {
          allowed: totalRemaining >= requiredTokens,
          remaining: totalRemaining,
          maxTokens,
        };
      }

      return {
        allowed: maxTokens === 0 || remainingTokens >= requiredTokens,
        remaining: remainingTokens,
        maxTokens,
      };
    } catch (error: any) {
      console.error('Error checking token limit:', error);
      return { allowed: false, remaining: 0, maxTokens: 0 };
    }
  }

  /**
   * Get remaining active packages excluding the current one
   */
  private static async getActivePackages(
    tx: Prisma.TransactionClient,
    userId: string,
    excludeId: string
  ): Promise<any[]> {
    const packages = await tx.creditPurchase.findMany({
      where: {
        userId,
        status: PurchaseStatus.ACTIVE,
        id: { not: excludeId },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        package: true,
        usage: true
      }
    });

    return packages.map(pkg => ({
      ...pkg,
      packageName: pkg.package.name,
      remainingCredits: pkg.usage?.remainingCredits || 0
    })).filter(p => p.remainingCredits > 0);
  }

  /**
   * Get current usage state for a user
   */
  static async getUsageState(userId: string): Promise<UsageState> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD],
            },
          },
          include: {
            plan: {
              include: {
                feature: true
              }
            },
            usage: true
          }
        },
        creditPurchases: {
          where: { 
            status: PurchaseStatus.ACTIVE,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          include: {
            package: {
              include: {
                feature: true
              }
            },
            usage: true
          }
        }
      }
    });

    if (!user) throw new Error(this.Errors.USER_NOT_FOUND);
    const activeSubscription = user.subscriptions[0];
    const feature = activeSubscription?.plan?.feature;
    const subUsage = activeSubscription?.usage;
    const subscriptionState = {
      id: activeSubscription?.id ?? null,
      status: activeSubscription?.status ?? SubscriptionStatus.EXPIRED,
      planName: activeSubscription?.plan?.name,
      projects: this.calculateResourceUsage(
        subUsage?.maxProjects || 0,
        subUsage?.remainingProjects || 0
      ),
      teams: this.calculateResourceUsage(
        subUsage?.maxTeams || 0,
        subUsage?.remainingTeams || 0
      ),
      proposals: this.calculateResourceUsage(
        subUsage?.maxProposals || 0,
        subUsage?.remainingProposals || 0
      ),
      requests: this.calculateResourceUsage(
        subUsage?.maxRequests || 0,
        subUsage?.remainingRequests || 0
      ),
      isApproachingLimit: false
    };

    subscriptionState.isApproachingLimit = 
      subscriptionState.projects.percentageUsed >= 80 ||
      subscriptionState.teams.percentageUsed >= 80 ||
      subscriptionState.proposals.percentageUsed >= 80 ||
      subscriptionState.requests.percentageUsed >= 80;

    // Build active packages state
    const activePackages = user.creditPurchases.map(purchase => {
      const usage = purchase.usage;
      const feature = purchase.package.feature;
      return {
        id: purchase.id,
        name: purchase.package.name,
        creditsUsed: (usage?.maxCredits || 0) - (usage?.remainingCredits || 0),
        creditLimit: usage?.maxCredits || 0,
        percentageUsed: this.calculatePercentage(
          (usage?.maxCredits || 0) - (usage?.remainingCredits || 0),
          usage?.maxCredits || 0
        ),
        remainingCredits: usage?.remainingCredits || 0,

        projectsUsed: (usage?.maxProjects || 0) - (usage?.remainingProjects || 0),
        projectLimit: usage?.maxProjects || 0,
        remainingProjects: usage?.remainingProjects || 0,

        proposalsUsed: (usage?.maxProposals || 0) - (usage?.remainingProposals || 0),
        proposalLimit: usage?.maxProposals || 0,
        remainingProposals: usage?.remainingProposals || 0,

        teamsUsed: (usage?.maxTeams || 0) - (usage?.remainingTeams || 0),
        teamLimit: usage?.maxTeams || 0,
        remainingTeams: usage?.remainingTeams || 0,

        requestsUsed: (usage?.maxRequests || 0) - (usage?.remainingRequests || 0),
        requestLimit: usage?.maxRequests || 0,
        remainingRequests: usage?.remainingRequests || 0,

        isExpiringSoon: purchase.expiresAt 
          ? DateTime.fromJSDate(purchase.expiresAt).diff(DateTime.now(), 'days').days <= 7
          : false,
        expiresAt: purchase.expiresAt || undefined
      };
    });

    // Calculate total usage
    const totalUsage = this.calculateTotalUsage(subscriptionState, activePackages);

    return {
      subscription: subscriptionState,
      creditPackages: {
        active: activePackages,
        expired: []
      },
      totalUsage
    };
  }

  private static calculateResourceUsage(max: number, remaining: number) {
    const used = max - remaining;
    return {
      used,
      limit: max,
      remaining,
      percentageUsed: this.calculatePercentage(used, max)
    };
  }

  private static calculatePercentage(used: number, total: number): number {
    return total > 0 ? (used / total) * 100 : 0;
  }

  private static calculateTotalUsage(
    subscription: UsageState['subscription'],
    packages: UsageState['creditPackages']['active']
  ): UsageState['totalUsage'] {
    const totals = {
      creditsUsed: 0,
      creditLimit: 0,
      projectsUsed: 0,
      projectLimit: 0,
      proposalsUsed: 0,
      proposalLimit: 0,
      teamsUsed: 0,
      teamLimit: 0,
      requestsUsed: 0,
      requestLimit: 0
    };

    // Add subscription
    totals.projectsUsed += subscription.projects.used;
    totals.projectLimit += subscription.projects.limit;
    totals.teamsUsed += subscription.teams.used;
    totals.teamLimit += subscription.teams.limit;
    totals.proposalsUsed += subscription.proposals.used;
    totals.proposalLimit += subscription.proposals.limit;
    totals.requestsUsed += subscription.requests.used;
    totals.requestLimit += subscription.requests.limit;

    // Add packages
    packages.forEach(pkg => {
      totals.creditsUsed += pkg.creditsUsed;
      totals.creditLimit += pkg.creditLimit;
      totals.projectsUsed += pkg.projectsUsed;
      totals.projectLimit += pkg.projectLimit;
      totals.teamsUsed += pkg.teamsUsed;
      totals.teamLimit += pkg.teamLimit;
      totals.proposalsUsed += pkg.proposalsUsed;
      totals.proposalLimit += pkg.proposalLimit;
      totals.requestsUsed += pkg.requestsUsed;
      totals.requestLimit += pkg.requestLimit;
    });

    const remainingCredits = totals.creditLimit - totals.creditsUsed;
    const percentageUsed = this.calculatePercentage(totals.creditsUsed, totals.creditLimit);

    return {
      creditsUsed: totals.creditsUsed,
      creditLimit: totals.creditLimit,
      remainingCredits,
      percentageUsed,

      projectsUsed: totals.projectsUsed,
      projectLimit: totals.projectLimit,
      remainingProjects: totals.projectLimit - totals.projectsUsed,

      proposalsUsed: totals.proposalsUsed,
      proposalLimit: totals.proposalLimit,
      remainingProposals: totals.proposalLimit - totals.proposalsUsed,

      teamsUsed: totals.teamsUsed,
      teamLimit: totals.teamLimit,
      remainingTeams: totals.teamLimit - totals.teamsUsed,

      requestsUsed: totals.requestsUsed,
      requestLimit: totals.requestLimit,
      remainingRequests: totals.requestLimit - totals.requestsUsed,

      isOverLimit: percentageUsed >= 100,
      isApproachingLimit: percentageUsed >= 80
    };
  }

  /**
   * Reset usage counts for a subscription (typically at billing cycle)
   */
  static async resetUsageCounts(subscription: Subscription, userId: string): Promise<void> {
    if (!userId || !subscription) {
      throw new Error(this.Errors.MISSING_PARAMETERS);
    }
    const feature = await prisma.feature.findUnique({
      where: { planId: subscription.planId }
    });
    if (!feature) {
      throw new Error('Invalid or not found plan feature');
    }
    await prisma.usage.updateMany({
      where: { subscriptionId: subscription.id },
      data: {
        maxCredits: feature.maxCredits,
        remainingCredits: feature.maxCredits,
        maxRequests: feature.maxRequests,
        remainingRequests: feature.maxRequests,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Handle notifications for usage limits
   */
  private static async handleUsageNotification(
    usageState: UsageState,
    userId: string,
    userName: string,
    email?: string
  ): Promise<void> {
    const { totalUsage } = usageState;

    if (!totalUsage.isOverLimit && !totalUsage.isApproachingLimit) {
      return;
    }

    const notificationType = totalUsage.isOverLimit 
      ? NotificationType.USAGE_OVER_LIMIT 
      : NotificationType.USAGE_APPROACHING_LIMIT;

    const hasRecentNotification = await this.checkLastNotification(
      userId,
      notificationType
    );

    if (hasRecentNotification) return;

    const config = this.getNotificationConfig(notificationType);

    await this.createNotification({
      userId,
      type: notificationType,
      title: config.title,
      content: config.generateMessage(usageState),
    });
  }

  private static async handleSubscriptionLimitReached(
    userId: string,
    userName: string,
    service: Service,
    subscription: Subscription,
    email?: string
  ): Promise<void> {
    const hasRecentNotification = await this.checkLastNotification(
      userId,
      NotificationType.SUBSCRIPTION_EXPIRED,
      { subscriptionId: subscription.id, service }
    );

    if (hasRecentNotification) return;

    const config = this.getNotificationConfig(NotificationType.SUBSCRIPTION_EXPIRED);

      await this.createNotification({
        userId,
        type: NotificationType.SUBSCRIPTION_EXPIRED,
        title: config.title,
        content: config.generateMessage(service),
      });
  }

  private static async handlePackageExpired(
    userId: string,
    userName: string,
    purchase: any,
    activePackages: any[],
    email?: string
  ): Promise<void> {
    const hasRecentNotification = await this.checkLastNotification(
      userId,
      NotificationType.PACKAGE_EXPIRED,
      { packageId: purchase.id }
    );

    if (hasRecentNotification) return;

    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { 
        status: PurchaseStatus.EXPIRED
      }
    });

    const config = this.getNotificationConfig(NotificationType.PACKAGE_EXPIRED);
    const usageData = {
      packageName: purchase.package.name,
      activePackagesCount: activePackages.length
    };
    
    await this.createNotification({
      userId,
      type: NotificationType.PACKAGE_EXPIRED,
      title: config.title,
      content: config.generateMessage(usageData),
    });
      
  }

  private static async checkLastNotification(
    userId: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const lastNotification = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        createdAt: {
          gte: DateTime.utc().minus({ hours: 24 }).toJSDate()
        }
      }
    });
    return !!lastNotification;
  }

  private static getNotificationConfig(type: NotificationType): {
    title: string;
    generateMessage: (data: any) => string;
  } {
    const configs = {
      [NotificationType.USAGE_OVER_LIMIT]: {
        title: 'Usage Limit Exceeded',
        generateMessage: (usageState: UsageState) => 
          `Your total usage has exceeded the limit (${usageState.totalUsage.percentageUsed.toFixed(1)}%). Please upgrade your plan or purchase additional credits.`
      },
      [NotificationType.USAGE_APPROACHING_LIMIT]: {
        title: 'Usage Limit Approaching',
        generateMessage: (usageState: UsageState) => 
          `Your total usage is approaching the limit (${usageState.totalUsage.percentageUsed.toFixed(1)}%). Consider upgrading your plan.`
      },
      [NotificationType.PACKAGE_EXPIRED]: {
        title: 'Credit Package Expired',
        generateMessage: (data: { packageName: string; activePackagesCount: number }) => 
          data.activePackagesCount === 0
            ? `Your ${data.packageName} package has expired. You have no active packages remaining.`
            : `Your ${data.packageName} package has expired. You have ${data.activePackagesCount} active package(s) remaining.`
      },
      [NotificationType.SUBSCRIPTION_EXPIRED]: {
        title: 'Subscription Usage Limit Reached',
        generateMessage: (service: Service) => 
          `Your subscription usage for ${service} service has been reached. Doc2Product will use your active credit packages.`
      }
    };
    return configs[type as keyof typeof configs];
  }

  private static async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
  }): Promise<void> {
    await prisma.notification.create({ data });
  }
}
