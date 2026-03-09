import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  functionSchema: z.any(),
  steps: z.any(),
  isPublic: z.boolean().default(true),
});

export const compositeToolRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      query: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {};

      if (input?.workspaceId) {
        where.workspaceId = input.workspaceId;
      }

      where.ownerId = userId;

      if (input?.query) {
        const q = input.query.trim();
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ];
      }

      const items = await prisma.compositeTool.findMany({
        where,
        orderBy: { updatedAt: "desc" },
      });

      // Shape like SystemTool for WorkforceSidebar/dbTools usage
      return items.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        category: t.category ?? "Custom",
        functionSchema: t.functionSchema as any,
        isComposite: true,
        workspaceId: t.workspaceId,
        ownerId: t.ownerId,
        isPublic: t.isPublic,
        updatedAt: t.updatedAt,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.compositeTool.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
    }).merge(baseSchema))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      let workspaceId = input.workspaceId;

      if (!workspaceId) {
        const firstWorkspace = await prisma.workspace.findFirst({
          where: { ownerId: userId, isActive: true },
        });

        if (!firstWorkspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active workspace found for user",
          });
        }

        workspaceId = firstWorkspace.id;
      }

      const now = new Date();
      const created = await prisma.compositeTool.create({
        data: {
          workspaceId,
          ownerId: userId,
          name: input.name,
          description: input.description ?? undefined,
          category: input.category ?? undefined,
          functionSchema: input.functionSchema as any,
          steps: input.steps as any,
          isPublic: input.isPublic,
          createdAt: now,
          updatedAt: now,
        },
      });
      return created;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
    }).merge(baseSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, ...data } = input;

      // Ensure ownership
      const existing = await prisma.compositeTool.findFirst({
        where: { id, ownerId: userId },
      });
      if (!existing) {
        throw new Error("Tool not found or permission denied");
      }

      const updated = await prisma.compositeTool.update({
        where: { id },
        data: {
          ...data,
          functionSchema: data.functionSchema ?? existing.functionSchema,
          steps: data.steps ?? existing.steps,
        } as any,
      });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.compositeTool.findFirst({
        where: { id: input.id, ownerId: userId },
      });
      if (!existing) {
        throw new Error("Tool not found or permission denied");
      }
      await prisma.compositeTool.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

