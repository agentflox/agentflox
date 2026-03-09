import { prisma } from '@/lib/prisma';
import { AgentRelationType } from '@agentflox/database/src/generated/prisma';
import { z } from 'zod';
import { AgentBuilderError } from '../arch/agentBuilderService';

/**
 * Service for managing multi-agent relationships
 * Implements "World-Class" patterns:
 * - Cycle detection for hierarchies
 * - Strict relationship typing
 * - Context propagation rules
 */
export class AgentRelationService {

    /**
     * Add a relationship between two agents
     */
    async addRelation(
        parentId: string,
        childId: string,
        type: AgentRelationType,
        userId: string
    ) {
        // 1. Validation
        if (parentId === childId) {
            throw new AgentBuilderError(
                'AGENT_RELATION_SELF_REFERENCE',
                'Cannot create a relation to self',
                'An agent cannot be its own sub-agent.'
            );
        }

        // 2. Check ownership/permissions
        const [parent, child] = await Promise.all([
            prisma.aiAgent.findUnique({ where: { id: parentId } }),
            prisma.aiAgent.findUnique({ where: { id: childId } }),
        ]);

        if (!parent || !child) {
            throw new AgentBuilderError(
                'AGENT_NOT_FOUND',
                'Agent not found',
                'One of the agents specified does not exist.'
            );
        }

        // For now, assume user must own both or have admin rights (simplification)
        if (parent.createdBy !== userId || child.createdBy !== userId) {
            throw new AgentBuilderError(
                'AGENT_RELATION_UNAUTHORIZED',
                'Unauthorized relation',
                'You must own both agents to link them.'
            );
        }

        // 3. Cycle Detection for Sub-Agent/Supervisor
        if (type === 'SUB_AGENT' || type === 'SUPERVISOR') {
            const hasCycle = await this.detectCycle(parentId, childId);
            if (hasCycle) {
                throw new AgentBuilderError(
                    'AGENT_RELATION_CYCLE_DETECTED',
                    'Cycle detected in agent hierarchy',
                    'Adding this relationship would create an infinite loop.'
                );
            }
        }

        // 4. Create Relation
        return prisma.agentRelation.create({
            data: {
                parentId,
                childId,
                type,
            },
        });
    }

    /**
     * Remove a relationship
     */
    async removeRelation(relationId: string, userId: string) {
        // Verify ownership
        const relation = await prisma.agentRelation.findUnique({
            where: { id: relationId },
            include: { parent: true },
        });

        if (!relation) {
            throw new AgentBuilderError('RELATION_NOT_FOUND', 'Relation not found', '');
        }

        if (relation.parent.createdBy !== userId) {
            throw new AgentBuilderError('UNAUTHORIZED', 'Unauthorized', '');
        }

        return prisma.agentRelation.delete({
            where: { id: relationId },
        });
    }

    /**
     * Get an agent's "Team" (all relations)
     */
    async getAgentTeam(agentId: string) {
        const [subAgents, parentAgents, peers] = await Promise.all([
            prisma.agentRelation.findMany({
                where: { parentId: agentId, type: 'SUB_AGENT' },
                include: { child: true },
            }),
            prisma.agentRelation.findMany({
                where: { childId: agentId, type: 'SUB_AGENT' },
                include: { parent: true },
            }),
            prisma.agentRelation.findMany({
                where: {
                    OR: [
                        { parentId: agentId, type: 'PEER' },
                        { childId: agentId, type: 'PEER' }
                    ]
                },
                include: { parent: true, child: true },
            }),
        ]);

        return {
            subAgents: subAgents.map(r => ({ ...r.child, relationId: r.id })),
            supervisors: parentAgents.map(r => ({ ...r.parent, relationId: r.id })),
            peers: peers.map(r => {
                const peer = r.parentId === agentId ? r.child : r.parent;
                return { ...peer, relationId: r.id };
            }),
        };
    }

    /**
     * BFS to detect cycles.
     * Checks if adding A -> B creates a path from B to A.
     */
    private async detectCycle(sourceId: string, targetId: string): Promise<boolean> {
        const visited = new Set<string>();
        const queue = [targetId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (currentId === sourceId) return true;

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Find all children of current
            const relations = await prisma.agentRelation.findMany({
                where: { parentId: currentId, type: 'SUB_AGENT' },
                select: { childId: true },
            });

            for (const rel of relations) {
                queue.push(rel.childId);
            }
        }

        return false;
    }
}

export const agentRelationService = new AgentRelationService();
