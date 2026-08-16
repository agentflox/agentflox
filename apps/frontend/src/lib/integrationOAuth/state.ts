import { createHmac, timingSafeEqual } from 'crypto';
import type { IntegrationOAuthProviderId } from '@agentflox/types/integrationOAuth';
import { INTEGRATION_OAUTH_STATE_PREFIX } from './constants';

export type IntegrationOAuthState = {
  userId: string;
  provider: IntegrationOAuthProviderId;
  redirectUri: string;
  exp: number;
};

function secret(): string {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error('AUTH_SECRET is required for integration OAuth');
  }
  return value;
}

export function signIntegrationOAuthState(
  payload: Omit<IntegrationOAuthState, 'exp'>,
): string {
  const body: IntegrationOAuthState = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
  };
  const json = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(json).digest('base64url');
  return `${INTEGRATION_OAUTH_STATE_PREFIX}${json}.${sig}`;
}

export function verifyIntegrationOAuthState(state: string): IntegrationOAuthState {
  const raw = state.startsWith(INTEGRATION_OAUTH_STATE_PREFIX)
    ? state.slice(INTEGRATION_OAUTH_STATE_PREFIX.length)
    : state;
  const [json, sig] = raw.split('.');
  if (!json || !sig) {
    throw new Error('Invalid OAuth state');
  }
  const expected = createHmac('sha256', secret()).update(json).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }
  const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf8')) as IntegrationOAuthState;
  if (!payload.userId || !payload.provider || !payload.redirectUri || !payload.exp) {
    throw new Error('Invalid OAuth state payload');
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('OAuth state expired. Try connecting again.');
  }
  return payload;
}
