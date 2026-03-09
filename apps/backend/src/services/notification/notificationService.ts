/**
 * Enterprise Notification Service
 * Implements event-sourced notifications with deduplication and aggregation
 */

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Server } from 'socket.io';
import { circuitBreakerManager } from '@/lib/circuitBreaker';

// Notification event types
export enum NotificationEventType {
    POST_CREATED = 'POST_CREATED',
    POST_LIKED = 'POST_LIKED',
    POST_COMMENTED = 'POST_COMMENTED',
    POST_SHARED = 'POST_SHARED',
    COMMENT_LIKED = 'COMMENT_LIKED',
    COMMENT_REPLIED = 'COMMENT_REPLIED',
    USER_FOLLOWED = 'USER_FOLLOWED',
    MENTION = 'MENTION',
    // New types
    INVITATION_RECEIVED = 'INVITATION_RECEIVED',
    OWNERSHIP_TRANSFER = 'OWNERSHIP_TRANSFER',
    PERMISSION_GRANTED = 'PERMISSION_GRANTED',
    PERMISSION_REVOKED = 'PERMISSION_REVOKED'
}

export interface NotificationEvent {
    eventType: NotificationEventType;
    actorId: string;
    entityType: string;
    entityId: string;
    recipientId: string;
    metadata?: Record<string, any>;
    aggregateKey?: string;
    createdAt?: Date;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationEventType;
    title: string;
    message: string;
    actorIds: string[];
    entityType: string;
    entityId: string;
    metadata: Record<string, any>;
    read: boolean;
    readAt?: Date;
    aggregateKey: string;
    createdAt: Date;
    updatedAt: Date;
}

interface AggregationWindow {
    windowMs: number;     // Time window for aggregation
    maxActors: number;    // Maximum actors to show
}

export class NotificationService {
    private eventQueue: NotificationEvent[] = [];
    private isProcessing = false;
    private aggregationWindows: Map<NotificationEventType, AggregationWindow> = new Map([
        [NotificationEventType.POST_LIKED, { windowMs: 60000, maxActors: 10 }],      // 1 minute
        [NotificationEventType.POST_COMMENTED, { windowMs: 30000, maxActors: 5 }],    // 30 seconds
        [NotificationEventType.COMMENT_LIKED, { windowMs: 60000, maxActors: 10 }],   // 1 minute
        [NotificationEventType.COMMENT_REPLIED, { windowMs: 30000, maxActors: 5 }],  // 30 seconds
        [NotificationEventType.USER_FOLLOWED, { windowMs: 120000, maxActors: 10 }],  // 2 minutes
        // No aggregation for invitations/transfers usually, but consistent structure helps
        [NotificationEventType.INVITATION_RECEIVED, { windowMs: 0, maxActors: 1 }],
        [NotificationEventType.OWNERSHIP_TRANSFER, { windowMs: 0, maxActors: 1 }],
        [NotificationEventType.PERMISSION_GRANTED, { windowMs: 0, maxActors: 1 }],
    ]);

    constructor(private io?: Server) {
        // Start background processing
        this.startEventProcessor();
    }

    /**
     * Send invitation notification
     */
    async sendInvitationNotification(params: {
        recipientId: string;
        inviterId: string;
        itemType: string;
        itemId: string;
        role: string;
        itemName: string; // Passed in metadata
    }): Promise<void> {
        await this.publishEvent({
            eventType: NotificationEventType.INVITATION_RECEIVED,
            actorId: params.inviterId,
            entityType: params.itemType,
            entityId: params.itemId,
            recipientId: params.recipientId,
            metadata: {
                role: params.role,
                itemName: params.itemName
            }
        });
    }

    /**
     * Send ownership transfer notification
     */
    async sendOwnershipTransferNotification(params: {
        recipientId: string;
        fromUserId: string;
        itemType: string;
        itemId: string;
        itemName: string;
    }): Promise<void> {
        await this.publishEvent({
            eventType: NotificationEventType.OWNERSHIP_TRANSFER,
            actorId: params.fromUserId,
            entityType: params.itemType,
            entityId: params.itemId,
            recipientId: params.recipientId,
            metadata: {
                itemName: params.itemName
            }
        });
    }

    /**
     * Send permission granted notification
     */
    async sendPermissionGrantedNotification(params: {
        recipientId: string;
        grantedById: string;
        itemType: string;
        itemId: string;
        permission: string;
        itemName: string;
    }): Promise<void> {
        await this.publishEvent({
            eventType: NotificationEventType.PERMISSION_GRANTED,
            actorId: params.grantedById,
            entityType: params.itemType,
            entityId: params.itemId,
            recipientId: params.recipientId,
            metadata: {
                permission: params.permission,
                itemName: params.itemName
            }
        });
    }

    /**
     * Publish a notification event
     */
    async publishEvent(event: NotificationEvent): Promise<void> {
        // Generate aggregate key for deduplication
        event.aggregateKey = event.aggregateKey || this.generateAggregateKey(event);
        event.createdAt = event.createdAt || new Date();

        // Add to queue
        this.eventQueue.push(event);

        // Trigger processing if not already running
        if (!this.isProcessing) {
            this.processEventQueue();
        }
    }

    /**
     * Process event queue with batching and aggregation
     */
    private async processEventQueue(): Promise<void> {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Take a batch of events
            const batch = this.eventQueue.splice(0, 100);

            // Group events by aggregate key
            const grouped = this.groupEventsByAggregateKey(batch);

            // Create or update notifications
            await Promise.all(
                Array.from(grouped.entries()).map(([key, events]) =>
                    this.createOrUpdateNotification(events)
                )
            );

            // Continue processing if more events exist
            if (this.eventQueue.length > 0) {
                setImmediate(() => this.processEventQueue());
            } else {
                this.isProcessing = false;
            }
        } catch (error) {
            console.error('[NotificationService] Error processing event queue:', error);
            this.isProcessing = false;
        }
    }

    /**
     * Create or update notification with aggregation
     */
    private async createOrUpdateNotification(events: NotificationEvent[]): Promise<void> {
        if (events.length === 0) return;

        const firstEvent = events[0];
        const window = this.aggregationWindows.get(firstEvent.eventType);

        try {
            // Check if notification exists within aggregation window
            const existing = await prisma.notification.findFirst({
                where: {
                    userId: firstEvent.recipientId,
                    aggregateKey: firstEvent.aggregateKey!,
                    createdAt: window && window.windowMs > 0 ? {
                        gte: new Date(Date.now() - window.windowMs)
                    } : undefined
                }
            });

            const actorIds = Array.from(new Set(events.map(e => e.actorId)));
            const maxActors = window?.maxActors || 10;

            if (existing) {
                // Update existing notification with new actors
                const updatedActorIds = Array.from(
                    new Set([...existing.actorIds, ...actorIds])
                ).slice(0, maxActors);

                await prisma.notification.update({
                    where: { id: existing.id },
                    data: {
                        actorIds: updatedActorIds,
                        message: this.generateNotificationMessage(
                            firstEvent.eventType,
                            updatedActorIds.length,
                            (existing.metadata as Record<string, any>) || {}
                        ),
                        updatedAt: new Date()
                    }
                });

                // Emit real-time update
                await this.emitNotification(firstEvent.recipientId, existing.id, 'updated');
            } else {
                // Create new notification
                const notification = await prisma.notification.create({
                    data: {
                        userId: firstEvent.recipientId,
                        type: firstEvent.eventType,
                        title: this.generateNotificationTitle(firstEvent.eventType),
                        message: this.generateNotificationMessage(
                            firstEvent.eventType,
                            actorIds.length,
                            firstEvent.metadata
                        ),
                        actorIds: actorIds.slice(0, maxActors),
                        entityType: firstEvent.entityType,
                        entityId: firstEvent.entityId,
                        metadata: firstEvent.metadata || {},
                        aggregateKey: firstEvent.aggregateKey!,
                        read: false
                    }
                });

                // Emit real-time notification
                await this.emitNotification(firstEvent.recipientId, notification.id, 'created');

                // Update cached unread count
                await this.incrementUnreadCount(firstEvent.recipientId);
            }
        } catch (error: any) {
            if (error.code === 'P2003') {
                console.warn(`[NotificationService] Skipping notification for non-existent user: ${firstEvent.recipientId}`);
                return;
            }
            console.error('[NotificationService] Error creating/updating notification:', error);
        }
    }

    /**
     * Emit real-time notification via Socket.IO
     */
    private async emitNotification(
        userId: string,
        notificationId: string,
        action: 'created' | 'updated'
    ): Promise<void> {
        if (!this.io) return;

        const breaker = circuitBreakerManager.getBreaker('notification-socket');

        await breaker.execute(
            async () => {
                this.io!.to(`user:${userId}`).emit('notification:new', {
                    notificationId,
                    action,
                    timestamp: Date.now()
                });
            },
            async () => {
                console.log(`[NotificationService] Skipped socket emit for user ${userId} (circuit open)`);
            }
        );
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId }
        });

        if (!notification || notification.read) return;

        await prisma.notification.update({
            where: { id: notificationId },
            data: {
                read: true,
                readAt: new Date()
            }
        });

        // Update cached unread count
        await this.decrementUnreadCount(userId);

        // Emit read receipt
        if (this.io) {
            this.io.to(`user:${userId}`).emit('notification:read', {
                notificationId
            });
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string): Promise<void> {
        await prisma.notification.updateMany({
            where: {
                userId,
                read: false
            },
            data: {
                read: true,
                readAt: new Date()
            }
        });

        // Reset unread count
        await redis.del(`notifications:unread:${userId}`);

        // Emit bulk read receipt
        if (this.io) {
            this.io.to(`user:${userId}`).emit('notification:all_read');
        }
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(
        userId: string,
        options: {
            limit?: number;
            cursor?: string;
            unreadOnly?: boolean;
        } = {}
    ): Promise<{ items: Notification[]; nextCursor?: string; unreadCount: number }> {
        const { limit = 50, cursor, unreadOnly = false } = options;

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { read: false } : {})
            },
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' }
        }) as Notification[];

        let nextCursor: string | undefined;
        if (notifications.length > limit) {
            const nextItem = notifications.pop();
            nextCursor = nextItem?.id;
        }

        const unreadCount = await this.getUnreadCount(userId);

        return {
            items: notifications,
            nextCursor,
            unreadCount
        };
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const cacheKey = `notifications:unread:${userId}`;

        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            return parseInt(cached, 10);
        }

        // Query database
        const count = await prisma.notification.count({
            where: { userId, read: false }
        });

        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, count.toString());

        return count;
    }

    /**
     * Increment unread count cache
     */
    private async incrementUnreadCount(userId: string): Promise<void> {
        const cacheKey = `notifications:unread:${userId}`;
        await redis.incr(cacheKey);
        await redis.expire(cacheKey, 300);
    }

    /**
     * Decrement unread count cache
     */
    private async decrementUnreadCount(userId: string): Promise<void> {
        const cacheKey = `notifications:unread:${userId}`;
        await redis.decr(cacheKey);
    }

    /**
     * Generate aggregate key for deduplication
     */
    private generateAggregateKey(event: NotificationEvent): string {
        return `${event.recipientId}:${event.eventType}:${event.entityType}:${event.entityId}`;
    }

    /**
     * Group events by aggregate key
     */
    private groupEventsByAggregateKey(
        events: NotificationEvent[]
    ): Map<string, NotificationEvent[]> {
        const grouped = new Map<string, NotificationEvent[]>();

        for (const event of events) {
            const key = event.aggregateKey!;
            const group = grouped.get(key) || [];
            group.push(event);
            grouped.set(key, group);
        }

        return grouped;
    }

    /**
     * Generate notification title
     */
    private generateNotificationTitle(type: NotificationEventType): string {
        const titles: Record<NotificationEventType, string> = {
            [NotificationEventType.POST_CREATED]: 'New Post',
            [NotificationEventType.POST_LIKED]: 'Post Liked',
            [NotificationEventType.POST_COMMENTED]: 'New Comment',
            [NotificationEventType.POST_SHARED]: 'Post Shared',
            [NotificationEventType.COMMENT_LIKED]: 'Comment Liked',
            [NotificationEventType.COMMENT_REPLIED]: 'Comment Reply',
            [NotificationEventType.USER_FOLLOWED]: 'New Follower',
            [NotificationEventType.MENTION]: 'You were mentioned',
            [NotificationEventType.INVITATION_RECEIVED]: 'Invitation Received',
            [NotificationEventType.OWNERSHIP_TRANSFER]: 'Ownership Transfer',
            [NotificationEventType.PERMISSION_GRANTED]: 'Permissions Updated',
            [NotificationEventType.PERMISSION_REVOKED]: 'Permissions Updated',
        };

        return titles[type] || 'Notification';
    }

    /**
     * Generate notification message
     */
    private generateNotificationMessage(
        type: NotificationEventType,
        actorCount: number,
        metadata?: Record<string, any>
    ): string {
        const actor = actorCount === 1 ? 'someone' : `${actorCount} people`;
        const itemName = metadata?.itemName || 'an item';

        const messages: Record<NotificationEventType, string> = {
            [NotificationEventType.POST_CREATED]: `${actor} created a new post`,
            [NotificationEventType.POST_LIKED]: `${actor} liked your post`,
            [NotificationEventType.POST_COMMENTED]: `${actor} commented on your post`,
            [NotificationEventType.POST_SHARED]: `${actor} shared your post`,
            [NotificationEventType.COMMENT_LIKED]: `${actor} liked your comment`,
            [NotificationEventType.COMMENT_REPLIED]: `${actor} replied to your comment`,
            [NotificationEventType.USER_FOLLOWED]: `${actor} followed you`,
            [NotificationEventType.MENTION]: `${actor} mentioned you`,
            [NotificationEventType.INVITATION_RECEIVED]: `You have been invited to join ${itemName}`,
            [NotificationEventType.OWNERSHIP_TRANSFER]: `Ownership of ${itemName} has been transferred to you`,
            [NotificationEventType.PERMISSION_GRANTED]: `You have been granted access to ${itemName}`,
            [NotificationEventType.PERMISSION_REVOKED]: `Your access to ${itemName} has been revoked`,
        };

        return messages[type] || 'You have a new notification';
    }

    /**
     * Start background event processor
     */
    private startEventProcessor(): void {
        setInterval(() => {
            if (!this.isProcessing && this.eventQueue.length > 0) {
                this.processEventQueue();
            }
        }, 1000); // Check every second
    }

    /**
     * Clean up old notifications
     */
    async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                read: true
            }
        });

        return result.count;
    }
}

// Global instance
export const notificationService = new NotificationService();
