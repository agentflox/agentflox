import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const customFieldsRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      projectId: z.string().optional(),
      folderId: z.string().optional(),
      listId: z.string().optional(),
      teamId: z.string().optional(),
      applyTo: z.enum(["TASK", "PROJECT"]).optional(),
    }))
    .query(async ({ input }) => {
      const conditions: any[] = [];

      // Always include workspace if provided
      if (input.workspaceId) {
        conditions.push({ workspaceId: input.workspaceId });
      }

      // Hierarchy resolution
      if (input.listId) {
        conditions.push({ listId: input.listId });
        const list = await prisma.list.findUnique({
          where: { id: input.listId },
          select: { folderId: true, spaceId: true, folder: { select: { spaceId: true } } }
        });
        if (list) {
          if (list.folderId) {
            conditions.push({ folderId: list.folderId });
            if (list.folder?.spaceId) conditions.push({ spaceId: list.folder.spaceId });
          }
          if (list.spaceId) conditions.push({ spaceId: list.spaceId });
        }
      } else if (input.folderId) {
        conditions.push({ folderId: input.folderId });
        const folder = await prisma.folder.findUnique({
          where: { id: input.folderId },
          select: { spaceId: true }
        });
        if (folder?.spaceId) {
          conditions.push({ spaceId: folder.spaceId });
        }
      } else if (input.spaceId) {
        conditions.push({ spaceId: input.spaceId });
      } else if (input.projectId) {
        conditions.push({ projectId: input.projectId });
      } else if (input.teamId) {
        conditions.push({ teamId: input.teamId });
      }

      // If no ID is provided, return empty (or handle as needed)
      if (conditions.length === 0) return [];

      return prisma.customField.findMany({
        where: {
          OR: conditions,
          ...(input.applyTo ? { applyTo: { has: input.applyTo } } : {}),
        },
        orderBy: { position: 'asc' }
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.customField.findUnique({
        where: { id: input.id },
        include: { values: true }
      });
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      projectId: z.string().optional(),
      folderId: z.string().optional(),
      listId: z.string().optional(),
      teamId: z.string().optional(),
      name: z.string(),
      type: z.string(), // Display type from field types (e.g. TEXT_AREA, MONEY)
      config: z.any().optional(),
      defaultValue: z.any().optional(),
      isRequired: z.boolean().optional(),
      applyTo: z.array(z.enum(["TASK", "PROJECT"])),
    }))
    .mutation(async ({ input }) => {
      const DB_TYPES = ["TEXT", "NUMBER", "DROPDOWN", "DATE", "CHECKBOX", "URL", "EMAIL", "PHONE", "MULTI_SELECT", "CURRENCY", "RATING", "USER", "LOCATION", "FORMULA"] as const;
      const typeToDb: Record<string, string> = {
        TEXT: "TEXT", TEXT_AREA: "TEXT", LONG_TEXT: "TEXT", SUMMARY: "TEXT", CUSTOM_TEXT: "TEXT",
        PROGRESS_UPDATES: "TEXT", TRANSLATION: "TEXT", FILES: "TEXT", RELATIONSHIP: "TEXT", TASKS: "TEXT",
        SIGNATURE: "TEXT", BUTTON: "TEXT", ACTION_ITEMS: "TEXT",
        NUMBER: "NUMBER", PROGRESS_AUTO: "NUMBER", PROGRESS_MANUAL: "NUMBER", VOTING: "NUMBER",
        DROPDOWN: "DROPDOWN", CUSTOM_DROPDOWN: "DROPDOWN", LABELS: "DROPDOWN", CATEGORIZE: "DROPDOWN",
        SENTIMENT: "DROPDOWN", TSHIRT_SIZE: "DROPDOWN",
        DATE: "DATE", CHECKBOX: "CHECKBOX", URL: "URL", WEBSITE: "URL", EMAIL: "EMAIL", PHONE: "PHONE",
        MONEY: "CURRENCY", CURRENCY: "CURRENCY", FORMULA: "FORMULA", PEOPLE: "USER", USER: "USER",
        LOCATION: "LOCATION", RATING: "RATING", MULTI_SELECT: "MULTI_SELECT",
      };
      const dbType = (typeToDb[input.type] ?? "TEXT") as (typeof DB_TYPES)[number];
      if (!DB_TYPES.includes(dbType)) throw new Error(`Invalid field type: ${input.type}`);
      const config = {
        ...(input.config as object ?? {}),
        ...(input.type !== dbType ? { fieldType: input.type } : {}),
      };

      // Get the highest position in the most specific context
      // Prioritize List > Folder > Space > Project > Team > Workspace
      const whereContext: any = {};
      if (input.listId) whereContext.listId = input.listId;
      else if (input.folderId) whereContext.folderId = input.folderId;
      else if (input.spaceId) whereContext.spaceId = input.spaceId;
      else if (input.projectId) whereContext.projectId = input.projectId;
      else if (input.teamId) whereContext.teamId = input.teamId;
      else if (input.workspaceId) whereContext.workspaceId = input.workspaceId;

      const maxPosition = await prisma.customField.findFirst({
        where: whereContext,
        orderBy: { position: 'desc' },
        select: { position: true }
      });

      return prisma.customField.create({
        data: {
          workspaceId: input.workspaceId,
          spaceId: input.spaceId,
          projectId: input.projectId,
          folderId: input.folderId,
          listId: input.listId,
          teamId: input.teamId,
          name: input.name,
          type: dbType,
          config: Object.keys(config).length ? config : input.config,
          defaultValue: input.defaultValue,
          isRequired: input.isRequired ?? false,
          applyTo: input.applyTo,
          position: (maxPosition?.position ?? 0) + 1,
        }
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      config: z.any().optional(),
      defaultValue: z.any().optional(),
      isRequired: z.boolean().optional(),
      position: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.customField.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.customField.delete({
        where: { id: input.id }
      });
    }),

  reorder: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      fieldIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      // Update positions based on array order
      const updates = input.fieldIds.map((id, index) =>
        prisma.customField.update({
          where: { id },
          data: { position: index }
        })
      );

      await prisma.$transaction(updates);
      return { success: true };
    }),
});
