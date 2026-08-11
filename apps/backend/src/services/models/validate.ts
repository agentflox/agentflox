import { getProviderAuthConfig, type AiModelAuthType, type AiModelProvider } from '@agentflox/types';
import { generateText } from './providers';
import { ModelValidationError, type ResolvedModel } from './types';
import { logModelEvent } from './observability';
import { scrubError } from './credentials';

export function assertAuthTypeAllowed(
  provider: AiModelProvider,
  authType: AiModelAuthType,
): void {
  const cfg = getProviderAuthConfig(provider);
  if (!cfg || !cfg.authMethods.includes(authType)) {
    throw new ModelValidationError(
      `Auth type ${authType} is not supported for provider ${provider}`,
      { provider, authType },
    );
  }
  if (authType === 'OAUTH_TOKEN' && !cfg.oauthEnabled) {
    throw new ModelValidationError(
      `OAuth is not enabled yet for provider ${provider}. Use an API key.`,
      { provider, authType },
    );
  }
}

export function assertCredentialPayload(
  authType: AiModelAuthType,
  credentials: Record<string, unknown>,
): void {
  if (authType === 'API_KEY' && !credentials.apiKey) {
    throw new ModelValidationError('API key is required');
  }
  if (authType === 'OAUTH_TOKEN' && !credentials.accessToken) {
    throw new ModelValidationError('OAuth access token is required');
  }
}

/** Cheap test completion to validate apiModelId + credentials before save. */
export async function validateModelConnectivity(params: {
  provider: AiModelProvider;
  apiModelId: string;
  apiKey: string;
}): Promise<void> {
  const resolved: ResolvedModel = {
    id: 'validate-temp',
    slug: 'validate-temp',
    displayName: params.apiModelId,
    provider: params.provider,
    apiModelId: params.apiModelId,
    isSystem: false,
    isCustom: true,
    isDefault: false,
    apiKey: params.apiKey,
  };

  try {
    await generateText(
      resolved,
      [{ role: 'user', content: 'Reply with OK' }],
      { maxTokens: 5, temperature: 0 },
    );
    logModelEvent('model.validate', { outcome: 'ok', provider: params.provider, apiModelId: params.apiModelId });
  } catch (err) {
    const scrubbed = scrubError(err);
    logModelEvent('model.validate', {
      outcome: 'fail',
      provider: params.provider,
      apiModelId: params.apiModelId,
      error: scrubbed.message,
    });
    throw new ModelValidationError(
      `Could not reach model "${params.apiModelId}": ${scrubbed.message}`,
    );
  }
}
