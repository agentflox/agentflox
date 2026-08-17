import { signWebhookBody, verifyWebhookRequest } from '@/services/automations/webhook';

describe('automation webhook HMAC', () => {
  const secret = 'whsec_test_secret';
  const body = JSON.stringify({ type: 'TASK_OR_SUBTASK_CREATED', taskId: 't1' });

  it('accepts a valid signature within the timestamp window', () => {
    const timestamp = String(Date.now());
    const signature = signWebhookBody(secret, timestamp, body);
    const result = verifyWebhookRequest({
      secret,
      signature,
      timestamp,
      nonce: `n-${Date.now()}`,
      body,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects a bad HMAC', () => {
    const timestamp = String(Date.now());
    const result = verifyWebhookRequest({
      secret,
      signature: 'deadbeef',
      timestamp,
      nonce: `bad-${Date.now()}`,
      body,
    });
    expect(result).toEqual({ ok: false, reason: 'bad_hmac' });
  });

  it('rejects replayed nonces', () => {
    const timestamp = String(Date.now());
    const signature = signWebhookBody(secret, timestamp, body);
    const nonce = `replay-${Date.now()}`;
    expect(verifyWebhookRequest({ secret, signature, timestamp, nonce, body }).ok).toBe(true);
    expect(verifyWebhookRequest({ secret, signature, timestamp, nonce, body })).toEqual({
      ok: false,
      reason: 'replay',
    });
  });

  it('rejects stale timestamps', () => {
    const timestamp = String(Date.now() - 6 * 60 * 1000);
    const signature = signWebhookBody(secret, timestamp, body);
    expect(
      verifyWebhookRequest({
        secret,
        signature,
        timestamp,
        nonce: `stale-${Date.now()}`,
        body,
      }),
    ).toEqual({ ok: false, reason: 'stale' });
  });
});
