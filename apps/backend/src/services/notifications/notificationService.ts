/**
 * Notification Service
 * Handles email and real-time socket notifications for invitations, transfers, etc.
 */

import { prisma } from '@agentflox/database';
import { Server } from 'socket.io';

export enum NotificationType {
    INVITATION_RECEIVED = 'invitation_received',
    OWNERSHIP_TRANSFER = 'ownership_transfer',
    PERMISSION_GRANTED = 'permission_granted',
    PERMISSION_REVOKED = 'permission_revoked',
    MEMBER_ADDED = 'member_added',
    MEMBER_REMOVED = 'member_removed',
    COMMENT_MENTION = 'comment_mention',
    TASK_ASSIGNED = 'task_assigned',
}

export enum NotificationCategory {
    INVITATION = 'invitation',
    PERMISSION = 'permission',
    ACTIVITY = 'activity',
    MENTION = 'mention',
}

interface NotificationPayload {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
}

export class NotificationService {
    private static io: Server | null = null;

    /**
     * Initialize with Socket.IO server
     */
    static initialize(io: Server) {
        this.io = io;
    }

    /**
     * Send invitation notification (email + socket)
     */
    static async sendInvitationNotification(params: {
        recipientEmail: string;
        inviterName: string;
        inviterEmail: string;
        itemType: string;
        itemName: string;
        role: string;
        invitationToken: string;
        workspaceId: string;
    }) {
        const {
            recipientEmail,
            inviterName,
            inviterEmail,
            itemType,
            itemName,
            role,
            invitationToken,
            workspaceId,
        } = params;

        // Check if recipient already has account
        const user = await prisma.user.findUnique({
            where: { email: recipientEmail },
        });

        const notification: NotificationPayload = {
            type: NotificationType.INVITATION_RECEIVED,
            category: NotificationCategory.INVITATION,
            title: `Invitation to ${itemType}`,
            message: `${inviterName} (${inviterEmail}) invited you to join "${itemName}" as ${role}`,
            actionUrl: `/invitations/${invitationToken}`,
            metadata: {
                inviterName,
                inviterEmail,
                itemType,
                itemName,
                role,
            },
        };

        // If user exists, send real-time notification
        if (user && this.io) {
            await this.sendRealTimeNotification(user.id, notification);

            // Also save to database
            await this.saveNotification(user.id, notification);
        }

        // Send email notification
        await this.sendEmailNotification({
            to: recipientEmail,
            subject: `You've been invited to ${itemName}`,
            template: 'invitation',
            data: {
                inviterName,
                inviterEmail,
                itemType,
                itemName,
                role,
                acceptUrl: `${process.env.FRONTEND_URL}/invitations/${invitationToken}`,
            },
        });
    }

    /**
     * Send ownership transfer notification
     */
    static async sendOwnershipTransferNotification(params: {
        recipientId: string;
        fromUserId: string;
        fromUserName: string;
        itemType: string;
        itemName: string;
        itemId: string;
    }) {
        const { recipientId, fromUserName, itemType, itemName, itemId } = params;

        const notification: NotificationPayload = {
            type: NotificationType.OWNERSHIP_TRANSFER,
            category: NotificationCategory.PERMISSION,
            title: 'Ownership Transfer',
            message: `${fromUserName} transferred ownership of "${itemName}" to you`,
            actionUrl: `/${itemType}s/${itemId}`,
            metadata: {
                fromUserName,
                itemType,
                itemName,
            },
        };

        // Real-time notification
        await this.sendRealTimeNotification(recipientId, notification);

        // Save to database
        await this.saveNotification(recipientId, notification);

        // Email notification
        const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { email: true, name: true },
        });

        if (recipient?.email) {
            await this.sendEmailNotification({
                to: recipient.email,
                subject: `Ownership Transferred: ${itemName}`,
                template: 'ownership-transfer',
                data: {
                    recipientName: recipient.name,
                    fromUserName,
                    itemType,
                    itemName,
                    itemUrl: `${process.env.FRONTEND_URL}/${itemType}s/${itemId}`,
                },
            });
        }
    }

    /**
     * Send permission granted notification
     */
    static async sendPermissionGrantedNotification(params: {
        recipientId: string;
        grantedByName: string;
        itemType: string;
        itemName: string;
        permission: string;
        itemId: string;
    }) {
        const { recipientId, grantedByName, itemType, itemName, permission, itemId } = params;

        const notification: NotificationPayload = {
            type: NotificationType.PERMISSION_GRANTED,
            category: NotificationCategory.PERMISSION,
            title: 'Access Granted',
            message: `${grantedByName} shared "${itemName}" with you (${permission} access)`,
            actionUrl: `/${itemType}s/${itemId}`,
            metadata: {
                grantedByName,
                itemType,
                itemName,
                permission,
            },
        };

        await this.sendRealTimeNotification(recipientId, notification);
        await this.saveNotification(recipientId, notification);
    }

    /**
     * Send real-time notification via Socket.IO
     */
    private static async sendRealTimeNotification(
        userId: string,
        notification: NotificationPayload
    ) {
        if (!this.io) {
            console.warn('[NotificationService] Socket.IO not initialized');
            return;
        }

        // Emit to user's room
        this.io.to(`user:${userId}`).emit('notification:new', {
            id: Date.now().toString(),
            userId,
            createdAt: new Date().toISOString(),
            isRead: false,
            ...notification,
        });
    }

    /**
     * Save notification to database
     */
    private static async saveNotification(
        userId: string,
        notification: NotificationPayload
    ) {
        await prisma.notification.create({
            data: {
                userId,
                type: notification.type,
                title: notification.title,
                content: notification.message,
                actionUrl: notification.actionUrl,
                metadata: notification.metadata as any,
                isRead: false,
            },
        });
    }

    /**
     * Send email notification
     */
    private static async sendEmailNotification(params: {
        to: string;
        subject: string;
        template: string;
        data: Record<string, any>;
    }) {
        // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
        console.log('[NotificationService] Email notification:', {
            to: params.to,
            subject: params.subject,
            template: params.template,
        });

        // Example: Using SendGrid or nodemailer
        // await emailService.send({
        //   to: params.to,
        //   subject: params.subject,
        //   template: params.template,
        //   data: params.data,
        // });
    }

    /**
     * Mark notifications as read
     */
    static async markAsRead(notificationIds: string[]) {
        await prisma.notification.updateMany({
            where: { id: { in: notificationIds } },
            data: { isRead: true, readAt: new Date() },
        });
    }

    /**
     * Get user notifications
     */
    static async getUserNotifications(
        userId: string,
        options: {
            limit?: number;
            offset?: number;
            unreadOnly?: boolean;
            category?: NotificationCategory;
        } = {}
    ) {
        const { limit = 50, offset = 0, unreadOnly = false, category } = options;

        return await prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly && { isRead: false }),
                ...(category && { type: { startsWith: category } }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId: string): Promise<number> {
        return await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }
}
