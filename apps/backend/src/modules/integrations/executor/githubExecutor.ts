import {
  buildGithubApiUrl,
  INTEGRATION_RESPONSE_MAX_BYTES,
} from '../security/allowlist';
import { resolveAccessToken } from '../oauth/credentialVault';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function githubFetch(
  accessToken: string,
  method: HttpMethod,
  path: string,
  options?: {
    query?: Record<string, string>;
    body?: unknown;
    failOnStatus400Plus?: boolean;
  },
): Promise<Record<string, unknown>> {
  const url = buildGithubApiUrl(path, options?.query);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let body: string | undefined;
  if (options?.body !== undefined && options?.body !== null && method !== 'GET') {
    headers['content-type'] = 'application/json';
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(url, { method, headers, body });
  const text = await response.text();

  if (text.length > INTEGRATION_RESPONSE_MAX_BYTES) {
    throw new Error(`GitHub API response exceeds ${INTEGRATION_RESPONSE_MAX_BYTES} bytes`);
  }

  let parsed: unknown = text;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (options?.failOnStatus400Plus && response.status >= 400) {
    throw new Error(
      `GitHub API error ${response.status}: ${typeof parsed === 'string' ? parsed.slice(0, 500) : JSON.stringify(parsed).slice(0, 500)}`,
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    body: parsed,
    url,
  };
}

export async function executeGithubGetRepository(
  params: { accountId: string; owner: string; repo: string },
  userId: string,
  workspaceId?: string,
) {
  const { accessToken } = await resolveAccessToken({
    userId,
    workspaceId,
    providerId: 'github',
    accountId: params.accountId,
  });

  return githubFetch(accessToken, 'GET', `/repos/${params.owner}/${params.repo}`);
}

export async function executeGithubListRepos(
  params: { accountId: string; per_page?: number; page?: number; sort?: string },
  userId: string,
  workspaceId?: string,
) {
  const { accessToken } = await resolveAccessToken({
    userId,
    workspaceId,
    providerId: 'github',
    accountId: params.accountId,
  });

  const query: Record<string, string> = {};
  if (params.per_page != null) query.per_page = String(params.per_page);
  if (params.page != null) query.page = String(params.page);
  if (params.sort) query.sort = params.sort;

  return githubFetch(accessToken, 'GET', '/user/repos', { query });
}

export async function executeGithubApiCall(
  params: {
    accountId: string;
    method: HttpMethod;
    path: string;
    query?: Record<string, string>;
    body?: unknown;
    failOnStatus400Plus?: boolean;
  },
  userId: string,
  workspaceId?: string,
) {
  const { accessToken } = await resolveAccessToken({
    userId,
    workspaceId,
    providerId: 'github',
    accountId: params.accountId,
  });

  return githubFetch(accessToken, params.method, params.path, {
    query: params.query,
    body: params.body,
    failOnStatus400Plus: params.failOnStatus400Plus,
  });
}
