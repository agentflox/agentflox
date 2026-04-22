import { Controller, Post, Req, Body, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { SupportService } from '../services/support/support.service';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
        name?: string;
    };
}

@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) {}

    @Post('initialize')
    async initialize(@Req() req: AuthenticatedRequest, @Body() body: { title?: string }) {
        const userId = req.user?.id;
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return this.supportService.initializeSupportAssistant(userId, body.title);
    }

    @Post('message')
    async message(
        @Req() req: AuthenticatedRequest, 
        @Body() body: { conversationId: string; message: string }
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        if (!body.conversationId || !body.message) {
            throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
        }

        return this.supportService.sendMessageToSupportAssistant(
            userId, 
            body.conversationId, 
            body.message
        );
    }
}
