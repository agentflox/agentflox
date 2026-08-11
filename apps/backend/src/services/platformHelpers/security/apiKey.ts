/**
 * Resolve a third-party API key from helper args, then env fallback.
 * Prefer user-supplied tool inputs so generated tools can collect secrets at run time.
 */
export function resolveHelperApiKey(
  args: Record<string, any>,
  opts: {
    /** Explicit arg names to check first (e.g. firecrawl_api_key) */
    argNames?: string[];
    /** Env var name used as platform fallback */
    envName?: string;
  } = {},
): string | null {
  const names = [
    ...(opts.argNames || []),
    'api_key',
    'apiKey',
    'token',
    'access_token',
  ];
  for (const name of names) {
    const v = args?.[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  if (opts.envName) {
    const env = process.env[opts.envName];
    if (env && env.trim()) return env.trim();
  }
  return null;
}
