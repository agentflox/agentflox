import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@agentflox/database/src/generated/prisma/client";

export const notificationRouter = router({
	// Get user notifications
	getNotifications: protectedProcedure
		.input(z.object({
			page: z.number().int().min(1).optional().default(1),
			pageSize: z.number().int().min(1).max(50).optional().default(20),
			unreadOnly: z.boolean().optional().default(false),
		}))
		.query(async ({ ctx, input }: { ctx: { session: any }; input: { page: number; pageSize: number; unreadOnly: boolean } }) => {
			const userId = ctx.session!.user!.id;

			const where: any = { userId };
			if (input.unreadOnly) {
				where.read = false;
			}

			const skip = (input.page - 1) * input.pageSize;
			const take = input.pageSize;

			const [total, notifications] = await Promise.all([
				prisma.notification.count({ where }),
				prisma.notification.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take,
				}),
			]);

			return { notifications, total, page: input.page, pageSize: input.pageSize };
		}),

	// Get user notifications with infinite query support
	getNotificationsInfinite: protectedProcedure
		.input(z.object({
			pageSize: z.number().int().min(1).max(50).optional().default(10),
			unreadOnly: z.boolean().optional().default(false),
		}))
		.query(async ({ ctx, input }: { ctx: { session: any }; input: { pageSize: number; unreadOnly: boolean } }) => {
			const userId = ctx.session!.user!.id;

			const where: any = { userId };
			if (input.unreadOnly) {
				where.read = false;
			}

			const take = input.pageSize;

			const [total, notifications] = await Promise.all([
				prisma.notification.count({ where }),
				prisma.notification.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take,
				}),
			]);

			return {
				notifications,
				total,
				page: 1,
				pageSize: input.pageSize,
				hasNextPage: notifications.length === input.pageSize && notifications.length < total
			};
		}),

	// Mark notification as read
	markAsRead: protectedProcedure
		.input(z.object({ notificationId: z.string() }))
		.mutation(async ({ ctx, input }: { ctx: { session: any }; input: { notificationId: string } }) => {
			const userId = ctx.session!.user!.id;

			const notification = await prisma.notification.update({
				where: {
					id: input.notificationId,
					userId,
				},
				data: {
					read: true,
					readAt: new Date(),
				},
			});

			// Send notification to the original sender that their request was viewed
			if (notification.relatedType === "PROPOSAL" && notification.relatedId) {
				try {
					// Find the request to get the sender
					const request = await prisma.request.findFirst({
						where: {
							proposalId: notification.relatedId,
							message: notification.content,
						},
						select: { senderId: true }
					});

					if (request) {
						// Create notification for the sender
						const created = await prisma.notification.create({
							data: {
								userId: request.senderId,
								type: "REQUEST_STATUS",
								title: "Request Viewed",
								content: `Your request has been viewed by the proposal owner.`,
								relatedId: notification.relatedId,
								relatedType: "PROPOSAL",
							}
						});

						// Note: client will emit 'notification:send' to broadcast this in real time


					}
				} catch (error) {
					console.error("Failed to notify sender:", error);
				}
			}

			return notification;
		}),

	// Mark all notifications as read
	markAllAsRead: protectedProcedure
		.mutation(async ({ ctx }: { ctx: { session: any } }) => {
			const userId = ctx.session!.user!.id;

			await prisma.notification.updateMany({
				where: {
					userId,
					read: false,
				},
				data: {
					read: true,
					readAt: new Date(),
				},
			});

			return { success: true };
		}),

	// Get unread count
	getUnreadCount: protectedProcedure
		.query(async ({ ctx }: { ctx: { session: any } }) => {
			const userId = ctx.session!.user!.id;

			const count = await prisma.notification.count({
				where: {
					userId,
					read: false,
				},
			});

			return { count };
		}),

	// Delete notification
	deleteNotification: protectedProcedure
		.input(z.object({ notificationId: z.string() }))
		.mutation(async ({ ctx, input }: { ctx: { session: any }; input: { notificationId: string } }) => {
			const userId = ctx.session!.user!.id;

			await prisma.notification.delete({
				where: {
					id: input.notificationId,
					userId,
				},
			});

			return { success: true };
		}),

	// Create notifications for all project members (and owner), excluding the actor
	createForProjectMembers: protectedProcedure
		.input(z.object({
			projectId: z.string(),
			title: z.string().min(1),
			content: z.string().min(1),
			relatedId: z.string().optional(),
			relatedType: z.enum(["POST", "PROJECT", "PROPOSAL", "TEAM"]).default("POST"),
		}))
		.mutation(async ({ ctx, input }: { ctx: { session: any }; input: { projectId: string; title: string; content: string; relatedId?: string; relatedType: "POST" | "PROJECT" | "PROPOSAL" | "TEAM" } }) => {
			const actorId = ctx.session!.user!.id;

			const project = await prisma.project.findUnique({
				where: { id: input.projectId },
				include: {
					members: { select: { userId: true } },
				},
			});

			if (!project) throw new Error("Project not found");

			const recipientIds = new Set<string>();
			if (project.ownerId && project.ownerId !== actorId) recipientIds.add(project.ownerId);
			for (const m of project.members) {
				if (m.userId && m.userId !== actorId) recipientIds.add(m.userId);
			}

			if (recipientIds.size === 0) return { created: 0, userIds: [] as string[] } as const;

			await prisma.notification.createMany({
				data: Array.from(recipientIds).map((userId) => ({
					userId,
					type: NotificationType.PROJECT_UPDATE,
					title: input.title,
					content: input.content,
					relatedId: input.relatedId,
					relatedType: input.relatedType,
				})),
				skipDuplicates: true,
			});

			return { created: recipientIds.size, userIds: Array.from(recipientIds) } as const;
		}),

	// Create notifications for specific userIds (mentions)
	createForUserIds: protectedProcedure
		.input(z.object({
			userIds: z.array(z.string()).min(1),
			title: z.string().min(1),
			content: z.string().min(1),
			relatedId: z.string().optional(),
			relatedType: z.enum(["POST", "PROJECT", "PROPOSAL", "TEAM", "COMMENT"]).default("POST"),
		}))
		.mutation(async ({ ctx, input }: { ctx: { session: any }; input: { userIds: string[]; title: string; content: string; relatedId?: string; relatedType: "POST" | "PROJECT" | "PROPOSAL" | "TEAM" | "COMMENT" } }) => {
			const actorId = ctx.session!.user!.id;
			const recipients = Array.from(new Set(input.userIds.filter((id) => id !== actorId)));
			if (recipients.length === 0) return { created: 0, userIds: [] as string[] } as const;

			await prisma.notification.createMany({
				data: recipients.map((userId) => ({
					userId,
					type: NotificationType.MESSAGE_RECEIVED,
					title: input.title,
					content: input.content,
					relatedId: input.relatedId,
					relatedType: input.relatedType,
				})),
				skipDuplicates: true,
			});

			return { created: recipients.length, userIds: recipients } as const;
		}),

	// Get notification by ID
	getNotification: protectedProcedure
		.input(z.object({ notificationId: z.string() }))
		.query(async ({ ctx, input }: { ctx: { session: any }; input: { notificationId: string } }) => {
			const userId = ctx.session!.user!.id;

			return prisma.notification.findFirst({
				where: {
					id: input.notificationId,
					userId,
				},
			});
		}),
});
