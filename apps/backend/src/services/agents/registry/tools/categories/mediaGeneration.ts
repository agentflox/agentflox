import { ToolDefinition } from '../core/ToolRegistryManager';

export const MEDIA_GENERATION_TOOLS: ToolDefinition[] = [
    {
        name: 'generateImage',
        description: 'Create images using AI models, with options for style and aspect ratio',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'generateImage',
            description: 'Generate image using AI with configurable style and aspect ratio',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Detailed text description of the image to generate' },
                    style: {
                        type: 'string',
                        enum: ['photorealistic', 'cartoon', 'anime', 'oil-painting', 'watercolor', 'sketch', 'digital-art', '3d-render', 'cinematic', 'abstract'],
                        description: 'Visual style of the generated image',
                    },
                    aspectRatio: {
                        type: 'string',
                        enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
                        description: 'Aspect ratio of the generated image (default: 1:1)',
                    },
                    size: { type: 'string', enum: ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'], description: 'Pixel dimensions of the image' },
                    negativePrompt: { type: 'string', description: 'Elements to exclude from the image' },
                    numberOfImages: { type: 'number', description: 'Number of images to generate (default: 1, max: 4)' },
                    quality: { type: 'string', enum: ['standard', 'hd'], description: 'Quality level of the generated image (default: standard)' },
                },
                required: ['prompt'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { prompt: 'A futuristic city at sunset', style: 'cinematic', aspectRatio: '16:9' },
                output: { images: [{ url: 'https://...', width: 1792, height: 1024 }], model: 'dall-e-3' },
                description: 'Generate a cinematic wide-angle cityscape',
            },
        ],
    },
    {
        name: 'textToSpeech',
        description: 'Convert text to speech using AI to create audio outputs',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'textToSpeech',
            description: 'Convert text to speech audio using AI voices',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text content to convert to speech (max 4096 characters)' },
                    voice: {
                        type: 'string',
                        enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                        description: 'AI voice to use for speech synthesis (default: alloy)',
                    },
                    speed: { type: 'number', description: 'Speaking speed multiplier between 0.25 and 4.0 (default: 1.0)' },
                    format: {
                        type: 'string',
                        enum: ['mp3', 'opus', 'aac', 'flac', 'wav'],
                        description: 'Output audio format (default: mp3)',
                    },
                    language: { type: 'string', description: 'Language/locale hint for pronunciation (e.g., "en-US", "fr-FR")' },
                    instructions: { type: 'string', description: 'Additional instructions for tone or speaking style (e.g., "speak slowly and clearly")' },
                },
                required: ['text'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { text: 'Welcome to Agentflox! Your AI-powered workspace.', voice: 'nova', format: 'mp3', speed: 1.0 },
                output: { audioUrl: 'https://...', format: 'mp3', durationSeconds: 4.2, sizeBytes: 33600 },
                description: 'Convert a welcome message to speech using the nova voice',
            },
        ],
    },
    {
        name: 'generateVideo',
        description: 'Generate a short video based on a text prompt',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'generateVideo',
            description: 'Generate video',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Text description of the video' },
                    duration: { type: 'number', description: 'Duration in seconds' },
                },
                required: ['prompt'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 120,
        examples: [],
    },
];
