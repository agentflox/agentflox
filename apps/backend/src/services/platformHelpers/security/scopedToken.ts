import crypto from 'crypto';
import type { HelperContext } from '../types';

export interface ScopedHelperClaims {
  userId: string;
  runId: string;
  toolId?: string;
  exp: number;
}

function getSecret(): string {
  return (
    process.env.HELPER_TOKEN_SECRET ||
    process.env.HELPER_INTERNAL_SECRET ||
    process.env.JWT_SECRET ||
    'dev-helper-token-secret-change-me'
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

/**
 * Mint a short-lived scoped token for one tool run.
 * Sandboxes present this as Bearer auth to the helper bridge / internal API.
 */
export function mintScopedHelperToken(
  ctx: Pick<HelperContext, 'userId' | 'runId' | 'toolId'>,
  ttlSeconds = 900,
): string {
  if (!ctx.userId || !ctx.runId) {
    throw new Error('userId and runId are required to mint a helper token');
  }
  const header = b64urlJson({ alg: 'HS256', typ: 'HEL' });
  const payload = b64urlJson({
    userId: ctx.userId,
    runId: ctx.runId,
    toolId: ctx.toolId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  } satisfies ScopedHelperClaims);
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyScopedHelperToken(token: string): ScopedHelperClaims {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 3) throw new Error('Invalid helper token');
  const [header, payload, sig] = parts;
  const data = `${header}.${payload}`;
  const expected = b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid helper token signature');
  }
  const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as ScopedHelperClaims;
  if (!claims?.userId || !claims?.runId || !claims?.exp) {
    throw new Error('Invalid helper token claims');
  }
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Helper token expired');
  }
  return claims;
}

export function bearerFromAuthHeader(authorization?: string | null): string | null {
  if (!authorization) return null;
  const m = String(authorization).match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
