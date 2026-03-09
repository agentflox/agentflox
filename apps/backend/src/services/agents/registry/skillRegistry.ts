/**
 * Skill Registry
 * 
 * Registers agent skills using the new Centralized SkillRegistryManager architecture
 */

import { prisma } from '@/lib/prisma';
import { skillRegistryManager } from './skills';

// Export type from the core manager
export type { SkillDefinition } from './core/SkillRegistryManager';

// Export the unified sync logic
export { syncSkillsToDatabase } from './sync';

/**
 * Expose BUILT_IN_SKILLS variable for backward compatibility
 */
export const BUILT_IN_SKILLS = skillRegistryManager.getAllSkillDefinitions();

/**
 * Get skill by name
 */
export function getSkillByName(name: string) {
    return skillRegistryManager.getSkill(name);
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(category: string) {
    return skillRegistryManager.getSkillsByCategory(category);
}

/**
 * Get all skill names
 */
export function getAllSkillNames(): string[] {
    return skillRegistryManager.getAllSkillNames();
}

/**
 * Get all skills from the database, including their associated tools
 */
export async function getAllSkills() {
    const skills = await prisma.agentSkill.findMany({
        where: { isActive: true },
        include: {
            toolSkills: {
                include: {
                    tool: true
                }
            }
        }
    });

    return skills.map(skill => ({
        id: skill.name, // Using name as ID for compatibility
        name: skill.displayName,
        description: skill.description,
        category: skill.category,
        icon: skill.icon,
        tools: skill.toolSkills.map((st: any) => st.tool.name)
    }));
}
