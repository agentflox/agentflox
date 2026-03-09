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
  folderId: z.string().optional().nullable(),
});

const contextSchema = baseContextSchema.refine(
  (data) => data.workspaceId || data.spaceId || data.projectId || data.teamId,
  {
    message: "At least one context (workspace, space, project, or team) must be provided",
  }
);

export const listRouter = router({
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

      // If we couldn't resolve a workspace, it's okay for standalone projects/teams
      // but we still need to filter by something if possible, or we just rely on projectId/teamId
      const where: any = {};

      if (resolvedWorkspaceId) where.workspaceId = resolvedWorkspaceId;
      if (input.spaceId) where.spaceId = input.spaceId;
      if (input.projectId) where.projectId = input.projectId;
      if (input.teamId) where.teamId = input.teamId;
      if (input.folderId) where.folderId = input.folderId;

      // Filter by archived status (default to false if not specified)
      if (input.archived !== undefined) {
        where.isArchived = input.archived;
      } else {
        where.isArchived = false;
      }

      const lists = await prisma.list.findMany({
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
          folderId: true,
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
          space: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true
            }
          },
          folder: {
            select: {
              id: true,
              name: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          statuses: {
            select: {
              id: true,
              name: true,
              color: true,
            },
            orderBy: { position: "asc" },
          },
        },
      });

      return { items: lists };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify user has access to this list
      const list = await prisma.list.findFirst({
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
          workspaceId: true,
          spaceId: true,
          projectId: true,
          teamId: true,
          folderId: true,
          statuses: {
            select: {
              id: true,
              name: true,
              color: true,
              type: true,
              position: true,
            },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!list) {
        throw new Error("List not found or permission denied");
      }

      return list;
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
        })
        .refine(
          (data) =>
            data.workspaceId || data.spaceId || data.projectId || data.teamId,
          {
            message:
              "At least one context (workspace, space, project, or team) must be provided",
          },
        ),
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
        (await prisma.list.count({
          where: resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : { projectId: input.projectId, teamId: input.teamId },
        }));

      // Create list with default statuses and views in a transaction
      const list = await prisma.$transaction(async (tx) => {
        // Create the list
        const newList = await tx.list.create({
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
            folderId: input.folderId ?? undefined,
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
            folderId: true,
          },
        });

        // Create default statuses for the list
        const defaultStatuses = [
          { name: "Open", type: "OPEN" as const, color: "#94A3B8", position: 0 },
          { name: "In Progress", type: "IN_PROGRESS" as const, color: "#3B82F6", position: 1 },
          { name: "Completed", type: "COMPLETED" as const, color: "#10B981", position: 2 },
          { name: "Closed", type: "CLOSED" as const, color: "#6B7280", position: 3 },
        ];

        await Promise.all(
          defaultStatuses.map((status) =>
            tx.taskStatus.create({
              data: {
                listId: newList.id,
                name: status.name,
                type: status.type,
                color: status.color,
                position: status.position,
              },
            })
          )
        );

        // Create default views for the list (List and Board)
        const defaultViews = [
          { name: "List", type: "LIST" as const, position: 0 },
          { name: "Board", type: "BOARD" as const, position: 1 },
        ];

        await Promise.all(
          defaultViews.map((view) =>
            tx.view.create({
              data: {
                listId: newList.id,
                name: view.name,
                type: view.type,
                position: view.position,
                createdBy: userId,
                isDefault: view.position === 0, // First view is default
              },
            })
          )
        );

        return newList;
      });

      return list;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        icon: z.string().optional().nullable(),
        icon: z.string().optional().nullable(),
        position: z.number().int().optional(),
        isArchived: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, ...updateData } = input;

      // Verify user has access to this list
      const list = await prisma.list.findFirst({
        where: {
          id,
          workspace: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
        select: { id: true, workspaceId: true },
      });

      if (!list) {
        throw new Error("List not found or permission denied");
      }

      const updatedList = await prisma.list.update({
        where: { id },
        data: updateData,
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
          folderId: true,
          isArchived: true,
        },
      });

      return updatedList;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify user has access to this list
      const list = await prisma.list.findFirst({
        where: {
          id: input.id,
          workspace: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
        select: { id: true },
      });

      if (!list) {
        throw new Error("List not found or permission denied");
      }

      await prisma.list.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(), // Optional new name
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // 1. Get source list with all relations needed for copying
      const sourceList = await prisma.list.findFirst({
        where: {
          id: input.id,
          workspace: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
        include: {
          statuses: true,
          views: true,
        }
      });

      if (!sourceList) {
        throw new Error("List not found or permission denied");
      }

      // 2. Create the new list and copy structure in a transaction
      const newList = await prisma.$transaction(async (tx) => {
        // Create List
        const createdList = await tx.list.create({
          data: {
            workspaceId: sourceList.workspaceId,
            spaceId: sourceList.spaceId,
            projectId: sourceList.projectId,
            teamId: sourceList.teamId,
            folderId: sourceList.folderId,
            name: input.name ?? `${sourceList.name} (Copy)`,
            description: sourceList.description,
            color: sourceList.color,
            icon: sourceList.icon,
            position: sourceList.position + 1, // Place after the original
            defaultView: sourceList.defaultView,
            isArchived: false,
          }
        });

        // Copy Statuses
        if (sourceList.statuses.length > 0) {
          await Promise.all(
            sourceList.statuses.map(status =>
              tx.taskStatus.create({
                data: {
                  listId: createdList.id,
                  name: status.name,
                  type: status.type,
                  color: status.color,
                  position: status.position,
                }
              })
            )
          );
        }

        // Copy Views
        if (sourceList.views.length > 0) {
          await Promise.all(
            sourceList.views.map(view =>
              tx.view.create({
                data: {
                  listId: createdList.id,
                  name: view.name,
                  type: view.type,
                  description: view.description,
                  config: view.config ?? undefined,
                  filters: view.filters ?? undefined,
                  grouping: view.grouping ?? undefined,
                  sorting: view.sorting ?? undefined,
                  columns: view.columns ?? undefined,
                  position: view.position,
                  isDefault: view.isDefault,
                  isShared: view.isShared,
                  isPrivate: view.isPrivate,
                  isPinned: view.isPinned,
                  isLocked: view.isLocked,
                  isAutosave: view.isAutosave,
                  createdBy: userId,
                }
              })
            )
          );
        }

        return createdList;
      });

      return newList;
    }),
});

