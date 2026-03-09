/**
 * Chat Service Types
 * 
 * Type definitions for enhanced chat features including context enrichment,
 * follow-ups, and quick actions
 */

export interface EnrichedContext {
    summary: string;
    relevantProjects: Array<{ id: string; name: string; description?: string }>;
    relevantTeams: Array<{ id: string; name: string; description?: string }>;
    relevantTasks: Array<{ id: string; title: string; description?: string }>;
    memories: Array<{ key: string; content: string; importance: number }>;
    semanticContext: string;
    embedding?: number[];
    lastUpdatedAt?: number;
}

export interface ChatFollowup {
    id: string;
    label: string;
}

export interface QuickAction {
    id: string;
    label: string;
    action: string;
    icon?: string;
    variant?: 'default' | 'primary' | 'secondary' | 'destructive';
}

export interface ContextItem {
    id: string;
    type: 'PROJECT' | 'TEAM' | 'TASK' | 'MEMORY' | 'WORKSPACE';
    source: string;
    content: string;
    metadata: {
        relevanceScore: number;
        sourceType: string;
        sourceId: string;
        timestamp: string;
        tags?: string[];
    };
    embedding?: number[];
}
