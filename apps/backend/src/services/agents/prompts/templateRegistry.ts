/**
 * Template Registry
 *
 * Registers all default AI agent templates available in the system.
 * Templates are synced to the database (AgentTemplate model) on startup.
 */

import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { AGENT_TEMPLATES } from './templates/constants';

/**
 * Generates an embedding for the given text using OpenAI.
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Efficient and high performance
            input: text,
            dimensions: 1536
        });
        return response.data[0].embedding;
    } catch (error) {
        console.warn('[TemplateRegistry] Failed to generate embedding:', error);
        return null; // Fail gracefully, don't block startup
    }
}

export async function syncTemplatesToDatabase() {
    console.log('[TemplateRegistry] Syncing templates to database...');

    for (const template of AGENT_TEMPLATES) {
        try {
            // Check if template exists (by name and isSystem=true)
            const existing = await prisma.agentTemplate.findFirst({
                where: {
                    name: template.name,
                    isSystem: true
                }
            });

            // Text to embed: Combine critical semantic fields
            const textToEmbed = `
Name: ${template.name}
Role: ${template.role}
Objective: ${template.objective}
Description: ${template.description}
Categories: ${template.categories.join(', ')}
Capabilities: ${template.capabilities.map(c => c.name).join(', ')}
            `.trim();

            const embedding = await generateEmbedding(textToEmbed);

            // Prepare base data
            const data: Prisma.AgentTemplateCreateInput = {
                name: template.name,
                description: template.description,
                role: template.role,
                objective: template.objective,
                categories: template.categories,
                capabilities: template.capabilities as any,
                instructions: template.instructions,
                triggers: template.triggers as any,
                isSystem: true,
                isPublic: true,
                embeddingUpdatedAt: embedding ? new Date() : undefined,
            };

            let templateId: string;

            if (existing) {
                // Update existing
                await prisma.agentTemplate.update({
                    where: { id: existing.id },
                    data
                });
                templateId = existing.id;
                console.log(`[TemplateRegistry] Updated template: ${template.name}`);
            } else {
                // Create new
                const created = await prisma.agentTemplate.create({
                    data
                });
                templateId = created.id;
                console.log(`[TemplateRegistry] Created template: ${template.name}`);
            }

            // Update embedding using raw SQL because Prisma Schema has Unsupported("vector")
            // This requires the pgvector extension to be enabled in Postgres
            if (embedding && templateId) {
                const vectorString = `[${embedding.join(',')}]`;
                await prisma.$executeRaw`
                    UPDATE agent_templates 
                    SET embedding = ${vectorString}::vector
                    WHERE id = ${templateId}
                `;
            }

        } catch (error) {
            console.error(`[TemplateRegistry] Failed to sync template ${template.name}:`, error);
        }
    }
    console.log('[TemplateRegistry] Template sync complete.');
}
