/**
 * Public facade for AI model catalog, resolve, invoke, and usage.
 * Call sites should import from `@/services/models` only.
 */

export * from './types';
export {
  getDefaultModel,
  getModelById,
  getModelBySlug,
  listModels,
  canAccessModel,
  DEFAULT_SLUG,
} from './catalog';
export { resolveModel } from './resolve';
export {
  encryptCredentials,
  decryptCredentials,
  getPlatformApiKey,
  scrubError,
  maskSecret,
  resolveApiKeyFromCredentials,
} from './credentials';
export { shouldDebitPlatformTokens } from './billing';
export { assertModelEntitled, isModelVisibleForPlan } from './entitlements';
export { toAiModelView } from './mappers';
export { recordUsage } from './usage';
export {
  assertAuthTypeAllowed,
  assertCredentialPayload,
  validateModelConnectivity,
} from './validate';
export { convertModelName, legacyEnumToSlug } from './legacy';
export {
  generateText,
  createChatCompletion,
  createOpenAICompletion,
  extractUsageFromCompletion,
} from './providers';
export { fromOpenAIUsage, fromAnthropicUsage, fromGoogleUsage, emptyUsage } from './providers/normalize';
export { completeWithDefaultModel, resolveAgentModel } from './orchestratorLlm';
export {
  toUserFacingError,
  getUserFacingErrorMessage,
  toUserFacingModelError,
  getUserFacingModelErrorMessage,
} from './errors';
export type { UserFacingError, UserFacingErrorKind, UserFacingModelError } from './errors';

import { resolveModel } from './resolve';
import { generateText } from './providers';
import { recordUsage } from './usage';
import type { InvokeOptions, InvokeResult, ResolveModelInput, RecordUsageContext } from './types';

/** Resolve + generate + record usage in one call. */
export async function invokeWithModel(params: {
  resolve: ResolveModelInput;
  messages: Array<{ role: string; content: any }>;
  options?: InvokeOptions;
  usageContext?: RecordUsageContext;
  userName?: string;
  email?: string;
}): Promise<InvokeResult & { resolved: Awaited<ReturnType<typeof resolveModel>> }> {
  const resolved = await resolveModel(params.resolve);
  const started = Date.now();
  try {
    const result = await generateText(resolved, params.messages, params.options);
    await recordUsage({
      resolved,
      usage: result.usage,
      userId: params.resolve.userId,
      userName: params.userName,
      email: params.email,
      context: {
        ...params.usageContext,
        requestDurationMs: Date.now() - started,
        success: true,
      },
    });
    return { ...result, resolved };
  } catch (err) {
    await recordUsage({
      resolved,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, usageEstimated: true },
      userId: params.resolve.userId,
      userName: params.userName,
      email: params.email,
      context: {
        ...params.usageContext,
        requestDurationMs: Date.now() - started,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
