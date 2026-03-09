import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { MODEL_RATES, DEFAULT_RATE } from './rates';
import { convertModelName } from '../chat/utils/convertModelName';

@Injectable()
export class UsageTrackingService {

    async trackUsage(params: {
        userId: string;
        modelId: string;
        inputTokens: number;
        outputTokens: number;
        context: 'CHAT' | 'AGENT' | 'AUTOMATION';
        conversationId?: string;
        executionId?: string; // For agents
        metadata?: any;
    }) {
        const { userId, modelId, inputTokens, outputTokens, context, conversationId, metadata } = params;

        // Normalize model ID
        const normalizedModelId = convertModelName(modelId) || modelId;

        // Calculate cost
        const rate = MODEL_RATES[normalizedModelId] || MODEL_RATES[modelId] || DEFAULT_RATE;

        // Cost calculation: (Tokens / 1,000,000) * Rate
        const inputCost = (inputTokens / 1_000_000) * rate.input;
        const outputCost = (outputTokens / 1_000_000) * rate.output;
        const totalCost = inputCost + outputCost;

        // Log to DB
        try {
            await (prisma as any).aiUsageLog.create({
                data: {
                    userId,
                    action: context === 'CHAT' ? 'CHAT_COMPLETION' : 'AGENT_EXECUTION', // Map to AiActionType enum roughly
                    model: normalizedModelId,
                    tokensUsed: inputTokens + outputTokens,
                    cost: totalCost,
                    conversationId: conversationId,
                    metadata: {
                        inputTokens,
                        outputTokens,
                        executionId: params.executionId,
                        ...metadata
                    }
                }
            });
        } catch (error) {
            console.error('Failed to log AI usage', error);
            // Don't throw, we don't want to break the user flow for logging failure
        }
    }

    async checkLimit(userId: string, modelId: string): Promise<boolean> {
        // TODO: Implement subscription check against a SubscriptionService
        // For now, allow all (enterprise grade would check quota here)
        return true;
    }
}
