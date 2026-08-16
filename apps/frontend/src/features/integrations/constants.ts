import { Integration } from '@agentflox/types';

export { INTEGRATION_CATEGORIES } from './integrationCategories';
export { INTEGRATION_ICONS } from './integrationIcons';

/** @deprecated Legacy static list — grid is built from catalog + integrationUiMeta. */
export const AVAILABLE_INTEGRATIONS: Omit<Integration, 'id' | 'isConnected' | 'connectedAt' | 'connectedBy'>[] = [
    {
        name: 'Figma',
        description: 'Connect your design files to sync assets and prototypes directly.',
        category: 'design',
        provider: 'figma',
        isEnterprise: false,
    },
    {
        name: 'GitHub',
        description: 'Link repositories to track issues, pull requests, and commits.',
        category: 'development',
        provider: 'github',
        isEnterprise: false,
    },
    {
        name: 'Gmail',
        description: 'Sync your emails and contacts for streamlined communication.',
        category: 'email',
        provider: 'gmail',
        isEnterprise: false,
    },
    {
        name: 'Google Drive',
        description: 'Access and share files from Google Drive within your workspace.',
        category: 'storage',
        provider: 'google_drive',
        isEnterprise: false,
    },
    {
        name: 'Codegen',
        description: 'Automate code generation and scaffolding directly from your specs.',
        category: 'development',
        provider: 'codegen',
        isEnterprise: true,
    },
    {
        name: 'Microsoft Teams',
        description: 'Collaborate with your team seamlessly via Microsoft Teams.',
        category: 'communication',
        provider: 'microsoft_teams',
        isEnterprise: true,
    },
    {
        name: 'Slack',
        description: 'Receive notifications and updates in your Slack channels.',
        category: 'communication',
        provider: 'slack',
        isEnterprise: false,
    },
    {
        name: 'Google Calendar',
        description: 'Sync events and meetings to manage your schedule efficiently.',
        category: 'calendar',
        provider: 'google_calendar',
        isEnterprise: false,
    },
    {
        name: 'Discord',
        description: 'Connect with your community and team on Discord servers.',
        category: 'communication',
        provider: 'discord',
        isEnterprise: false,
    },
    {
        name: 'YouTube',
        description: 'Publish and manage video content directly from the platform.',
        category: 'marketing',
        provider: 'youtube',
        isEnterprise: false,
    },
    {
        name: 'Facebook',
        description: 'Manage your social media presence and ad campaigns.',
        category: 'marketing',
        provider: 'facebook',
        isEnterprise: false,
    }
];
