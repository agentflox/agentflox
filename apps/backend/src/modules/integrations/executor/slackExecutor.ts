import { resolveAccessToken } from '../oauth/credentialVault';
import { INTEGRATION_RESPONSE_MAX_BYTES } from '../security/allowlist';

export async function executeSlackPostMessage(
  params: { accountId: string; channel: string; text: string },
  userId: string,
  workspaceId?: string,
) {
  const { accessToken } = await resolveAccessToken({
    userId,
    workspaceId,
    providerId: 'slack',
    accountId: params.accountId,
  });

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: params.channel,
      text: params.text,
    }),
  });

  const text = await res.text();
  if (text.length > INTEGRATION_RESPONSE_MAX_BYTES) {
    throw new Error(`Slack API response exceeds ${INTEGRATION_RESPONSE_MAX_BYTES} bytes`);
  }

  const json = JSON.parse(text) as { ok: boolean; error?: string; ts?: string; channel?: string };
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error ?? 'unknown'}`);
  }

  return { ok: true, ts: json.ts, channel: json.channel };
}
