import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@agentflox/database/src/generated/prisma';
import { ModelService } from '../ai/model.service';

export interface CommandContext {
    userId: string;
    workspaceId?: string;
    projectId?: string;
    teamId?: string;
    organizationId?: string;
    url?: string;
    userRole?: string;
    permissions?: string[];
}

export interface ParsedCommand {
    type: 'chat' | 'agent' | 'navigation' | 'action' | 'search';
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    requiresContext?: string[];
}

export interface Suggestion {
    id: string;
    type: 'command' | 'agent' | 'workspace' | 'project' | 'team' | 'action' | 'task' | 'material' | 'tool';
    title: string;
    description?: string;
    icon?: string;
    score: number;
    metadata?: any;
    actionable: boolean;
}

export interface CommandExecutionResult {
    success: boolean;
    message: string;
    data?: any;
    followUpActions?: Array<{
        label: string;
        command: string;
        icon?: string;
    }>;
}

@Injectable()
export class CommandService {
    private readonly logger = new Logger(CommandService.name);
    private readonly prisma: PrismaClient;

    constructor(
        private readonly modelService: ModelService,
    ) {
        this.prisma = new PrismaClient();
    }

    /**
     * Parse user input using AI-powered NLP
     */
    async parse(input: string, context: CommandContext): Promise<ParsedCommand> {
        this.logger.log(`Parsing command: "${input}" for user ${context.userId}`);

        // Handle explicit commands first
        if (input.startsWith('/')) {
            return this.parseExplicitCommand(input, context);
        }

        // Use AI for natural language understanding
        return this.parseNaturalLanguage(input, context);
    }

    /**
     * Parse explicit slash commands
     */
    private parseExplicitCommand(input: string, context: CommandContext): ParsedCommand {
        const parts = input.substring(1).trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        const commandMap: Record<string, ParsedCommand> = {
            'chat': {
                type: 'chat',
                intent: 'start_conversation',
                entities: { message: args },
                confidence: 1.0,
            },
            'agent': {
                type: 'agent',
                intent: 'discover_agent',
                entities: { query: args },
                confidence: 1.0,
            },
            'create': {
                type: 'action',
                intent: 'create_entity',
                entities: { entityType: this.detectEntityType(args), description: args },
                confidence: 0.9,
                requiresContext: ['workspaceId'],
            },
            'search': {
                type: 'search',
                intent: 'search_workspace',
                entities: { query: args },
                confidence: 1.0,
                requiresContext: ['workspaceId'],
            },
            'goto': {
                type: 'navigation',
                intent: 'navigate_to',
                entities: { target: args },
                confidence: 0.95,
            },
        };

        return commandMap[command] || {
            type: 'chat',
            intent: 'unknown_command',
            entities: { input },
            confidence: 0.5,
        };
    }

    /**
     * Use AI to parse natural language
     */
    private async parseNaturalLanguage(input: string, context: CommandContext): Promise<ParsedCommand> {
        try {
            const systemPrompt = `You are a command parser for a project management system. Parse the user's natural language input into a structured command.

Available command types:
- chat: General questions or conversations
- agent: Running automated workflows/agents
- navigation: Moving to different parts of the app
- action: Creating, updating, or deleting entities
- search: Finding specific items

Context: ${JSON.stringify(context, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "type": "chat|agent|navigation|action|search",
  "intent": "specific_intent_description",
  "entities": { "key": "value" },
  "confidence": 0.0-1.0
}`;

            const result = await this.modelService.generateText(
                'gpt-4o-mini',
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: input }
                ],
                { temperature: 0.3, max_tokens: 300 }
            );

            const parsed = JSON.parse(result.text.trim());
            return {
                type: parsed.type || 'chat',
                intent: parsed.intent || 'general_query',
                entities: parsed.entities || {},
                confidence: parsed.confidence || 0.7,
            };
        } catch (error) {
            this.logger.error(`Failed to parse natural language: ${error.message}`);
            // Fallback to simple chat
            return {
                type: 'chat',
                intent: 'general_query',
                entities: { message: input },
                confidence: 0.6,
            };
        }
    }

    /**
     * Get intelligent suggestions based on input and context
     */
    async getSuggestions(input: string, context: CommandContext): Promise<Suggestion[]> {
        const suggestions: Suggestion[] = [];

        if (!input || input.length === 0) {
            return this.getDefaultSuggestions(context);
        }

        const query = input.toLowerCase();

        // Command suggestions
        if (input.startsWith('/')) {
            suggestions.push(...this.getCommandSuggestions(query));
        }

        // Workspace entities (parallel queries for performance)
        const [workspaces, projects, teams, tasks, materials, tools] = await Promise.all([
            this.searchWorkspaces(query, context),
            this.searchProjects(query, context),
            this.searchTeams(query, context),
            this.searchTasks(query, context),
            this.searchMaterials(query, context),
            this.searchTools(query, context),
        ]);

        suggestions.push(...workspaces, ...projects, ...teams, ...tasks, ...materials, ...tools);

        // Sort by relevance score
        return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    /**
     * Execute a parsed command
     */
    async execute(input: string, context: CommandContext): Promise<CommandExecutionResult> {
        const parsed = await this.parse(input, context);

        this.logger.log(`Executing command: ${parsed.type} - ${parsed.intent}`);

        // Validate required context
        if (parsed.requiresContext) {
            for (const required of parsed.requiresContext) {
                if (!context[required]) {
                    throw new BadRequestException(`Missing required context: ${required}`);
                }
            }
        }

        switch (parsed.type) {
            case 'chat':
                return this.executeChat(parsed, context);
            case 'agent':
                return this.executeAgent(parsed, context);
            case 'navigation':
                return this.executeNavigation(parsed, context);
            case 'action':
                return this.executeAction(parsed, context);
            case 'search':
                return this.executeSearch(parsed, context);
            default:
                throw new BadRequestException(`Unknown command type: ${parsed.type}`);
        }
    }

    // ==================== Private Helper Methods ====================

    private getDefaultSuggestions(context: CommandContext): Suggestion[] {
        return [
            {
                id: 'cmd-chat',
                type: 'command',
                title: 'Start AI Chat',
                description: 'Ask anything about your workspace',
                icon: 'MessageSquare',
                score: 1.0,
                actionable: true,
            },
            {
                id: 'cmd-agent',
                type: 'command',
                title: 'Run Agent',
                description: 'Execute automated workflows',
                icon: 'Bot',
                score: 0.95,
                actionable: true,
            },
            {
                id: 'cmd-create',
                type: 'command',
                title: 'Create New',
                description: 'Create tasks, projects, or teams',
                icon: 'Plus',
                score: 0.9,
                actionable: true,
            },
        ];
    }

    private getCommandSuggestions(query: string): Suggestion[] {
        const commands = [
            { cmd: '/chat', desc: 'Start AI conversation', icon: 'MessageSquare' },
            { cmd: '/agent', desc: 'Run automated agent', icon: 'Bot' },
            { cmd: '/create', desc: 'Create new entity', icon: 'Plus' },
            { cmd: '/search', desc: 'Search workspace', icon: 'Search' },
            { cmd: '/goto', desc: 'Navigate to location', icon: 'Navigation' },
        ];

        return commands
            .filter(c => c.cmd.startsWith(query))
            .map((c, idx) => ({
                id: `cmd-${c.cmd}`,
                type: 'command' as const,
                title: c.cmd,
                description: c.desc,
                icon: c.icon,
                score: 1.0 - (idx * 0.05),
                actionable: true,
            }));
    }

    private async searchWorkspaces(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2) return [];

        try {
            const workspaces = await this.prisma.workspace.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    isActive: true,
                    isArchived: false,
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true,
                },
            });

            return workspaces.map((ws, idx) => ({
                id: `ws-${ws.id}`,
                type: 'workspace' as const,
                title: ws.name,
                description: ws.description || 'Workspace',
                icon: 'Briefcase',
                score: 0.85 - (idx * 0.05),
                metadata: { workspaceId: ws.id, color: ws.color },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search workspaces: ${error.message}`);
            return [];
        }
    }

    private async searchProjects(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2 || !context.workspaceId) return [];

        try {
            const projects = await this.prisma.project.findMany({
                where: {
                    workspaceId: context.workspaceId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    isArchived: false,
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                },
            });

            return projects.map((proj, idx) => ({
                id: `proj-${proj.id}`,
                type: 'project' as const,
                title: proj.name,
                description: `${proj.status} • ${proj.description || 'Project'}`,
                icon: 'Folder',
                score: 0.8 - (idx * 0.05),
                metadata: { projectId: proj.id },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search projects: ${error.message}`);
            return [];
        }
    }

    private async searchTeams(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2 || !context.workspaceId) return [];

        try {
            const teams = await this.prisma.team.findMany({
                where: {
                    workspaceId: context.workspaceId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                    isActive: true,
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    size: true,
                },
            });

            return teams.map((team, idx) => ({
                id: `team-${team.id}`,
                type: 'team' as const,
                title: team.name,
                description: `${team.size} members • ${team.description}`,
                icon: 'Users',
                score: 0.75 - (idx * 0.05),
                metadata: { teamId: team.id },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search teams: ${error.message}`);
            return [];
        }
    }

    private async searchTasks(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2 || !context.workspaceId) return [];

        try {
            const tasks = await this.prisma.task.findMany({
                where: {
                    workspaceId: context.workspaceId,
                    title: { contains: query, mode: 'insensitive' },
                },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    priority: true,
                    dueDate: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            return tasks.map((task, idx) => ({
                id: `task-${task.id}`,
                type: 'task' as const,
                title: task.title,
                description: `${task.priority} priority${task.dueDate ? ` • Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}`,
                icon: 'CheckSquare',
                score: 0.7 - (idx * 0.05),
                metadata: { taskId: task.id },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search tasks: ${error.message}`);
            return [];
        }
    }

    private async searchMaterials(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2 || !context.workspaceId) return [];

        try {
            const materials = await this.prisma.material.findMany({
                where: {
                    workspaceId: context.workspaceId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                },
            });

            return materials.map((mat, idx) => ({
                id: `mat-${mat.id}`,
                type: 'material' as const,
                title: mat.name,
                description: `${mat.type} • ${mat.description || 'Material'}`,
                icon: 'FileText',
                score: 0.65 - (idx * 0.05),
                metadata: { materialId: mat.id },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search materials: ${error.message}`);
            return [];
        }
    }

    private async searchTools(query: string, context: CommandContext): Promise<Suggestion[]> {
        if (query.length < 2 || !context.workspaceId) return [];

        try {
            const tools = await this.prisma.tool.findMany({
                where: {
                    workspaceId: context.workspaceId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    category: true,
                },
            });

            return tools.map((tool, idx) => ({
                id: `tool-${tool.id}`,
                type: 'tool' as const,
                title: tool.name,
                description: `${tool.category} • ${tool.description || 'Tool'}`,
                icon: 'Wrench',
                score: 0.6 - (idx * 0.05),
                metadata: { toolId: tool.id },
                actionable: true,
            }));
        } catch (error) {
            this.logger.error(`Failed to search tools: ${error.message}`);
            return [];
        }
    }

    private detectEntityType(input: string): string {
        const lower = input.toLowerCase();
        if (lower.includes('task')) return 'task';
        if (lower.includes('project')) return 'project';
        if (lower.includes('team')) return 'team';
        if (lower.includes('material')) return 'material';
        if (lower.includes('tool')) return 'tool';
        return 'task'; // default
    }

    private async executeChat(parsed: ParsedCommand, context: CommandContext): Promise<CommandExecutionResult> {
        const message = parsed.entities.message || '';

        // Use AI to generate response
        const systemPrompt = `You are an AI assistant for a project management platform. Help users with their questions about workspaces, projects, teams, tasks, and more.

User Context:
- Workspace ID: ${context.workspaceId || 'None'}
- Project ID: ${context.projectId || 'None'}
- User Role: ${context.userRole || 'Member'}

Be helpful, concise, and actionable. Suggest specific next steps when appropriate.`;

        const result = await this.modelService.generateText(
            'gpt-4o-mini',
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            { temperature: 0.7, max_tokens: 500 }
        );

        return {
            success: true,
            message: result.text,
            followUpActions: [
                { label: 'Create Task', command: '/create task', icon: 'Plus' },
                { label: 'Search', command: '/search', icon: 'Search' },
            ],
        };
    }

    private async executeAgent(parsed: ParsedCommand, context: CommandContext): Promise<CommandExecutionResult> {
        // TODO: Implement agent execution
        return {
            success: true,
            message: 'Agent execution coming soon',
            data: { agentQuery: parsed.entities.query },
        };
    }

    private async executeNavigation(parsed: ParsedCommand, context: CommandContext): Promise<CommandExecutionResult> {
        return {
            success: true,
            message: `Navigate to: ${parsed.entities.target}`,
            data: { url: `/workspace/${context.workspaceId}/${parsed.entities.target}` },
        };
    }

    private async executeAction(parsed: ParsedCommand, context: CommandContext): Promise<CommandExecutionResult> {
        const { entityType, description } = parsed.entities;

        if (entityType === 'task' && context.workspaceId) {
            const task = await this.prisma.task.create({
                data: {
                    title: description,
                    workspaceId: context.workspaceId,
                    createdBy: context.userId,
                    projectId: context.projectId,
                },
            });

            return {
                success: true,
                message: `Task "${task.title}" created successfully`,
                data: { taskId: task.id },
                followUpActions: [
                    { label: 'View Task', command: `/goto task/${task.id}`, icon: 'Eye' },
                    { label: 'Create Another', command: '/create task', icon: 'Plus' },
                ],
            };
        }

        return {
            success: false,
            message: `Cannot create ${entityType} - insufficient context or permissions`,
        };
    }

    private async executeSearch(parsed: ParsedCommand, context: CommandContext): Promise<CommandExecutionResult> {
        const query = parsed.entities.query;
        const suggestions = await this.getSuggestions(query, context);

        return {
            success: true,
            message: `Found ${suggestions.length} results for "${query}"`,
            data: { results: suggestions },
        };
    }

    async onModuleDestroy() {
        await this.prisma.$disconnect();
    }
}
