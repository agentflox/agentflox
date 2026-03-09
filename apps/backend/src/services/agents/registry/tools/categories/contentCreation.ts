import { ToolDefinition } from '../core/ToolRegistryManager';

export const CONTENT_CREATION_TOOLS: ToolDefinition[] = [
    {
        name: 'generateBlogPost',
        description: 'Generate a comprehensive blog post on a specific topic',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'generateBlogPost',
            description: 'Generate a blog post',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'Main topic or title of the blog post' },
                    keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to include' },
                    tone: { type: 'string', description: 'Tone of the post (e.g., professional, casual, informative)' },
                    targetAudience: { type: 'string', description: 'Target audience for the post' },
                    wordCount: { type: 'number', description: 'Approximate word count' },
                },
                required: ['topic'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { topic: 'The Future of AI', tone: 'Inspirational' },
                output: { title: 'The Future of AI', content: '...' },
                description: 'Generate a blog post about AI',
            },
        ],
    },
    {
        name: 'writeScript',
        description: 'Write a script for a video, podcast, or presentation',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'writeScript',
            description: 'Write a script',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'Topic or title of the script' },
                    format: { type: 'string', enum: ['VIDEO', 'PODCAST', 'PRESENTATION'], description: 'Format of the script' },
                    duration: { type: 'string', description: 'Target duration (e.g., "5 minutes")' },
                    keyPoints: { type: 'array', items: { type: 'string' }, description: 'Key points to cover' },
                },
                required: ['topic', 'format'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'createDocumentation',
        description: 'Create technical documentation, user guides, or API references',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'createDocumentation',
            description: 'Create documentation',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string', description: 'Subject of the documentation' },
                    type: { type: 'string', enum: ['USER_GUIDE', 'API_REFERENCE', 'TECHNICAL_SPEC', 'README'], description: 'Type of documentation' },
                    details: { type: 'string', description: 'Detailed information or code to document' },
                },
                required: ['subject', 'type', 'details'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
];
