import { ToolDefinition } from '../core/ToolRegistryManager';

export const PROFILE_MANAGEMENT_TOOLS: ToolDefinition[] = [
    {
        name: 'updateProfile',
        description: 'Update user profile information',
        category: 'USER_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'updateProfile',
            description: 'Update profile',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'User ID (default: current user)' },
                    name: { type: 'string', description: 'Updated name' },
                    bio: { type: 'string', description: 'Updated bio (max 1000 characters)' },
                    avatar: { type: 'string', description: 'Updated avatar URL' },
                    location: { type: 'string', description: 'Updated location' },
                    website: { type: 'string', description: 'Updated website URL' },
                    skills: { type: 'array', items: { type: 'string' }, description: 'Updated array of skills' },
                    socialLinks: { type: 'object', description: 'Updated social media links' },
                    preferences: { type: 'object', description: 'Updated user preferences' },
                },
                required: [],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 20,
        examples: [],
    },
    {
        name: 'publishProfileToMarketplace',
        description: 'Publish user profile to marketplace for talent discovery',
        category: 'USER_MANAGEMENT',
        isDefault: false,
        functionSchema: {
            name: 'publishProfileToMarketplace',
            description: 'Publish profile to marketplace',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'User ID (default: current user)' },
                    marketplaceVisibility: { type: 'string', enum: ['PUBLIC', 'LIMITED'], description: 'Marketplace visibility (default: PUBLIC)' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Marketplace tags for discovery' },
                    availability: { type: 'string', enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'], description: 'Availability status' },
                },
                required: [],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 5,
        examples: [],
    },
];
