/**
 * AI Skill Service - Manages AI skills for agents and chat contexts
 */

import { prisma } from '@agentflox/database';
import type { AiSkill, SystemTool } from '@agentflox/database';

export class AgentSkillService {
    /**
     * Assign skills to an agent
     */
    async assignSkillsToAgent(agentId: string, skillIds: string[]): Promise<void> {
        // Create agent-skill relationships
        await prisma.aiAgentToSkill.createMany({
            data: skillIds.map(skillId => ({
                agentId,
                skillId,
                isEnabled: true,
            })),
            skipDuplicates: true,
        });
    }

    /**
     * Remove skills from an agent
     */
    async removeSkillsFromAgent(agentId: string, skillIds: string[]): Promise<void> {
        await prisma.aiAgentToSkill.deleteMany({
            where: {
                agentId,
                skillId: { in: skillIds },
            },
        });
    }

    /**
     * Enable/disable a skill for an agent
     */
    async toggleAgentSkill(agentId: string, skillId: string, isEnabled: boolean): Promise<void> {
        await prisma.aiAgentToSkill.updateMany({
            where: { agentId, skillId },
            data: { isEnabled },
        });
    }

    /**
     * Get all skills assigned to an agent (enabled and disabled)
     */
    async getAgentSkills(agentId: string): Promise<AiSkill[]> {
        const agentSkills = await prisma.aiAgentToSkill.findMany({
            where: { agentId },
            include: {
                skill: true,
            },
        });

        return agentSkills.map(as => as.skill);
    }

    /**
     * Get only enabled skills for an agent
     */
    async getEnabledAgentSkills(agentId: string): Promise<AiSkill[]> {
        const agentSkills = await prisma.aiAgentToSkill.findMany({
            where: {
                agentId,
                isEnabled: true,
            },
            include: {
                skill: true,
            },
        });

        return agentSkills.map(as => as.skill);
    }

    /**
     * Get tools available to an agent based on their assigned tools
     */
    async getAvailableTools(agentId: string): Promise<SystemTool[]> {
        // Fetch explicitly assigned AgentTool records
        const agentToolRecords = await prisma.agentTool.findMany({
            where: {
                agentId,
                isActive: true,
                isEnabled: true,
            },
            select: { name: true },
        });
        const agentToolNames = agentToolRecords.map(t => t.name);

        if (agentToolNames.length === 0) {
            return [];
        }

        const explicitTools = await prisma.systemTool.findMany({
            where: {
                name: { in: agentToolNames },
                isActive: true,
            }
        });

        return explicitTools;
    }

    /**
     * Get tool names available to an agent (for LLM function calling)
     */
    async getAvailableToolNames(agentId: string): Promise<string[]> {
        const agentToolRecords = await prisma.agentTool.findMany({
            where: {
                agentId,
                isActive: true,
                isEnabled: true,
            },
            select: { name: true },
        });
        return agentToolRecords.map(t => t.name);
    }

    /**
     * Check if an agent has a specific skill
     */
    async hasSkill(agentId: string, skillName: string): Promise<boolean> {
        const skillAssignment = await prisma.aiAgentToSkill.findFirst({
            where: {
                agentId,
                isEnabled: true,
                skill: {
                    name: skillName,
                },
            },
        });

        return skillAssignment !== null;
    }

    /**
     * Get all agents with a specific skill
     */
    async getAgentsWithSkill(skillName: string): Promise<string[]> {
        const agentSkills = await prisma.aiAgentToSkill.findMany({
            where: {
                isEnabled: true,
                skill: {
                    name: skillName,
                },
            },
            select: {
                agentId: true,
            },
        });

        return agentSkills.map(as => as.agentId);
    }
}

// Export a singleton instance
export const agentSkillService = new AgentSkillService();
