import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { AgentFeedback } from '@agentflox/database';

export interface CreateFeedbackParams {
    agentId: string;
    executionId?: string;
    userId: string;
    overallRating?: number;
    accuracyRating?: number;
    speedRating?: number;
    helpfulnessRating?: number;
    comment?: string;
    issueCategories?: string[];
    context?: any;
}

@Injectable()
export class AgentFeedbackService {

    /**
     * Record new feedback
     */
    async recordFeedback(params: CreateFeedbackParams): Promise<AgentFeedback> {
        return (prisma as any).agentFeedback.create({
            data: {
                id: crypto.randomUUID(), // Assuming UUIDs
                agentId: params.agentId,
                executionId: params.executionId,
                userId: params.userId,
                feedbackType: 'USER_RATING', // Detailed rating
                overallRating: params.overallRating,
                accuracyRating: params.accuracyRating,
                speedRating: params.speedRating,
                helpfulnessRating: params.helpfulnessRating,
                comment: params.comment,
                issueCategories: params.issueCategories || [],
                context: params.context || {},
            }
        });
    }

    /**
     * Retrieve relevant feedback for an intent to improve future execution.
     * In a full enterprise system, this would use vector search on the 'context' or 'comment'.
     * For now, we fetch recent negative feedback to avoid repeating mistakes, 
     * and positive instructions if structured.
     */
    async getRelevantFeedback(agentId: string, intentAction?: string): Promise<string[]> {
        // 1. Fetch recent negative feedback with comments (learning from mistakes)
        const negativeFeedback = await (prisma as any).agentFeedback.findMany({
            where: {
                agentId: agentId,
                overallRating: { lte: 3 }, // 1-3 stars
                comment: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        // 2. Fetch specific feedback for this action type if available
        // (Assuming context stores action info)

        const learnings: string[] = [];

        if (negativeFeedback.length > 0) {
            learnings.push("Previous user feedback to improve:");
            negativeFeedback.forEach((f: any) => {
                if (f.comment) learnings.push(`- Avoid: ${f.comment}`);
            });
        }

        return learnings;
    }
}
