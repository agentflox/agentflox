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
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const conditions: any[] = [];
      const hasSpecificContext = Boolean(
        input.listId || input.folderId || input.spaceId || input.projectId || input.teamId
      );

      // If the manager doesn't pass any workspace/context, return all custom fields
      // the current user can access (owner/member). This powers the "load everything"
      // mode in the Custom Fields Manager modal.
      if (!input.workspaceId && !hasSpecificContext) {
        const accessibleWorkspaceIds = await prisma.workspace.findMany({
          where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
          select: { id: true },
        });

        const workspaceIds = accessibleWorkspaceIds.map((w) => w.id);

        const spaceOr: any[] = [
          { createdBy: userId },
          { members: { some: { userId } } },
        ];
        if (workspaceIds.length > 0) {
          spaceOr.push({ workspaceId: { in: workspaceIds } });
        }

        const accessibleSpaceIds = await prisma.space.findMany({
          where: { OR: spaceOr },
          select: { id: true },
        });
        const spaceIds = accessibleSpaceIds.map((s) => s.id);

        const accessibleProjectIds = await prisma.project.findMany({
          where: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
              ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
            ],
          },
          select: { id: true },
        });
        const projectIds = accessibleProjectIds.map((p) => p.id);

        const accessibleTeamIds = await prisma.team.findMany({
          where: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
              ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
            ],
          },
          select: { id: true },
        });
        const teamIds = accessibleTeamIds.map((t) => t.id);

        const accessibleFolderIds = await prisma.folder.findMany({
          where: {
            OR: [
              ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
              ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
              ...(spaceIds.length > 0 ? [{ spaceId: { in: spaceIds } }] : []),
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
          select: { id: true },
        });
        const folderIds = accessibleFolderIds.map((f) => f.id);

        const accessibleListIds = await prisma.list.findMany({
          where: {
            OR: [
              ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
              ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
              ...(spaceIds.length > 0 ? [{ spaceId: { in: spaceIds } }] : []),
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
          select: { id: true },
        });
        const listIds = accessibleListIds.map((l) => l.id);

        const accessConditions: any[] = [{ locationType: "PERSONAL" }];
        if (workspaceIds.length > 0) accessConditions.push({ workspaceId: { in: workspaceIds } });
        if (spaceIds.length > 0) accessConditions.push({ spaceId: { in: spaceIds } });
        if (projectIds.length > 0) accessConditions.push({ projectId: { in: projectIds } });
        if (folderIds.length > 0) accessConditions.push({ folderId: { in: folderIds } });
        if (listIds.length > 0) accessConditions.push({ listId: { in: listIds } });
        if (teamIds.length > 0) accessConditions.push({ teamId: { in: teamIds } });

        return prisma.customField.findMany({
          where: {
            OR: accessConditions,
            ...(input.applyTo ? { applyTo: { has: input.applyTo } } : {}),
          },
          orderBy: { position: "asc" },
          include: {
            creator: { select: { id: true, name: true, email: true, firstName: true, lastName: true } },
          },
        });
      }

      // Workspace-level manager view:
      // include workspace-linked fields plus personal/unscoped fields.
      if (input.workspaceId && !hasSpecificContext) {
        conditions.push({ workspaceId: input.workspaceId });
        conditions.push({
          locationType: "PERSONAL",
          workspaceId: null,
          spaceId: null,
          projectId: null,
          folderId: null,
          listId: null,
          teamId: null,
        });

        // Manager view should also include fields that are not directly attached
        // to the workspace, e.g. standalone projects/lists/spaces.
        conditions.push({ workspaceId: null, spaceId: { not: null } });
        conditions.push({ workspaceId: null, projectId: { not: null } });
        conditions.push({ workspaceId: null, folderId: { not: null } });
        conditions.push({ workspaceId: null, listId: { not: null } });
        conditions.push({ workspaceId: null, teamId: { not: null } });
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
        orderBy: { position: 'asc' },
        include: {
          creator: { select: { id: true, name: true, email: true, firstName: true, lastName: true } },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.customField.findUnique({
        where: { id: input.id },
        include: {
          values: true,
          creator: { select: { id: true, name: true, email: true, firstName: true, lastName: true } },
        },
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
      locationType: z.enum(["WORKSPACE", "SPACE", "PROJECT", "TEAM", "FOLDER", "LIST", "PERSONAL"]).optional(),
      name: z.string(),
      type: z.string(), // Display type from field types (e.g. TEXT_AREA, MONEY)
      config: z.any().optional(),
      defaultValue: z.any().optional(),
      isRequired: z.boolean().optional(),
      isPinned: z.boolean().optional(),
      isRequiredInTasks: z.boolean().optional(),
      isVisibleToGuests: z.boolean().optional(),
      visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
      applyTo: z.array(z.enum(["TASK", "PROJECT"])),
    }))
    .mutation(async ({ input, ctx }) => {
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
          createdBy: ctx.session.user.id,
          workspaceId: input.workspaceId,
          spaceId: input.spaceId,
          projectId: input.projectId,
          folderId: input.folderId,
          listId: input.listId,
          teamId: input.teamId,
          locationType: input.locationType,
          name: input.name,
          type: dbType,
          config: Object.keys(config).length ? config : input.config,
          defaultValue: input.defaultValue,
          isRequired: input.isRequired ?? false,
          isPinned: input.isPinned ?? false,
          isRequiredInTasks: input.isRequiredInTasks ?? false,
          isVisibleToGuests: input.isVisibleToGuests ?? true,
          visibility: input.visibility ?? "ADMINS",
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
      isPinned: z.boolean().optional(),
      isRequiredInTasks: z.boolean().optional(),
      isVisibleToGuests: z.boolean().optional(),
      visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
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

  addToLocation: protectedProcedure
    .input(z.object({
      fieldIds: z.array(z.string()).min(1),
      locationType: z.enum(["WORKSPACE", "SPACE", "PROJECT", "TEAM", "FOLDER", "LIST", "PERSONAL"]),
      locationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const sourceFields = await prisma.customField.findMany({
        where: { id: { in: input.fieldIds } },
      });

      if (sourceFields.length === 0) {
        throw new Error("No custom fields found");
      }

      const locationData: {
        workspaceId?: string | null;
        spaceId?: string | null;
        projectId?: string | null;
        folderId?: string | null;
        listId?: string | null;
        teamId?: string | null;
      } = {};

      switch (input.locationType) {
        case "WORKSPACE":
          locationData.workspaceId = input.locationId;
          break;
        case "SPACE":
          locationData.spaceId = input.locationId;
          break;
        case "PROJECT":
          locationData.projectId = input.locationId;
          break;
        case "FOLDER":
          locationData.folderId = input.locationId;
          break;
        case "LIST":
          locationData.listId = input.locationId;
          break;
        case "TEAM":
          locationData.teamId = input.locationId;
          break;
        case "PERSONAL":
          break;
      }

      if (!locationData.workspaceId) {
        if (locationData.spaceId) {
          const space = await prisma.space.findUnique({
            where: { id: locationData.spaceId },
            select: { workspaceId: true },
          });
          locationData.workspaceId = space?.workspaceId ?? null;
        } else if (locationData.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: locationData.projectId },
            select: { workspaceId: true },
          });
          locationData.workspaceId = project?.workspaceId ?? null;
        } else if (locationData.listId) {
          const list = await prisma.list.findUnique({
            where: { id: locationData.listId },
            select: { workspaceId: true },
          });
          locationData.workspaceId = list?.workspaceId ?? null;
        } else if (locationData.folderId) {
          const folder = await prisma.folder.findUnique({
            where: { id: locationData.folderId },
            select: { workspaceId: true },
          });
          locationData.workspaceId = folder?.workspaceId ?? null;
        } else if (locationData.teamId) {
          const team = await prisma.team.findUnique({
            where: { id: locationData.teamId },
            select: { workspaceId: true },
          });
          locationData.workspaceId = team?.workspaceId ?? null;
        }
      }

      const whereContext: Record<string, string | null | undefined> = { ...locationData };
      const maxPosition = await prisma.customField.findFirst({
        where: whereContext,
        orderBy: { position: "desc" },
        select: { position: true },
      });

      let nextPosition = (maxPosition?.position ?? 0) + 1;
      const created: Awaited<ReturnType<typeof prisma.customField.create>>[] = [];

      for (const field of sourceFields) {
        const copy = await prisma.customField.create({
          data: {
            createdBy: userId,
            workspaceId: locationData.workspaceId ?? null,
            spaceId: locationData.spaceId ?? null,
            projectId: locationData.projectId ?? null,
            folderId: locationData.folderId ?? null,
            listId: locationData.listId ?? null,
            teamId: locationData.teamId ?? null,
            locationType: input.locationType,
            name: field.name,
            type: field.type,
            config: field.config ?? undefined,
            defaultValue: field.defaultValue ?? undefined,
            isRequired: field.isRequired,
            isPinned: field.isPinned,
            isRequiredInTasks: field.isRequiredInTasks,
            isVisibleToGuests: field.isVisibleToGuests,
            visibility: field.visibility,
            applyTo: field.applyTo,
            inheritedFrom: field.id,
            position: nextPosition++,
          },
        });
        created.push(copy);
      }

      return { count: created.length, fields: created };
    }),
});
