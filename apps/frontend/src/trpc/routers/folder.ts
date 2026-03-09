import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

async function assertContextAccess(
    workspaceId: string | undefined,
    spaceId: string | undefined,
    projectId: string | undefined,
    teamId: string | undefined,
    userId: string
) {
    // At least one context must be provided
    if (!workspaceId && !spaceId && !projectId && !teamId) {
        throw new Error("At least one context (workspace, space, project, or team) must be provided");
    }

    // If workspaceId is provided, verify access
    if (workspaceId) {
        const workspace = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });

        if (!workspace) {
            throw new Error("Workspace not found or permission denied");
        }
    }

    // If projectId is provided, verify access
    if (projectId) {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true, workspaceId: true },
        });

        if (!project) {
            throw new Error("Project not found or permission denied");
        }

        // Use project's workspaceId if workspaceId not provided
        if (!workspaceId && project.workspaceId) {
            return project.workspaceId;
        }
    }

    // If teamId is provided, verify access
    if (teamId) {
        const team = await prisma.team.findFirst({
            where: {
                id: teamId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true, workspaceId: true },
        });

        if (!team) {
            throw new Error("Team not found or permission denied");
        }

        // Use team's workspaceId if workspaceId not provided
        if (!workspaceId && team.workspaceId) {
            return team.workspaceId;
        }
    }

    // If spaceId is provided, verify access
    if (spaceId) {
        const space = await prisma.space.findFirst({
            where: {
                id: spaceId,
                workspace: {
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId } } },
                    ],
                },
            },
            select: { id: true, workspaceId: true },
        });

        if (!space) {
            throw new Error("Space not found or permission denied");
        }

        // Use space's workspaceId if workspaceId not provided
        if (!workspaceId && space.workspaceId) {
            return space.workspaceId;
        }
    }

    return workspaceId;
}

const baseContextSchema = z.object({
    workspaceId: z.string().optional().nullable(),
    spaceId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    teamId: z.string().optional().nullable(),
});

const contextSchema = baseContextSchema.refine(
    (data) => data.workspaceId || data.spaceId || data.projectId || data.teamId,
    {
        message: "At least one context (workspace, space, project, or team) must be provided",
    }
);

export const folderRouter = router({
    byContext: protectedProcedure
        .input(
            baseContextSchema
                .extend({
                    archived: z.boolean().optional(),
                })
                .refine(
                    (data) =>
                        data.workspaceId || data.spaceId || data.projectId || data.teamId,
                    {
                        message:
                            "At least one context (workspace, space, project, or team) must be provided",
                    }
                )
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;
            const resolvedWorkspaceId = await assertContextAccess(
                input.workspaceId,
                input.spaceId,
                input.projectId,
                input.teamId,
                userId
            );

            const where: any = {};

            if (resolvedWorkspaceId) where.workspaceId = resolvedWorkspaceId;
            if (input.spaceId) where.spaceId = input.spaceId;
            if (input.projectId) where.projectId = input.projectId;
            if (input.teamId) where.teamId = input.teamId;

            // Filter by archived status (default to false if not specified)
            if (input.archived !== undefined) {
                where.isArchived = input.archived;
            } else {
                where.isArchived = false;
            }

            const folders = await prisma.folder.findMany({
                where,
                orderBy: { position: "asc" },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true,
                    icon: true,
                    workspaceId: true,
                    spaceId: true,
                    projectId: true,
                    teamId: true,
                    views: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            description: true,
                            config: true,
                            filters: true,
                            grouping: true,
                            sorting: true,
                            columns: true,
                            position: true,
                            isDefault: true,
                            isShared: true,
                            isPrivate: true,
                            isPinned: true,
                            isLocked: true,
                            isAutosave: true,
                            createdBy: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                        orderBy: { position: "asc" },
                    },
                },
            });

            return { items: folders };
        }),

    create: protectedProcedure
        .input(
            baseContextSchema
                .extend({
                    name: z.string().min(1),
                    description: z.string().optional().nullable(),
                    color: z.string().optional().nullable(),
                    icon: z.string().optional().nullable(),
                    position: z.number().int().optional(),
                    parentFolderId: z.string().optional(),
                })
                .refine(
                    (data) =>
                        data.workspaceId || data.spaceId || data.projectId || data.teamId,
                    {
                        message:
                            "At least one context (workspace, space, project, or team) must be provided",
                    }
                )
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;
            const resolvedWorkspaceId = await assertContextAccess(
                input.workspaceId,
                input.spaceId,
                input.projectId,
                input.teamId,
                userId
            );

            // Only throw if we have NO context at all and couldn't resolve a workspace
            if (!resolvedWorkspaceId && !input.projectId && !input.teamId && !input.spaceId) {
                throw new Error("Unable to resolve workspace context");
            }

            const position =
                input.position ??
                (await prisma.folder.count({
                    where: resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : { projectId: input.projectId, teamId: input.teamId },
                }));

            // Create folder with default views in a transaction
            const folder = await prisma.$transaction(async (tx) => {
                // Create the folder
                const newFolder = await tx.folder.create({
                    data: {
                        name: input.name,
                        description: input.description ?? undefined,
                        color: input.color ?? undefined,
                        icon: input.icon ?? undefined,
                        position,
                        workspaceId: resolvedWorkspaceId ?? undefined,
                        spaceId: input.spaceId ?? undefined,
                        projectId: input.projectId ?? undefined,
                        teamId: input.teamId ?? undefined,
                        parentId: input.parentFolderId ?? undefined,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true,
                        icon: true,
                        position: true,
                        workspaceId: true,
                        spaceId: true,
                        projectId: true,
                        teamId: true,
                    },
                });

                // Create default views for the folder (List and Board)
                const defaultViews = [
                    { name: "List", type: "LIST" as const, position: 0 },
                    { name: "Board", type: "BOARD" as const, position: 1 },
                ];

                await Promise.all(
                    defaultViews.map((view) =>
                        tx.view.create({
                            data: {
                                folderId: newFolder.id,
                                name: view.name,
                                type: view.type,
                                position: view.position,
                                createdBy: userId,
                                isDefault: view.position === 0, // First view is default
                            },
                        })
                    )
                );

                return newFolder;
            });

            return folder;
        }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;

            const folder = await prisma.folder.findFirst({
                where: {
                    id: input.id,
                    workspace: {
                        OR: [
                            { ownerId: userId },
                            { members: { some: { userId } } },
                        ],
                    },
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true,
                    icon: true,
                    position: true,
                    workspaceId: true,
                    spaceId: true,
                    projectId: true,
                    teamId: true,
                    parentId: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                    views: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            description: true,
                            config: true,
                            filters: true,
                            grouping: true,
                            sorting: true,
                            columns: true,
                            position: true,
                            isDefault: true,
                            isShared: true,
                            isPrivate: true,
                            isPinned: true,
                            isLocked: true,
                            isAutosave: true,
                            createdBy: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                        orderBy: { position: "asc" },
                    },
                },
            });

            if (!folder) {
                throw new Error("Folder not found or permission denied");
            }

            return folder;
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                description: z.string().optional().nullable(),
                color: z.string().optional().nullable(),
                icon: z.string().optional().nullable(),
                position: z.number().int().optional(),
                isArchived: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;

            // Verify folder exists and user has access
            const folder = await prisma.folder.findFirst({
                where: {
                    id: input.id,
                    workspace: {
                        OR: [
                            { ownerId: userId },
                            { members: { some: { userId } } },
                        ],
                    },
                },
                select: { id: true, workspaceId: true },
            });

            if (!folder) {
                throw new Error("Folder not found or permission denied");
            }

            // Update the folder
            const updatedFolder = await prisma.folder.update({
                where: { id: input.id },
                data: {
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.color !== undefined && { color: input.color }),
                    ...(input.icon !== undefined && { icon: input.icon }),
                    ...(input.position !== undefined && { position: input.position }),
                    ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true,
                    icon: true,
                    position: true,
                    isArchived: true,
                    workspaceId: true,
                    spaceId: true,
                    projectId: true,
                    teamId: true,
                },
            });

            return updatedFolder;
        }),
});
