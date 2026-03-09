import { SkillDefinition } from '../core/SkillRegistryManager';

/**
 * Built-in skills that group related tools for agent capabilities
 * and define native mappings directly in the definition via the `tools` array
 */
export const BUILT_IN_SKILLS: SkillDefinition[] = [
    // === CREATIVE SKILLS ===
    {
        name: 'content_creation',
        displayName: 'Content Creation',
        description: 'Create blog posts, articles, scripts, and documentation',
        category: 'creative',
        icon: '✍️',
        isBuiltIn: true,
        tools: [
            'generateBlogPost',
            'writeScript',
            'createDocumentation'
        ]
    },
    {
        name: 'media_generation',
        displayName: 'Media Generation',
        description: 'Generate images, videos, audio, and presentations',
        category: 'creative',
        icon: '🎨',
        isBuiltIn: true,
        tools: [
            'generateImage',
            'textToSpeech', // from MEDIA_GENERATION_TOOLS
            'generateVideo'
        ]
    },

    // === TECHNICAL SKILLS ===
    {
        name: 'code_operations',
        displayName: 'Code Operations',
        description: 'Write, review, refactor, and debug code',
        category: 'technical',
        icon: '💻',
        isBuiltIn: true,
        tools: [
            'writeCode',
            'reviewCode',
            'refactorCode',
            'debugCode'
        ]
    },
    {
        name: 'file_operations',
        displayName: 'File Operations',
        description: 'Read, write, and manage files and directories',
        category: 'technical',
        icon: '📁',
        isBuiltIn: true,
        tools: [
            'readFile',
            'writeFile',
            'listFiles',
            'convertFile' // from FILE_OPERATION_TOOLS
        ]
    },

    // === AUTOMATION SKILLS ===
    {
        name: 'browser_automation',
        displayName: 'Browser Automation',
        description: 'Navigate websites, interact with elements, extract data',
        category: 'automation',
        icon: '🌐',
        isBuiltIn: true,
        tools: [
            'navigateToUrl',
            'clickElement',
            'scrapeData',
            'scrapeWebPage', // from BROWSER_AUTOMATION_TOOLS
            'crawlWebsite'  // from BROWSER_AUTOMATION_TOOLS
        ]
    },
    {
        name: 'api_integration',
        displayName: 'API Integration',
        description: 'Call external APIs and integrate with third-party services',
        category: 'automation',
        icon: '🔌',
        isBuiltIn: true,
        tools: [] // Not yet implemented
    },

    // === BUSINESS SKILLS ===
    {
        name: 'task_management',
        displayName: 'Task Management',
        description: 'Create, update, and manage tasks and projects',
        category: 'business',
        icon: '✅',
        isBuiltIn: true,
        tools: [
            // From TASK_MANAGEMENT_TOOLS mappings in syncSkillsToDatabase.ts
            'createTask',
            'updateTask',
            // 'deleteTask',  (Not defined in tools)
            'retrieveTaskList', // (maps to listTasks conceptually, using actual tool names)
            // 'getTask', (Not defined in tools)
            // 'assignTask', (Not defined in tools)

            // Search tools (available to all)
            'searchProjects',
            'searchTasks', // (Not defined? wait, `findTasks` was created in marketplace, let's include it or remove)

            // Project Management tools
            'createProject',
            'updateProject',

            // Team Management tools
            'createTeam',
            'updateTeam'
        ]
    },
];
