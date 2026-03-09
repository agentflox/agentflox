import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { toolRegistryManager } from './tools';
import { skillRegistryManager } from './skills';

/** Convert camelCase name to display name, e.g. navigateToUrl -> "Navigate to URL" */
function camelToDisplayName(name: string): string {
  const spaced = name.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sync all tool definitions from the Registry Manager to the database
 */
export async function syncToolsToDatabase(): Promise<void> {
    console.log('[System] Syncing tools to database...');
    const toolDefinitions = toolRegistryManager.getAllToolDefinitions();
    let syncedCount = 0;

    for (const toolDef of toolDefinitions) {
        const now = new Date();
        const displayName = toolDef.displayName ?? camelToDisplayName(toolDef.name);
        await prisma.systemTool.upsert({
            where: { name: toolDef.name },
            update: {
                displayName,
                description: toolDef.description,
                category: toolDef.category,
                functionSchema: toolDef.functionSchema as any,
                deterministic: toolDef.deterministic,
                requiresAuth: toolDef.requiresAuth,
                rateLimit: toolDef.rateLimit,
                timeout: toolDef.timeout,
                examples: toolDef.examples as any,
                isDefault: toolDef.isDefault ?? false,
                isBuiltIn: true,
                isActive: true,
                updatedAt: now,
            },
            create: {
                id: randomUUID(),
                name: toolDef.name,
                displayName,
                description: toolDef.description,
                category: toolDef.category,
                functionSchema: toolDef.functionSchema as any,
                deterministic: toolDef.deterministic,
                requiresAuth: toolDef.requiresAuth,
                rateLimit: toolDef.rateLimit,
                timeout: toolDef.timeout,
                examples: toolDef.examples as any,
                isDefault: toolDef.isDefault ?? false,
                isBuiltIn: true,
                isActive: true,
                updatedAt: now,
            },
        });
        syncedCount++;
    }

    console.log(`[System] ✓ Synced ${syncedCount} tools`);
}

/**
 * Sync all skill definitions from the Registry Manager to the database
 */
export async function syncSkillsToDatabase(): Promise<void> {
    console.log('[System] Syncing skills to database...');
    const skillDefinitions = skillRegistryManager.getAllSkillDefinitions();
    let syncedCount = 0;

    for (const skillDef of skillDefinitions) {
        await prisma.agentSkill.upsert({
            where: { name: skillDef.name },
            update: {
                displayName: skillDef.displayName,
                description: skillDef.description,
                category: skillDef.category,
                icon: skillDef.icon,
                isBuiltIn: true,
                isActive: true,
            },
            create: {
                id: randomUUID(),
                name: skillDef.name,
                displayName: skillDef.displayName,
                description: skillDef.description,
                category: skillDef.category,
                icon: skillDef.icon,
                isBuiltIn: true,
                isActive: true,
            },
        });
        syncedCount++;
    }

    console.log(`[System] ✓ Synced ${syncedCount} skills`);
}

/**
 * Sync skill-to-tool mappings natively based on the skill's 'tools' array
 */
export async function syncSkillToolMappings(): Promise<void> {
    console.log('[System] Syncing skill-tool mappings...');
    const skillDefinitions = skillRegistryManager.getAllSkillDefinitions();
    let mappingCount = 0;

    for (const skillDef of skillDefinitions) {
        if (!skillDef.tools || skillDef.tools.length === 0) continue;

        const skill = await prisma.agentSkill.findUnique({
            where: { name: skillDef.name },
        });

        if (!skill) continue;

        for (const toolName of skillDef.tools) {
            const tool = await prisma.systemTool.findUnique({
                where: { name: toolName },
            });

            if (!tool) {
                console.warn(`[System] ⚠ Tool not found for mapping: ${toolName}, skipping...`);
                continue;
            }

            await prisma.skillToTool.upsert({
                where: {
                    skillId_toolId: {
                        skillId: skill.id,
                        toolId: tool.id,
                    },
                },
                update: {
                    isDefault: true,
                },
                create: {
                    id: randomUUID(),
                    skillId: skill.id,
                    toolId: tool.id,
                    isDefault: true,
                },
            });
            mappingCount++;
        }
    }

    console.log(`[System] ✓ Synced ${mappingCount} skill-tool mappings`);
}

/**
 * Main wrapper to sync everything
 */
export async function syncSkillsAndTools(): Promise<void> {
    try {
        await syncToolsToDatabase();
        await syncSkillsToDatabase();
        await syncSkillToolMappings();
        console.log('[System] ✓ Skill and tool sync completed successfully');
    } catch (error) {
        console.error('[System] ✗ Error syncing skills and tools:', error);
        throw error;
    }
}
