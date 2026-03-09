import { ToolDefinition } from '../core/ToolRegistryManager';

export const CODE_OPERATION_TOOLS: ToolDefinition[] = [
    {
        name: 'writeCode',
        description: 'Generate or modify code based on requirements',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'writeCode',
            description: 'Write code',
            parameters: {
                type: 'object',
                properties: {
                    language: { type: 'string', description: 'Programming language' },
                    description: { type: 'string', description: 'Description of what the code should do' },
                    existingCode: { type: 'string', description: 'Existing code to modify (optional)' },
                    filePath: { type: 'string', description: 'Target file path (optional)' },
                },
                required: ['language', 'description'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'reviewCode',
        description: 'Review code for best practices, bugs, and security issues',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'reviewCode',
            description: 'Review code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code to review' },
                    language: { type: 'string', description: 'Programming language' },
                    context: { type: 'string', description: 'Additional context about the code' },
                },
                required: ['code'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'refactorCode',
        description: 'Refactor code to improve structure, readability, or performance',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'refactorCode',
            description: 'Refactor code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code to refactor' },
                    language: { type: 'string', description: 'Programming language' },
                    goal: { type: 'string', description: 'Goal of the refactoring (e.g., "improve performance", "clean up")' },
                },
                required: ['code', 'goal'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'debugCode',
        description: 'Analyze code and error logs to identify and fix bugs',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'debugCode',
            description: 'Debug code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code with issues' },
                    error: { type: 'string', description: 'Error message or log' },
                    language: { type: 'string', description: 'Programming language' },
                },
                required: ['code', 'error'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
];
