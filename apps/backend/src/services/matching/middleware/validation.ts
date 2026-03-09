import { z } from 'zod';

// Constants
export const MAX_EMBEDDING_TEXT_LENGTH = 8000;
export const ALLOWED_TABLES = ['projects', 'proposals', 'teams', 'users', 'member_profiles'] as const;
export const ALLOWED_ENTITY_TYPES = ['project', 'proposal', 'team', 'user', 'member_profile'] as const;
export const ALLOWED_MATCH_TYPES = ['project', 'proposal', 'team', 'profile'] as const;

// Embedding request validation
export const embeddingRequestSchema = z.object({
    text: z.string()
        .min(1, 'Text cannot be empty')
        .max(MAX_EMBEDDING_TEXT_LENGTH, `Text exceeds ${MAX_EMBEDDING_TEXT_LENGTH} characters`),
    entityType: z.enum(ALLOWED_ENTITY_TYPES).optional(),
    entityId: z.string().uuid().optional(),
});

// Match request validation
export const matchRequestSchema = z.object({
    entityId: z.string().uuid('Invalid entity ID format'),
    entityType: z.enum(ALLOWED_MATCH_TYPES),
    limit: z.number().int().min(1).max(100).default(20),
    threshold: z.number().min(0).max(1).default(0.85),
    useCache: z.boolean().optional().default(true),
});

// Batch processing request validation
export const batchProcessRequestSchema = z.object({
    entityType: z.enum(ALLOWED_MATCH_TYPES).optional(),
    batchSize: z.number().int().min(10).max(500).optional(),
    threshold: z.number().min(0).max(1).optional(),
});

/**
 * Validate table name against allowlist to prevent SQL injection
 */
export function validateTable(tableName: string): void {
    if (!ALLOWED_TABLES.includes(tableName as any)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }
}

/**
 * Validate column name (alphanumeric, underscore, dot only)
 */
export function validateColumnName(columnName: string): void {
    if (!/^[a-zA-Z0-9_.]+$/.test(columnName)) {
        throw new Error(`Invalid column name: ${columnName}`);
    }
}

/**
 * Sanitize array parameters
 */
export function sanitizeArray(arr: any[]): string[] {
    return arr
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())
        .slice(0, 100); // Limit array size
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
