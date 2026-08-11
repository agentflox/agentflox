import type { AiModel } from '@agentflox/database/src/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  canAccessModel,
  getDefaultModel,
  getModelById,
} from './catalog';
import {
  decryptCredentials,
  getPlatformApiKey,
  resolveApiKeyFromCredentials,
} from './credentials';
import { assertModelEntitled } from './entitlements';
import { logModelEvent } from './observability';
import {
  ModelNotFoundError,
  ModelUnauthorizedError,
  ModelValidationError,
  type ResolvedModel,
  type ResolveModelInput,
} from './types';

async function loadUserPlanType(userId: string): Promise<string | null> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'ON_HOLD', 'TRIALING'] as any },
      },
      include: { plan: { select: { planType: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return subscription?.plan?.planType || subscription?.plan?.name || null;
  } catch {
    return null;
  }
}

function toResolved(row: AiModel, apiKey?: string): ResolvedModel {
  let credentials = undefined as ResolvedModel['credentials'];
  if (row.isCustom && row.credentialsEncrypted) {
    try {
      credentials = decryptCredentials(row.credentialsEncrypted);
    } catch {
      throw new ModelValidationError('Failed to decrypt model credentials');
    }
  }

  const resolvedKey =
    apiKey ||
    resolveApiKeyFromCredentials(row.authType as any, credentials) ||
    (!row.isCustom ? getPlatformApiKey(row.provider as any) : undefined);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    provider: row.provider as ResolvedModel['provider'],
    apiModelId: row.apiModelId,
    isSystem: row.isSystem,
    isCustom: row.isCustom,
    isDefault: row.isDefault,
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    credentials,
    apiKey: resolvedKey,
  };
}

/**
 * Strict resolve:
 * - null/undefined modelId → default
 * - present but missing → ModelNotFoundError
 * - present but unauthorized → ModelUnauthorizedError
 */
export async function resolveModel(input: ResolveModelInput): Promise<ResolvedModel> {
  const { modelId, userId, workspaceIds = [], skipEntitlement, planType: planTypeOverride } = input;
  const planType = skipEntitlement
    ? null
    : (planTypeOverride ?? (await loadUserPlanType(userId)));

  if (!modelId) {
    const row = await getDefaultModel();
    const resolved = toResolved(row);
    if (!skipEntitlement) {
      // attach creditTier for entitlement via row
      (resolved as any).creditTier = row.creditTier;
      assertModelEntitled(resolved, planType);
    }
    logModelEvent('model.resolve', {
      source: 'default',
      modelId: resolved.id,
      provider: resolved.provider,
      isCustom: resolved.isCustom,
      userId,
      planType,
    });
    return resolved;
  }

  const row = await getModelById(modelId);
  if (!row || !row.isActive) {
    logModelEvent('model.resolve', { source: 'explicit', outcome: 'not_found', modelId, userId });
    throw new ModelNotFoundError(modelId);
  }

  if (!canAccessModel(row, userId, workspaceIds)) {
    logModelEvent('model.resolve', { source: 'explicit', outcome: 'unauthorized', modelId, userId });
    throw new ModelUnauthorizedError(modelId);
  }

  const resolved = toResolved(row);
  (resolved as any).creditTier = row.creditTier;

  if (!skipEntitlement) {
    assertModelEntitled(resolved, planType);
  }

  if (row.isCustom && !resolved.apiKey) {
    throw new ModelValidationError('Custom model is missing credentials');
  }
  if (!row.isCustom && !resolved.apiKey) {
    throw new ModelValidationError(`Platform API key not configured for provider ${row.provider}`);
  }

  logModelEvent('model.resolve', {
    source: 'explicit',
    outcome: 'ok',
    modelId: resolved.id,
    provider: resolved.provider,
    isCustom: resolved.isCustom,
    userId,
  });

  return resolved;
}
