import { Controller, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { ProposalService } from '@/services/ai/proposal.service';
import { AiTextService } from '@/services/ai/aiText.service';
import { z } from 'zod';

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

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    private proposalService: ProposalService;
    private aiTextService: AiTextService;

    constructor() {
        this.proposalService = new ProposalService();
        this.aiTextService = new AiTextService();
    }

    @Post('proposal/generate')
    async generateProposal(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            // Validate request body
            const schema = z.object({
                taskTitle: z.string().min(1),
                taskDescription: z.string().optional(),
                dueDate: z.string().optional(),
                projectId: z.string().optional()
            });

            const body = schema.parse(req.body);
            const userId = req.userId!;

            // Delegate to service layer
            const result = await this.proposalService.generateProposal(
                {
                    taskTitle: body.taskTitle,
                    taskDescription: body.taskDescription,
                    dueDate: body.dueDate,
                    projectId: body.projectId
                },
                userId
            );

            // Check if result is a token limit error
            if ('error' in result && result.error === 'Insufficient tokens') {
                return res.status(403).json({
                    error: result.error,
                    remaining: result.remaining,
                    required: result.required
                });
            }

            // Return successful response
            return res.json(result);

        } catch (error) {
            console.error('AI Proposal Generation Error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid request', details: error.errors });
            }
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown'
            });
        }
    }

    @Post('text')
    async processText(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const body = aiTextBodySchema.parse(req.body);
            const userId = req.userId!;
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
