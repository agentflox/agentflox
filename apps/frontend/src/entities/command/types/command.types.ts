// Command Interface Types

export type CommandMode = 'idle' | 'chat' | 'agent' | 'executing' | 'result' | 'navigation';

export interface Suggestion {
    id: string;
    type: 'command' | 'agent' | 'workspace' | 'project' | 'team' | 'action' | 'history' | 'task' | 'material' | 'tool';
    title: string;
    description?: string;
    icon?: string; // Icon name identifier (e.g., 'MessageSquare', 'Bot')
    shortcut?: string;
    metadata?: any;
    score?: number;
    actionable?: boolean;
}

export interface ParsedCommand {
    raw?: string;
    type: 'chat' | 'agent' | 'navigation' | 'action' | 'search' | 'unknown';
    intent?: string;
    params?: Record<string, any>;
    entities?: Record<string, any>;
    confidence?: number;
    requiresContext?: string[];
}

export interface CommandContext {
    userId?: string;
    workspaceId?: string;
    projectId?: string;
    teamId?: string;
    organizationId?: string;
    entityId?: string;
    entityType?: string;
    url: string;
    userRole?: string;
    permissions?: string[];
}

export interface Agent {
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    capabilities?: string[];
    status?: 'active' | 'inactive';
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        followUpActions?: Array<{
            label: string;
            command: string;
            icon?: string;
        }>;
        data?: any;
    };
}

export interface CommandResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    followUpActions?: Array<{
        label: string;
        command: string;
        icon?: string;
    }>;
}
