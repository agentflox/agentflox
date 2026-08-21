export const WEBHOOK_TYPES = {
  AUTOMATION: 'automation',
  INTEGRATION: 'integration',
  AGENT: 'agent',
} as const;

export type WebhookType = (typeof WEBHOOK_TYPES)[keyof typeof WEBHOOK_TYPES];
