import { Injectable } from '@nestjs/common';
import { ModelService } from './model.service';
import { prisma } from '@/lib/prisma';
import {
    checkMarketplaceTokenLimit,
    updateMarketplaceUsage,
    estimateTokens,
    countMarketplaceTokens
} from '@/utils/ai/marketplaceUsageTracking';

export interface GenerateListingInput {
    entityType: string;
    entityId?: string;
    title?: string;
    description?: string;
    dueDate?: string;
}

export interface GenerateListingOutput {
    taskTitle: string;
    detailedDesc: string;
    skills: string[];
    niceToHaveSkills?: string[];
    experience?: 'Junior' | 'Mid-Level' | 'Senior';
    dueDate?: string;
    useCases?: string[];
    intendedUsers?: string[];
}

export interface TokenLimitError {
    error: 'Insufficient tokens';
    remaining: number;
    required: number;
}

@Injectable()
export class ListingService {
    private modelService: ModelService;

    constructor() {
        this.modelService = new ModelService();
    }

    /**
     * Generate a marketplace listing using AI based on task details
     * @param input Task details for listing generation
     * @param userId User ID for token tracking
     * @returns Generated listing content or token limit error
     */
    async generate(
        input: GenerateListingInput,
        userId: string
    ): Promise<GenerateListingOutput | TokenLimitError> {
        // 1. Construct Prompt
        const prompt = this.buildListingPrompt(input);
        const messages = [{ role: 'user', content: prompt }];

        // 2. Estimate Tokens & Check Limits
        const estimatedTokens = estimateTokens(prompt) + 500; // Buffer for output
        const limitCheck = await checkMarketplaceTokenLimit(userId, estimatedTokens);

        if (!limitCheck.allowed) {
            return {
                error: 'Insufficient tokens',
                remaining: limitCheck.remaining,
                required: estimatedTokens
            };
        }

        // 3. Generate Content
        const detectionResult = await this.modelService.generateText('gpt-4o-mini', messages as any, {
            temperature: 0.7,
            maxTokens: 1000,
            responseFormat: { type: "json_object" }
        });

        // Strip markdown code blocks if present (handles ```json ... ``` wrapper)
        const cleanContent = this.stripMarkdownCodeBlocks(detectionResult.content);
        const generatedContent = JSON.parse(cleanContent) as GenerateListingOutput;

        // 4. Calculate Actual Usage
        const tokenCount = await countMarketplaceTokens(
            messages as any,
            detectionResult.content,
            'gpt-4o-mini'
        );

        // 5. Update Usage (non-blocking)
        this.trackUsage(userId, tokenCount.inputTokens, tokenCount.outputTokens).catch(err => {
            console.error('Failed to update marketplace usage:', err);
        });

        return generatedContent;
    }

    /**
     * Strip markdown code blocks from AI response
     * Handles cases where AI returns: ```json\n{...}\n```
     */
    private stripMarkdownCodeBlocks(content: string): string {
        // Remove ```json at the start and ``` at the end
        return content
            .replace(/^```(?:json)?\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();
    }

    /**
     * Build the AI prompt for listing generation
     */
    private buildListingPrompt(input: GenerateListingInput): string {
        const isAsset = ['agent', 'tool', 'template'].includes((input.entityType || '').toLowerCase());
        
        return `
You are an expert Listing Copywriter for a freelance marketplace.
Generate a high-quality, comprehensive marketplace listing description based on the following ${input.entityType || 'task'}:

Title: ${input.title || 'Untitled'}
Description/Internal Context: ${input.description || 'No description provided'}
${input.dueDate ? `Due Date: ${input.dueDate}` : ''}

CRITICAL HTML FORMATTING RULES:
For the detailedDesc field, you MUST generate rich HTML content that can be perfectly rendered inside a Tiptap rich-text editor. You should use semantic HTML tags (e.g. <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>). Do NOT use markdown.

CONTENT GENERATION RULES:
If the entity is an opportunity (such as a task, project, workforce, team, or talent), structure the content to clearly indicate we are looking for someone to join, looking for someone to carry out the task, or requesting collaboration. 
Intelligently expand upon the provided context to generate a comprehensive, persuasive, and professional listing description. Introduce logical sections (e.g. "What we are looking for", "Scope of Work", "Deliverables", etc.) if it fits the context.

Please generate a JSON response with the following fields:
- taskTitle: A highly polished and engaging public title for the listing.
- detailedDesc: The expertly crafted rich HTML description.
- skills: A list of 3-5 mandatory skills required or tags associated with this.
${isAsset ? `
- useCases: A list of 3-5 practical use cases for this asset.
- intendedUsers: A list of 2-3 target user roles (e.g. Developers, Marketers).
` : `
- niceToHaveSkills: A list of 2-3 optional skills or properties.
- experience: Recommended experience level to interact with this (Junior, Mid-Level, Senior).
- dueDate: Suggested or provided due date in ISO format (YYYY-MM-DD). ${input.dueDate ? `Use the provided due date: ${input.dueDate}` : 'Suggest a reasonable deadline based on the entity complexity.'}
`}

Output pure JSON only.
        `.trim();
    }

    /**
     * Track token usage for marketplace features
     */
    private async trackUsage(
        userId: string,
        inputTokens: number,
        outputTokens: number
    ): Promise<void> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await updateMarketplaceUsage(
            userId,
            user?.name || user?.email || 'User',
            inputTokens,
            outputTokens,
            user?.email
        );
    }
}
