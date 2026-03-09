import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

/**
 * Prompt Registry for managing versioned prompts
 * Supports environment-based rollout and A/B testing
 */

export interface PromptVersion {
    id: string;
    templateId: string;
    version: number;
    content: string;
    variables: string[];
    environment: 'dev' | 'staging' | 'prod';
    rolloutPercentage: number;
    isActive: boolean;
    createdAt: Date;
    metadata?: Record<string, any>;
}

export class PromptRegistry {
    private cachePrefix = 'prompt:';
    private cacheTTL = 300; // 5 minutes

    /**
     * Get prompt template by ID with environment-based selection
     */
    async getPrompt(
        templateId: string,
        environment: 'dev' | 'staging' | 'prod' = 'prod',
        userId?: string
    ): Promise<PromptVersion | null> {
        // Check cache first
        const cacheKey = `${this.cachePrefix}${templateId}:${environment}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch active versions for this environment
        const versions = await prisma.promptVersion.findMany({
            where: {
                templateId,
                environment,
                isActive: true,
            },
            orderBy: { version: 'desc' },
        });

        if (versions.length === 0) return null;

        // Select version based on rollout percentage
        let selectedVersion = versions[0];
        if (versions.length > 1 && userId) {
            // Deterministic A/B testing based on user ID
            const hash = this.hashUserId(userId);
            const bucket = hash % 100;

            for (const version of versions) {
                if (bucket < version.rolloutPercentage) {
                    selectedVersion = version as any;
                    break;
                }
            }
        }

        // Cache for 5 minutes
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(selectedVersion));

        return selectedVersion as any;
    }

    /**
     * Create a new prompt version
     */
    async createVersion(
        templateId: string,
        content: string,
        environment: 'dev' | 'staging' | 'prod',
        options: {
            rolloutPercentage?: number;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<PromptVersion> {
        // Get latest version number
        const latestVersion = await prisma.promptVersion.findFirst({
            where: { templateId, environment },
            orderBy: { version: 'desc' },
        });

        const newVersion = (latestVersion?.version || 0) + 1;

        // Extract variables from template (simple {{variable}} pattern)
        const variables = this.extractVariables(content);

        const version = await prisma.promptVersion.create({
            data: {
                id: `${templateId}-v${newVersion}`,
                templateId,
                version: newVersion,
                content,
                variables,
                environment,
                rolloutPercentage: options.rolloutPercentage || 100,
                isActive: false, // Require explicit activation
                metadata: options.metadata,
            },
        });

        return version as any;
    }

    /**
     * Activate a specific version (and optionally deactivate others)
     */
    async activateVersion(versionId: string, deactivateOthers: boolean = true): Promise<void> {
        const version = await prisma.promptVersion.findUnique({ where: { id: versionId } });
        if (!version) throw new Error('Version not found');

        if (deactivateOthers) {
            // Deactivate all other versions in the same environment
            await prisma.promptVersion.updateMany({
                where: {
                    templateId: version.templateId,
                    environment: version.environment,
                    id: { not: versionId },
                },
                data: { isActive: false },
            });
        }

        // Activate this version
        await prisma.promptVersion.update({
            where: { id: versionId },
            data: { isActive: true },
        });

        // Invalidate cache
        await this.invalidateCache(version.templateId, version.environment);
    }

    /**
     * Render prompt with variables
     */
    renderPrompt(template: string, variables: Record<string, any>): string {
        let rendered = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
        }
        return rendered;
    }

    /**
     * Extract variable placeholders from template
     */
    private extractVariables(template: string): string[] {
        const regex = /\{\{(\w+)\}\}/g;
        const variables: string[] = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }
        return variables;
    }

    /**
     * Hash user ID for deterministic bucketing
     */
    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Invalidate cache for a template
     */
    private async invalidateCache(templateId: string, environment: string): Promise<void> {
        const cacheKey = `${this.cachePrefix}${templateId}:${environment}`;
        await redis.del(cacheKey);
    }
}

export const promptRegistry = new PromptRegistry();
