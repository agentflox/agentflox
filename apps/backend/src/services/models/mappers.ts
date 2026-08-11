import type { AiModel } from '@agentflox/database/src/generated/prisma/client';
import type { AiModelView } from '@agentflox/types';
import { maskSecret } from './credentials';

function credentialsHint(encrypted?: string | null): string | null {
  if (!encrypted) return null;
  // Never decrypt for display — generic mask only
  return '••••••••';
}

export function toAiModelView(row: AiModel): AiModelView {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    provider: row.provider as AiModelView['provider'],
    apiModelId: row.apiModelId,
    description: row.description,
    isSystem: row.isSystem,
    isCustom: row.isCustom,
    isDefault: row.isDefault,
    isActive: row.isActive,
    authType: (row.authType as AiModelView['authType']) ?? null,
    hasCredentials: Boolean(row.credentialsEncrypted),
    credentialsHint: credentialsHint(row.credentialsEncrypted),
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    creditsPer1kInput: row.creditsPer1kInput,
    creditsPer1kOutput: row.creditsPer1kOutput,
    creditTier: row.creditTier,
    inputFileTypes: row.inputFileTypes ?? [],
    supportsThinking: row.supportsThinking,
    workspaceId: row.workspaceId,
    userId: row.userId,
  };
}

export function maskApiKeyForLog(key?: string): string {
  return maskSecret(key) || '[none]';
}
