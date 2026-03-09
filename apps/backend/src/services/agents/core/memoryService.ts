/**
 * Memory Service
 * 
 * Manages agent memory: user preferences, project rules, recent state
 */

import { prisma } from '@/lib/prisma';
import { AgentMemoryType, Memory } from '../types/types';
import { randomUUID } from 'crypto';
import { openai } from '@/lib/openai';

/**
 * Store a memory
 */
export async function storeMemory(
  agentId: string,
  memoryType: AgentMemoryType | 'USER_PREFERENCE' | 'PROJECT_RULE' | 'RECENT_STATE',
  category: string,
  key: string,
  content: string,
  importance: number = 0.5,
  expiresAt?: Date,
  associatedData?: Record<string, any>
): Promise<Memory> {
  const resolvedType = resolveMemoryType(memoryType);
  // Generate embedding for semantic search
  let embedding: number[] | undefined;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });
    embedding = embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
  }

  // Store in database
  const memory = await prisma.agentMemory.upsert({
    where: {
      agentId_key: {
        agentId,
        key,
      },
    },
    create: {
      id: randomUUID(),
      agentId,
      memoryType: resolvedType as any,
      category,
      key,
      content,
      importance,
      expiresAt,
      associatedData: associatedData || {},
      embeddingModel: 'text-embedding-3-small',
      updatedAt: new Date(),
      tags: [],
    },
    update: {
      content,
      importance,
      expiresAt,
      associatedData: associatedData || {},
      updatedAt: new Date(),
    },
  });

  if (embedding && embedding.length > 0) {
    await prisma.$executeRaw`
      UPDATE agent_memories
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${memory.id}
    `;
  }

  return {
    id: memory.id,
    agentId: memory.agentId,
    memoryType: memory.memoryType as AgentMemoryType,
    category: memory.category,
    key: memory.key,
    content: memory.content,
    summary: memory.summary || undefined,
    contextType: memory.contextType || undefined,
    contextId: memory.contextId || undefined,
    associatedData: memory.associatedData as Record<string, any> | undefined,
    embedding: memory.embedding as number[] | undefined,
    importance: memory.importance,
    accessCount: memory.accessCount,
    lastAccessedAt: memory.lastAccessedAt?.toISOString(),
    expiresAt: memory.expiresAt?.toISOString(),
    isActive: memory.isActive,
    tags: memory.tags,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

/**
* Retrieve relevant memories
*/
export async function retrieveMemories(
  agentId: string,
  query: string,
  topK: number = 5,
  memoryTypes?: AgentMemoryType[]
): Promise<Memory[]> {
  // Generate query embedding
  let queryEmbedding: number[] | undefined;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    queryEmbedding = embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
  }

  const now = new Date();
  let memories: any[] = [];

  if (queryEmbedding) {
    // Vector search
    if (memoryTypes && memoryTypes.length > 0) {
      memories = await prisma.$queryRaw<any[]>`
        SELECT *,
               1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM agent_memories
        WHERE agent_id = ${agentId}::uuid
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > ${now})
          AND memory_type = ANY(ARRAY[${memoryTypes.join(',')}]::"AgentMemoryType"[])
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${topK * 2}
      `;
    } else {
      memories = await prisma.$queryRaw<any[]>`
          SELECT *,
                 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM agent_memories
          WHERE agent_id = ${agentId}::uuid
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > ${now})
          ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
          LIMIT ${topK * 2}
        `;
    }
  } else {
    // Query memories fallback
    const where: any = {
      agentId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    };

    if (memoryTypes && memoryTypes.length > 0) {
      where.memoryType = { in: memoryTypes };
    }

    memories = await prisma.agentMemory.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { accessCount: 'desc' },
      ],
      take: topK * 2, // Get more for filtering
    });
  }

  // Update access counts
  if (memories.length > 0) {
    await prisma.agentMemory.updateMany({
      where: {
        id: { in: memories.map((m) => m.id) },
      },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  // Convert to Memory type
  const result: Memory[] = memories.slice(0, topK).map((m) => ({
    id: m.id,
    agentId: m.agentId || m.agent_id,
    memoryType: (m.memoryType || m.memory_type) as AgentMemoryType,
    category: m.category,
    key: m.key,
    content: m.content,
    summary: m.summary || undefined,
    contextType: m.contextType || m.context_type || undefined,
    contextId: m.contextId || m.context_id || undefined,
    associatedData: (m.associatedData || m.associated_data) as Record<string, any> | undefined,
    embedding: m.embedding as number[] | undefined,
    importance: m.importance,
    accessCount: (m.accessCount ?? m.access_count) + 1,
    lastAccessedAt: new Date().toISOString(),
    expiresAt: (m.expiresAt || m.expires_at)?.toISOString(),
    isActive: m.isActive ?? m.is_active,
    tags: m.tags || [],
    createdAt: (m.createdAt || m.created_at).toISOString(),
    updatedAt: (m.updatedAt || m.updated_at).toISOString(),
  }));

  return result;
}

function resolveMemoryType(
  memoryType: AgentMemoryType | 'USER_PREFERENCE' | 'PROJECT_RULE' | 'RECENT_STATE'
): AgentMemoryType {
  switch (memoryType) {
    case 'USER_PREFERENCE':
    case 'PROJECT_RULE':
      return AgentMemoryType.SEMANTIC;
    case 'RECENT_STATE':
      return AgentMemoryType.SHORT_TERM;
    default:
      return memoryType;
  }
}

