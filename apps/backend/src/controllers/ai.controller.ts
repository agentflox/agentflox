import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { ListingService } from '@/services/ai/listing.service';
import { AiTextService } from '@/services/ai/aiText.service';
import { z } from 'zod';
import { aiFeaturesRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';

const aiTextBodySchema = z.object({
    text: z.string().min(1),
    operation: z.string().optional(),
    userInstruction: z.string().optional(),
    tone: z.string().optional(),
    creativity: z.enum(['low', 'medium', 'high']).optional(),
    contextIds: z
        .array(
            z.object({
                type: z.enum(['list', 'project', 'space']),
                id: z.string(),
            })
        )
        .optional(),
});

const listingEntityTypes = ['task', 'project', 'agent', 'tool', 'template', 'team', 'talent', 'workforce'] as const;

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    private listingService: ListingService;
    private aiTextService: AiTextService;

    constructor() {
        this.listingService = new ListingService();
        this.aiTextService = new AiTextService();
    }

    /**
     * Entity-aware marketplace listing generation.
     * Accepts any entityType (task | project | agent | tool | template | team | talent)
     * and returns contextually appropriate marketplace copy fields.
     *
     * Assets (agent, tool, template) → returns useCases + intendedUsers
     * Opportunities (task, project, team, talent) → returns niceToHaveSkills + experience + dueDate
     */
    @Post('listing/generate')
    async generateListing(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const schema = z.object({
                entityType: z.enum(listingEntityTypes),
                entityId: z.string().optional(),
                title: z.string().optional(),
                description: z.string().optional(),
                dueDate: z.string().optional(),
            });

            const body = schema.parse(req.body);
            const userId = req.userId!;

            const rl = await consumeRateLimit(aiFeaturesRateLimiter, userId, 'ai:listing:generate');
            if (!rl.allowed) {
                return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
            }

            const result = await this.listingService.generate(
                {
                    entityType: body.entityType,
                    entityId: body.entityId,
                    title: body.title,
                    description: body.description,
                    dueDate: body.dueDate,
                },
                userId
            );

            if ('error' in result && result.error === 'Insufficient tokens') {
                return res.status(403).json({
                    error: result.error,
                    remaining: result.remaining,
                    required: result.required,
                });
            }

            return res.json(result);

        } catch (error) {
            console.error('AI Listing Generation Error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid request', details: error.errors });
            }
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }

    @Post('text')
    async processText(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const body = aiTextBodySchema.parse(req.body);
            const userId = req.userId!;

            const rl = await consumeRateLimit(aiFeaturesRateLimiter, userId, 'ai:text');
            if (!rl.allowed) {
                return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
            }
            const result = await this.aiTextService.processText(userId, {
                text: body.text,
                operation: body.operation ?? 'enhance',
                userInstruction: body.userInstruction,
                tone: body.tone,
                creativity: body.creativity,
                contextIds: body.contextIds,
            });

            if ('error' in result && result.error === 'Insufficient tokens') {
                return res.status(403).json({
                    error: result.error,
                    remaining: result.remaining,
                    required: result.required,
                });
            }

            return res.json(result);
        } catch (error) {
            console.error('AI text error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid request', details: error.errors });
            }
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }
}
