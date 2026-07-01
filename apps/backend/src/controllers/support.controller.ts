import { Controller, Post, Req, Res, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { SupportService } from '../services/support/support.service';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { supportRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';

@Controller('v1/support')
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(private readonly supportService: SupportService) {}

    @Post('initialize')
    async initialize(@Req() req: AuthenticatedRequest, @Body() body: { title?: string }) {
        const userId = req.userId;
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        return this.supportService.initializeSupportAssistant(userId, body.title);
    }

    @Post('message')
    async message(
        @Req() req: AuthenticatedRequest,
        @Body() body: { conversationId: string; message: string },
    ) {
        const userId = req.userId;
        if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        if (!body.conversationId || !body.message) {
            throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
        }

        const rl = await consumeRateLimit(supportRateLimiter, userId, 'support:message');
        if (!rl.allowed) {
            throw new HttpException(`Rate limit exceeded. Try again in ${rl.retryAfter}s`, HttpStatus.TOO_MANY_REQUESTS);
        }

        return this.supportService.sendMessageToSupportAssistant(userId, body.conversationId, body.message);
    }

    /**
     * POST /v1/support/message-stream
     * Streams assistant tokens as SSE for the support chat modal.
     */
    @Post('message-stream')
    async messageStream(
        @Req() req: AuthenticatedRequest,
        @Res() res: ExpressResponse,
        @Body() body: { conversationId: string; message: string },
    ) {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!body.conversationId || !body.message) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const rl = await consumeRateLimit(supportRateLimiter, userId, 'support:message-stream');
        if (!rl.allowed) {
            res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
            return;
        }

        await this.supportService.streamMessageToSupportAssistant(
            userId,
            body.conversationId,
            body.message,
            res,
        );
    }
}
