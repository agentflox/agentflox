import type { IntegrationCategory } from '@agentflox/types';

/** Static UI metadata keyed by integrations page provider id. Names/status come from catalog + API. */
export type IntegrationUiMeta = {
  category: IntegrationCategory;
  description: string;
  isEnterprise?: boolean;
};

export const INTEGRATION_UI_META: Record<string, IntegrationUiMeta> = {
  github: {
    category: 'development',
    description: 'Link repositories to track issues, pull requests, and commits.',
  },
  slack: {
    category: 'communication',
    description: 'Receive notifications and updates in your Slack channels.',
  },
  gmail: {
    category: 'email',
    description: 'Sync your emails and contacts for streamlined communication.',
  },
  google_drive: {
    category: 'storage',
    description: 'Access and share files from Google Drive within your workspace.',
  },
  google_calendar: {
    category: 'calendar',
    description: 'Sync events and meetings to manage your schedule efficiently.',
  },
  http_webhook: {
    category: 'development',
    description: 'Call external APIs and receive inbound webhooks as workforce triggers.',
  },
  schedule: {
    category: 'calendar',
    description: 'Run workforces on a recurring schedule without manual triggers.',
  },
  openai: {
    category: 'development',
    description: 'Use OpenAI models for chat, embeddings, images, and moderation in agents.',
  },
  anthropic: {
    category: 'development',
    description: 'Use Anthropic Claude models as an alternative AI provider in workflows.',
    isEnterprise: true,
  },
  figma: {
    category: 'design',
    description: 'Connect your design files to sync assets and prototypes directly.',
  },
  codegen: {
    category: 'development',
    description: 'Automate code generation and scaffolding directly from your specs.',
    isEnterprise: true,
  },
  zoom: {
    category: 'communication',
    description: 'Start and join Zoom meetings directly from your dashboard.',
  },
  microsoft_teams: {
    category: 'communication',
    description: 'Collaborate with your team seamlessly via Microsoft Teams.',
    isEnterprise: true,
  },
  discord: {
    category: 'communication',
    description: 'Connect with your community and team on Discord servers.',
  },
  microsoft_online: {
    category: 'storage',
    description: 'Integrate Office 365 apps for document editing and collaboration.',
    isEnterprise: true,
  },
  youtube: {
    category: 'marketing',
    description: 'Publish and manage video content directly from the platform.',
  },
  facebook: {
    category: 'marketing',
    description: 'Manage your social media presence and ad campaigns.',
  },
};

/** OAuth providers that open the connect/configure modal. */
export const OAUTH_INTEGRATION_PROVIDERS = new Set([
  'github',
  'slack',
  'gmail',
  'google_calendar',
  'google_drive',
]);

/** Providers backed by the canonical integration catalog (real executors / vault). */
export const CATALOG_UI_PROVIDERS = new Set([
  'github',
  'slack',
  'gmail',
  'google_calendar',
  'google_drive',
]);

/** Env/API-backed providers shown with live platform status. */
export const PLATFORM_INTEGRATION_PROVIDERS = new Set<string>();

/** Roadmap entries — shown separately, never as connected. */
export const COMING_SOON_UI_PROVIDERS = new Set([
  'figma',
  'codegen',
  'microsoft_teams',
  'discord',
  'youtube',
  'facebook',
]);
