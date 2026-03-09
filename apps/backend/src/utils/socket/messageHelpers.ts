/**
 * Format message payload for consistent response structure
 */
export function formatMessagePayload(message: any, replyTo?: any) {
    return {
        id: message.id,
        messageId: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        fromUserId: message.sender_id,
        toUserId: message.receiver_id,
        content: message.content,
        attachments: message.attachments || [],
        isRead: message.is_read,
        createdAt: message.created_at,
        replyTo: replyTo ? {
            id: replyTo.id,
            content: replyTo.content,
            senderId: replyTo.senderId,
        } : null,
        reactions: message.reactions || [],
    };
}

/**
 * Update message delivery status
 */
export async function updateDeliveryStatus(
    messageId: string,
    status: 'SENT' | 'DELIVERED' | 'READ'
) {
    // This would be implemented with a proper delivery tracking table
    // For now, just log it
    console.log(`📊 Message ${messageId} status: ${status}`);
}
