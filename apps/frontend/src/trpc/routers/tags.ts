import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const tagsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        spaceId: z.string().optional(),
        projectId: z.string().optional(),
        folderId: z.string().optional(),
        listId: z.string().optional(),
        teamId: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const where: any = {};

      if (input.workspaceId) where.workspaceId = input.workspaceId;
      if (input.spaceId) where.spaceId = input.spaceId;
      if (input.projectId) where.projectId = input.projectId;
      if (input.folderId) where.folderId = input.folderId;
      if (input.listId) where.listId = input.listId;
      if (input.teamId) where.teamId = input.teamId;

      if (input.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }

      const tags = await prisma.tag.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, image: true, email: true },
          },
          _count: {
            select: { taskTags: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || "#5eead4",
        locationType: tag.locationType,
        workspaceId: tag.workspaceId,
        spaceId: tag.spaceId,
        projectId: tag.projectId,
        folderId: tag.folderId,
        listId: tag.listId,
        teamId: tag.teamId,
        visibility: tag.visibility,
        usageCount: tag._count.taskTags,
        createdAt: tag.createdAt.toISOString(),
        createdBy: {
          id: tag.creator?.id || tag.createdBy || "system",
          name: tag.creator?.name || tag.creator?.email || "User",
          avatarUrl: tag.creator?.image || undefined,
        },
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const tag = await prisma.tag.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: { id: true, name: true, image: true, email: true },
          },
          _count: {
            select: { taskTags: true },
          },
        },
      });

      if (!tag) return null;

      return {
        id: tag.id,
        name: tag.name,
        color: tag.color || "#5eead4",
        locationType: tag.locationType,
        workspaceId: tag.workspaceId,
        spaceId: tag.spaceId,
        projectId: tag.projectId,
        folderId: tag.folderId,
        listId: tag.listId,
        teamId: tag.teamId,
        visibility: tag.visibility,
        usageCount: tag._count.taskTags,
        createdAt: tag.createdAt.toISOString(),
        createdBy: {
          id: tag.creator?.id || tag.createdBy || "system",
          name: tag.creator?.name || tag.creator?.email || "User",
          avatarUrl: tag.creator?.image || undefined,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
        workspaceId: z.string().optional(),
        spaceId: z.string().optional(),
        projectId: z.string().optional(),
        folderId: z.string().optional(),
        listId: z.string().optional(),
        teamId: z.string().optional(),
        visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      let locationType: "WORKSPACE" | "SPACE" | "PROJECT" | "FOLDER" | "LIST" | "TEAM" = "WORKSPACE";
      if (input.listId) locationType = "LIST";
      else if (input.folderId) locationType = "FOLDER";
      else if (input.projectId) locationType = "PROJECT";
      else if (input.spaceId) locationType = "SPACE";
      else if (input.teamId) locationType = "TEAM";

      const created = await prisma.tag.create({
        data: {
          name: input.name.trim(),
          color: input.color || "#5eead4",
          locationType,
          workspaceId: input.workspaceId,
          spaceId: input.spaceId,
          projectId: input.projectId,
          folderId: input.folderId,
          listId: input.listId,
          teamId: input.teamId,
          visibility: input.visibility === "PRIVATE" ? "ADMINS" : "PUBLIC",
          createdBy: userId,
        },
        include: {
          creator: {
            select: { id: true, name: true, image: true, email: true },
          },
        },
      });

      return {
        id: created.id,
        name: created.name,
        color: created.color || "#5eead4",
        locationType: created.locationType,
        workspaceId: created.workspaceId,
        spaceId: created.spaceId,
        projectId: created.projectId,
        folderId: created.folderId,
        listId: created.listId,
        teamId: created.teamId,
        visibility: created.visibility,
        usageCount: 0,
        createdAt: created.createdAt.toISOString(),
        createdBy: {
          id: created.creator?.id || userId,
          name: created.creator?.name || created.creator?.email || "You",
          avatarUrl: created.creator?.image || undefined,
        },
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await prisma.tag.update({
        where: { id: input.id },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.color ? { color: input.color } : {}),
          ...(input.visibility ? { visibility: input.visibility === "PRIVATE" ? "ADMINS" : "PUBLIC" } : {}),
        },
        include: {
          creator: {
            select: { id: true, name: true, image: true, email: true },
          },
          _count: {
            select: { taskTags: true },
          },
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        color: updated.color || "#5eead4",
        locationType: updated.locationType,
        workspaceId: updated.workspaceId,
        spaceId: updated.spaceId,
        projectId: updated.projectId,
        folderId: updated.folderId,
        listId: updated.listId,
        teamId: updated.teamId,
        visibility: updated.visibility,
        usageCount: updated._count.taskTags,
        createdAt: updated.createdAt.toISOString(),
        createdBy: {
          id: updated.creator?.id || updated.createdBy || "system",
          name: updated.creator?.name || updated.creator?.email || "User",
          avatarUrl: updated.creator?.image || undefined,
        },
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.tag.delete({
        where: { id: input.id },
      });
      return { success: true, id: input.id };
    }),

  applyToTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        tagId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const created = await prisma.taskTag.upsert({
        where: {
          taskId_tagId: {
            taskId: input.taskId,
            tagId: input.tagId,
          },
        },
        create: {
          taskId: input.taskId,
          tagId: input.tagId,
        },
        update: {},
      });
      return { success: true, taskTag: created };
    }),

  removeFromTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        tagId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.taskTag.deleteMany({
        where: {
          taskId: input.taskId,
          tagId: input.tagId,
        },
      });
      return { success: true };
    }),
});
