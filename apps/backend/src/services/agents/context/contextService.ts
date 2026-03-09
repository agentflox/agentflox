/**
 * Context Service
 * 
 * Gathers and ranks relevant context from workspace, memory, and rules
 */

import { prisma } from '@/lib/prisma';
import { Context } from '../types/types';
import { AgentFeedbackService } from '../learning/feedbackService';

import { openai } from '@/lib/openai';

const feedbackService = new AgentFeedbackService();

export async function gatherContext(
  userId: string,
  workspaceId: string | undefined,
  intent: string,
  intentParameters: Record<string, any>,
  agentId?: string,
): Promise<Context[]> {
  const contexts: Context[] = [];

  // 0. Gather Learning Feedback (New)
  if (agentId) {
    try {
      const feedback = await feedbackService.getRelevantFeedback(agentId, intent);
      if (feedback.length > 0) {
        contexts.push({
          id: `feedback_learning`,
          type: 'LEARNING' as any,
          source: 'agent_feedback',
          content: feedback.join('\n'),
          metadata: {
            relevanceScore: 0.9, // High relevance for learning
            sourceType: 'feedback',
            sourceId: 'feedback',
            timestamp: new Date().toISOString(),
          }
        });
      }
    } catch (error) {
      console.warn('Failed to gather feedback context:', error);
    }
  }

  // 1. Gather workspace context
  if (workspaceId) {
    try {
      // Get user's projects
      const projects = await prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: 10,
      });

      projects.forEach((project) => {
        contexts.push({
          id: `project_${project.id}`,
          type: 'PROJECT',
          source: project.id,
          content: `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}`,
          metadata: {
            relevanceScore: 0.7,
            sourceType: 'project',
            sourceId: project.id,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Get user's teams
      const teams = await prisma.team.findMany({
        where: {
          workspaceId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: 10,
      });

      teams.forEach((team) => {
        contexts.push({
          id: `team_${team.id}`,
          type: 'TEAM',
          source: team.id,
          content: `Team: ${team.name}${team.description ? ` - ${team.description}` : ''}`,
          metadata: {
            relevanceScore: 0.7,
            sourceType: 'team',
            sourceId: team.id,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Get recent tasks
      const tasks = await prisma.task.findMany({
        where: {
          workspaceId,
          OR: [
            { createdBy: userId },
            { assigneeId: userId },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });

      tasks.forEach((task) => {
        contexts.push({
          id: `task_${task.id}`,
          type: 'TASK',
          source: task.id,
          content: `Task: ${task.title}${task.description ? ` - ${task.description}` : ''}`,
          metadata: {
            relevanceScore: 0.6,
            sourceType: 'task',
            sourceId: task.id,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } catch (error) {
      console.error('Error gathering workspace context:', error);
    }
  }

  // 2. Gather memory context (user preferences, project rules)
  try {
    const memories = await prisma.agentMemory.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: [
        { importance: 'desc' },
        { accessCount: 'desc' },
      ],
      take: 20,
    });

    memories.forEach((memory) => {
      contexts.push({
        id: `memory_${memory.id}`,
        type: memory.memoryType as any,
        source: memory.key,
        content: memory.content,
        metadata: {
          relevanceScore: memory.importance,
          sourceType: 'memory',
          sourceId: memory.id,
          timestamp: memory.updatedAt.toISOString(),
          tags: memory.tags,
        },
        embedding: memory.embedding as number[] | undefined,
      });
    });
  } catch (error) {
    console.error('Error gathering memory context:', error);
  }

  // 3. Rank contexts by relevance using semantic search
  const rankedContexts = await rankContexts(contexts, intent, intentParameters);

  // Return top-K (3-5) contexts
  return rankedContexts.slice(0, 5);
}

async function rankContexts(
  contexts: Context[],
  intent: string,
  intentParameters: Record<string, any>
): Promise<Context[]> {
  if (contexts.length === 0) return contexts;

  const query = `${intent} ${JSON.stringify(intentParameters)}`.toLowerCase();

  // Generate query embedding
  let queryEmbedding: number[] | undefined;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    queryEmbedding = embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding for ranking:', error);
  }

  // If no embeddings, fallback to keyword ranking
  if (!queryEmbedding) {
    const scored = contexts.map((ctx) => {
      const content = ctx.content.toLowerCase();
      let score = ctx.metadata.relevanceScore || 0;

      const queryTerms = query.split(/\s+/);
      const matches = queryTerms.filter((term) => content.includes(term)).length;
      score += matches * 0.1;

      return { ...ctx, metadata: { ...ctx.metadata, relevanceScore: Math.min(score, 1.0) } };
    });

    return scored.sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0));
  }

  // Since contexts come from different sources, we calculate similarity locally if they have embeddings
  // or we could query the database again. To avoid complex multi-table vector queries here, 
  // we'll calculate cosine similarity in-memory for those with embeddings, and fallback for others.
  const scored = await Promise.all(contexts.map(async (ctx) => {
    let score = ctx.metadata.relevanceScore || 0.5;

    // If the context doesn't have an embedding but we need one for ranking, 
    // we could generate it here, but to avoid high latency, we'll rely on keyword fallback
    // for non-embedded contexts.
    if (ctx.embedding && ctx.embedding.length > 0) {
      // Manual cosine similarity
      const similarity = cosineSimilarity(queryEmbedding!, ctx.embedding);
      // Combine vector similarity with base relevance score
      score = (similarity * 0.7) + (score * 0.3);
    } else {
      const content = ctx.content.toLowerCase();
      const queryTerms = query.split(/\s+/);
      const matches = queryTerms.filter((term) => content.includes(term)).length;
      score = (score * 0.5) + Math.min(matches * 0.1, 0.5);
    }

    return { ...ctx, metadata: { ...ctx.metadata, relevanceScore: score } };
  }));

  // Sort by relevance score
  return scored.sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0));
}

function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

