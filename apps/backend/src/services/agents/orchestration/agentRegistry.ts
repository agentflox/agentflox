import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';

/**
 * Agent Registry & Discovery Service
 * Capability-based agent discovery for multi-agent orchestration
 */

export interface AgentRegistryEntry {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    status: string;
    workspaceId?: string;
    metadata?: Record<string, any>;
}

export interface AgentQuery {
    capability?: string;
    type?: string;
    workspaceId?: string;
    status?: string;
    query?: string;
}

@Injectable()
export class AgentRegistryService {
    /**
     * Register agent in the registry
     */
    async registerAgent(agent: {
        id: string;
        name: string;
        type: string;
        capabilities?: string[];
        status: string;
        workspaceId?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        // Store agent metadata in Redis
        await redis.hset(`agent:registry:${agent.id}`, {
            name: agent.name,
            type: agent.type,
            capabilities: JSON.stringify(agent.capabilities || []),
            status: agent.status,
            workspaceId: agent.workspaceId || '',
            metadata: JSON.stringify(agent.metadata || {}),
            registeredAt: new Date().toISOString(),
        });

        // Index by capability for fast discovery
        for (const capability of agent.capabilities || []) {
            await redis.sadd(`agent:capability:${capability}`, agent.id);
        }

        // Index by type
        await redis.sadd(`agent:type:${agent.type}`, agent.id);

        // Index by workspace
        if (agent.workspaceId) {
            await redis.sadd(`agent:workspace:${agent.workspaceId}`, agent.id);
        }

        console.log(`[AgentRegistry] Registered agent ${agent.id} with capabilities:`, agent.capabilities);
    }

    /**
     * Unregister agent from registry
     */
    async unregisterAgent(agentId: string): Promise<void> {
        // Get agent data before deletion
        const agentData = await redis.hgetall(`agent:registry:${agentId}`);
        if (!agentData || Object.keys(agentData).length === 0) return;

        const capabilities = JSON.parse(agentData.capabilities || '[]');
        const type = agentData.type;
        const workspaceId = agentData.workspaceId;

        // Remove from capability indexes
        for (const capability of capabilities) {
            await redis.srem(`agent:capability:${capability}`, agentId);
        }

        // Remove from type index
        await redis.srem(`agent:type:${type}`, agentId);

        // Remove from workspace index
        if (workspaceId) {
            await redis.srem(`agent:workspace:${workspaceId}`, agentId);
        }

        // Remove main entry
        await redis.del(`agent:registry:${agentId}`);

        console.log(`[AgentRegistry] Unregistered agent ${agentId}`);
    }

    /**
     * Discover agents by query
     */
    async discoverAgents(query: AgentQuery): Promise<AgentRegistryEntry[]> {
        let agentIds: string[] = [];

        if (query.capability) {
            // Find by capability
            agentIds = await redis.smembers(`agent:capability:${query.capability}`);
        } else if (query.type) {
            // Find by type
            agentIds = await redis.smembers(`agent:type:${query.type}`);
        } else if (query.workspaceId) {
            // Find by workspace
            agentIds = await redis.smembers(`agent:workspace:${query.workspaceId}`);
        } else {
            // Get all agents (scan all registry keys)
            const keys = await redis.keys('agent:registry:*');
            agentIds = keys.map((k) => k.replace('agent:registry:', ''));
        }

        // Fetch agent details
        const agents: AgentRegistryEntry[] = [];
        for (const agentId of agentIds) {
            const agentData = await redis.hgetall(`agent:registry:${agentId}`);
            if (!agentData || Object.keys(agentData).length === 0) continue;

            const agent: AgentRegistryEntry = {
                id: agentId,
                name: agentData.name,
                type: agentData.type,
                capabilities: JSON.parse(agentData.capabilities || '[]'),
                status: agentData.status,
                workspaceId: agentData.workspaceId || undefined,
                metadata: JSON.parse(agentData.metadata || '{}'),
            };

            // Apply filters
            if (query.status && agent.status !== query.status) continue;
            if (query.workspaceId && agent.workspaceId !== query.workspaceId) continue;

            agents.push(agent);
        }

        return agents;
    }

    /**
     * Get agent by ID
     */
    async getAgent(agentId: string): Promise<AgentRegistryEntry | null> {
        const agentData = await redis.hgetall(`agent:registry:${agentId}`);
        if (!agentData || Object.keys(agentData).length === 0) return null;

        return {
            id: agentId,
            name: agentData.name,
            type: agentData.type,
            capabilities: JSON.parse(agentData.capabilities || '[]'),
            status: agentData.status,
            workspaceId: agentData.workspaceId || undefined,
            metadata: JSON.parse(agentData.metadata || '{}'),
        };
    }

    /**
     * Update agent status
     */
    async updateAgentStatus(agentId: string, status: string): Promise<void> {
        await redis.hset(`agent:registry:${agentId}`, 'status', status);
    }

    /**
     * Sync database agents to registry
     */
    async syncDatabaseAgents(): Promise<void> {
        const agents = await prisma.aiAgent.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                agentType: true,
                capabilities: true,
                status: true,
                workspaceId: true,
            },
        });

        for (const agent of agents) {
            await this.registerAgent({
                id: agent.id,
                name: agent.name,
                type: agent.agentType,
                capabilities: agent.capabilities as string[] || [],
                status: agent.status,
                workspaceId: agent.workspaceId || undefined,
            });
        }

        console.log(`[AgentRegistry] Synced ${agents.length} agents from database`);
    }
}

export const agentRegistryService = new AgentRegistryService();
