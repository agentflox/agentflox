import { z } from "zod";
import { ViewType, StatusType } from "@agentflox/database/src/generated/prisma/client";
import { router, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

// Validate list view config slice to reject malformed payloads; allow extra keys via passthrough
const filterConditionSchema = z.object({
	id: z.string(),
	field: z.string(),
	operator: z.string(),
	value: z.any(),
});
type FilterGroupInput = { id: string; operator: string; conditions: (unknown | FilterGroupInput)[] };
const filterGroupSchema: z.ZodType<FilterGroupInput> = z.lazy(() =>
	z.object({
		id: z.string(),
		operator: z.enum(["AND", "OR"]),
		conditions: z.array(z.union([filterConditionSchema, filterGroupSchema])),
	})
);
const listViewConfigSchema = z
	.object({
		groupBy: z.string().optional(),
		groupDirection: z.enum(["asc", "desc"]).optional(),
		subtasksMode: z.enum(["collapsed", "expanded", "separate"]).optional(),
		sortBy: z.string().optional(),
		sortDirection: z.enum(["asc", "desc"]).optional(),
		showCompleted: z.boolean().optional(),
		showCompletedSubtasks: z.boolean().optional(),
		visibleColumns: z.array(z.string()).optional(),
		showEmptyStatuses: z.boolean().optional(),
		wrapText: z.boolean().optional(),
		showTaskLocations: z.boolean().optional(),
		showSubtaskParentNames: z.boolean().optional(),
		showTaskProperties: z.boolean().optional(),
		showTasksFromOtherLists: z.boolean().optional(),
		showSubtasksFromOtherLists: z.boolean().optional(),
		pinDescription: z.boolean().optional(),
		viewAutosave: z.boolean().optional(),
		defaultToMeMode: z.boolean().optional(),
		filterGroups: filterGroupSchema.optional(),
		savedFilterPresets: z.array(z.object({ id: z.string(), name: z.string(), config: filterGroupSchema })).optional(),
	})
	.catchall(z.any());

const viewConfigSchema = z
	.object({
		listView: listViewConfigSchema.optional(),
	})
	.catchall(z.any())
	.optional()
	.nullable();

const createViewSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	type: z.enum(Object.keys(ViewType) as [keyof typeof ViewType, ...(keyof typeof ViewType)[]]),
	workspaceId: z.string().optional(),
	spaceId: z.string().optional(),
	projectId: z.string().optional(),
	teamId: z.string().optional(),
	listId: z.string().optional(),
	folderId: z.string().optional(),
	locationType: z.enum(["WORKSPACE", "SPACE", "PROJECT", "TEAM", "FOLDER", "LIST", "PERSONAL"]).optional(),
	isDefault: z.boolean().optional(),
	isShared: z.boolean().optional(),
	isPrivate: z.boolean().optional(),
	isPinned: z.boolean().optional(),
	isLocked: z.boolean().optional(),
	sidebarView: z.boolean().optional(),
	sidebarOrder: z.number().optional(),
	config: viewConfigSchema,
	filters: z.any().optional(),
	grouping: z.any().optional(),
	sorting: z.any().optional(),
	columns: z.any().optional(),
});

const updateViewSchema = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	description: z.string().optional().nullable(),
	config: viewConfigSchema,
	filters: z.any().optional().nullable(),
	grouping: z.any().optional().nullable(),
	sorting: z.any().optional().nullable(),
	columns: z.any().optional().nullable(),
	isDefault: z.boolean().optional(),
	isShared: z.boolean().optional(),
	isPrivate: z.boolean().optional(),
	isPinned: z.boolean().optional(),
	isLocked: z.boolean().optional(),
	sidebarView: z.boolean().optional(),
	sidebarOrder: z.number().optional(),
	position: z.number().optional(),
});

export const viewRouter = router({
	create: protectedProcedure.input(createViewSchema).mutation(async ({ ctx, input }) => {
		// Basic validation: ensure at least one container is provided unless it's PERSONAL
		if (input.locationType !== "PERSONAL" && !input.workspaceId && !input.spaceId && !input.projectId && !input.teamId && !input.listId && !input.folderId) {
			throw new Error("View must be associated with a workspace, space, project, team, list, or folder");
		}

		// Basic access control should be here (e.g. check if user has access to spaceId) 
		// For now we assume the UI handles calling this correctly for accessible items, 
		// but ideally we'd fetch the container and check permissions.

		let workspaceId: string | null = null;
		if (input.spaceId) {
			const space = await prisma.space.findUnique({ where: { id: input.spaceId }, select: { workspaceId: true } });
			workspaceId = space?.workspaceId || null;
		} else if (input.projectId) {
			const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { workspaceId: true } });
			workspaceId = project?.workspaceId || null;
		} else if (input.listId) {
			const list = await prisma.list.findUnique({ where: { id: input.listId }, select: { workspaceId: true } });
			workspaceId = list?.workspaceId || null;
		} else if (input.teamId) {
			const team = await prisma.team.findUnique({ where: { id: input.teamId }, select: { workspaceId: true } });
			workspaceId = team?.workspaceId || null;
		} else if (input.folderId) {
			const folder = await prisma.folder.findUnique({ where: { id: input.folderId }, select: { workspaceId: true } });
			workspaceId = folder?.workspaceId || null;
		}

		const lastView = await prisma.view.findFirst({
			where: {
				spaceId: input.spaceId,
				projectId: input.projectId,
				teamId: input.teamId,
				listId: input.listId,
				folderId: input.folderId,
			},
			orderBy: { position: "desc" },
		});

		const position = (lastView?.position ?? 0) + 1000;

		const view = await prisma.view.create({
			data: {
				name: input.name,
				description: input.description,
				type: input.type,
				workspaceId: input.workspaceId || workspaceId,
				spaceId: input.spaceId,
				projectId: input.projectId,
				teamId: input.teamId,
				listId: input.listId,
				folderId: input.folderId,
				isDefault: input.isDefault ?? false,
				isShared: input.isShared ?? false,
				isPrivate: input.isPrivate ?? false,
				isPinned: input.isPinned ?? false,
				isLocked: input.isLocked ?? false,
				sidebarView: input.sidebarView ?? false,
				sidebarOrder: input.sidebarOrder,
				config: input.config as any,
				filters: input.filters as any,
				grouping: input.grouping as any,
				sorting: input.sorting as any,
				columns: input.columns as any,
				createdBy: ctx.session!.user!.id,
				position,
			},
		});

		if (view.type === "DOC") {
			await prisma.document.create({
				data: {
					title: "Untitled",
					content: "[]",
					workspaceId: input.workspaceId || workspaceId || null,
					viewId: view.id,
					spaceId: input.spaceId ?? null,
					projectId: input.projectId ?? null,
					listId: input.listId ?? null,
					teamId: input.teamId ?? null,
					folderId: input.folderId ?? null,
					locationType: (input.locationType as any) || "PERSONAL",
					createdBy: ctx.session!.user!.id,
				}
			});
		}

		return view;
	}),

	update: protectedProcedure.input(updateViewSchema).mutation(async ({ input }) => {
		const { id, ...data } = input;

		const view = await prisma.view.findUnique({ where: { id } });
		if (!view) throw new Error("View not found");

		// TODO: Strict permission check (owner/admin of container)

		return prisma.view.update({
			where: { id },
			data: {
				name: data.name ?? undefined,
				description: data.description !== undefined ? data.description : undefined,
				config: data.config as any,
				filters: data.filters as any,
				grouping: data.grouping as any,
				sorting: data.sorting as any,
				columns: data.columns as any,
				isDefault: data.isDefault ?? undefined,
				isShared: data.isShared ?? undefined,
				isPrivate: data.isPrivate ?? undefined,
				isPinned: data.isPinned ?? undefined,
				isLocked: data.isLocked ?? undefined,
				sidebarView: data.sidebarView ?? undefined,
				sidebarOrder: data.sidebarOrder ?? undefined,
				position: data.position ?? undefined,
			},
		});
	}),

	updateMany: protectedProcedure.input(z.object({
		where: z.object({
			spaceId: z.string().optional(),
			projectId: z.string().optional(),
			teamId: z.string().optional(),
			listId: z.string().optional(),
		}),
		data: z.object({
			config: z.any().optional().nullable(),
		})
	})).mutation(async ({ input }) => {
		const { where, data } = input;

		return prisma.view.updateMany({
			where: {
				spaceId: where.spaceId,
				projectId: where.projectId,
				teamId: where.teamId,
				listId: where.listId,
			},
			data: {
				config: data.config as any,
			},
		});
	}),

	delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
		const view = await prisma.view.findUnique({ where: { id: input.id } });
		if (!view) throw new Error("View not found");

		// TODO: Strict permission check

		return prisma.view.delete({
			where: { id: input.id },
		});
	}),

	list: protectedProcedure.input(z.object({
		workspaceId: z.string().optional(),
		spaceId: z.string().optional(),
		projectId: z.string().optional(),
		teamId: z.string().optional(),
		listId: z.string().optional(),
		type: z.enum(Object.keys(ViewType) as [keyof typeof ViewType, ...(keyof typeof ViewType)[]]).optional(),
		sidebarView: z.boolean().optional(),
	})).query(async ({ input }) => {
		const where: any = {};
		if (input.workspaceId) where.workspaceId = input.workspaceId;
		if (input.spaceId) where.spaceId = input.spaceId;
		if (input.projectId) where.projectId = input.projectId;
		if (input.teamId) where.teamId = input.teamId;
		if (input.listId) where.listId = input.listId;
		if (input.type) where.type = input.type;
		if (input.sidebarView !== undefined) where.sidebarView = input.sidebarView;

		if (Object.keys(where).length === 0) {
			throw new Error("Must provide at least one filter");
		}

		return prisma.view.findMany({
			where,
			orderBy: { position: "asc" },
			include: {
				creator: {
					select: {
						id: true,
						name: true,
						image: true,
					}
				}
			}
		});
	}),

	get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
		const view = await prisma.view.findUnique({
			where: { id: input.id },
			include: {
				shares: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
						team: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
				creator: {
					select: {
						id: true,
						name: true,
						image: true,
					}
				}
			}
		});
		if (!view) throw new Error("View not found");
		return view;
	}),

	createFromTemplate: protectedProcedure.input(z.object({
		templateId: z.string(),
		spaceId: z.string().optional(),
		projectId: z.string().optional(),
		teamId: z.string().optional(),
		listId: z.string().optional(),
	})).mutation(async ({ ctx, input }) => {
		const template = await prisma.template.findUnique({ where: { id: input.templateId } });
		if (!template) throw new Error("Template not found");
		if (template.entityType !== "VIEW") throw new Error("Invalid template type");

		const content = template.content as any;

		const lastView = await prisma.view.findFirst({
			where: {
				spaceId: input.spaceId,
				projectId: input.projectId,
				teamId: input.teamId,
				listId: input.listId,
			},
			orderBy: { position: "desc" },
		});

		const position = (lastView?.position ?? 0) + 1000;

		return prisma.view.create({
			data: {
				name: template.name,
				type: content.type as ViewType,
				spaceId: input.spaceId,
				projectId: input.projectId,
				teamId: input.teamId,
				listId: input.listId,
				config: content.config ?? undefined,
				filters: content.filters ?? undefined,
				grouping: content.grouping ?? undefined,
				sorting: content.sorting ?? undefined,
				columns: content.columns ?? undefined,
				createdBy: ctx.session!.user!.id,
				position,
			},
		});
	}),

	reorder: protectedProcedure.input(z.array(z.object({
		id: z.string(),
		position: z.number()
	}))).mutation(async ({ input }) => {
		// Batch update positions
		// Since prisma doesn't support bulk update with different values easily in one query without raw SQL,
		// we'll loop for now or use transaction.
		return prisma.$transaction(
			input.map((item) =>
				prisma.view.update({
					where: { id: item.id },
					data: { position: item.position }
				})
			)
		);
	}),

	// View Sharing
	share: protectedProcedure.input(z.object({
		viewId: z.string(),
		userId: z.string().optional(),
		teamId: z.string().optional(),
		permission: z.enum(["VIEW", "COMMENT", "FULL"]).default("VIEW"),
	})).mutation(async ({ input }) => {
		if (!input.userId && !input.teamId) {
			throw new Error("Must provide userId or teamId");
		}

		return prisma.viewShare.create({
			data: {
				viewId: input.viewId,
				userId: input.userId,
				teamId: input.teamId,
				permission: input.permission,
			},
		});
	}),

	getShares: protectedProcedure.input(z.object({
		viewId: z.string(),
	})).query(async ({ input }) => {
		return prisma.viewShare.findMany({
			where: { viewId: input.viewId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				team: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
	}),

	updateShare: protectedProcedure.input(z.object({
		shareId: z.string(),
		permission: z.enum(["VIEW", "COMMENT", "FULL"]),
	})).mutation(async ({ input }) => {
		return prisma.viewShare.update({
			where: { id: input.shareId },
			data: { permission: input.permission },
		});
	}),

	removeShare: protectedProcedure.input(z.object({
		shareId: z.string(),
	})).mutation(async ({ input }) => {
		return prisma.viewShare.delete({
			where: { id: input.shareId },
		});
	}),
	submitPublicFormResponse: protectedProcedure // TODO: Make public when ready
		.input(z.object({ viewId: z.string(), values: z.any() }))
		.mutation(async ({ input }) => {
			const view = await prisma.view.findUnique({ where: { id: input.viewId } });
			if (!view || !view.isShared) throw new Error("View not found or not public");
			// Store submission somewhere...
			return { success: true };
		}),

	getPublicForm: protectedProcedure // TODO: Make public when ready
		.input(z.object({ viewId: z.string() }))
		.query(async ({ input }) => {
			const view = await prisma.view.findUnique({
				where: { id: input.viewId },
				select: { id: true, name: true, config: true, isShared: true }
			});
			if (!view || !view.isShared) throw new Error("View not found or not public");
			return view;
		}),
});
