import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

/** System-level fallback statuses — used when no workspace/list context is available */
export const SYSTEM_STATUSES = [
  { id: "system:todo",        name: "To Do",       color: "#94A3B8", position: 0, type: "NOT_STARTED" as const, isSystem: true },
  { id: "system:inprogress",  name: "In Progress", color: "#3B82F6", position: 1, type: "ACTIVE"      as const, isSystem: true },
  { id: "system:completed",   name: "Completed",   color: "#10B981", position: 2, type: "CLOSED"      as const, isSystem: true },
];

/** Default workspace-level statuses seeded on workspace creation */
export const DEFAULT_WORKSPACE_STATUSES = [
  { name: "To Do",       color: "#94A3B8", position: 0, type: "NOT_STARTED" as const },
  { name: "In Progress", color: "#3B82F6", position: 1, type: "ACTIVE"      as const },
  { name: "Completed",   color: "#10B981", position: 2, type: "CLOSED"      as const },
];

/**
 * Ensures a workspace has its default statuses. Idempotent — safe to call multiple times.
 */
export async function ensureWorkspaceStatuses(workspaceId: string, txClient?: any) {
  const db = txClient || prisma;
  const existing = await db.taskStatus.count({
    where: { workspaceId, listId: null },
  });
  if (existing > 0) return;

  await db.taskStatus.createMany({
    data: DEFAULT_WORKSPACE_STATUSES.map((s) => ({
      ...s,
      workspaceId,
      listId: null,
      isSystem: false,
    })),
    skipDuplicates: true,
  });
}

export const taskStatusRouter = router({
  /**
   * Resolution order:
   * 1. List-scoped statuses (if listId provided)
   * 2. Workspace-scoped statuses (if workspaceId provided, no listId)
   * 3. System global fallbacks (no DB record — returned as-is)
   */
  list: protectedProcedure
    .input(
      z.object({
        listId:      z.string().optional(),
        workspaceId: z.string().optional(),
        spaceId:     z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { listId, workspaceId } = input;
      const userId = ctx.session!.user!.id;

      // 1. List-scoped
      if (listId) {
        let targetListId = listId;
        if (listId === "personal") {
          const personalList = await prisma.list.findFirst({
            where: {
              locationType: "PERSONAL",
              ownerId: userId,
            },
            select: { id: true },
          });
          if (personalList) targetListId = personalList.id;
        }

        const statuses = await prisma.taskStatus.findMany({
          where: { listId: targetListId },
          orderBy: { position: "asc" },
          select: { id: true, name: true, color: true, position: true, type: true, isSystem: true },
        });
        if (statuses.length > 0) return statuses;
      }

      // 2. Workspace-scoped (listId is null)
      if (workspaceId) {
        const statuses = await prisma.taskStatus.findMany({
          where: { workspaceId, listId: null },
          orderBy: { position: "asc" },
          select: { id: true, name: true, color: true, position: true, type: true, isSystem: true },
        });
        if (statuses.length > 0) return statuses;

        // Auto-seed if workspace has none yet
        await ensureWorkspaceStatuses(workspaceId);
        return prisma.taskStatus.findMany({
          where: { workspaceId, listId: null },
          orderBy: { position: "asc" },
          select: { id: true, name: true, color: true, position: true, type: true, isSystem: true },
        });
      }

      // 3. System global fallback
      return SYSTEM_STATUSES;
    }),

  /** Idempotently seed default statuses for a workspace */
  ensureDefaults: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ input }) => {
      await ensureWorkspaceStatuses(input.workspaceId);
      return { ok: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name:        z.string().min(1),
        color:       z.string().optional(),
        type:        z.enum(["NOT_STARTED", "ACTIVE", "CLOSED", "CUSTOM"]).optional(),
        position:    z.number().int().optional(),
        workspaceId: z.string().optional(),
        listId:      z.string().optional(),
        spaceId:     z.string().optional(),
        teamId:      z.string().optional(),
        projectId:   z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const position =
        input.position ??
        (await prisma.taskStatus.count({
          where: {
            listId:      input.listId      ?? null,
            workspaceId: input.workspaceId ?? null,
          },
        }));

      return prisma.taskStatus.create({
        data: {
          name:        input.name,
          color:       input.color ?? "#94A3B8",
          type:        input.type ?? "CUSTOM",
          position,
          workspaceId: input.workspaceId,
          listId:      input.listId,
          spaceId:     input.spaceId,
          teamId:      input.teamId,
          projectId:   input.projectId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.taskStatus.delete({ where: { id: input.id } });
    }),
});
