import { Queue, Worker, Job } from 'bullmq';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { PresenceService } from '@/services/socket/presenceService';
import { executeDbOperation } from '@/lib/circuitBreaker';

/**
 * Message Delivery Queue Service
 * Provides guaranteed delivery with retries for offline users
 */

interface MessageDeliveryJobData {
    messageId: string;
    recipientId: string;
    senderId: string;
    priority?: number;
}

const DELIVERY_JOB_NAME = 'deliver' as const;

// Create delivery queue
export const messageDeliveryQueue = new Queue<MessageDeliveryJobData, any, typeof DELIVERY_JOB_NAME>('message-delivery', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 5, // Retry up to 5 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s, doubles each time
        },
        removeOnComplete: {
            count: 1000, // Keep last 1000 successful jobs
            age: 24 * 3600, // Remove after 24h
        },
        removeOnFail: {
            count: 5000, // Keep last 5000 failed jobs for debugging
            age: 7 * 24 * 3600, // Remove after 7 days
        },
    },
});

/**
 * Enqueue message for delivery
 */
export async function enqueueMessageDelivery(
    messageId: string,
    recipientId: string,
    senderId: string,
    priority: number = 1
): Promise<void> {
    await messageDeliveryQueue.add(
        DELIVERY_JOB_NAME,
        {
            messageId,
            recipientId,
            senderId,
            priority,
        },
        {
            jobId: messageId, // Deduplicate by messageId
            priority: priority,
        }
    );
}

/**
 * Delivery Worker - Attempts to deliver messages
 * This should be started in a separate worker process or alongside the main server
 */
export function startMessageDeliveryWorker(io: any) {
    const worker = new Worker<MessageDeliveryJobData>(
        'message-delivery',
        async (job: Job<MessageDeliveryJobData>) => {
            const { messageId, recipientId, senderId } = job.data;

            console.log(`[DeliveryWorker] Attempting delivery: ${messageId} to ${recipientId}`);

            // Check if user is online (with timeout handling)
            let isOnline = false;
            try {
                isOnline = await PresenceService.isUserOnline(recipientId);
            } catch (error: any) {
                // Handle Redis timeout errors gracefully
                if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
                    console.warn(`[DeliveryWorker] Redis timeout checking presence for ${recipientId}, will retry`);
                    throw new Error('Redis timeout - will retry');
                }
                throw error; // Re-throw other errors
            }

            if (!isOnline) {
                // User offline - check if we should keep retrying
                if (job.attemptsMade < 3) {
                    // Retry up to 3 times for online delivery
                    throw new Error(`User ${recipientId} offline - will retry`);
                } else {
                    // After 3 attempts, mark as PENDING and stop retrying
                    // User will receive message when they come online
                    await executeDbOperation(() =>
                        prisma.messageDelivery.upsert({
                            where: {
                                messageId_userId: {
                                    messageId,
                                    userId: recipientId,
                                },
                            },
                            create: {
                                messageId,
                                userId: recipientId,
                                status: 'PENDING',
                            },
                            update: {
                                status: 'PENDING',
                                timestamp: new Date(),
                            },
                        })
                    );

                    console.log(`[DeliveryWorker] Message ${messageId} marked PENDING for offline user`);
                    return { status: 'PENDING', reason: 'user_offline' };
                }
            }

            // User is online - fetch message and deliver via socket
            const message = await executeDbOperation(() =>
                prisma.message.findUnique({
                    where: { id: messageId },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: true,
                            },
                        },
                        replyTo: {
                            select: {
                                id: true,
                                content: true,
                                senderId: true,
                            },
                        },
                    },
                })
            );

            if (!message) {
                throw new Error(`Message ${messageId} not found`);
            }

            // Emit to recipient's room
            const recipientRoom = `user:${recipientId}`;
            io.to(recipientRoom).emit('message:received', {
                id: message.id,
                conversationId: message.conversationId,
                from: {
                    id: message.sender.id,
                    username: message.sender.username,
                    name: message.sender.name,
                    avatar: message.sender.avatar,
                },
                content: message.content,
                attachments: message.attachments,
                reactions: message.reactions,
                replyTo: message.replyTo,
                isRead: message.isRead,
                createdAt: message.createdAt,
            });

            // Update delivery status
            await executeDbOperation(() =>
                prisma.messageDelivery.upsert({
                    where: {
                        messageId_userId: {
                            messageId,
                            userId: recipientId,
                        },
                    },
                    create: {
                        messageId,
                        userId: recipientId,
                        status: 'DELIVERED',
                    },
                    update: {
                        status: 'DELIVERED',
                        timestamp: new Date(),
                    },
                })
            );

            // Update message delivery status
            await executeDbOperation(() =>
                prisma.message.update({
                    where: { id: messageId },
                    data: { deliveryStatus: 'DELIVERED' },
                })
            );

            console.log(`[DeliveryWorker] ✅ Message ${messageId} delivered to ${recipientId}`);
            return { status: 'DELIVERED', messageId, recipientId };
        },
        {
            connection: redis as any,
            concurrency: 10, // Process 10 deliveries concurrently
            drainDelay: 10, // Wait 10s before polling again when queue is empty (reduces Redis requests)
            stalledInterval: 30000, // Check for stalled jobs every 30s
            lockDuration: 30000, // Lock jobs for 30s
        }
    );

    worker.on('completed', (job, result) => {
        console.log(`[DeliveryWorker] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, error) => {
        console.error(`[DeliveryWorker] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('[DeliveryWorker] Worker error:', error);
    });

    console.log('📬 Message delivery worker started');

    return worker;
}

/**
 * Deliver pending messages when user comes online
 */
export async function deliverPendingMessages(userId: string, io: any): Promise<number> {
    // Fetch pending messages
    const pendingDeliveries = await executeDbOperation(() =>
        prisma.messageDelivery.findMany({
            where: {
                userId,
                status: 'PENDING',
            },
            include: {
                message: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: true,
                            },
                        },
                        replyTo: {
                            select: {
                                id: true,
                                content: true,
                                senderId: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
            take: 100, // Limit to prevent overwhelming user
        })
    );

    if (!pendingDeliveries || pendingDeliveries.length === 0) {
        return 0;
    }

    console.log(`[DeliveryService] Delivering ${pendingDeliveries.length} pending messages to ${userId}`);

    const userRoom = `user:${userId}`;

    // Deliver all pending messages
    for (const delivery of pendingDeliveries) {
        const message = delivery.message;

        io.to(userRoom).emit('message:received', {
            id: message.id,
            conversationId: message.conversationId,
            from: {
                id: message.sender.id,
                username: message.sender.username,
                name: message.sender.name,
                avatar: message.sender.avatar,
            },
            content: message.content,
            attachments: message.attachments,
            reactions: message.reactions,
            replyTo: message.replyTo,
            isRead: message.isRead,
            createdAt: message.createdAt,
        });

        // Mark as delivered
        await executeDbOperation(() =>
            prisma.messageDelivery.update({
                where: { id: delivery.id },
                data: {
                    status: 'DELIVERED',
                    timestamp: new Date(),
                },
            })
        );
    }

    // Update message delivery statuses in batch
    await executeDbOperation(() =>
        prisma.message.updateMany({
            where: {
                id: {
                    in: pendingDeliveries.map((d) => d.messageId),
                },
            },
            data: {
                deliveryStatus: 'DELIVERED',
            },
        })
    );

    console.log(`[DeliveryService] ✅ Delivered ${pendingDeliveries.length} pending messages to ${userId}`);

    return pendingDeliveries.length;
}
