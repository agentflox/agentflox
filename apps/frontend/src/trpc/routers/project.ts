import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { ViewType } from "@agentflox/database/src/generated/prisma/client";
import { UsageManager } from "@/features/usage/utils/usageManager";
import { LimitGuard } from "@/features/usage/utils/limitGuard";

export const projectRouter = router({
	list: protectedProcedure
		.input(z.object({
			query: z.string().optional(),
			stage: z.enum(["IDEA", "MVP", "BETA", "LAUNCHED", "GROWTH", "SCALE", "EXIT"]).optional(),
			industry: z.array(z.string()).optional(),
			isActive: z.boolean().optional(),
			scope: z.enum(["all", "owned", "participated"]).optional().default("owned"),
			status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
			page: z.number().int().min(1).optional().default(1),
			pageSize: z.number().int().min(1).max(50).optional().default(12),
			spaceId: z.string().optional().nullable(),
			workspaceId: z.string().optional(),
		}))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			await LimitGuard.ensureCycle(userId);
			const where: any = {};

			// Scope
			if (input.scope === "owned") {
				where.ownerId = userId;
			} else if (input.scope === "participated") {
				where.members = { some: { userId } };
			} else {
				// all: owned or participated
				where.OR = [{ ownerId: userId }, { members: { some: { userId } } }];
			}

			if (input?.stage) {
				where.stage = input.stage;
			}
			if (input?.industry && input.industry.length > 0) {
				where.industry = { hasSome: input.industry };
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive;
			}
			if (input?.status) {
				where.status = input.status;
			}
			if (input?.query) {
				where.OR = [
					...(where.OR || []),
					{ name: { contains: input.query, mode: "insensitive" } },
					{ description: { contains: input.query, mode: "insensitive" } },
					{ tagline: { contains: input.query, mode: "insensitive" } },
				];
			}

			if (input.spaceId !== undefined) {
				where.spaceId = input.spaceId;
			}

			if (input.workspaceId) {
				where.workspaceId = input.workspaceId;
			}
			const skip = (input.page - 1) * input.pageSize;
			const take = input.pageSize;
			const [total, items] = await Promise.all([
				prisma.project.count({ where }),
				prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take })
			]);
			return { items, total, page: input.page, pageSize: input.pageSize };
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			return prisma.project.findFirst({
				where: {
					id: input.id,
					OR: [
						{ ownerId: userId },
						{ members: { some: { userId } } },
						{ teams: { some: { team: { members: { some: { userId } } } } } },
					],
				},
				include: {
					views: { orderBy: { position: "asc" } },
					members: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
					teams: { include: { team: { select: { id: true, name: true } } } },
					owner: { select: { id: true, name: true, image: true } },
					_count: {
						select: {
							tasks: true,
							members: true,
							teams: true,
						}
					}
				}
			});
		}),

	// Participants for mentions: owner + members + team members (unique)
	getParticipants: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const project = await prisma.project.findFirst({
				where: {
					id: input.projectId,
					OR: [
						{ ownerId: userId },
						{ members: { some: { userId } } },
						{ teams: { some: { team: { members: { some: { userId } } } } } },
					],
				},
				include: {
					owner: { select: { id: true, name: true, email: true } },
					members: { select: { user: { select: { id: true, name: true, email: true } } } },
					teams: {
						select: {
							team: {
								select: {
									id: true,
									name: true,
									members: { select: { user: { select: { id: true, name: true, email: true } } } },
								},
							},
						},
					},
				},
			});

			if (!project) return { users: [] as { id: string; name: string | null; email: string | null }[], teams: [] as { id: string; name: string | null }[] } as const;

			const userMap = new Map<string, { id: string; name: string | null; email: string | null }>();
			if (project.owner) userMap.set(project.owner.id, { id: project.owner.id, name: project.owner.name, email: project.owner.email });
			for (const m of project.members) {
				if (m.user) userMap.set(m.user.id, { id: m.user.id, name: m.user.name, email: m.user.email });
			}
			const teamList: { id: string; name: string | null }[] = [];
			for (const t of project.teams) {
				teamList.push({ id: t.team.id, name: t.team.name });
				for (const tm of t.team.members) {
					if (tm.user) userMap.set(tm.user.id, { id: tm.user.id, name: tm.user.name, email: tm.user.email });
				}
			}

			return { users: Array.from(userMap.values()), teams: teamList } as const;
		}),

	publish: protectedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				name: z.string().optional(),
				description: z.string().optional(),
				tagline: z.string().optional(),
				logo: z.string().optional(),
				website: z.string().optional(),
				stage: z.enum(["IDEA", "MVP", "BETA", "LAUNCHED", "GROWTH", "SCALE", "EXIT"]).optional(),
				industry: z.array(z.string()).optional(),
				tags: z.array(z.string()).optional(),
				revenueModel: z.array(z.string()).optional(),
				targetMarket: z.string().optional(),
				competitiveEdge: z.string().optional(),
				fundingGoal: z.number().optional(),
				location: z.string().optional(),
				isRemoteFriendly: z.boolean().optional(),
				isHiring: z.boolean().optional(),
				isActive: z.boolean().optional(),
				isPublic: z.boolean().optional(),
				status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
				spaceId: z.string().optional().nullable(),
				workspaceId: z.string().optional().nullable(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const id = input.id;
			const baseData: any = {
				ownerId: ctx.session!.user!.id,
				name: input.name,
				description: input.description,
				tagline: input.tagline,
				logo: input.logo,
				website: input.website,
				stage: input.stage,
				industry: input.industry,
				tags: input.tags,
				revenueModel: input.revenueModel,
				targetMarket: input.targetMarket,
				competitiveEdge: input.competitiveEdge,
				fundingGoal: input.fundingGoal,
				location: input.location,
				isRemoteFriendly: input.isRemoteFriendly,
				isHiring: input.isHiring,
				isActive: input.isActive ?? true,
				isPublic: input.isPublic ?? true,
				isActive: input.isActive ?? true,
				isPublic: input.isPublic ?? true,
				status: "PUBLISHED",
				// Only add default views if creating
				...(id ? {} : {
					views: {
						createMany: {
							data: [
								{ name: "Overview", type: ViewType.OVERVIEW, position: 0, createdBy: ctx.session!.user!.id, isDefault: true },
								{ name: "List", type: ViewType.LIST, position: 1, createdBy: ctx.session!.user!.id },
								{ name: "Board", type: ViewType.BOARD, position: 2, createdBy: ctx.session!.user!.id },
							]
						}
					}
				})
			};

			if (input.spaceId !== undefined) {
				baseData.spaceId = input.spaceId === null ? undefined : input.spaceId;
			}
			if (input.workspaceId !== undefined) {
				baseData.workspaceId = input.workspaceId === null ? undefined : input.workspaceId;
			}

			const createdOrUpdated = id
				? await prisma.project.update({ where: { id }, data: baseData })
				: await prisma.project.create({ data: { id: input.id as any, ...baseData } });
			return { id: createdOrUpdated.id, data: createdOrUpdated } as const;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().optional(),
				description: z.string().optional(),
				status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
				spaceId: z.string().optional(),
				workspaceId: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			await LimitGuard.ensureWithinCreateLimit(ctx.session!.user!.id, 'PROJECT');
			const baseData: any = {
				ownerId: ctx.session!.user!.id,
				name: input.name,
				description: input.description,
				status: input.status ?? "DRAFT",
				spaceId: input.spaceId,
				workspaceId: input.workspaceId,
				views: {
					createMany: {
						data: [
							{ name: "Overview", type: ViewType.OVERVIEW, position: 0, createdBy: ctx.session!.user!.id, isDefault: true },
							{ name: "List", type: ViewType.LIST, position: 1, createdBy: ctx.session!.user!.id },
							{ name: "Board", type: ViewType.BOARD, position: 2, createdBy: ctx.session!.user!.id },
						]
					}
				}
			};

			const created = await prisma.project.create({ data: baseData });

			// Update usage for project creation
			try {
				await UsageManager.updateServiceUsage(
					ctx.session!.user!.id,
					ctx.session!.user!.name || ctx.session!.user!.email || "",
					"PROJECT" as any,
					1,
					ctx.session!.user!.email || undefined
				);
			} catch (e) {
				console.error("Project usage update failed:", e);
			}

			return { id: created.id, data: created } as const;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				description: z.string().optional(),
				tagline: z.string().optional(),
				logo: z.string().optional(),
				website: z.string().optional(),
				stage: z.enum(["IDEA", "MVP", "BETA", "LAUNCHED", "GROWTH", "SCALE", "EXIT"]).optional(),
				industry: z.array(z.string()).optional(),
				tags: z.array(z.string()).optional(),
				revenueModel: z.array(z.string()).optional(),
				targetMarket: z.string().optional(),
				competitiveEdge: z.string().optional(),
				fundingGoal: z.number().optional(),
				location: z.string().optional(),
				isRemoteFriendly: z.boolean().optional(),
				isHiring: z.boolean().optional(),
				isActive: z.boolean().optional(),
				isPublic: z.boolean().optional(),
				spaceId: z.string().optional().nullable(),
				workspaceId: z.string().optional().nullable(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			await LimitGuard.ensureCanModify(ctx.session!.user!.id, 'PROJECT');
			const { id, ...updateData } = input;

			const data: any = { ...updateData };
			// Keep null values as is to properly set them to NULL in the database
			// This ensures that when we want to detach a project by setting spaceId/workspaceId to null,
			// the values are properly set to NULL in the database

			const updated = await prisma.project.update({
				where: { id, ownerId: ctx.session!.user!.id },
				data
			});
			return { id: updated.id, data: updated } as const;
		}),

	saveDraft: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				description: z.string().optional(),
				tagline: z.string().optional(),
				logo: z.string().optional(),
				website: z.string().optional(),
				stage: z.enum(["IDEA", "MVP", "BETA", "LAUNCHED", "GROWTH", "SCALE", "EXIT"]).optional(),
				industry: z.array(z.string()).optional(),
				tags: z.array(z.string()).optional(),
				revenueModel: z.array(z.string()).optional(),
				targetMarket: z.string().optional(),
				competitiveEdge: z.string().optional(),
				fundingGoal: z.number().optional(),
				location: z.string().optional(),
				isRemoteFriendly: z.boolean().optional(),
				isHiring: z.boolean().optional(),
				isActive: z.boolean().optional(),
				isPublic: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			await LimitGuard.ensureCanModify(ctx.session!.user!.id, 'PROJECT');
			const { id, ...updateData } = input;
			const baseData: any = {
				...updateData,
				status: "DRAFT",
			};

			const updated = await prisma.project.update({
				where: { id, ownerId: ctx.session!.user!.id },
				data: baseData
			});
			return { id: updated.id, data: updated } as const;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const deleted = await prisma.project.delete({
				where: { id: input.id, ownerId: ctx.session!.user!.id }
			});
			return deleted.id;
		}),

	archive: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const updated = await prisma.project.update({
				where: { id: input.id, ownerId: ctx.session!.user!.id },
				data: { status: "ARCHIVED" },
			});
			return updated.id;
		}),

	// Public endpoints similar to proposals
	getSinglePublicProject: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			return prisma.project.findFirst({
				where: { id: input.id, isPublic: true, status: "PUBLISHED" },
				include: {
					owner: { select: { id: true, name: true, email: true } },
					likes: { select: { userId: true } },
				}
			});
		}),

	getPublicProjects: protectedProcedure
		.input(z.object({
			query: z.string().optional(),
			stage: z.enum(["IDEA", "MVP", "BETA", "LAUNCHED", "GROWTH", "SCALE", "EXIT"]).optional(),
			industry: z.array(z.string()).optional(),
			location: z.string().optional(),
			sortBy: z.enum(["relevance", "latest"]).optional().default("latest"),
			page: z.number().int().min(1).optional().default(1),
			pageSize: z.number().int().min(1).max(50).optional().default(12),
		}))
		.query(async ({ input }) => {
			const where: any = { isPublic: true, status: "PUBLISHED" };
			if (input.query) {
				where.OR = [
					{ name: { contains: input.query, mode: "insensitive" } },
					{ description: { contains: input.query, mode: "insensitive" } },
					{ tagline: { contains: input.query, mode: "insensitive" } },
				];
			}
			if (input.stage) where.stage = input.stage;
			if (input.industry && input.industry.length > 0) where.industry = { hasSome: input.industry };
			if (input.location) where.location = { contains: input.location, mode: "insensitive" };
			const skip = (input.page - 1) * input.pageSize;
			const take = input.pageSize;
			const [total, items] = await Promise.all([
				prisma.project.count({ where }),
				prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take, include: { owner: true, likes: true } })
			]);
			return { items, total, page: input.page, pageSize: input.pageSize };
		}),

	toggleInterest: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const existing = await prisma.projectLike.findFirst({ where: { projectId: input.projectId, userId } });
			if (existing) {
				await prisma.projectLike.delete({ where: { id: existing.id } });
				return { interested: false } as const;
			}
			await prisma.projectLike.create({ data: { projectId: input.projectId, userId } });
			return { interested: true } as const;
		}),

	getDiscussionViewPermission: protectedProcedure
		.input(z.object({ postId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const post = await prisma.post.findUnique({ where: { id: input.postId }, select: { projectId: true } });
			if (!post?.projectId) return null;
			const canView = await prisma.project.findFirst({
				where: {
					id: post.projectId,
					OR: [
						{ ownerId: userId },
						{ members: { some: { userId, isBlocked: false, canViewProject: true } } },
						{ teams: { some: { team: { members: { some: { userId } } } } } },
					],
				},
				select: { id: true },
			});
			if (!canView) return null;
			return post.projectId;
		}),
});
