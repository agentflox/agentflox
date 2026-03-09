import { Controller, Post, Req, Res, Body, HttpException, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ChatService } from '../services/chat/chatService';
import { OpenAIErrorHandler } from '../services/chat/utils/errorHandler';
import { parseFile } from '../services/chat/fileParserService';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
        name?: string;
    };
}

interface UploadedFileType {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('chat')
export class ChatController {
    @Post()
    async chat(@Req() req: AuthenticatedRequest, @Res() res: Response, @Body() body: any) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
            }

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
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @Req() req: AuthenticatedRequest,
        @UploadedFile() file: UploadedFileType,
        @Body('conversationId') conversationId: string
    ) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
            }

            if (!file) {
                throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
            }

            if (file.size > MAX_FILE_SIZE) {
                throw new HttpException('File too large', HttpStatus.BAD_REQUEST);
            }

            if (!conversationId) {
                throw new HttpException('Conversation ID required', HttpStatus.BAD_REQUEST);
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
            console.error('File upload error:', error);
            throw new HttpException(
                error.message || 'Failed to upload file',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
