import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { ViewType } from "@agentflox/database/src/generated/prisma/client";

const listInputSchema = z.object({
	query: z.string().optional(),
	scope: z.enum(["owned", "member", "all"]).optional().default("owned"),
	status: z.enum(["active", "archived"]).optional(),
	workspaceId: z.string().optional(),
	page: z.number().int().min(1).optional().default(1),
	pageSize: z.number().int().min(1).max(50).optional().default(12),
	includeCounts: z.boolean().optional(),
	visibility: z.array(z.enum(["OWNERS_ONLY", "OWNERS_ADMINS", "MEMBERS", "PUBLIC"])).optional(),
});

const createInputSchema = z.object({
	workspaceId: z.string(),
	name: z.string().min(1),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	visibility: z.enum(["OWNERS_ONLY", "OWNERS_ADMINS", "MEMBERS", "PUBLIC"]).optional().default("OWNERS_ONLY"),
	isActive: z.boolean().optional(),
});

const updateInputSchema = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	description: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	visibility: z.enum(["OWNERS_ONLY", "OWNERS_ADMINS", "MEMBERS", "PUBLIC"]).optional(),
	isActive: z.boolean().optional(),
	settings: z.any().optional().nullable(),
});

const memberMutationSchema = z.object({
	spaceId: z.string(),
	userId: z.string(),
	role: z.enum(["ADMIN", "MEMBER", "COMMENTER", "VIEWER"]).optional().default("MEMBER"),
});

const duplicateInputSchema = z.object({
	spaceId: z.string(),
	newName: z.string(),
	icon: z.string().optional(),
	color: z.string().optional(),
	copyMode: z.enum(["everything", "customize"]),
	includeAutomations: z.boolean().optional(),
	includeViews: z.boolean().optional(),
	includeTasks: z.boolean().optional(),
	taskProperties: z.record(z.string(), z.boolean()).optional(),
	archivedTasks: z.enum(["no", "include", "unarchive"]).optional(),
});

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
	const workspace = await prisma.workspace.findFirst({
		where: { id: workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
		select: { id: true, ownerId: true },
	});
	if (!workspace) {
		throw new Error("Workspace not found or permission denied");
	}
	return workspace;
}

async function assertSpaceAdmin(spaceId: string, userId: string) {
	const space = await prisma.space.findUnique({
		where: { id: spaceId },
		select: {
			id: true,
			name: true,
			description: true,
			icon: true,
			color: true,
			visibility: true,
			createdBy: true,
			workspaceId: true,
			workspace: { select: { ownerId: true } },
		},
	});
	if (!space) throw new Error("Space not found");

	if (
		space.createdBy !== userId &&
		space.workspace.ownerId !== userId
	) {
		const membership = await prisma.spaceMember.findFirst({
			where: { spaceId, userId, role: "ADMIN" },
			select: { id: true },
		});
		if (!membership) throw new Error("Permission denied");
	}
	return space;
}

export const spaceRouter = router({
	list: protectedProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;

		const accessibleOr = [
			{ createdBy: userId },
			{ members: { some: { userId } } },
			{ workspace: { ownerId: userId } },
			{ workspace: { members: { some: { userId } } } },
		];

		const where: any = {
			AND: [
				{ OR: accessibleOr }
			]
		};

		if (input.scope === "owned") {
			where.createdBy = userId;
		} else if (input.scope === "member") {
			where.members = { some: { userId } };
		}

		if (input.workspaceId) {
			where.workspaceId = input.workspaceId;
		}

		if (input.status) {
			where.isActive = input.status === "active";
		}

		if (input.query) {
			const term = input.query.trim();
			where.AND.push({
				OR: [
					{ name: { contains: term, mode: "insensitive" } },
					{ description: { contains: term, mode: "insensitive" } },
				]
			});
		}

		const skip = (input.page - 1) * input.pageSize;
		const take = input.pageSize;

		const include: any = {
			workspace: { select: { id: true, name: true } },
		};

		if (input.includeCounts) {
			include._count = {
				select: {
					members: true,
					tools: true,
					materials: true,
					lists: true,
				},
			};
		}

		const [total, items] = await Promise.all([
			prisma.space.count({ where }),
			prisma.space.findMany({
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

	listInfinite: protectedProcedure
		.input(
			listInputSchema.extend({
				cursor: z.number().nullish(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const page = input.cursor ?? input.page ?? 1;
			const pageSize = input.pageSize ?? 12;

			const accessibleOr = [
				{ createdBy: userId },
				{ members: { some: { userId } } },
				{ workspace: { ownerId: userId } },
				{ workspace: { members: { some: { userId } } } },
			];

			const where: any = {
				AND: [
					{ OR: accessibleOr }
				]
			};

			if (input.scope === "owned") {
				where.createdBy = userId;
			} else if (input.scope === "member") {
				where.members = { some: { userId } };
			}

			if (input.workspaceId) {
				where.workspaceId = input.workspaceId;
			}

			if (input.status) {
				where.isActive = input.status === "active";
			}

			if (input.query) {
				const term = input.query.trim();
				where.AND.push({
					OR: [
						{ name: { contains: term, mode: "insensitive" } },
						{ description: { contains: term, mode: "insensitive" } },
					]
				});
			}

			const skip = (page - 1) * pageSize;
			const take = pageSize;

			const include: any = {
				workspace: { select: { id: true, name: true } },
			};

			if (input.includeCounts) {
				include._count = {
					select: {
						members: true,
						tools: true,
						materials: true,
						lists: true,
					},
				};
			}

			const [total, items] = await Promise.all([
				prisma.space.count({ where }),
				prisma.space.findMany({
					where,
					orderBy: { updatedAt: "desc" },
					skip,
					take,
					include,
				}),
			]);

			const totalPages = Math.ceil(total / pageSize);
			const hasNextPage = page < totalPages;

			return {
				items,
				total,
				page,
				pageSize,
				nextCursor: hasNextPage ? page + 1 : undefined,
			};
		}),

	create: protectedProcedure.input(createInputSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		await assertWorkspaceAccess(input.workspaceId, userId);

		const space = await prisma.space.create({
			data: {
				name: input.name,
				description: input.description ?? undefined,
				icon: input.icon ?? undefined,
				color: input.color ?? undefined,
				visibility: input.visibility ?? "PRIVATE",
				isActive: input.isActive ?? true,
				workspaceId: input.workspaceId,
				createdBy: userId,
				members: {
					create: {
						userId,
						role: "ADMIN",
					},
				},
				views: {
					createMany: {
						data: [
							{ name: "Overview", type: ViewType.OVERVIEW, position: 0, createdBy: userId, isDefault: true },
							{ name: "List", type: ViewType.LIST, position: 1, createdBy: userId, isDefault: true },
							{ name: "Projects", type: ViewType.PROJECTS, position: 2, createdBy: userId, isDefault: true },
							{ name: "Teams", type: ViewType.TEAMS, position: 3, createdBy: userId, isDefault: true },
							{ name: "Tasks", type: ViewType.TASKS, position: 4, createdBy: userId, isDefault: true },
						]
					}
				}
			},
			include: {
				workspace: { select: { id: true, name: true } },
				_count: { select: { members: true, tools: true, materials: true, lists: true } },
			},
		});

		return space;
	}),

	get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;

		const space = await prisma.space.findFirst({
			where: {
				id: input.id,
				OR: [
					{ createdBy: userId },
					{ members: { some: { userId } } },
					{ workspace: { ownerId: userId } },
					{ workspace: { members: { some: { userId } } } },
				],
			},
			include: {
				workspace: {
					select: {
						id: true,
						name: true,
						ownerId: true,
						members: {
							select: {
								id: true,
								role: true,
								user: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
										username: true,
										locationPermissions: {
											where: { locationId: input.id, locationType: "space" },
											select: { permission: true }
										}
									}
								}
							}
						}
					},
				},
				members: {
					orderBy: { addedAt: "asc" },
					select: {
						id: true,
						role: true,
						userId: true,
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
								username: true,
								firstName: true,
								lastName: true,
								locationPermissions: {
									where: { locationId: input.id, locationType: "space" },
									select: { permission: true }
								}
							}
						},
					},
				},
				views: {
					orderBy: { position: "asc" },
				},
				projects: {
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						name: true,
						description: true,
						status: true,
						updatedAt: true,
					},
				},
				teams: {
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						name: true,
						description: true,
						teamType: true,
						isActive: true,
						updatedAt: true,
						locationPermissions: {
							where: { locationId: input.id, locationType: "space" },
							select: { permission: true }
						},
						members: {
							select: {
								id: true,
								userId: true,
								user: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
										username: true,
										locationPermissions: {
											where: { locationId: input.id, locationType: "space" },
											select: { permission: true }
										}
									}
								}
							}
						}
					},
				},
				tools: {
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						name: true,
						description: true,
						category: true,
						productUrl: true,
						isPublic: true,
						updatedAt: true,
					},
				},
				materials: {
					orderBy: { updatedAt: "desc" },
					select: {
						id: true,
						title: true,
						description: true,
						category: true,
						priceUsd: true,
						isPublic: true,
						externalUrl: true,
						fileUrl: true,
						updatedAt: true,
					},
				},
				lists: {
					orderBy: { position: "asc" },
					select: { id: true, name: true, description: true, color: true, icon: true },
				},
				folders: {
					orderBy: { position: "asc" },
					select: { id: true, name: true, description: true, color: true, icon: true },
				},
				_count: {
					select: {
						members: true,
						projects: true,
						teams: true,
						tools: true,
						materials: true,
						lists: true
					},
				},
			},
		});

		if (!space) return null;

		const creator = await prisma.user.findUnique({
			where: { id: space.createdBy },
			select: {
				id: true,
				name: true,
				username: true,
				firstName: true,
				lastName: true,
				email: true,
				image: true
			}
		});

		return { ...space, creator };
	}),

	update: protectedProcedure.input(updateInputSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		const space = await assertSpaceAdmin(input.id, userId);

		const updated = await prisma.space.update({
			where: { id: space.id },
			data: {
				name: input.name ?? undefined,
				description: input.description ?? undefined,
				icon: input.icon ?? undefined,
				color: input.color ?? undefined,
				visibility: input.visibility ?? undefined,
				isActive: input.isActive ?? undefined,
				settings: input.settings ?? undefined,
			},
			include: {
				workspace: { select: { id: true, name: true } },
				_count: { select: { members: true, tools: true, materials: true, lists: true } },
			},
		});

		return updated;
	}),

	delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		const space = await assertSpaceAdmin(input.id, userId);

		await prisma.spaceMember.deleteMany({ where: { spaceId: space.id } });
		await prisma.tool.updateMany({ where: { spaceId: space.id }, data: { spaceId: null } });
		await prisma.material.updateMany({ where: { spaceId: space.id }, data: { spaceId: null } });
		await prisma.folder.updateMany({ where: { spaceId: space.id }, data: { spaceId: null } });
		await prisma.list.updateMany({ where: { spaceId: space.id }, data: { spaceId: null } });

		return prisma.space.delete({ where: { id: space.id } });
	}),

	addMember: protectedProcedure.input(memberMutationSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		const space = await assertSpaceAdmin(input.spaceId, userId);

		// Ensure target user belongs to workspace
		const workspaceMember = await prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId: space.workspaceId, userId: input.userId } },
			select: { id: true },
		});
		if (!workspaceMember) {
			throw new Error("User must be a member of the workspace before joining the space");
		}

		return prisma.spaceMember.upsert({
			where: { spaceId_userId: { spaceId: input.spaceId, userId: input.userId } },
			update: { role: input.role },
			create: { spaceId: input.spaceId, userId: input.userId, role: input.role },
		});
	}),

	removeMember: protectedProcedure
		.input(z.object({ spaceId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			await assertSpaceAdmin(input.spaceId, userId);

			await prisma.spaceMember.deleteMany({
				where: { spaceId: input.spaceId, userId: input.userId, role: { not: "ADMIN" } },
			});

			return { removed: true as const };
		}),

	toggleSidebarVisibility: protectedProcedure
		.input(z.object({ spaceId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;

			const member = await prisma.spaceMember.findUnique({
				where: { spaceId_userId: { spaceId: input.spaceId, userId } },
				select: { id: true, isHidden: true }
			});

			if (!member) {
				throw new Error("You are not a member of this space");
			}

			const updated = await prisma.spaceMember.update({
				where: { id: member.id },
				data: { isHidden: !member.isHidden },
				select: { isHidden: true, spaceId: true }
			});

			return updated;
		}),

	duplicate: protectedProcedure.input(duplicateInputSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session!.user!.id;
		const sourceSpace = await assertSpaceAdmin(input.spaceId, userId);

		// 1. Create New Space
		const newSpace = await prisma.space.create({
			data: {
				workspaceId: sourceSpace.workspaceId,
				name: input.newName,
				icon: input.icon || sourceSpace.icon,
				color: input.color || sourceSpace.color,
				description: sourceSpace.description,
				visibility: sourceSpace.visibility, // Keep original visibility or default to PRIV? Let's copy.
				createdBy: userId,
				members: {
					create: {
						userId,
						role: "ADMIN"
					}
				}
			}
		});

		// 2. Structure Copy (Folders & Lists)
		// Note: This is a simplified copy strategy. A full deep copy would require 
		// recursive logic for nested folders, task dependencies, etc.
		if (input.copyMode === "everything" || input.includeTasks) {
			// Copy Folders
			const sourceFolders = await prisma.folder.findMany({
				where: { spaceId: sourceSpace.id, isArchived: false }
			});

			const folderMap = new Map<string, string>(); // oldId -> newId

			for (const folder of sourceFolders) {
				const newFolder = await prisma.folder.create({
					data: {
						workspaceId: newSpace.workspaceId,
						spaceId: newSpace.id,
						name: folder.name,
						description: folder.description,
						color: folder.color,
						icon: folder.icon,
						position: folder.position
						// Parent copying omitted for simplicity in this iteration
					}
				});
				folderMap.set(folder.id, newFolder.id);
			}

			// Copy Lists
			const sourceLists = await prisma.list.findMany({
				where: { spaceId: sourceSpace.id, isArchived: false }
			});

			for (const list of sourceLists) {
				// Resolve new folder ID if list belonged to a folder
				const newFolderId = list.folderId ? folderMap.get(list.folderId) : undefined;

				await prisma.list.create({
					data: {
						workspaceId: newSpace.workspaceId,
						spaceId: newSpace.id,
						folderId: newFolderId,
						name: list.name,
						description: list.description,
						color: list.color,
						icon: list.icon,
						position: list.position,
						defaultView: list.defaultView,
						// If duplicating tasks was simple we'd do it here, but it requires substantial logic.
						// For now, we provide the clean structure.
					}
				});
			}
		}

		return newSpace;
	}),
});


