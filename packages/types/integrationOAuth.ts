import type { IntegrationProviderId } from './integrationCatalog';

export const INTEGRATION_OAUTH_PROVIDERS = [
  'github',
  'slack',
  'google_mail',
  'google_calendar',
  'google_drive',
] as const;

export type IntegrationOAuthProviderId = (typeof INTEGRATION_OAUTH_PROVIDERS)[number];

export const GOOGLE_MAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export const GOOGLE_DRIVE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const GITHUB_INTEGRATION_SCOPES = ['read:user', 'user:email', 'repo'] as const;

export const SLACK_INTEGRATION_BOT_SCOPES = [
  'chat:write',
  'channels:read',
  'groups:read',
  'users:read',
] as const;

const UI_TO_OAUTH: Record<string, IntegrationOAuthProviderId> = {
  github: 'github',
  slack: 'slack',
  gmail: 'google_mail',
  google_mail: 'google_mail',
  google_calendar: 'google_calendar',
  google_drive: 'google_drive',
};

export function oauthProviderFromUiKey(uiProvider: string): IntegrationOAuthProviderId | null {
  return UI_TO_OAUTH[uiProvider] ?? null;
}

export function isIntegrationOAuthProvider(value: string): value is IntegrationOAuthProviderId {
  return (INTEGRATION_OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function catalogIdForOAuthProvider(provider: IntegrationOAuthProviderId): IntegrationProviderId {
  return provider;
}
