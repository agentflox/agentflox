import {
  GITHUB_INTEGRATION_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_DRIVE_SCOPES,
  GOOGLE_MAIL_SCOPES,
  SLACK_INTEGRATION_BOT_SCOPES,
  type IntegrationOAuthProviderId,
} from '@agentflox/types/integrationOAuth';

export type ExchangedOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  providerAccountId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export function publicOriginFromRequest(request: { headers: Headers; nextUrl: URL }): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = forwardedProto || request.nextUrl.protocol.replace(/:$/, '');
  return `${proto}://${host}`;
}

/**
 * Reuse the NextAuth callback URLs already registered on GitHub/Google/Slack OAuth apps.
 * Integration connects are intercepted in middleware when state has our prefix.
 */
export function integrationOAuthCallbackUrl(
  origin: string,
  provider: IntegrationOAuthProviderId,
): string {
  const base = origin.replace(/\/$/, '');
  if (provider === 'github') return `${base}/api/auth/callback/github`;
  if (provider === 'slack') return `${base}/api/auth/callback/slack`;
  return `${base}/api/auth/callback/google`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function buildAuthorizationUrl(
  provider: IntegrationOAuthProviderId,
  state: string,
  redirectUri: string,
): string {
  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: requireEnv('GITHUB_CLIENT_ID'),
      redirect_uri: redirectUri,
      scope: GITHUB_INTEGRATION_SCOPES.join(' '),
      state,
      allow_signup: 'true',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === 'slack') {
    const params = new URLSearchParams({
      client_id: requireEnv('SLACK_CLIENT_ID'),
      redirect_uri: redirectUri,
      scope: SLACK_INTEGRATION_BOT_SCOPES.join(','),
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  const googleScopes =
    provider === 'google_mail'
      ? GOOGLE_MAIL_SCOPES
      : provider === 'google_calendar'
        ? GOOGLE_CALENDAR_SCOPES
        : GOOGLE_DRIVE_SCOPES;

  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: googleScopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  provider: IntegrationOAuthProviderId,
  code: string,
  redirectUri: string,
): Promise<ExchangedOAuthTokens> {
  if (provider === 'github') return exchangeGithub(code, redirectUri);
  if (provider === 'slack') return exchangeSlack(code, redirectUri);
  return exchangeGoogle(code, redirectUri);
}

async function exchangeGithub(code: string, redirectUri: string): Promise<ExchangedOAuthTokens> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: requireEnv('GITHUB_CLIENT_ID'),
      client_secret: requireEnv('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: redirectUri,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || 'GitHub token exchange failed');
  }

  const profileRes = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${json.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const profile = (await profileRes.json()) as {
    id?: number;
    login?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  if (!profileRes.ok || !profile.id) {
    throw new Error('Failed to load GitHub profile');
  }

  let email = profile.email ?? null;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${json.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>;
      email = emails.find((e) => e.primary)?.email || emails.find((e) => e.verified)?.email || emails[0]?.email || null;
    }
  }

  return {
    accessToken: json.access_token,
    refreshToken: null,
    expiresAt: null,
    tokenType: json.token_type ?? 'bearer',
    scope: json.scope ?? GITHUB_INTEGRATION_SCOPES.join(' '),
    providerAccountId: String(profile.id),
    displayName: profile.login || profile.name || String(profile.id),
    email,
    avatarUrl: profile.avatar_url ?? null,
  };
}

async function exchangeSlack(code: string, redirectUri: string): Promise<ExchangedOAuthTokens> {
  const body = new URLSearchParams({
    client_id: requireEnv('SLACK_CLIENT_ID'),
    client_secret: requireEnv('SLACK_CLIENT_SECRET'),
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    token_type?: string;
    scope?: string;
    bot_user_id?: string;
    authed_user?: { id?: string; access_token?: string; scope?: string };
    team?: { id?: string; name?: string };
  };
  if (!json.ok || !json.access_token) {
    throw new Error(json.error || 'Slack token exchange failed');
  }

  const providerAccountId = json.authed_user?.id || json.bot_user_id || json.team?.id;
  if (!providerAccountId) {
    throw new Error('Slack did not return a user or team id');
  }

  return {
    accessToken: json.access_token,
    refreshToken: null,
    expiresAt: null,
    tokenType: json.token_type ?? 'bot',
    scope: json.scope ?? SLACK_INTEGRATION_BOT_SCOPES.join(','),
    providerAccountId,
    displayName: json.team?.name || 'Slack',
    email: null,
    avatarUrl: null,
  };
}

async function exchangeGoogle(code: string, redirectUri: string): Promise<ExchangedOAuthTokens> {
  const body = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || 'Google token exchange failed');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${json.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  if (!profileRes.ok || !profile.sub) {
    throw new Error('Failed to load Google profile');
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? Math.floor(Date.now() / 1000) + json.expires_in : null,
    tokenType: json.token_type ?? 'Bearer',
    scope: json.scope ?? null,
    providerAccountId: profile.sub,
    displayName: profile.name || profile.email || profile.sub,
    email: profile.email ?? null,
    avatarUrl: profile.picture ?? null,
  };
}
