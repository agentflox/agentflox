import { Injectable } from '@nestjs/common';
import { ModelService } from './model.service';
import { prisma } from '@/lib/prisma';
import {
    checkMarketplaceTokenLimit,
    updateMarketplaceUsage,
    estimateTokens,
    countMarketplaceTokens
} from '@/utils/ai/marketplaceUsageTracking';

export interface GenerateProposalInput {
    taskTitle: string;
    taskDescription?: string;
    dueDate?: string;
    projectId?: string;
}

export interface GenerateProposalOutput {
    detailedDesc: string;
    skills: string[];
    niceToHaveSkills: string[];
    experience: 'Junior' | 'Mid-Level' | 'Senior';
    dueDate?: string;
}

export interface TokenLimitError {
    error: 'Insufficient tokens';
    remaining: number;
    required: number;
}

@Injectable()
export class ProposalService {
    private modelService: ModelService;

    constructor() {
        this.modelService = new ModelService();
    }

    /**
     * Generate a marketplace proposal using AI based on task details
     * @param input Task details for proposal generation
     * @param userId User ID for token tracking
     * @returns Generated proposal content or token limit error
     */
    async generateProposal(
        input: GenerateProposalInput,
        userId: string
    ): Promise<GenerateProposalOutput | TokenLimitError> {
        // 1. Construct Prompt
        const prompt = this.buildProposalPrompt(input);
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
        const generatedContent = JSON.parse(cleanContent) as GenerateProposalOutput;

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
     * Build the AI prompt for proposal generation
     */
    private buildProposalPrompt(input: GenerateProposalInput): string {
        return `
You are an expert Proposal Writer for a freelance marketplace.
Generate a high-quality job proposal/description based on the following task:

Task Title: ${input.taskTitle}
Task Description: ${input.taskDescription || 'No description provided'}
${input.dueDate ? `Due Date: ${input.dueDate}` : ''}

Please generate a JSON response with the following fields:
- detailedDesc: A professional and detailed job description (markdown supported).
- skills: A list of 3-5 mandatory skills required.
- niceToHaveSkills: A list of 2-3 optional skills.
- experience: Recommended experience level (Junior, Mid-Level, Senior).
- dueDate: Suggested or provided due date in ISO format (YYYY-MM-DD). ${input.dueDate ? `Use the provided due date: ${input.dueDate}` : 'Suggest a reasonable deadline based on the task complexity.'}

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
