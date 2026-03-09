export type IntegrationCategory =
    | 'communication'
    | 'development'
    | 'design'
    | 'storage'
    | 'calendar'
    | 'marketing'
    | 'email'
    | 'other';

export interface Integration {
    id: string;
    name: string;
    description: string;
    category: IntegrationCategory;
    provider:
    | 'figma'
    | 'github'
    | 'gmail'
    | 'google_drive'
    | 'codegen'
    | 'zoom'
    | 'microsoft_teams'
    | 'slack'
    | 'google_calendar'
    | 'discord'
    | 'microsoft_online'
    | 'youtube'
    | 'facebook'
    | 'openai'
    | 'anthropic'
    | 'http_webhook';
    icon?: string; // URL or local path identifier
    isConnected: boolean;
    isEnterprise: boolean; // if it requires enterprise plan
    config?: Record<string, any>;
    connectedAt?: Date;
    connectedBy?: string; // User ID
}

export interface IntegrationConnectionState {
    provider: Integration['provider'];
    status: 'connected' | 'disconnected' | 'error' | 'pending';
    lastSync?: Date;
    errorMessage?: string;
}
