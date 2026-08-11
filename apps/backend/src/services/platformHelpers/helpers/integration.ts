import type { HelperArgs, HelperContext, HelperResult } from '../types';

/**
 * OAuth Integration.api_call — signature stable; not configured until OAuth vault exists.
 */
export async function integrationApiCall(
  args: HelperArgs,
  _ctx: HelperContext,
): Promise<HelperResult> {
  return {
    status: 'error',
    error:
      'Integration OAuth is not configured yet. Use dedicated OAuth tool steps or configure integrations first.',
    __integration: args.provider_name || args.provider,
    __input: {
      method: args.method,
      url: args.url,
    },
  };
}
