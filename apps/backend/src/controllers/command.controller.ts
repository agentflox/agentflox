import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { JwtAuthGuard, AuthenticatedRequest } from '@/middleware/httpAuth';
import { commandRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';
import { CommandService, CommandContext } from '../services/command/command.service';

interface CommandRequest {
    input: string;
    context?: Partial<CommandContext>;
}

@Controller('command')
@UseGuards(JwtAuthGuard)
export class CommandController {
    private readonly logger = new Logger(CommandController.name);

    constructor(private readonly commandService: CommandService) { }

    /**
     * Parse user input into structured command
     * POST /command/parse
     */
    @Post('parse')
    async parse(@Body() body: CommandRequest, @Request() req?: AuthenticatedRequest) {
        try {
            const userId = this.requireUserId(req);
            const rl = await consumeRateLimit(commandRateLimiter, userId, 'command:parse');
            if (!rl.allowed) {
                throw new HttpException(rl.error ?? 'Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
            }
            const context = this.buildContext(body.context, req);

            if (!body.input || body.input.trim().length === 0) {
                throw new HttpException('Input cannot be empty', HttpStatus.BAD_REQUEST);
            }

            const result = await this.commandService.parse(body.input, context);

            this.logger.log(`Parsed command for user ${context.userId}: ${result.type}`);

            return {
                success: true,
                data: result,
            };
        } catch (error: any) {
            this.logger.error(`Parse error: ${error.message}`, error.stack);
            throw new HttpException(
                error.message || 'Failed to parse command',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get intelligent suggestions based on input
     * POST /command/suggest
     */
    @Post('suggest')
    async suggest(@Body() body: CommandRequest, @Request() req?: AuthenticatedRequest) {
        try {
            const userId = this.requireUserId(req);
            const rl = await consumeRateLimit(commandRateLimiter, userId, 'command:suggest');
            if (!rl.allowed) {
                throw new HttpException(rl.error ?? 'Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
            }
            const context = this.buildContext(body.context, req);

            const suggestions = await this.commandService.getSuggestions(
                body.input || '',
                context,
            );

            return {
                success: true,
                data: suggestions,
                meta: {
                    count: suggestions.length,
                    query: body.input,
                },
            };
        } catch (error: any) {
            this.logger.error(`Suggest error: ${error.message}`, error.stack);
            throw new HttpException(
                error.message || 'Failed to get suggestions',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Execute a command
     * POST /command/execute
     */
    @Post('execute')
    async execute(@Body() body: CommandRequest, @Request() req?: AuthenticatedRequest) {
        try {
            const userId = this.requireUserId(req);
            const rl = await consumeRateLimit(commandRateLimiter, userId, 'command:execute');
            if (!rl.allowed) {
                throw new HttpException(rl.error ?? 'Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
            }
            const context = this.buildContext(body.context, req);

            if (!body.input || body.input.trim().length === 0) {
                throw new HttpException('Input cannot be empty', HttpStatus.BAD_REQUEST);
            }

            const result = await this.commandService.execute(body.input, context);

            this.logger.log(`Executed command for user ${context.userId}: ${body.input}`);

            return {
                success: result.success,
                message: result.message,
                data: result.data,
                followUpActions: result.followUpActions,
            };
        } catch (error: any) {
            this.logger.error(`Execute error: ${error.message}`, error.stack);
            throw new HttpException(
                error.message || 'Failed to execute command',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Build command context from request
     */
    private buildContext(
        providedContext?: Partial<CommandContext>,
        req?: AuthenticatedRequest,
    ): CommandContext {
        return {
            userId: this.requireUserId(req),
            workspaceId: providedContext?.workspaceId,
            projectId: providedContext?.projectId,
            teamId: providedContext?.teamId,
            organizationId: providedContext?.organizationId,
            url: providedContext?.url,
            userRole: providedContext?.userRole,
            permissions: Array.isArray(providedContext?.permissions) ? providedContext.permissions : [],
        };
    }

    private requireUserId(req?: AuthenticatedRequest): string {
        if (!req?.userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        return req.userId;
    }
}
