import { z } from 'zod';

/**
 * Collaboration schemas for realtime document editing with Yjs
 */

export const CollaborationJoinSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    documentType: z.enum(['task', 'project', 'space', 'comment', 'doc']),
});

export const CollaborationUpdateSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    update: z.instanceof(Uint8Array).or(z.string()), // Yjs update as base64 string or Uint8Array
    origin: z.string().optional(), // Client ID for awareness
});

export const CollaborationSyncRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    stateVector: z.instanceof(Uint8Array).or(z.string()).optional(), // Client's state vector
});

export const CollaborationAwarenessSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    awareness: z.record(z.any()), // Awareness state (cursor position, selection, user info)
});

export const CollaborationHistorySchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().min(0).default(0),
});

// Type exports
export type CollaborationJoinData = z.infer<typeof CollaborationJoinSchema>;
export type CollaborationUpdateData = z.infer<typeof CollaborationUpdateSchema>;
export type CollaborationSyncRequestData = z.infer<typeof CollaborationSyncRequestSchema>;
export type CollaborationAwarenessData = z.infer<typeof CollaborationAwarenessSchema>;
export type CollaborationHistoryData = z.infer<typeof CollaborationHistorySchema>;
