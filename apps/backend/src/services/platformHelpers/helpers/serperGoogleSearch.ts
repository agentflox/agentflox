import { withRetries } from '../policy/retry';
import { recordHelperUsage } from '../usage';
import { resolveHelperApiKey } from '../security/apiKey';
import type { HelperArgs, HelperContext, HelperResult } from '../types';

export async function serperGoogleSearch(
  args: HelperArgs,
  ctx: HelperContext,
  signal?: AbortSignal,
): Promise<HelperResult> {
  const apiKey = resolveHelperApiKey(args, {
    argNames: ['serper_api_key', 'serperApiKey'],
    envName: 'SERPER_API_KEY',
  });
  if (!apiKey) {
    return {
      status: 'error',
      error:
        'Serper API key required. Pass serper_api_key (or api_key) in Helper args / tool inputs, or set SERPER_API_KEY.',
    };
  }

  const query = String(args.query || args.q || '').trim();
  if (!query) return { status: 'error', error: 'query is required' };

  try {
    const data = await withRetries(async () => {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        signal,
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: typeof args.num === 'number' ? args.num : 10,
          gl: args.gl,
          hl: args.hl,
        }),
      });
      if (!res.ok) {
        const err: any = new Error(`Serper error ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    });

    await recordHelperUsage({
      ctx,
      helperName: 'serper_google_search',
      billable: true,
      success: true,
      estimatedTokens: 50,
      meta: { query },
    });

    return {
      status: 'success',
      ...data,
      organic: data.organic || data.organic_results || [],
      query,
      user_key_used: Boolean(args.serper_api_key || args.api_key || args.apiKey),
    };
  } catch (err: any) {
    await recordHelperUsage({
      ctx,
      helperName: 'serper_google_search',
      billable: false,
      success: false,
      meta: { error: err?.message },
    });
    return { status: 'error', error: err?.message || 'serper_google_search failed', query };
  }
}
