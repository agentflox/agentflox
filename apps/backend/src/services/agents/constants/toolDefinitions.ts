/**
 * Tool Definitions - Externalized Constants
 * 
 * All tool definitions for the agent system.
 * Separated from business logic for better maintainability.
 */

import type { Tool } from '../types/types';

// Tool definition type (without id - id is auto-generated in database)
export type ToolDefinition = Omit<Tool, 'id'>;

// Default Tools
export const DEFAULT_TOOLS: ToolDefinition[] = [
    {
        name: 'createSchedule',
        description: 'Create a scheduled task or automation that runs at specified intervals or times',
        category: 'TASK_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'createSchedule',
            description: 'Create a scheduled task or automation',
            parameters: {
                type: 'object',
                properties: {
                    workspaceId: { type: 'string', description: 'Workspace ID where schedule will be created' },
                    name: { type: 'string', description: 'Name of the schedule' },
                    description: { type: 'string', description: 'Description of what the schedule does' },
                    cronExpression: { type: 'string', description: 'Cron expression defining schedule (e.g., "0 9 * * *" for daily at 9 AM)' },
                    timezone: { type: 'string', description: 'Timezone for schedule (default: UTC)' },
                    enabled: { type: 'boolean', description: 'Whether schedule is enabled (default: true)' },
                    action: {
                        type: 'object',
                        description: 'Action to execute when schedule triggers',
                        properties: {
                            type: { type: 'string', description: 'Action type (e.g., "CREATE_TASK", "SEND_NOTIFICATION")' },
                            parameters: { type: 'object', description: 'Action-specific parameters' },
                        },
                    },
                },
                required: ['workspaceId', 'name', 'cronExpression', 'action'],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 10,
        examples: [
            {
                input: {
                    workspaceId: 'ws_123',
                    name: 'Daily Standup Reminder',
                    cronExpression: '0 9 * * 1-5',
                    timezone: 'America/New_York',
                    action: { type: 'SEND_NOTIFICATION', parameters: { channel: 'general', message: 'Time for daily standup!' } },
                },
                output: { id: 'schedule_456', workspaceId: 'ws_123', name: 'Daily Standup Reminder' },
                description: 'Create a daily standup reminder schedule',
            },
        ],
    },
    {
        name: 'retrieveTaskList',
        description: 'Retrieve a list of tasks with optional filtering and pagination',
        category: 'TASK_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'retrieveTaskList',
            description: 'Retrieve task list',
            parameters: {
                type: 'object',
                properties: {
                    workspaceId: { type: 'string', description: 'Workspace ID filter' },
                    spaceId: { type: 'string', description: 'Space ID filter' },
                    projectId: { type: 'string', description: 'Project ID filter' },
                    teamId: { type: 'string', description: 'Team ID filter' },
                    listId: { type: 'string', description: 'List ID filter' },
                    assigneeId: { type: 'string', description: 'Assignee user ID filter' },
                    status: { type: 'array', items: { type: 'string' }, description: 'Array of status values to filter by' },
                    query: { type: 'string', description: 'Search query for task title/description' },
                    page: { type: 'number', description: 'Page number (default: 1)' },
                    pageSize: { type: 'number', description: 'Items per page (default: 12, max: 50)' },
                    scope: { type: 'string', enum: ['owned', 'assigned', 'all'], description: 'Scope filter (default: owned)' },
                    includeRelations: { type: 'boolean', description: 'Include related data (default: false)' },
                },
                required: [],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 60,
        examples: [
            {
                input: {
                    workspaceId: 'ws_123',
                    projectId: 'proj_456',
                    status: ['TODO', 'IN_PROGRESS'],
                    page: 1,
                    pageSize: 20,
                },
                output: { items: [], total: 0, page: 1, pageSize: 20 },
                description: 'Retrieve tasks in a project',
            },
        ],
    },
];

// NOTE: This is a minimal example. You should move ALL tool definitions here
// from toolRegistry.ts to keep the registry file clean and focused on logic.

/**
 * Get all tool definitions organized by category
 */
export function getAllToolDefinitions(): {
    default: ToolDefinition[];
    search: ToolDefinition[];
    taskManagement: ToolDefinition[];
    projectManagement: ToolDefinition[];
    teamManagement: ToolDefinition[];
    profileManagement: ToolDefinition[];
    proposalManagement: ToolDefinition[];
    marketplace: ToolDefinition[];
} {
    // TODO: Import and organize all tool constant arrays here
    return {
        default: DEFAULT_TOOLS,
        search: [],
        taskManagement: [],
        projectManagement: [],
        teamManagement: [],
        profileManagement: [],
        proposalManagement: [],
        marketplace: [],
    };
}
