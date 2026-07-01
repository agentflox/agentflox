import {
    Controller,
    Post,
    Req,
    Res,
    Body,
    HttpException,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ChatService } from '../services/chat/chatService';
import { OpenAIErrorHandler } from '../services/chat/utils/errorHandler';
import { parseFile } from '../services/chat/fileParserService';
import { AuthenticatedRequest, JwtAuthGuard } from '../middleware/httpAuth';
import { prisma } from '@/lib/prisma';

interface UploadedFileType {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    @Post()
    async chat(@Req() req: AuthenticatedRequest, @Res() res: Response, @Body() body: any) {
        try {
            const userId = req.userId!;

            const ip = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || req.ip || 'unknown';

            const { stream, headers } = await ChatService.processChatCompletion(userId, body, ip);

            // Set headers
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Stream the response
            const reader = stream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }

            res.end();
        } catch (error) {
            const errorResponse = OpenAIErrorHandler.handleOpenAIError(error);
            throw new HttpException(errorResponse.error, errorResponse.status);
        }
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
    async upload(
        @Req() req: AuthenticatedRequest,
        @UploadedFile() file: UploadedFileType,
        @Body('conversationId') conversationId: string
    ) {
        try {
            const userId = req.userId!;

            if (!file) {
                throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
            }

            if (!conversationId) {
                throw new HttpException('Conversation ID required', HttpStatus.BAD_REQUEST);
            }

            const conversation = await prisma.aiConversation.findFirst({
                where: { id: conversationId, userId },
                select: { id: true },
            });
            if (!conversation) {
                throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
            }

            const parsedFile = await parseFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                userId,
                conversationId
            );

            return parsedFile;
        } catch (error: any) {
            if (error?.code === 'LIMIT_FILE_SIZE') {
                throw new HttpException('File too large', HttpStatus.BAD_REQUEST);
            }
            console.error('File upload error:', error);
            throw new HttpException(
                error.message || 'Failed to upload file',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
