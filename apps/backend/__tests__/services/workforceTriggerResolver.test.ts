import { cronMatchesNow, verifyWebhookSecret } from '../../src/modules/workforce/integrations/workforceTriggerResolver';

describe('workforce trigger resolver', () => {
  it('matches simple cron expressions', () => {
    const date = new Date('2026-08-12T10:30:00');
    expect(cronMatchesNow('30 10 * * *', date)).toBe(true);
    expect(cronMatchesNow('0 10 * * *', date)).toBe(false);
  });

  it('verifies webhook secrets with timing-safe compare', () => {
    expect(verifyWebhookSecret('secret123', 'secret123')).toBe(true);
    expect(verifyWebhookSecret('wrong', 'secret123')).toBe(false);
  });
});
