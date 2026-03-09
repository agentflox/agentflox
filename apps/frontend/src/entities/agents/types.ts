/**
 * Agent Builder Types
 * 
 * Shared type definitions for agent builder functionality
 */

export type ConversationStage =
  | 'initialization'
  | 'configuration'
  | 'launch';

export interface AgentDraft {
  name?: string;
  description?: string;
  avatar?: string;
  agentType?: string;
  systemPrompt?: string;
  personality?: any;
  capabilities?: string[];
  constraints?: string[];
  modelConfig?: {
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
  };
  knowledgeBases?: Array<any>;
  tools?: Array<{
    id: string;
    name: string;
    config?: any;
  }>;
  rules?: Array<{
    type: string;
    condition: string;
    action: string;
  }>;
  triggers?: Array<{
    type: string;
    config: any;
  }>;
  status: 'draft' | 'testing' | 'ready';
}

export interface ConversationState {
  conversationId: string;
  userId: string;
  workspaceId: string;
  stage: ConversationStage;
  agentDraft: AgentDraft;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  pendingActions: Array<{
    type: string;
    field?: string;
    service?: string;
    data?: any;
  }>;
  focusedList?: any;
  mentionedUsers?: Array<any>;
  suggestions: Array<{
    type: string;
    value: any;
    label: string;
    reason: string;
  }>;
}

export interface QuickAction {
  label: string;
  value: string;
  description?: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
}

export interface UserContext {
  workspace: {
    id: string;
    name: string;
    spaces: Array<{
      id: string;
      name: string;
      folders: Array<{
        id: string;
        name: string;
        lists: Array<{
          id: string;
          name: string;
          statuses: Array<{ id: string; name: string; color: string }>;
          customFields: Array<any>;
          taskCount?: number;
        }>;
      }>;
      lists: Array<{
        id: string;
        name: string;
        statuses: Array<any>;
        customFields: Array<any>;
        taskCount?: number;
      }>;
      allLists: Array<any>;
    }>;
  };
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    taskActivity?: any;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    workspaceId: string;
    spaceId?: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    workspaceId: string;
    spaceId?: string;
  }>;
  availableTriggers: Array<{
    id: string;
    name: string;
    description: string;
    scope: string[];
    parameters: Array<any>;
  }>;
  connectedIntegrations: string[];
  recentActivity: {
    mostActiveList?: string;
    totalTasks: number;
    commonTaskPatterns: Array<{
      type: string;
      description: string;
      confidence?: number;
    }>;
    suggestedAutomations?: Array<any>;
  };
  existingAgents: Array<{
    id: string;
    name: string;
    triggers: string[];
  }>;
  userPreferences: {
    defaultModel?: string;
    preferredTone?: string;
    automationPreferences?: any;
  };
}

