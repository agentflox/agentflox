/**
 * Agent Usage Tracking Utility
 * 
 * Provides token limit checking and usage tracking for agent operations
 * Similar to chat usage tracking but for agent build/update/execute operations
 */

import { prisma } from '@/lib/prisma';
import { SubscriptionStatus, PurchaseStatus } from './types';
import { countTokens } from './countTokens';

/**
 * Check if user has sufficient tokens for an agent operation
 */
export async function checkAgentTokenLimit(
  userId: string,
  requiredTokens: number
): Promise<{ allowed: boolean; remaining: number; maxTokens: number }> {
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
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          usage: true,
        },
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
    console.error('Error checking agent token limit:', error);
    return { allowed: false, remaining: 0, maxTokens: 0 };
  }
}

/**
 * Update agent token usage (build/update/execute operations)
 */
export async function updateAgentUsage(
  userId: string,
  userName: string,
  inputTokens: number,
  outputTokens: number,
  email?: string
): Promise<void> {
  if (!userId || inputTokens < 0 || outputTokens < 0) {
    throw new Error('Invalid parameters for agent usage update');
  }

  const totalTokens = inputTokens + outputTokens;

  try {
    await prisma.$transaction(async (tx) => {
      // Get active subscription
      const subscription = await tx.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD],
          },
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

      if (subscription?.usage && subscription.plan?.feature) {
        const usage = subscription.usage;
        const feature = subscription.plan.feature;
        const maxTokens = feature.maxTokens || 0;

        if (maxTokens > 0 && (usage.remainingTokens || 0) >= totalTokens) {
          // Deduct from subscription
          await tx.usage.update({
            where: { id: usage.id },
            data: {
              inputTokensUsed: { increment: inputTokens },
              outputTokensUsed: { increment: outputTokens },
              totalTokensUsed: { increment: totalTokens },
              remainingTokens: { decrement: totalTokens },
            },
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
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { purchasedAt: 'asc' },
        include: {
          package: {
            include: {
              feature: true,
            },
          },
          usage: true,
        },
      });

      let tokensLeft = totalTokens;

      // First try subscription
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
            },
          });
          tokensLeft = totalTokens - tokensFromSub;
        }
      }

      // Then try credit packages
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
            remainingCredits: Math.max(0, (usage.remainingCredits || 0) - creditsToDeduct),
          },
        });

        tokensLeft -= tokensToDeduct;
      }

      if (tokensLeft > 0) {
        throw new Error('Insufficient tokens available');
      }
    }, {
      timeout: 50000,
      maxWait: 5000,
      isolationLevel: 'ReadCommitted',
    });
  } catch (error: any) {
    console.error('Failed to update agent token usage:', error);
    throw new Error(`Failed to update agent token usage: ${error.message}`);
  }
}

/**
 * Estimate tokens for messages/prompts (quick estimation)
 */
export function estimateTokens(content: string | object): number {
  if (typeof content === 'object') {
    return Math.ceil(JSON.stringify(content).length / 4);
  }
  return Math.ceil(content.length / 4);
}

/**
 * Count actual tokens from OpenAI API response or messages
 */
export async function countAgentTokens(
  messages?: Array<{ role: string; content: string }>,
  completion?: string,
  model: string = 'gpt-4o-mini',
  usage?: { prompt_tokens?: number | null; completion_tokens?: number | null } | null,
): Promise<{ inputTokens: number; outputTokens: number }> {
  // Prefer the model's own accounting when available — this is the true billing
  // source of truth and avoids re-tokenizing large histories.
  if (usage && (usage.prompt_tokens != null || usage.completion_tokens != null)) {
    return {
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    };
  }

  const inputStr = messages ? JSON.stringify(messages) : undefined;

  const tokenCount = await countTokens({
    input: inputStr,
    completion,
    model,
  });

  return {
    inputTokens: tokenCount.inputTokens || 0,
    outputTokens: tokenCount.outputTokens || 0,
  };
}

