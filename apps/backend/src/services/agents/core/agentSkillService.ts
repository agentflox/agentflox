/**
 * Agent Skill Service - Manages agent skills and skill-based tool access
 */

import { prisma } from '@agentflox/database';
import type { AgentSkill, SystemTool } from '@agentflox/database/generated/prisma';

export class AgentSkillService {
    /**
     * Assign skills to an agent
     */
    async assignSkillsToAgent(agentId: string, skillIds: string[]): Promise<void> {
        // Create agent-skill relationships
        await prisma.agentToSkill.createMany({
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
        await prisma.agentToSkill.deleteMany({
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
        await prisma.agentToSkill.updateMany({
            where: { agentId, skillId },
            data: { isEnabled },
        });
    }

    /**
     * Get all skills assigned to an agent (enabled and disabled)
     */
    async getAgentSkills(agentId: string): Promise<AgentSkill[]> {
        const agentSkills = await prisma.agentToSkill.findMany({
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
    async getEnabledAgentSkills(agentId: string): Promise<AgentSkill[]> {
        const agentSkills = await prisma.agentToSkill.findMany({
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
     * Get tools available to an agent based on their enabled skills
     */
    async getAvailableTools(agentId: string): Promise<SystemTool[]> {
        // Get agent's enabled skills
        const agentSkills = await prisma.agentToSkill.findMany({
            where: {
                agentId,
                isEnabled: true,
            },
            include: {
                skill: {
                    include: {
                        toolSkills: {
                            include: {
                                tool: true,
                            },
                        },
                    },
                },
            },
        });

        // Collect unique tools from all skills
        const toolSet = new Map<string, SystemTool>();

        for (const agentSkill of agentSkills) {
            for (const skillTool of agentSkill.skill.toolSkills) {
                if (!toolSet.has(skillTool.tool.id)) {
                    toolSet.set(skillTool.tool.id, skillTool.tool);
                }
            }
        }

        return Array.from(toolSet.values());
    }

    /**
     * Get tool names available to an agent (for LLM function calling)
     */
    async getAvailableToolNames(agentId: string): Promise<string[]> {
        const tools = await this.getAvailableTools(agentId);
        return tools.map(tool => tool.name);
    }

    /**
     * Check if an agent has a specific skill
     */
    async hasSkill(agentId: string, skillName: string): Promise<boolean> {
        const skillAssignment = await prisma.agentToSkill.findFirst({
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
        const agentSkills = await prisma.agentToSkill.findMany({
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
