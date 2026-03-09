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
import { CommandService, CommandContext } from '../services/command/command.service';

// Assuming you have an auth guard - adjust path as needed
// import { AuthGuard } from '../guards/auth.guard';

interface CommandRequest {
    input: string;
    context?: Partial<CommandContext>;
}

@Controller('command')
// @UseGuards(AuthGuard) // Uncomment when auth guard is available
export class CommandController {
    private readonly logger = new Logger(CommandController.name);

    constructor(private readonly commandService: CommandService) { }

    /**
     * Parse user input into structured command
     * POST /command/parse
     */
    @Post('parse')
    async parse(@Body() body: CommandRequest, @Request() req?: any) {
        try {
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
        } catch (error) {
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
    async suggest(@Body() body: CommandRequest, @Request() req?: any) {
        try {
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
        } catch (error) {
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
    async execute(@Body() body: CommandRequest, @Request() req?: any) {
        try {
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
        } catch (error) {
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
        req?: any,
    ): CommandContext {
        // Extract user from request (adjust based on your auth implementation)
        const userId = req?.user?.id || providedContext?.userId || 'anonymous';

        return {
            userId,
            workspaceId: providedContext?.workspaceId,
            projectId: providedContext?.projectId,
            teamId: providedContext?.teamId,
            organizationId: providedContext?.organizationId,
            url: providedContext?.url,
            userRole: providedContext?.userRole || req?.user?.role,
            permissions: providedContext?.permissions || req?.user?.permissions || [],
        };
    }
}
