type RefreshResult = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
};

export async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for token refresh');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = JSON.parse(text) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  const expiresAt = json.expires_in
    ? Math.floor(Date.now() / 1000) + json.expires_in
    : null;

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt,
  };
}

export async function refreshSlackToken(refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are required for token refresh');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json()) as {
    ok?: boolean;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!json.ok || !json.access_token) {
    throw new Error(`Slack token refresh failed: ${json.error ?? 'unknown error'}`);
  }

  const expiresAt = json.expires_in
    ? Math.floor(Date.now() / 1000) + json.expires_in
    : null;

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt,
  };
}

export async function refreshProviderToken(
  providerId: string,
  refreshToken: string,
): Promise<RefreshResult> {
  if (providerId.startsWith('google_')) {
    return refreshGoogleToken(refreshToken);
  }
  if (providerId === 'slack') {
    return refreshSlackToken(refreshToken);
  }
  throw new Error(`Token refresh not supported for provider: ${providerId}`);
}
