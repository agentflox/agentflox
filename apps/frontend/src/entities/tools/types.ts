/**
 * Tool Builder Types
 *
 * Shared type definitions for the AI tool builder functionality,
 * aligned with the CompositeTool Prisma model.
 */

export type ConversationStage =
  | 'initialization'
  | 'configuration'
  | 'launch';

export type StepType = 'LLM' | 'API' | 'SYSTEM_TOOL' | 'LOOP' | 'BRANCH' | 'PYTHON' | 'JAVASCRIPT' | 'RUN_CHAIN';

export interface ToolStep {
  id: string;
  name: string;
  type: StepType;
  config?: string | Record<string, unknown>;
  varName?: string;
  kind?: string;
}

/** In-progress draft built up by the AI builder during a conversation */
export interface ToolDraft {
  /** CompositeTool id once created */
  id?: string;
  name?: string;
  description?: string;
  /** Emoji or URL avatar (runtime only, not stored on CompositeTool) */
  avatar?: string;
  category?: string;
  toolType?: string;
  systemPrompt?: string;
  functionSchema?: Record<string, unknown>;
  steps?: ToolStep[];
  mode?: 'MANUAL' | 'AI';
  isPublic?: boolean;
  capabilities?: string[];
  constraints?: string[];
  /** current draft lifecycle: 'draft' | 'testing' | 'ready' */
  status?: 'draft' | 'testing' | 'ready';
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  conversationId: string;
  userId: string;
  workspaceId: string;
  stage: ConversationStage;
  toolDraft: ToolDraft;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  pendingActions?: Array<{
    type: string;
    field?: string;
    service?: string;
    data?: any;
  }>;
}

export interface UserContext {
  workspace: {
    id: string;
    name: string;
    spaces: Array<{
      id: string;
      name: string;
      lists?: Array<{
        id: string;
        name: string;
        statuses?: Array<{ id: string; name: string; color: string }>;
      }>;
    }>;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>;
  connectedIntegrations?: string[];
}
