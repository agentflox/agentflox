import { Injectable } from '@nestjs/common';
import { openai } from '@/lib/openai';
import { randomUUID, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@agentflox/database';

/**
 * Shared Memory Service
 * Enables cross-agent knowledge sharing via vector embeddings using PostgreSQL pgvector
 */

export interface SharedMemory {
    id: string;
    agentId: string;
    type: 'fact' | 'experience' | 'pattern';
    content: string;
    scope: 'workspace' | 'project' | 'global' | string; // string allows user-scoped keys like 'user:{userId}'
    timestamp: Date;
    accessCount: number;
    importance: number;
    embedding?: number[];
}

@Injectable()
export class SharedMemoryService {
    // Embedding cache can still stay in memory to avoid redundant calls to OpenAI
    private embeddingCache: Map<string, number[]> = new Map();

    /**
     * Share a memory (store with embedding)
     */
    async share(
        agentId: string,
        memoryType: 'fact' | 'experience' | 'pattern',
        content: string,
        scope: 'workspace' | 'project' | 'global' | string,  // allows user-scoped keys for PII isolation
        importance: number = 0.5
    ): Promise<string> {
        const id = randomUUID();
        const timestamp = new Date();
        const embedding = await this.embed(content);
        const contentHash = createHash('sha256').update(content).digest('hex');

        // Store into the vector_embeddings table
        // We use $executeRaw to safely insert the vector because Prisma might not natively support vector inserts cleanly
        const metadata = {
            id,
            agentId,
            type: memoryType,
            scope,
            importance,
            timestamp: timestamp.toISOString()
        };

        await prisma.$executeRaw`
            INSERT INTO vector_embeddings (
                id, 
                source_type, 
                source_id, 
                content, 
                content_hash, 
                metadata, 
                embedding, 
                use_count, 
                created_at, 
                updated_at
            ) VALUES (
                ${id}, 
                'CUSTOM'::"VectorSourceType", 
                ${agentId}, 
                ${content}, 
                ${contentHash}, 
                ${metadata}::jsonb, 
                ${JSON.stringify(embedding)}::vector, 
                0, 
                ${timestamp}, 
                ${timestamp}
            )
        `;

        console.log(`[SharedMemory] Agent ${agentId} shared ${memoryType} in ${scope} scope`);

        return id;
    }

    /**
     * Query memories via semantic search
     */
    async query(
        agentId: string,
        query: string,
        scopes: Array<'workspace' | 'project' | 'global' | string>,  // allows user-scoped keys for PII isolation
        topK: number = 10
    ): Promise<SharedMemory[]> {
        // Get query embedding
        const queryEmbedding = await this.embed(query);
        const scopeJson = JSON.stringify(scopes);

        // Vector search using pgvector
        const results = await prisma.$queryRaw<any[]>`
            SELECT 
                id,
                source_id as "agentId",
                content,
                metadata,
                use_count as "accessCount",
                created_at as "timestamp",
                1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
            FROM vector_embeddings
            WHERE source_type = 'CUSTOM'::"VectorSourceType"
              AND metadata->>'scope' = ANY (
                SELECT jsonb_array_elements_text(${scopeJson}::jsonb)
              )
            ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
            LIMIT ${topK * 2}
        `;

        // We fetch topK * 2, then we will re-score by importance and take topK
        const scoredMemories = results.map((row) => {
            const importance = row.metadata?.importance || 0.5;
            let similarity = row.similarity || 0;
            if (Number.isNaN(similarity)) similarity = 0;

            const score = similarity * importance; // Weight by importance

            return {
                memory: {
                    id: row.id,
                    agentId: row.agentId,
                    type: row.metadata?.type || 'fact',
                    content: row.content,
                    scope: row.metadata?.scope || 'global',
                    timestamp: new Date(row.timestamp),
                    accessCount: row.accessCount,
                    importance
                } as SharedMemory,
                score
            };
        });

        scoredMemories.sort((a, b) => b.score - a.score);
        const topMemories = scoredMemories.slice(0, topK).map((sm) => sm.memory);

        // Update access count
        if (topMemories.length > 0) {
            const ids = topMemories.map(m => m.id);
            await prisma.$executeRaw`
               UPDATE vector_embeddings
               SET use_count = use_count + 1, last_used_at = NOW()
               WHERE id = ANY(${ids}::text[])
           `;
            for (const memory of topMemories) {
                memory.accessCount++;
            }
        }

        console.log(`[SharedMemory] Agent ${agentId} queried memories, found ${topMemories.length} results`);

        return topMemories;
    }

    /**
     * Delete a memory
     */
    async deleteMemory(memoryId: string): Promise<void> {
        await prisma.vectorEmbedding.delete({
            where: { id: memoryId }
        });
    }

    /**
     * Get memory by ID
     */
    async getMemory(memoryId: string): Promise<SharedMemory | null> {
        const record = await prisma.vectorEmbedding.findUnique({
            where: { id: memoryId }
        });

        if (!record || record.sourceType !== 'CUSTOM') {
            return null;
        }

        const metadata = record.metadata as Record<string, any>;

        return {
            id: record.id,
            agentId: record.sourceId,
            content: record.content,
            type: metadata?.type || 'fact',
            scope: metadata?.scope || 'global',
            timestamp: record.createdAt,
            accessCount: record.useCount,
            importance: metadata?.importance || 0.5
        };
    }

    /**
     * Get all memories for an agent
     */
    async getAgentMemories(agentId: string): Promise<SharedMemory[]> {
        const records = await prisma.vectorEmbedding.findMany({
            where: {
                sourceId: agentId,
                sourceType: 'CUSTOM'
            }
        });

        return records.map(record => {
            const metadata = record.metadata as Record<string, any>;
            return {
                id: record.id,
                agentId: record.sourceId,
                content: record.content,
                type: metadata?.type || 'fact',
                scope: metadata?.scope || 'global',
                timestamp: record.createdAt,
                accessCount: record.useCount,
                importance: metadata?.importance || 0.5
            };
        });
    }

    /**
     * Cleanup old or low-access memories (garbage collection)
     */
    async cleanupMemories(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
        const cutoffDate = new Date(Date.now() - maxAgeMs);

        const result = await prisma.$executeRaw`
            DELETE FROM vector_embeddings
            WHERE source_type = 'CUSTOM'::"VectorSourceType" AND (
                (created_at < ${cutoffDate} AND use_count < 5)
                OR (CAST(metadata->>'importance' AS FLOAT) < 0.3 AND use_count = 0)
            )
        `;

        const removed = result as number;
        console.log(`[SharedMemory] Cleaned up ${removed} old memories`);
        return removed;
    }

    /**
     * Generate embedding for text
     */
    private async embed(text: string): Promise<number[]> {
        // Check cache
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text)!;
        }

        try {
            // Use OpenAI embeddings
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });

            const embedding = response.data[0].embedding;

            // Cache for reuse
            this.embeddingCache.set(text, embedding);

            return embedding;
        } catch (error) {
            console.error('[SharedMemory] Failed to generate embedding:', error);
            return new Array(1536).fill(0);
        }
    }

    /**
     * Get memory statistics
     */
    async getStats(): Promise<{
        totalMemories: number;
        byType: Record<string, number>;
        byScope: Record<string, number>;
        totalAccesses: number;
    }> {
        const records = await prisma.vectorEmbedding.findMany({
            where: { sourceType: 'CUSTOM' }
        });

        const memories = records.map(record => {
            const metadata = record.metadata as Record<string, any>;
            return {
                type: metadata?.type || 'fact',
                scope: metadata?.scope || 'global',
                accessCount: record.useCount
            };
        });

        return {
            totalMemories: memories.length,
            byType: {
                fact: memories.filter((m) => m.type === 'fact').length,
                experience: memories.filter((m) => m.type === 'experience').length,
                pattern: memories.filter((m) => m.type === 'pattern').length,
            },
            byScope: {
                workspace: memories.filter((m) => m.scope === 'workspace').length,
                project: memories.filter((m) => m.scope === 'project').length,
                global: memories.filter((m) => m.scope === 'global').length,
            },
            totalAccesses: memories.reduce((sum, m) => sum + m.accessCount, 0),
        };
    }
}

export const sharedMemoryService = new SharedMemoryService();
