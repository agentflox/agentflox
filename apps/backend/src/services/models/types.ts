import type { AiModelAuthType, AiModelProvider } from '@agentflox/types';

export type { AiModelAuthType, AiModelProvider };

export class ModelNotFoundError extends Error {
  readonly code = 'MODEL_NOT_FOUND';
  constructor(public readonly modelId: string) {
    super(`AI model not found: ${modelId}`);
    this.name = 'ModelNotFoundError';
  }
}

export class ModelUnauthorizedError extends Error {
  readonly code = 'MODEL_UNAUTHORIZED';
  constructor(public readonly modelId: string) {
    super(`Not authorized to use AI model: ${modelId}`);
    this.name = 'ModelUnauthorizedError';
  }
}

export class ModelValidationError extends Error {
  readonly code = 'MODEL_VALIDATION';
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'ModelValidationError';
  }
}

export class ModelEntitlementError extends Error {
  readonly code = 'MODEL_ENTITLEMENT';
  constructor(message: string, public readonly slug?: string) {
    super(message);
    this.name = 'ModelEntitlementError';
  }
}

export interface UnifiedUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  thinkingTokens?: number;
  usageEstimated?: boolean;
}

export interface ResolvedCredentials {
  authType: AiModelAuthType;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface ResolvedModel {
  id: string;
  slug: string;
  displayName: string;
  provider: AiModelProvider;
  apiModelId: string;
  isSystem: boolean;
  isCustom: boolean;
  isDefault: boolean;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  credentials?: ResolvedCredentials;
  /** Platform or user API key ready for SDK */
  apiKey?: string;
}

export interface ResolveModelInput {
  modelId?: string | null;
  userId: string;
  workspaceIds?: string[];
  /** Skip plan entitlement check (e.g. internal jobs) */
  skipEntitlement?: boolean;
  /** Optional plan type override; otherwise loaded from active subscription */
  planType?: string | null;
}

export interface ModelListFilters {
  search?: string;
  providers?: AiModelProvider[];
  isCustom?: boolean;
  supportsThinking?: boolean;
  inputFileTypes?: string[];
  minContextWindow?: number;
  maxCreditsPer1k?: number;
}

export interface RecordUsageContext {
  conversationId?: string;
  agentId?: string;
  action?: 'CHAT' | 'GENERATE' | 'ANALYZE' | 'SUMMARIZE' | 'SEARCH' | 'EMBEDDING';
  requestDurationMs?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface InvokeOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: unknown;
  stream?: boolean;
}

export interface InvokeResult {
  content: string | null;
  raw: unknown;
  usage: UnifiedUsage;
  toolCalls?: unknown[];
  finishReason?: string | null;
}
