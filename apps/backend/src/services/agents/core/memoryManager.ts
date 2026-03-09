import { Injectable } from '@nestjs/common';
import { redis } from '@/lib/redis';
import { sharedMemoryService, SharedMemory } from './sharedMemory';
import { AgentMemoryType } from '../types/types';

/**
 * Memory Manager
 * Orchestrates four levels of memory:
 * L0 (Hot): Request-scope (in-memory per execution)
 * L1 (Warm): Recent history (Redis sliding window)
 * L2 (Workspace): Workspace-level semantic knowledge (pgvector)
 * L3 (User): User-specific semantic memory and learned skills (pgvector)
 */

export interface MemoryContext {
    messages: any[];
    memories: SharedMemory[];
    summary?: string;
}

@Injectable()
export class MemoryManager {
    private hotCache: Map<string, any[]> = new Map();

    /**
     * Initialize or retrieve L1 context from Redis
     */
    async getWarmContext(conversationId: string): Promise<any[]> {
        const key = `memory:l1:${conversationId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : [];
    }

    /**
     * Save messages to L1 window
     */
    async saveToWarmContext(conversationId: string, messages: any[]): Promise<void> {
        const key = `memory:l1:${conversationId}`;
        // Maintain a window of last 20 messages for L1
        const windowed = messages.slice(-20);
        await redis.setex(key, 3600 * 24, JSON.stringify(windowed));
    }

    /**
     * Retrieve semantic context (L2 & L3)
     */
    async getSemanticContext(
        agentId: string,
        userId: string,
        query: string,
        workspaceId?: string
    ): Promise<SharedMemory[]> {
        const scopes = ['global'];
        if (workspaceId) scopes.push(`workspace:${workspaceId}`);
        scopes.push(`user:${userId}`);

        return await sharedMemoryService.query(agentId, query, scopes, 5);
    }

    /**
     * Commit short-term memory to long-term (L1 -> L2/L3)
     * Triggered when the turn completes or context reaches threshold
     */
    async persistExperience(
        agentId: string,
        userId: string,
        content: string,
        scope: 'workspace' | 'global' | string = 'global'
    ): Promise<void> {
        await sharedMemoryService.share(
            agentId,
            'experience',
            content,
            scope,
            0.7 // Higher importance for experiences
        );
    }

    /**
     * Clear request-scope L0 cache
     */
    clearHotCache(requestId: string): void {
        this.hotCache.delete(requestId);
    }
}

export const memoryManager = new MemoryManager();
