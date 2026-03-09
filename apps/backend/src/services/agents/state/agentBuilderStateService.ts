/**
 * Agent Builder State Service
 * 
 * Manages conversation state for agent builder using Redis for production-grade storage
 */

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { UserContext } from './agentBuilderContextService';
import { MessageRole, ConversationType } from '@agentflox/database/src/generated/prisma/client';
import { AGENT_CONSTANTS } from '../constants/agentConstants';

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
    triggerType: string;
    name?: string;
    description?: string;
    config: any;
    priority?: number;
    conditions?: any;
    filters?: any;
    confidence?: number;
    reasoning?: string;
  }>;
  metadata?: Record<string, any>;
  skills?: string[]; // IDs or names of assigned skills
  scopeType?: 'workspace' | 'space' | 'project' | 'team' | 'portable';
  isPortable?: boolean;
  status: 'draft' | 'testing' | 'ready';
  /**
   * Set to true when the system prompt extraction from the LLM's response is
   * still pending. The SYSTEM_PROMPT node will stay and wait for the next turn
   * when the configurationExtractor will pick it up from conversation history.
   */
  systemPromptPending?: boolean;
}

export interface ConversationState {
  conversationId: string;
  userId: string;
  stage: ConversationStage;
  stageReasoning?: string;
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
  configurationHistory?: Array<{
    timestamp: Date;
    field: string;
    oldValue: any;
    newValue: any;
    source: 'user_message' | 'ai_extraction' | 'manual_edit';
  }>;
  completedFields?: string[];
  currentFocus?: string; // Which field/stage AI is currently working on
}

// Redis key prefix for conversation states
const REDIS_KEY_PREFIX = 'agent_builder:conversation';
// TTL for conversation states: 24 hours (in seconds)
const CONVERSATION_TTL = 24 * 60 * 60;

/**
 * Get Redis key for a conversation. Keys are scoped by userId to prevent
 * full-keyspace SCAN and eliminate cross-tenant key collision/exposure.
 * Format: agent_builder:conversation:{userId}:{conversationId}
 */
function getConversationKey(userId: string, conversationId: string): string {
  return `${REDIS_KEY_PREFIX}:${userId}:${conversationId}`;
}

/**
 * Get Redis SCAN pattern for all conversations belonging to a user.
 */
function getUserKeyPattern(userId: string): string {
  return `${REDIS_KEY_PREFIX}:${userId}:*`;
}

/**
 * Apply the working memory cap to a history array.
 * Always takes the TAIL (most recent) messages to preserve recency.
 */
function applyWorkingMemoryCap(
  history: ConversationState['conversationHistory']
): ConversationState['conversationHistory'] {
  const limit = AGENT_CONSTANTS.WORKING_MEMORY_TURN_LIMIT;
  if (history.length <= limit) return history;
  return history.slice(-limit);
}

/**
 * Check if Redis is available and ready
 */
async function isRedisReady(): Promise<boolean> {
  try {
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * Serialize conversation state for Redis storage
 */
function serializeState(state: ConversationState): string {
  return JSON.stringify({
    ...state,
    conversationHistory: state.conversationHistory.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
    configurationHistory: state.configurationHistory?.map(entry => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })),
  });
}

/**
 * Deserialize conversation state from Redis
 */
function deserializeState(data: string): ConversationState {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    conversationHistory: parsed.conversationHistory.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
    configurationHistory: parsed.configurationHistory?.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    })),
  };
}

/**
 * Returns true when the draft contains the minimum required fields for launch:
 * a non-empty name and a non-empty system prompt.
 */
function isConfigurationComplete(draft: AgentDraft): boolean {
  return !!(draft.name?.trim() && draft.systemPrompt?.trim());
}

export class AgentBuilderStateService {
  async createConversationState(
    userId: string,
    agentId?: string,
    conversationType: ConversationType = 'AGENT_BUILDER'
  ): Promise<ConversationState> {

    // Create conversation in database
    const conversation = await prisma.aiConversation.create({
      data: {
        userId,
        conversationType,
        title: `${conversationType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Conversation`,
        isActive: true,
        ...(agentId && { agentId }), // Link to agent if provided
      },
    });

    const conversationId = conversation.id;

    const state: ConversationState = {
      conversationId,
      userId,
      stage: 'initialization',
      agentDraft: {
        status: 'draft',
      },
      conversationHistory: [],
      pendingActions: [],
      suggestions: [],
      configurationHistory: [],
      completedFields: [],
    };

    // Store in Redis with TTL — key scoped by userId for tenant isolation
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to store conversation state in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue execution - state is stored in database via conversation record
      }
    }

    return state;
  }

  async getConversationState(
    conversationId: string
  ): Promise<ConversationState | null> {
    let state: ConversationState | null = null;

    // Load userId first (required for scoped key lookup) — fast path via DB conversation record.
    // We need userId to construct the Redis key, so we do a lightweight DB check first.
    let resolvedUserId: string | null = null;
    try {
      const conv = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { userId: true },
      });
      resolvedUserId = conv?.userId ?? null;
    } catch { /* fall through to DB reconstruct path */ }

    // Try to load from Redis first (requires userId for scoped key)
    if (resolvedUserId && await isRedisReady()) {
      try {
        const key = getConversationKey(resolvedUserId, conversationId);
        const data = await redis.get(key);

        if (data) {
          state = deserializeState(data);
        }
      } catch (error) {
        console.error(`Failed to retrieve conversation state from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If Redis doesn't have it, try to reconstruct from database
    if (!state) {
      try {
        const conversation = await prisma.aiConversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          return null;
        }

        // Load messages from database
        const messages = await prisma.aiMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
        });

        // Reconstruct state from database
        const metadata = (conversation.metadata as any) || {};
        state = {
          conversationId,
          userId: conversation.userId,
          stage: metadata.stage || 'initialization', // Load stage from metadata
          agentDraft: {
            status: 'draft',
            ...metadata.agentDraft,
          },
          conversationHistory: messages.map(msg => ({
            role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: msg.createdAt,
            metadata: msg.metadata as any,
          })),
          pendingActions: metadata.pendingActions || [],
          suggestions: metadata.suggestions || [],
          focusedList: metadata.focusedList,
          mentionedUsers: metadata.mentionedUsers,
          configurationHistory: metadata.configurationHistory || [],
          completedFields: metadata.completedFields || [],
          currentFocus: metadata.currentFocus,
        };

        // Store reconstructed state in Redis
        if (resolvedUserId && await isRedisReady()) {
          try {
            const key = getConversationKey(resolvedUserId, conversationId);
            await redis.setex(key, CONVERSATION_TTL, serializeState(state));
          } catch (error) {
            console.error('Failed to store reconstructed state in Redis:', error);
          }
        }
      } catch (error) {
        console.error(`Failed to reconstruct conversation state from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    } else {
      // If we have Redis state, sync conversation history from DB.
      // DB is source of truth for messages; apply working-memory cap AFTER loading.
      try {
        const dbMessages = await prisma.aiMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
        });

        // Apply working memory cap: only keep the most recent N turns in the context window.
        // This is the CRITICAL enforcement point — capping here prevents context overflow
        // regardless of how many messages exist in the DB.
        state.conversationHistory = applyWorkingMemoryCap(
          dbMessages.map(msg => ({
            role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: msg.createdAt,
            metadata: msg.metadata as any,
          }))
        );

        // Update Redis with capped state
        if (state.userId && await isRedisReady()) {
          try {
            const key = getConversationKey(state.userId, conversationId);
            await redis.setex(key, CONVERSATION_TTL, serializeState(state));
          } catch (error) {
            console.error('Failed to update synced state in Redis:', error);
          }
        }
      } catch (error) {
        console.error('Failed to sync conversation history from database:', error);
        // Continue with Redis state if database sync fails
      }
    }

    return state;
  }

  async updateConversationState(
    conversationId: string,
    updates: Partial<ConversationState>
  ): Promise<ConversationState> {
    const state = await this.getConversationState(conversationId);
    if (!state) {
      throw new Error('Conversation state not found');
    }

    const updated = {
      ...state,
      ...updates,
      agentDraft: {
        ...state.agentDraft,
        ...(updates.agentDraft || {}),
      },
    };

    // Update in Redis — scoped key
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(updated.userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(updated));
      } catch (error) {
        console.error(`Failed to update conversation state in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error('Failed to update conversation state');
      }
    }

    // Persist critical state to database metadata for recovery
    try {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation) {
        const conversationWithMetadata = conversation as any;
        const existingMetadata = (conversationWithMetadata.metadata || {}) as any;
        await (prisma.aiConversation.update as any)({
          where: { id: conversationId },
          data: {
            metadata: JSON.parse(JSON.stringify({
              ...existingMetadata,
              stage: updated.stage,
              agentDraft: updated.agentDraft,
              pendingActions: updated.pendingActions,
              suggestions: updated.suggestions,
              focusedList: updated.focusedList,
              mentionedUsers: updated.mentionedUsers,
              // configurationHistory persisted to DB for durable audit trail.
              // Previously missing — Redis-only meant eviction caused audit gaps.
              configurationHistory: updated.configurationHistory,
              completedFields: updated.completedFields,
              currentFocus: updated.currentFocus,
            })),
          },
        });
      }
    } catch (error) {
      console.error(`Failed to persist conversation state to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - Redis is primary, DB is backup
    }

    return updated;
  }

  async addMessageToHistory(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<void> {
    const state = await this.getConversationState(conversationId);
    if (!state) {
      throw new Error('Conversation state not found');
    }

    // Add message to history
    state.conversationHistory.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Enforce working memory cap — only the most recent N turns are kept in the
    // Redis state. Older turns are stored in DB and available for summarization.
    state.conversationHistory = applyWorkingMemoryCap(state.conversationHistory);

    // Update in Redis — scoped key
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(state.userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to update conversation history in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue - will try to store in database
      }
    }

    // Store in database for persistence
    try {
      const savedMessage = await prisma.aiMessage.create({
        data: {
          conversationId,
          role: role.toUpperCase() as MessageRole,
          content,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
      console.log(`Message saved to database: ${savedMessage.id} for conversation ${conversationId}`);
    } catch (error) {
      console.error(`Failed to store message in database for conversation ${conversationId}:`, error);
      // Don't throw - Redis storage is primary, database is backup
      // But log the error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          conversationId,
          role,
          contentLength: content.length,
        });
      }
    }
  }

  async saveAgentDraft(
    conversationId: string,
    draft: Partial<AgentDraft>
  ): Promise<AgentDraft> {
    const state = await this.getConversationState(conversationId);
    if (!state) {
      throw new Error('Conversation state not found');
    }

    state.agentDraft = {
      ...state.agentDraft,
      ...draft,
    };

    // Update in Redis (persist both draft and any stage promotion) — scoped key
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(state.userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to save agent draft in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error('Failed to save agent draft');
      }
    }

    // Persist promoted stage + draft to DB so it survives Redis eviction
    try {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
      });
      if (conversation) {
        const existingMeta = ((conversation as any).metadata || {}) as Record<string, any>;
        await (prisma.aiConversation.update as any)({
          where: { id: conversationId },
          data: {
            metadata: JSON.parse(JSON.stringify({
              ...existingMeta,
              stage: state.stage,
              agentDraft: state.agentDraft,
            })),
          },
        });
      }
    } catch (error) {
      console.error(
        `Failed to persist promoted draft/stage to database for conversation ${conversationId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Don't throw — Redis is primary, DB is recovery backup
    }

    return state.agentDraft;
  }

  async updateStage(
    conversationId: string,
    stage: ConversationStage
  ): Promise<void> {
    await this.updateConversationState(conversationId, { stage });
  }

  async addSuggestion(
    conversationId: string,
    suggestion: {
      type: string;
      value: any;
      label: string;
      reason: string;
    }
  ): Promise<void> {
    const state = await this.getConversationState(conversationId);
    if (!state) {
      throw new Error('Conversation state not found');
    }

    state.suggestions.push(suggestion);

    // Update in Redis — scoped key
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(state.userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to add suggestion in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error('Failed to add suggestion');
      }
    }
  }

  async clearSuggestions(conversationId: string): Promise<void> {
    const state = await this.getConversationState(conversationId);
    if (!state) {
      throw new Error('Conversation state not found');
    }

    state.suggestions = [];

    // Update in Redis — scoped key
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(state.userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to clear suggestions in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error('Failed to clear suggestions');
      }
    }
  }

  async setFocusedList(conversationId: string, list: any): Promise<void> {
    await this.updateConversationState(conversationId, { focusedList: list });
  }

  async setMentionedUsers(conversationId: string, users: Array<any>): Promise<void> {
    await this.updateConversationState(conversationId, { mentionedUsers: users });
  }

  async deleteConversationState(conversationId: string, userId: string): Promise<void> {
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(userId, conversationId);
        await redis.del(key);
      } catch (error) {
        console.error(`Failed to delete conversation state from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw - deletion is best effort
      }
    }
  }

  /**
   * Extend TTL for a conversation state
   */
  async extendConversationTTL(conversationId: string, userId: string, ttlSeconds: number = CONVERSATION_TTL): Promise<void> {
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(userId, conversationId);
        const exists = await redis.exists(key);
        if (exists) {
          await redis.expire(key, ttlSeconds);
        }
      } catch (error) {
        console.error(`Failed to extend conversation TTL in Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get all conversation IDs for a user.
   * Uses userId-scoped key pattern to avoid full-keyspace SCAN
   * (previously scanned ALL keys and filtered in-app — O(N) across all tenants).
   */
  async getUserConversationIds(userId: string): Promise<string[]> {
    if (!(await isRedisReady())) {
      // Fallback: query DB directly
      try {
        const conversations = await prisma.aiConversation.findMany({
          where: { userId },
          select: { id: true },
        });
        return conversations.map(c => c.id);
      } catch {
        return [];
      }
    }

    try {
      // Pattern is now scoped to THIS user only — no cross-tenant key exposure.
      const pattern = getUserKeyPattern(userId);
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      // Extract conversationId from the scoped key format: prefix:{userId}:{conversationId}
      const prefix = `${REDIS_KEY_PREFIX}:${userId}:`;
      return keys
        .filter(k => k.startsWith(prefix))
        .map(k => k.slice(prefix.length))
        .filter(Boolean);
    } catch (error) {
      console.error(`Failed to get user conversation IDs from Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }
}

export const agentBuilderStateService = new AgentBuilderStateService();

