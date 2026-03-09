import { z } from 'zod';

/**
 * Validation schemas for socket events
 */

export const MessageCreateSchema = z.object({
    id: z.string().uuid('Invalid message ID format'),
    toUserId: z.string().uuid('Invalid recipient ID format'),
    content: z.string().max(10000, 'Message content too long (max 10000 chars)').optional(),
    attachments: z.array(z.string().url('Invalid attachment URL')).max(10, 'Too many attachments (max 10)').optional(),
    replyTo: z.object({
        id: z.string().uuid(),
        content: z.string().optional(),
        senderId: z.string().uuid().optional(),
    }).optional(),
}).refine(
    (data) => data.content?.trim() || data.attachments?.length,
    { message: 'Message must have content or attachments' }
);

export const MessageReactSchema = z.object({
    messageId: z.string().uuid('Invalid message ID'),
    emoji: z.string().min(1).max(10, 'Invalid emoji'),
});

export const MessageReadSchema = z.object({
    fromUserId: z.string().uuid('Invalid user ID'),
});

export const ChannelMessageCreateSchema = z.object({
    id: z.string().uuid('Invalid message ID'),
    channelId: z.string().uuid('Invalid channel ID'),
    content: z.string().max(10000).optional(),
    attachments: z.array(z.any()).max(10).optional(),
    replyTo: z.object({
        id: z.string().uuid(),
        content: z.string().optional(),
        userId: z.string().uuid().optional(),
    }).optional(),
}).refine(
    (data) => data.content?.trim() || data.attachments?.length,
    { message: 'Message must have content or attachments' }
);

export const ChannelJoinSchema = z.object({
    channelId: z.string().uuid('Invalid channel ID'),
});

export const ChannelReadSchema = z.object({
    channelId: z.string().uuid('Invalid channel ID'),
});

export const TypingDataSchema = z.object({
    postId: z.string().uuid().optional(),
    commentId: z.string().uuid().optional(),
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
