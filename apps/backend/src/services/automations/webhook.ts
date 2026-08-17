import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const SKEW_MS = 5 * 60 * 1000;

const replayStore = new Map<string, number>();

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

export function signWebhookBody(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function verifyWebhookRequest(opts: {
  secret: string;
  signature: string | undefined;
  timestamp: string | undefined;
  nonce: string | undefined;
  body: string;
  now?: number;
}): { ok: true } | { ok: false; reason: 'missing' | 'stale' | 'bad_hmac' | 'replay' } {
  const { secret, signature, timestamp, nonce, body } = opts;
  if (!signature || !timestamp || !nonce) return { ok: false, reason: 'missing' };

  const now = opts.now ?? Date.now();
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > SKEW_MS) {
    return { ok: false, reason: 'stale' };
  }

  const expected = signWebhookBody(secret, timestamp, body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_hmac' };
  }

  const replayKey = `${secret}:${nonce}`;
  if (replayStore.has(replayKey)) return { ok: false, reason: 'replay' };
  replayStore.set(replayKey, now);

  for (const [k, t] of replayStore) {
    if (now - t > SKEW_MS * 2) replayStore.delete(k);
  }

  return { ok: true };
}
