import { assertSafeOutboundUrl, SSRF_BLOCKED_MESSAGE } from '../security/ssrf';
import { withRetries } from '../policy/retry';
import { recordHelperUsage } from '../usage';
import { resolveHelperApiKey } from '../security/apiKey';
import type { HelperArgs, HelperContext, HelperResult } from '../types';

export async function firecrawlHelper(
  args: HelperArgs,
  ctx: HelperContext,
  signal?: AbortSignal,
): Promise<HelperResult> {
  const apiKey = resolveHelperApiKey(args, {
    argNames: ['firecrawl_api_key', 'firecrawlApiKey', 'firecrawl'],
    envName: 'FIRECRAWL_API_KEY',
  });
  if (!apiKey) {
    return {
      status: 'error',
      error:
        'Firecrawl API key required. Pass firecrawl_api_key (or api_key) in Helper args / tool inputs, or set FIRECRAWL_API_KEY.',
    };
  }

  const url = String(args.url || args.website_url || '').trim();
  if (!url) return { status: 'error', error: 'url is required' };

  try {
    await assertSafeOutboundUrl(url);
  } catch {
    return { status: 'error', error: SSRF_BLOCKED_MESSAGE };
  }

  const scrapeOnly = args.scrape_only !== false && args.scrapeOnly !== false
    ? Boolean(args.scrape_only ?? args.scrapeOnly ?? true)
    : false;

  const endpoint = scrapeOnly
    ? 'https://api.firecrawl.dev/v1/scrape'
    : 'https://api.firecrawl.dev/v1/crawl';

  const body: Record<string, any> = scrapeOnly
    ? {
        url,
        formats: args.scrape_output_formats || args.formats || ['markdown', 'html'],
        onlyMainContent: args.extract_main_content_only ?? args.onlyMainContent ?? true,
      }
    : {
        url,
        limit: Number(args.page_limit || args.limit || 10),
        scrapeOptions: {
          formats: args.scrape_output_formats || ['markdown'],
          onlyMainContent: args.extract_main_content_only ?? true,
        },
        includePaths: args.include_paths,
        excludePaths: args.exclude_paths,
      };

  try {
    const data = await withRetries(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err: any = new Error(`Firecrawl error ${res.status}: ${await res.text().catch(() => '')}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    });

    await recordHelperUsage({
      ctx,
      helperName: 'firecrawl',
      billable: true,
      success: true,
      estimatedTokens: 100,
      meta: { url, scrapeOnly },
    });

    // Normalize a Relevance-like shape for tool builder examples
    const pages = Array.isArray(data?.data)
      ? data.data
      : data?.data
        ? [data.data]
        : data?.markdown || data?.html
          ? [{ markdown: data.markdown, html: data.html, content: data.markdown || data.html }]
          : [];

    return {
      status: 'success',
      ...data,
      data: pages,
      total: pages.length,
      url,
      user_key_used: Boolean(
        args.firecrawl_api_key || args.api_key || args.apiKey || args.firecrawl,
      ),
    };
  } catch (err: any) {
    await recordHelperUsage({
      ctx,
      helperName: 'firecrawl',
      billable: false,
      success: false,
      meta: { error: err?.message },
    });
    return { status: 'error', error: err?.message || 'firecrawl failed', url };
  }
}
