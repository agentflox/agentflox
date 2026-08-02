import { z } from 'zod';

/**
 * Validation schemas for socket events
 */

const AppIdSchema = z
    .string()
    .trim()
    .min(1, 'Invalid ID format')
    .max(191, 'Invalid ID format');

export const MessageCreateSchema = z.object({
    id: AppIdSchema,
    toUserId: AppIdSchema,
    content: z.string().max(10000, 'Message content too long (max 10000 chars)').optional(),
    attachments: z.array(z.string().url('Invalid attachment URL')).max(10, 'Too many attachments (max 10)').optional(),
    replyTo: z.object({
        id: AppIdSchema,
        content: z.string().optional(),
        senderId: AppIdSchema.optional(),
    }).optional(),
    type: z.string().optional(),
    marketplaceListingId: z.string().optional(),
}).refine(
    (data) => data.content?.trim() || data.attachments?.length,
    { message: 'Message must have content or attachments' }
);

export const MessageReactSchema = z.object({
    messageId: AppIdSchema,
    emoji: z.string().min(1).max(10, 'Invalid emoji'),
});

export const MessageReadSchema = z.object({
    fromUserId: AppIdSchema,
});

export const ChannelMessageCreateSchema = z.object({
    id: AppIdSchema,
    channelId: AppIdSchema,
    content: z.string().max(10000).optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    attachments: z.array(z.any()).max(10).optional(),
    replyTo: z.object({
        id: AppIdSchema,
        content: z.string().optional(),
        userId: AppIdSchema.optional(),
    }).optional(),
}).refine(
    (data) => data.content?.trim() || data.attachments?.length,
    { message: 'Message must have content or attachments' }
);

export const ChannelJoinSchema = z.object({
    channelId: AppIdSchema,
});

export const ChannelReadSchema = z.object({
    channelId: AppIdSchema,
});

export const TypingDataSchema = z.object({
    postId: AppIdSchema.optional(),
    commentId: AppIdSchema.optional(),
}).refine(
    (data) => data.postId || data.commentId,
    { message: 'Either postId or commentId must be provided' }
);

// Type exports
export type MessageCreateData = z.infer<typeof MessageCreateSchema>;
export type MessageReactData = z.infer<typeof MessageReactSchema>;
export type MessageReadData = z.infer<typeof MessageReadSchema>;
export type ChannelMessageCreateData = z.infer<typeof ChannelMessageCreateSchema>;
export type ChannelJoinData = z.infer<typeof ChannelJoinSchema>;
export type ChannelReadData = z.infer<typeof ChannelReadSchema>;
export type TypingData = z.infer<typeof TypingDataSchema>;
