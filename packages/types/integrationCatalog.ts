/**
 * Canonical provider + action catalog for "deep" third-party integrations.
 *
 * Single source of truth for provider metadata, action schemas, and tool names.
 * Backend executor input validation and UI config schemas should be derived from
 * this catalog — do not hand-maintain parallel copies.
 */

export const INTEGRATION_CATALOG_SCHEMA_VERSION = '1.0.0';

export type IntegrationProviderId =
  | 'github'
  | 'slack'
  | 'google_mail'
  | 'google_calendar'
  | 'google_drive'
  | 'webhook'
  | 'schedule';

/** Prisma IntegrationProvider enum values (string union for cross-package use). */
export type PrismaIntegrationProvider =
  | 'SLACK'
  | 'GITHUB'
  | 'GITLAB'
  | 'JIRA'
  | 'TRELLO'
  | 'GOOGLE_CALENDAR'
  | 'GOOGLE_DRIVE'
  | 'GOOGLE_MAIL'
  | 'DROPBOX'
  | 'ZAPIER'
  | 'FIGMA'
  | 'LINEAR'
  | 'NOTION'
  | 'CUSTOM';

export type IntegrationActionId =
  | 'github.getRepository'
  | 'github.listRepos'
  | 'github.apiCall'
  | 'slack.postMessage'
  | 'webhook.send';

export type CatalogJsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
};

export type CanonicalIntegrationAction = {
  actionId: IntegrationActionId;
  providerId: IntegrationProviderId;
  displayName: string;
  description: string;
  verified: boolean;
  /** Registered SystemTool name used at runtime. */
  toolName: string;
  inputSchema: CatalogJsonSchema;
};

export type CanonicalIntegrationProvider = {
  providerId: IntegrationProviderId;
  displayName: string;
  verified: boolean;
  prismaProvider?: PrismaIntegrationProvider;
  actions: CanonicalIntegrationAction[];
};

const accountIdProperty = {
  type: 'string',
  description: 'Connected OAuth account id (required when multiple accounts exist).',
} as const;

export const INTEGRATION_CATALOG: CanonicalIntegrationProvider[] = [
  {
    providerId: 'github',
    displayName: 'GitHub',
    verified: true,
    prismaProvider: 'GITHUB',
    actions: [
      {
        actionId: 'github.getRepository',
        providerId: 'github',
        displayName: 'GitHub - Get Repository',
        description: 'Fetch metadata for a GitHub repository.',
        verified: true,
        toolName: 'githubGetRepository',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: accountIdProperty,
            owner: { type: 'string', description: 'Repository owner (user or org).' },
            repo: { type: 'string', description: 'Repository name.' },
          },
          required: ['accountId', 'owner', 'repo'],
        },
      },
      {
        actionId: 'github.listRepos',
        providerId: 'github',
        displayName: 'GitHub - List Repositories',
        description: 'List repositories for the authenticated GitHub user.',
        verified: true,
        toolName: 'githubListRepos',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: accountIdProperty,
            per_page: { type: 'number', description: 'Results per page (default 30, max 100).' },
            page: { type: 'number', description: 'Page number (default 1).' },
            sort: {
              type: 'string',
              enum: ['created', 'updated', 'pushed', 'full_name'],
              description: 'Sort field (default: full_name).',
            },
          },
          required: ['accountId'],
        },
      },
      {
        actionId: 'github.apiCall',
        providerId: 'github',
        displayName: 'GitHub - API Call',
        description: 'Authenticated GitHub REST API call (allowlisted paths only).',
        verified: true,
        toolName: 'githubApiCall',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: accountIdProperty,
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              description: 'HTTP method.',
            },
            path: {
              type: 'string',
              description: 'API path starting with / (e.g. /user/repos). Host must be api.github.com.',
            },
            query: {
              type: 'object',
              description: 'Optional query parameters.',
              additionalProperties: { type: 'string' },
            },
            body: {
              type: ['object', 'array', 'string', 'null'],
              description: 'Optional JSON request body.',
            },
            failOnStatus400Plus: {
              type: 'boolean',
              description: 'Treat 4xx/5xx responses as errors (default false).',
            },
          },
          required: ['accountId', 'method', 'path'],
        },
      },
    ],
  },
  {
    providerId: 'slack',
    displayName: 'Slack',
    verified: true,
    prismaProvider: 'SLACK',
    actions: [
      {
        actionId: 'slack.postMessage',
        providerId: 'slack',
        displayName: 'Slack - Post Message',
        description: 'Post a message to a Slack channel.',
        verified: true,
        toolName: 'slackPostMessage',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: accountIdProperty,
            channel: { type: 'string', description: 'Channel ID or name (e.g. #general).' },
            text: { type: 'string', description: 'Message text.' },
          },
          required: ['accountId', 'channel', 'text'],
        },
      },
    ],
  },
  {
    providerId: 'google_mail',
    displayName: 'Gmail',
    verified: false,
    prismaProvider: 'GOOGLE_MAIL',
    actions: [],
  },
  {
    providerId: 'google_calendar',
    displayName: 'Google Calendar',
    verified: false,
    prismaProvider: 'GOOGLE_CALENDAR',
    actions: [],
  },
  {
    providerId: 'google_drive',
    displayName: 'Google Drive',
    verified: false,
    prismaProvider: 'GOOGLE_DRIVE',
    actions: [],
  },
  {
    providerId: 'schedule',
    displayName: 'Schedule',
    verified: false,
    actions: [],
  },
  {
    providerId: 'webhook',
    displayName: 'Webhook',
    verified: true,
    actions: [
      {
        actionId: 'webhook.send',
        providerId: 'webhook',
        displayName: 'Webhook - Send JSON Payload',
        description: 'Send a JSON payload to a webhook URL.',
        verified: true,
        toolName: 'webhookSend',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Webhook URL.' },
            payload: { type: 'object', description: 'JSON payload.' },
            headers: {
              type: 'object',
              description: 'Optional HTTP headers.',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['url', 'payload'],
        },
      },
    ],
  },
];

/** Map catalog provider id to Prisma IntegrationProvider enum value. */
export const CATALOG_PROVIDER_TO_PRISMA: Partial<
  Record<IntegrationProviderId, PrismaIntegrationProvider>
> = Object.fromEntries(
  INTEGRATION_CATALOG.filter((p) => p.prismaProvider).map((p) => [p.providerId, p.prismaProvider!]),
) as Partial<Record<IntegrationProviderId, PrismaIntegrationProvider>>;

/** Map OAuth Account.provider string to catalog provider id. */
export const ACCOUNT_PROVIDER_TO_CATALOG: Record<string, IntegrationProviderId> = {
  github: 'github',
  slack: 'slack',
  google_mail: 'google_mail',
  google_calendar: 'google_calendar',
  google_drive: 'google_drive',
};

/** Scope fragments that indicate a Google account can fulfill a catalog provider. */
export const GOOGLE_SCOPE_TO_CATALOG: Array<{ match: RegExp; catalogId: IntegrationProviderId }> = [
  { match: /gmail/i, catalogId: 'google_mail' },
  { match: /calendar/i, catalogId: 'google_calendar' },
  { match: /drive/i, catalogId: 'google_drive' },
];

/** OAuth Account.provider values that can satisfy a catalog provider (incl. shared `google`). */
export function oauthAccountProvidersForCatalog(providerId: IntegrationProviderId): string[] {
  if (providerId.startsWith('google_')) return [providerId, 'google'];
  return [providerId];
}

/** Infer catalog providers granted by a Google OAuth account's scope string. */
export function catalogProvidersFromGoogleScope(scope: string | null | undefined): IntegrationProviderId[] {
  if (!scope) return [];
  const found = new Set<IntegrationProviderId>();
  for (const entry of GOOGLE_SCOPE_TO_CATALOG) {
    if (entry.match.test(scope)) found.add(entry.catalogId);
  }
  return Array.from(found);
}

export function getCatalogProvider(providerId: IntegrationProviderId): CanonicalIntegrationProvider | undefined {
  return INTEGRATION_CATALOG.find((p) => p.providerId === providerId);
}

export function getCatalogAction(actionId: IntegrationActionId): CanonicalIntegrationAction | undefined {
  for (const provider of INTEGRATION_CATALOG) {
    const action = provider.actions.find((a) => a.actionId === actionId);
    if (action) return action;
  }
  return undefined;
}

export function getCatalogActionByToolName(toolName: string): CanonicalIntegrationAction | undefined {
  for (const provider of INTEGRATION_CATALOG) {
    const action = provider.actions.find((a) => a.toolName === toolName);
    if (action) return action;
  }
  return undefined;
}

export function listVerifiedCatalogActions(): CanonicalIntegrationAction[] {
  return INTEGRATION_CATALOG.flatMap((p) => p.actions.filter((a) => a.verified));
}
