import { prisma } from '@/lib/prisma';
import { AiActionType } from '@agentflox/database/src/generated/prisma/client';
import { updateAgentUsage } from '@/utils/ai/agentUsageTracking';
import { shouldDebitPlatformTokens } from './billing';
import { logModelEvent } from './observability';
import type { RecordUsageContext, ResolvedModel, UnifiedUsage } from './types';

async function resolveIsCustomFlag(resolved: ResolvedModel): Promise<boolean> {
  if (resolved.isCustom) return true;
  // Safety: trust DB if model row exists (covers stale ResolvedModel shapes)
  if (!resolved.id || resolved.id.startsWith('validate') || resolved.id.startsWith('legacy:')) {
    return Boolean(resolved.isCustom);
  }
  try {
    const row = await prisma.aiModel.findUnique({
      where: { id: resolved.id },
      select: { isCustom: true },
    });
    if (row) return row.isCustom;
  } catch {
    /* ignore lookup failures */
  }
  return Boolean(resolved.isCustom);
}

export async function recordUsage(params: {
  resolved: ResolvedModel;
  usage: UnifiedUsage;
  userId: string;
  userName?: string;
  email?: string;
  context?: RecordUsageContext;
}): Promise<void> {
  const { resolved, usage, userId, userName = 'User', email, context = {} } = params;
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const totalTokens = usage.totalTokens || inputTokens + outputTokens;
  const isCustom = await resolveIsCustomFlag(resolved);
  const debit = !isCustom && shouldDebitPlatformTokens({ ...resolved, isCustom });

  // Skip synthetic/system userIds that would violate FK or pollute analytics
  if (!userId || userId === 'system') {
    logModelEvent('model.usage', {
      skipped: true,
      reason: 'system_user',
      modelId: resolved.id,
      isCustom,
      inputTokens,
      outputTokens,
      totalTokens,
    });
    return;
  }

  logModelEvent('model.usage', {
    modelId: resolved.id,
    apiModelId: resolved.apiModelId,
    provider: resolved.provider,
    isCustom,
    inputTokens,
    outputTokens,
    totalTokens,
    usageEstimated: Boolean(usage.usageEstimated),
    userId,
  });

  logModelEvent('model.billing', {
    modelId: resolved.id,
    isCustom,
    decision: debit ? 'debit' : 'skip',
    reason: debit ? 'system_model' : 'custom_byok',
    userId,
  });

  try {
    await prisma.aiUsageLog.create({
      data: {
        userId,
        conversationId: context.conversationId,
        action: (context.action as AiActionType) || AiActionType.GENERATE,
        model: resolved.apiModelId || resolved.displayName || resolved.slug,
        modelId:
          !resolved.id ||
          resolved.id.startsWith('validate') ||
          resolved.id.startsWith('legacy:')
            ? undefined
            : resolved.id,
        inputTokens,
        outputTokens,
        tokensUsed: totalTokens,
        isCustom,
        requestDuration: context.requestDurationMs,
        success: context.success !== false,
        errorMessage: context.errorMessage,
        metadata: {
          ...(context.metadata || {}),
          provider: resolved.provider,
          slug: resolved.slug,
          userKeyUsed: isCustom,
          usageEstimated: usage.usageEstimated,
          agentId: context.agentId,
        },
      },
    });
  } catch (err) {
    console.error('[models.usage] failed to write AiUsageLog', err);
  }

  if (debit && totalTokens > 0) {
    try {
      await updateAgentUsage(userId, userName, inputTokens, outputTokens, email);
    } catch (err) {
      console.error('[models.usage] failed to debit platform tokens', err);
    }
  }
}
