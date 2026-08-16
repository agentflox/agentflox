/**
 * Per-provider host/path allowlists for authenticated API passthrough.
 * Prevents SSRF via integration tools — never allow arbitrary hosts.
 */

const GITHUB_API_HOST = 'api.github.com';

/** Starting estimate — tune after provider profiling. */
export const INTEGRATION_RESPONSE_MAX_BYTES = 1_048_576;
/** Starting estimate — tune after provider profiling. */
export const INTEGRATION_RATE_LIMIT_PER_MIN = 100;

const GITHUB_PATH_ALLOWLIST: RegExp[] = [
  /^\/user(\/repos)?$/,
  /^\/user\/[^/]+$/,
  /^\/repos\/[^/]+\/[^/]+(\/.*)?$/,
  /^\/orgs\/[^/]+(\/repos)?$/,
  /^\/search\/[^/]+$/,
];

export function assertGithubPathAllowed(path: string): void {
  if (!path.startsWith('/')) {
    throw new Error('GitHub API path must start with /');
  }
  if (path.includes('://')) {
    throw new Error('GitHub API path must not include a host');
  }
  const allowed = GITHUB_PATH_ALLOWLIST.some((re) => re.test(path));
  if (!allowed) {
    throw new Error(`GitHub API path is not allowlisted: ${path}`);
  }
}

export function buildGithubApiUrl(path: string, query?: Record<string, string>): string {
  assertGithubPathAllowed(path);
  const url = new URL(`https://${GITHUB_API_HOST}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

const ALLOWED_HOSTS: Record<string, string[]> = {
  github: ['api.github.com'],
  slack: ['slack.com'],
  google_mail: ['gmail.googleapis.com', 'www.googleapis.com'],
};

const PRIVATE_IP_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/i;

export function assertIntegrationHostAllowed(providerId: string, url: string): void {
  const parsed = new URL(url);
  if (PRIVATE_IP_RE.test(parsed.hostname)) {
    throw new Error(`Private or local hosts are not allowed: ${parsed.hostname}`);
  }
  const allowed = ALLOWED_HOSTS[providerId];
  if (allowed?.includes(parsed.hostname)) return;
  throw new Error(`Host not allowlisted for provider ${providerId}: ${parsed.hostname}`);
}
