import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { WorkspaceRole } from '@agentflox/database/src/generated/prisma/client';

type WorkspaceScope = "owned" | "member" | "all" | "editable";

const listInputSchema = z.object({
	query: z.string().optional(),
	scope: z.enum(["owned", "member", "all", "editable"]).optional().default("owned"),
	status: z.enum(["active", "archived"]).optional(),
	page: z.number().int().min(1).optional().default(1),
	pageSize: z.number().int().min(1).max(100).optional().default(12),
	includeCounts: z.boolean().optional(),
});

export const workspaceRouter = router({
	list: protectedProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		const where: any = {};

		const scope = (input.scope ?? "owned") as WorkspaceScope;
		if (scope === "owned") {
			where.ownerId = userId;
		} else if (scope === "member") {
			where.members = { some: { userId } };
		} else if (scope === "all") {
			where.OR = [{ ownerId: userId }, { members: { some: { userId } } }];
		} else if (scope === "editable") {
			where.OR = [
				{ ownerId: userId },
				{
					members: {
						some: {
							userId,
							OR: [
								{ role: { in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN] } },
								{ canCreateSpaces: true }
							]
						}
					}
				}
			];
		}

		if (input.status) {
			where.isActive = input.status === "active";
		}

		if (input.query) {
			const query = input.query.trim();
			where.OR = [
				...(where.OR || []),
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			];
		}

		const skip = (input.page - 1) * input.pageSize;
		const take = input.pageSize;

		const include = input.includeCounts
			? { _count: { select: { members: true, projects: true, teams: true, tasks: true, channels: true, proposals: true } } }
			: undefined;

		const [total, items] = await Promise.all([
			prisma.workspace.count({ where }),
			prisma.workspace.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				skip,
				take,
				include,
			}),
		]);

		return {
			items,
			total,
			page: input.page,
			pageSize: input.pageSize,
		};
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				isActive: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;

			return prisma.$transaction(async (tx) => {
				// Create the workspace
				const ws = await tx.workspace.create({
					data: {
						owner: { connect: { id: userId } },
						name: input.name,
						description: input.description,
						isActive: input.isActive ?? true,
						members: { create: { userId, role: WorkspaceRole.OWNER } },
					},
					include: {
						members: {
							select: {
								id: true,
								role: true,
								user: { select: { id: true, name: true, email: true, image: true } },
							},
						},
						_count: { select: { projects: true, teams: true, tasks: true } },
					},
				});

				// Create default task types
				const { generateKeyBetween } = await import('fractional-indexing');

				const defaultTaskTypes = [
					{ name: 'Task', icon: '📋', color: '#3b82f6', isDefault: true },
					{ name: 'Milestone', icon: '🏁', color: '#8b5cf6', isDefault: false },
					{ name: 'Form Response', icon: '📝', color: '#10b981', isDefault: false },
					{ name: 'Meeting Note', icon: '📅', color: '#f59e0b', isDefault: false },
				];

				let prevPosition: string | null = null;
				for (const taskType of defaultTaskTypes) {
					const position = generateKeyBetween(prevPosition, null);
					await tx.taskType.create({
						data: {
							workspaceId: ws.id,
							name: taskType.name,
							icon: taskType.icon,
							color: taskType.color,
							isDefault: taskType.isDefault,
							isActive: true,
							position,
						},
					});
					prevPosition = position;
				}

				return ws;
			});
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;

			const workspace = await prisma.workspace.findFirst({
				where: {
					id: input.id,
					OR: [{ ownerId: userId }, { members: { some: { userId } } }],
				},
				include: {
					owner: { select: { id: true, name: true, email: true } },
					members: {
						orderBy: { joinedAt: "asc" },
						select: {
							id: true,
							role: true,
							joinedAt: true,
							user: { select: { id: true, name: true, email: true, image: true } },
						},
					},
					channels: {
						orderBy: { createdAt: "desc" },
						include: { _count: { select: { tasks: true } } },
					},
					spaces: {
						orderBy: { updatedAt: "desc" },
						select: {
							id: true,
							name: true,
							description: true,
							isActive: true,
							icon: true,
							color: true,
							updatedAt: true,
							_count: { select: { members: true, tools: true, materials: true } },
						},
					},
					projects: {
						orderBy: { updatedAt: "desc" },
						select: {
							id: true,
							name: true,
							description: true,
							stage: true,
							status: true,
							spaceId: true,
							updatedAt: true,
							_count: { select: { tasks: true, proposals: true } },
						},
					},
					teams: {
						orderBy: { updatedAt: "desc" },
						select: {
							id: true,
							name: true,
							description: true,
							status: true,
							size: true,
							maxSize: true,
							isHiring: true,
							spaceId: true,
							updatedAt: true,
							_count: { select: { members: true, tasks: true } },
						},
					},
					tasks: {
						orderBy: { updatedAt: "desc" },
						take: 20,
						select: {
							id: true,
							title: true,
							status: true,
							description: true,
							channelId: true,
							projectId: true,
							teamId: true,
							assigneeId: true,
							visibility: true,
							createdBy: true,
							updatedAt: true,
						},
					},
					proposals: {
						orderBy: { updatedAt: "desc" },
						select: {
							id: true,
							title: true,
							status: true,
							category: true,
							updatedAt: true,
						},
					},
					tools: {
						orderBy: { updatedAt: "desc" },
						take: 20,
						select: {
							id: true,
							name: true,
							description: true,
							category: true,
							productUrl: true,
							isPublic: true,
							spaceId: true,
							updatedAt: true,
						},
					},
					materials: {
						orderBy: { updatedAt: "desc" },
						take: 20,
						select: {
							id: true,
							title: true,
							description: true,
							category: true,
							priceUsd: true,
							isPublic: true,
							externalUrl: true,
							fileUrl: true,
							spaceId: true,
							updatedAt: true,
						},
					},
					_count: {
						select: {
							members: true,
							channels: true,
							spaces: true,
							projects: true,
							teams: true,
							tasks: true,
							tools: true,
							materials: true,
							proposals: true,
						},
					},
				},
			});

			if (!workspace) {
				return null;
			}

			return workspace;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				description: z.string().optional().nullable(),
				isActive: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const { id, ...data } = input;

			const existing = await prisma.workspace.findFirst({ where: { id, ownerId: userId } });
			if (!existing) {
				throw new Error("Workspace not found or permission denied");
			}

			const updated = await prisma.workspace.update({
				where: { id },
				data: {
					...data,
					description: data.description ?? undefined,
				},
				include: {
					_count: { select: { members: true, projects: true, teams: true, tasks: true } },
				},
			});

			return updated;
		}),

	archive: protectedProcedure
		.input(z.object({ id: z.string(), isActive: z.boolean().optional() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const existing = await prisma.workspace.findFirst({ where: { id: input.id, ownerId: userId } });
			if (!existing) {
				throw new Error("Workspace not found or permission denied");
			}

			return prisma.workspace.update({
				where: { id: input.id },
				data: { isActive: input.isActive ?? false },
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const existing = await prisma.workspace.findFirst({ where: { id: input.id, ownerId: userId } });
			if (!existing) {
				throw new Error("Workspace not found or permission denied");
			}

			await prisma.workspaceMember.deleteMany({ where: { workspaceId: input.id } });
			await prisma.channel.deleteMany({ where: { workspaceId: input.id } });
			await prisma.project.deleteMany({ where: { workspaceId: input.id } });
			await prisma.team.deleteMany({ where: { workspaceId: input.id } });
			await prisma.task.deleteMany({ where: { workspaceId: input.id } });
			await prisma.proposal.deleteMany({ where: { workspaceId: input.id } });
			await prisma.tool.deleteMany({ where: { workspaceId: input.id } });
			await prisma.material.deleteMany({ where: { workspaceId: input.id } });
			await prisma.folder.deleteMany({ where: { workspaceId: input.id } });
			await prisma.list.deleteMany({ where: { workspaceId: input.id } });

			return prisma.workspace.delete({ where: { id: input.id } });
		}),

	addMember: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
				role: z.nativeEnum(WorkspaceRole).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const currentUserId = ctx.session!.user!.id;
			const workspace = await prisma.workspace.findFirst({
				where: { id: input.workspaceId, ownerId: currentUserId },
			});
			if (!workspace) {
				throw new Error("Workspace not found or permission denied");
			}

			return prisma.workspaceMember.upsert({
				where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
				update: { role: input.role ?? WorkspaceRole.MEMBER },
				create: { workspaceId: input.workspaceId, userId: input.userId, role: input.role ?? WorkspaceRole.MEMBER },
			});
		}),

	removeMember: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const currentUserId = ctx.session!.user!.id;
			const workspace = await prisma.workspace.findFirst({
				where: { id: input.workspaceId, ownerId: currentUserId },
			});
			if (!workspace) {
				throw new Error("Workspace not found or permission denied");
			}

			await prisma.workspaceMember.deleteMany({
				where: { workspaceId: input.workspaceId, userId: input.userId, role: { not: WorkspaceRole.OWNER } },
			});

			return { removed: true as const };
		}),
});


