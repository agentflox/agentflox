import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getCatalogActionByToolName } from '@agentflox/types/integrationCatalog';
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
        const catalogAction = toolDef.category === 'SAAS_INTEGRATION'
            ? getCatalogActionByToolName(toolDef.name)
            : undefined;
        const metadata = catalogAction
            ? {
                integrationActionId: catalogAction.actionId,
                integrationProviderId: catalogAction.providerId,
                catalogSchemaVersion: '1.0.0',
            }
            : undefined;

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
                ...(metadata ? { metadata: metadata as any } : {}),
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
                ...(metadata ? { metadata: metadata as any } : {}),
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
        await prisma.aiSkill.upsert({
            where: { name: skillDef.name },
            update: {
                displayName: skillDef.displayName,
                description: skillDef.description,
                category: skillDef.category,
                icon: skillDef.icon,
                schema: (skillDef.schema as any) ?? undefined,
                metadata: (skillDef.metadata as any) ?? undefined,
                tags: skillDef.tags ?? [],
                isBuiltIn: true,
                isActive: true,
                status: "ACTIVE",
                visibility: "PUBLIC" as any,
                version: "1.0.0",
            },
            create: {
                id: randomUUID(),
                name: skillDef.name,
                displayName: skillDef.displayName,
                description: skillDef.description,
                category: skillDef.category,
                icon: skillDef.icon,
                schema: (skillDef.schema as any) ?? undefined,
                metadata: (skillDef.metadata as any) ?? undefined,
                tags: skillDef.tags ?? [],
                isBuiltIn: true,
                isActive: true,
                status: "ACTIVE",
                visibility: "PUBLIC" as any,
                version: "1.0.0",
            },
        });
        syncedCount++;
    }

    console.log(`[System] ✓ Synced ${syncedCount} skills`);
}

/**
 * Main wrapper to sync skills and tools
 */
export async function syncSkillsAndTools(): Promise<void> {
    try {
        await syncToolsToDatabase();
        await syncSkillsToDatabase();
        console.log('[System] ✓ Skill and tool sync completed successfully');
    } catch (error) {
        console.error('[System] ✗ Error syncing skills and tools:', error);
        throw error;
    }
}
