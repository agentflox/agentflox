import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { ConversationType, MessageRole } from '@agentflox/database/src/generated/prisma/client';

export type ConversationStage = 'initialization' | 'configuration' | 'launch';

export interface ToolDraft {
  name?: string;
  description?: string;
  category?: string;
  functionSchema?: any;
  steps?: any[];
  mode?: 'MANUAL' | 'AI';
  isPublic?: boolean;
  status: 'draft' | 'testing' | 'ready';
  systemPrompt?: string; // Stored alongside steps during generation
}

export interface ConversationState {
  conversationId: string;
  userId: string;
  stage: ConversationStage;
  toolDraft: ToolDraft;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
}

const REDIS_KEY_PREFIX = 'tool_builder:conversation';
const CONVERSATION_TTL = 24 * 60 * 60;

function getConversationKey(userId: string, conversationId: string): string {
  return `${REDIS_KEY_PREFIX}:${userId}:${conversationId}`;
}

async function isRedisReady(): Promise<boolean> {
  try {
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

function serializeState(state: ConversationState): string {
  return JSON.stringify({
    ...state,
    conversationHistory: state.conversationHistory.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
  });
}

function deserializeState(data: string): ConversationState {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    conversationHistory: parsed.conversationHistory.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  };
}

export class ToolBuilderStateService {
  async createConversationState(
    userId: string,
    toolId?: string,
  ): Promise<ConversationState> {
    const conversation = await prisma.aiConversation.create({
      data: {
        userId,
        conversationType: 'TOOL_BUILDER',
        title: 'Tool Builder Conversation',
        isActive: true,
        // Link to the tool so we can look it up on re-open
        ...(toolId ? { compositeToolId: toolId } : {}),
      },
    });

    const conversationId = conversation.id;

    const state: ConversationState = {
      conversationId,
      userId,
      stage: 'initialization',
      toolDraft: {
        status: 'draft',
        mode: 'AI',
        steps: [],
      },
      conversationHistory: [],
    };

    if (await isRedisReady()) {
      try {
        const key = getConversationKey(userId, conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to store conversation state in Redis:`, error);
      }
    }

    return state;
  }

  async getConversationState(conversationId: string): Promise<ConversationState | null> {
    let resolvedUserId: string | null = null;
    try {
      const conv = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { userId: true },
      });
      resolvedUserId = conv?.userId ?? null;
    } catch { }

    if (resolvedUserId && await isRedisReady()) {
      try {
        const key = getConversationKey(resolvedUserId, conversationId);
        const data = await redis.get(key);
        if (data) {
          return deserializeState(data);
        }
      } catch (error) {
        console.error(`Failed to retrieve conversation state from Redis:`, error);
      }
    }

    // Try reconstructing from DB
    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return null;

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const metadata = (conversation.metadata as any) || {};
    return {
      conversationId,
      userId: conversation.userId,
      stage: metadata.stage || 'initialization',
      toolDraft: {
        status: 'draft',
        ...metadata.toolDraft,
      },
      conversationHistory: messages.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.createdAt,
        metadata: msg.metadata as any,
      })),
    };
  }

  async saveConversationState(state: ConversationState): Promise<void> {
    if (await isRedisReady()) {
      try {
        const key = getConversationKey(state.userId, state.conversationId);
        await redis.setex(key, CONVERSATION_TTL, serializeState(state));
      } catch (error) {
        console.error(`Failed to update conversation state in Redis:`, error);
      }
    }

    // Persist to DB
    await prisma.aiConversation.update({
      where: { id: state.conversationId },
      data: {
        metadata: {
          stage: state.stage,
          toolDraft: state.toolDraft,
        } as any,
      },
    });
  }

  async addMessageToHistory(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<void> {
    const state = await this.getConversationState(conversationId);
    if (!state) throw new Error(`Conversation ${conversationId} not found`);

    const newMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    state.conversationHistory.push(newMessage);
    await this.saveConversationState(state);

    // Save to Postgres
    await prisma.aiMessage.create({
      data: {
        conversationId,
        role: role.toUpperCase() as MessageRole,
        content,
        metadata: metadata || {},
      },
    });
  }

  async deleteConversationState(userId: string, conversationId: string): Promise<void> {
    if (await isRedisReady()) {
      const key = getConversationKey(userId, conversationId);
      await redis.del(key);
    }
  }
}

export const toolBuilderStateService = new ToolBuilderStateService();
