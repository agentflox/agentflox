/**
 * Skill and Tool Sync Utility
 * Syncs built-in skills and their tool mappings to the database
 */

import { prisma } from '@agentflox/database';
import { BUILT_IN_SKILLS } from './skillRegistry';
import { syncToolsToDatabase } from './toolRegistry';
import { randomUUID } from 'crypto';

/**
 * Sync built-in skills to database
 */
export async function syncSkillsToDatabase(): Promise<void> {
    console.log('Syncing skills to database...');

    for (const skillDef of BUILT_IN_SKILLS) {
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
    }

    console.log(`✓ Synced ${BUILT_IN_SKILLS.length} skills`);
}

/**
 * Tool to skill mappings
 * Maps tool names to the skills they belong to
 */
export const TOOL_SKILL_MAPPINGS: Record<string, string[]> = {
    // Task Management tools
    createTask: ['task_management'],
    updateTask: ['task_management'],
    deleteTask: ['task_management'],
    listTasks: ['task_management'],
    getTask: ['task_management'],
    assignTask: ['task_management'],

    // Search tools (available to all)
    searchProjects: ['task_management'],
    searchTasks: ['task_management'],

    // Project Management tools
    createProject: ['task_management'],
    updateProject: ['task_management'],

    // Team Management tools
    createTeam: ['task_management'],
    updateTeam: ['task_management'],

    // Content Creation
    generateBlogPost: ['content_creation'],
    writeScript: ['content_creation'],
    createDocumentation: ['content_creation'],

    // Code Operations
    writeCode: ['code_operations'],
    reviewCode: ['code_operations'],
    refactorCode: ['code_operations'],
    debugCode: ['code_operations'],

    // Browser Automation
    navigateToUrl: ['browser_automation'],
    clickElement: ['browser_automation'],
    // fillForm: ['browser_automation'], // Not yet implemented
    scrapeData: ['browser_automation'],

    // Media Generation
    generateImage: ['media_generation'],
    generateVideo: ['media_generation'],
    // generateAudio: ['media_generation'], // Not yet implemented

    // File Operations
    readFile: ['file_operations'],
    writeFile: ['file_operations'],
    // deleteFile: ['file_operations'], // Not yet implemented
    listFiles: ['file_operations'],

    // API Integration
    // callExternalAPI: ['api_integration'], // Not yet implemented
};

/**
 * Sync skill-tool mappings to database
 */
export async function syncSkillToolMappings(): Promise<void> {
    console.log('Syncing skill-tool mappings...');

    let mappingCount = 0;

    for (const [toolName, skillNames] of Object.entries(TOOL_SKILL_MAPPINGS)) {
        // Get the tool from database
        const tool = await prisma.systemTool.findUnique({
            where: { name: toolName },
        });

        if (!tool) {
            console.warn(`⚠ Tool not found: ${toolName}, skipping...`);
            continue;
        }

        // Map to each skill
        for (const skillName of skillNames) {
            const skill = await prisma.agentSkill.findUnique({
                where: { name: skillName },
            });

            if (!skill) {
                console.warn(`⚠ Skill not found: ${skillName}, skipping...`);
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
                    skillId: skill.id,
                    toolId: tool.id,
                    isDefault: true,
                },
            });

            mappingCount++;
        }
    }

    console.log(`✓ Synced ${mappingCount} skill-tool mappings`);
}

/**
 * Main sync function - syncs skills and their tool mappings
 */
export async function syncSkillsAndTools(): Promise<void> {
    try {
        await syncSkillsToDatabase();
        await syncToolsToDatabase();
        await syncSkillToolMappings();
        console.log('✓ Skill and tool sync completed successfully');
    } catch (error) {
        console.error('✗ Error syncing skills and tools:', error);
        throw error;
    }
}

// Run sync if executed directly
// if (require.main === module) {
//     syncSkillsAndTools()
//         .then(() => {
//             console.log('Sync completed');
//             process.exit(0);
//         })
//         .catch(error => {
//             console.error('Sync failed:', error);
//             process.exit(1);
//         });
// }
