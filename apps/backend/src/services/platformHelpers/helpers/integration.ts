import type { HelperArgs, HelperContext, HelperResult } from '../types';
import { executeGithubApiCall } from '@/modules/integrations/executor/githubExecutor';
import { assertIntegrationHostAllowed } from '@/modules/integrations/security/allowlist';

const PROVIDER_ALIASES: Record<string, 'github'> = {
  github: 'github',
  GITHUB: 'github',
};

/**
 * OAuth Integration.api_call — routes to provider executors with SSRF allowlists.
 */
export async function integrationApiCall(
  args: HelperArgs,
  ctx: HelperContext,
): Promise<HelperResult> {
  const providerRaw = String(args.provider_name || args.provider || '').trim();
  const provider = PROVIDER_ALIASES[providerRaw];
  const accountId = String(args.account_id || args.accountId || '').trim();
  const method = String(args.method || 'GET').toUpperCase();
  const url = String(args.url || '');

  if (!provider) {
    return {
      status: 'error',
      error: `Integration provider "${providerRaw}" is not supported yet.`,
      __integration: providerRaw,
    };
  }

  if (!accountId) {
    return {
      status: 'error',
      error: 'account_id is required for integration API calls.',
      __integration: providerRaw,
    };
  }

  if (!url) {
    return {
      status: 'error',
      error: 'url is required for integration API calls.',
      __integration: providerRaw,
    };
  }

  try {
    assertIntegrationHostAllowed(provider, url);
    const parsed = new URL(url);

    const result = await executeGithubApiCall(
      {
        accountId,
        method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: parsed.pathname,
        query: Object.fromEntries(parsed.searchParams.entries()),
        body: args.body,
        failOnStatus400Plus: true,
      },
      ctx.userId || 'system',
      undefined,
    );

    return {
      status: 'success',
      result,
      __integration: providerRaw,
      __input: { method, url },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Integration API call failed',
      __integration: providerRaw,
      __input: { method, url },
    };
  }
}
