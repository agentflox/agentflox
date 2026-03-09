/**
 * Chat Context Enricher
 * 
 * Gathers and ranks relevant context from workspace, memory, and entities
 * to enhance chat responses with semantic understanding
 */

import { prisma } from '@/lib/prisma';
import type { ChatContextType } from './utils/requestContext';
import type { EnrichedContext, ContextItem } from './types';
import OpenAI from 'openai';

/**
 * Enrich chat context with workspace data, memories, and semantic context
 */
export async function enrichChatContext(
    userId: string,
    contextType: ChatContextType,
    entityId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    openai: OpenAI
): Promise<EnrichedContext> {
    const contexts: ContextItem[] = [];

    try {
        // 1. Gather workspace context based on context type
        if (contextType === 'project') {
            await gatherProjectContext(userId, entityId, contexts);
        } else if (contextType === 'team') {
            await gatherTeamContext(userId, entityId, contexts);
        } else if (contextType === 'workspace') {
            await gatherWorkspaceContext(userId, entityId, contexts);
        }

        // 2. Gather memory context (user preferences, project rules)
        await gatherMemoryContext(userId, contexts);

        // 3. Rank contexts by relevance using semantic search
        const rankedContexts = await rankContexts(contexts, message, conversationHistory);

        // 4. Build enriched context object
        const enriched: EnrichedContext = {
            summary: buildContextSummary(rankedContexts.slice(0, 5)),
            relevantProjects: rankedContexts
                .filter(c => c.type === 'PROJECT')
                .slice(0, 3)
                .map(c => ({
                    id: c.metadata.sourceId,
                    name: c.content.split(':')[1]?.trim() || 'Unnamed',
                    description: c.content.split(' - ')[1]?.trim(),
                })),
            relevantTeams: rankedContexts
                .filter(c => c.type === 'TEAM')
                .slice(0, 3)
                .map(c => ({
                    id: c.metadata.sourceId,
                    name: c.content.split(':')[1]?.trim() || 'Unnamed',
                    description: c.content.split(' - ')[1]?.trim(),
                })),
            relevantTasks: rankedContexts
                .filter(c => c.type === 'TASK')
                .slice(0, 5)
                .map(c => ({
                    id: c.metadata.sourceId,
                    title: c.content.split(':')[1]?.trim() || 'Unnamed',
                    description: c.content.split(' - ')[1]?.trim(),
                })),
            memories: rankedContexts
                .filter(c => c.type === 'MEMORY')
                .slice(0, 3)
                .map(c => ({
                    key: c.source,
                    content: c.content,
                    importance: c.metadata.relevanceScore,
                })),
            semanticContext: rankedContexts
                .slice(0, 5)
                .map(c => c.content)
                .join('\n'),
            lastUpdatedAt: Date.now(),
        };

        return enriched;
    } catch (error) {
        console.error('Error enriching chat context:', error);
        // Return minimal context on error
        return {
            summary: 'Unable to gather full context',
            relevantProjects: [],
            relevantTeams: [],
            relevantTasks: [],
            memories: [],
            semanticContext: '',
            lastUpdatedAt: Date.now(),
        };
    }
}

/**
 * Gather project-specific context
 */
async function gatherProjectContext(
    userId: string,
    projectId: string,
    contexts: ContextItem[]
): Promise<void> {
    try {
        // Get the specific project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
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
        });

        if (project) {
            contexts.push({
                id: `project_${project.id}`,
                type: 'PROJECT',
                source: project.id,
                content: `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}`,
                metadata: {
                    relevanceScore: 0.9,
                    sourceType: 'project',
                    sourceId: project.id,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Get recent tasks from this project
        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                OR: [
                    { createdBy: userId },
                    { assigneeId: userId },
                ],
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });

        tasks.forEach((task) => {
            contexts.push({
                id: `task_${task.id}`,
                type: 'TASK',
                source: task.id,
                content: `Task: ${task.title}${task.description ? ` - ${task.description}` : ''} (${task.status})`,
                metadata: {
                    relevanceScore: 0.7,
                    sourceType: 'task',
                    sourceId: task.id,
                    timestamp: new Date().toISOString(),
                },
            });
        });
    } catch (error) {
        console.error('Error gathering project context:', error);
    }
}

/**
 * Gather team-specific context
 */
async function gatherTeamContext(
    userId: string,
    teamId: string,
    contexts: ContextItem[]
): Promise<void> {
    try {
        const team = await prisma.team.findFirst({
            where: {
                id: teamId,
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
        });

        if (team) {
            contexts.push({
                id: `team_${team.id}`,
                type: 'TEAM',
                source: team.id,
                content: `Team: ${team.name}${team.description ? ` - ${team.description}` : ''}`,
                metadata: {
                    relevanceScore: 0.9,
                    sourceType: 'team',
                    sourceId: team.id,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    } catch (error) {
        console.error('Error gathering team context:', error);
    }
}

/**
 * Gather workspace-wide context
 */
async function gatherWorkspaceContext(
    userId: string,
    workspaceId: string,
    contexts: ContextItem[]
): Promise<void> {
    try {
        // Get user's recent projects in workspace
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
            orderBy: { updatedAt: 'desc' },
            take: 5,
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

        // Get user's teams in workspace
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
            orderBy: { updatedAt: 'desc' },
            take: 5,
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
    } catch (error) {
        console.error('Error gathering workspace context:', error);
    }
}

/**
 * Gather memory context (user preferences, project rules)
 */
async function gatherMemoryContext(
    userId: string,
    contexts: ContextItem[]
): Promise<void> {
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
            take: 10,
        });

        memories.forEach((memory) => {
            contexts.push({
                id: `memory_${memory.id}`,
                type: 'MEMORY',
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
}

/**
 * Rank contexts by relevance to the current message
 */
async function rankContexts(
    contexts: ContextItem[],
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<ContextItem[]> {
    // Simple keyword-based ranking for now
    // In production, use vector similarity search with embeddings

    const query = `${message} ${conversationHistory.map(m => m.content).join(' ')}`.toLowerCase();

    const scored = contexts.map((ctx) => {
        const content = ctx.content.toLowerCase();
        let score = ctx.metadata.relevanceScore;

        // Boost score if query terms appear in content
        const queryTerms = query.split(/\s+/).filter(t => t.length > 3);
        const matches = queryTerms.filter((term) => content.includes(term)).length;
        score += matches * 0.15;

        return {
            ...ctx,
            metadata: {
                ...ctx.metadata,
                relevanceScore: Math.min(score, 1.0)
            }
        };
    });

    // Sort by relevance score
    return scored.sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore);
}

/**
 * Build a summary of the top contexts
 */
function buildContextSummary(contexts: ContextItem[]): string {
    if (contexts.length === 0) {
        return 'No specific context available';
    }

    const parts: string[] = [];

    const projects = contexts.filter(c => c.type === 'PROJECT');
    if (projects.length > 0) {
        parts.push(`Working on ${projects.length} project(s): ${projects.map(p => p.content.split(':')[1]?.split('-')[0]?.trim()).join(', ')}`);
    }

    const tasks = contexts.filter(c => c.type === 'TASK');
    if (tasks.length > 0) {
        parts.push(`${tasks.length} active task(s)`);
    }

    const teams = contexts.filter(c => c.type === 'TEAM');
    if (teams.length > 0) {
        parts.push(`Part of ${teams.length} team(s)`);
    }

    return parts.join('. ');
}
