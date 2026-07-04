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
  mode: z.enum(["MANUAL", "AI"]).optional(),
  isPublic: z.boolean().default(true),
});

export const compositeToolRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      query: z.string().optional(),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(100).optional().default(12),
      includeSchema: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const includeSchema = input?.includeSchema ?? false;
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

      if (input?.category) {
        where.category = input.category;
      }

      if (typeof input?.isPublic === "boolean") {
        where.isPublic = input.isPublic;
      }

      const select = {
        id: true,
        name: true,
        description: true,
        category: true,
        workspaceId: true,
        ownerId: true,
        isPublic: true,
        mode: true,
        updatedAt: true,
        ...(includeSchema ? { functionSchema: true } : {}),
      } as const;

      const [total, items] = await Promise.all([
        prisma.compositeTool.count({ where }),
        prisma.compositeTool.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select,
        }),
      ]);

      return {
        items: items.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          category: t.category ?? "Custom",
          ...(includeSchema && "functionSchema" in t
            ? { functionSchema: t.functionSchema as any }
            : {}),
          isComposite: true,
          workspaceId: t.workspaceId,
          ownerId: t.ownerId,
          isPublic: t.isPublic,
          mode: t.mode,
          updatedAt: t.updatedAt,
        })),
        total,
        page,
        pageSize,
      };
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
          mode: input.mode,
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

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await prisma.compositeTool.deleteMany({
        where: {
          id: { in: input.ids },
          ownerId: userId,
        },
      });
      return { success: true };
    }),

  clone: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const source = await prisma.compositeTool.findFirst({
        where: { id: input.id, ownerId: userId },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found or permission denied" });

      const clone = await prisma.compositeTool.create({
        data: {
          workspaceId: source.workspaceId,
          ownerId: userId,
          name: input.name ?? `${source.name} (copy)`,
          description: source.description ?? undefined,
          category: source.category ?? undefined,
          functionSchema: source.functionSchema as any,
          steps: source.steps as any,
          mode: source.mode,
          isPublic: false, // clones start as private
        },
      });
      return clone;
    }),

  listVersions: protectedProcedure
    .input(z.object({ toolId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // Ensure user has access
      const tool = await prisma.compositeTool.findFirst({
        where: { id: input.toolId, ownerId: userId },
      });
      if (!tool) throw new TRPCError({ code: "NOT_FOUND" });

      return prisma.compositeToolVersion.findMany({
        where: { compositeToolId: input.toolId },
        orderBy: { version: "desc" },
        include: { createdBy: { select: { name: true, image: true, email: true } } },
      });
    }),

  createVersion: protectedProcedure
    .input(z.object({ toolId: z.string(), name: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const tool = await prisma.compositeTool.findFirst({
        where: { id: input.toolId, ownerId: userId },
      });
      if (!tool) throw new TRPCError({ code: "NOT_FOUND" });

      const count = await prisma.compositeToolVersion.count({
        where: { compositeToolId: tool.id }
      });

      return prisma.compositeToolVersion.create({
        data: {
          compositeToolId: tool.id,
          version: count + 1,
          name: input.name ?? `v${count + 1}`,
          description: input.description,
          functionSchema: tool.functionSchema as any,
          steps: tool.steps as any,
          createdById: userId,
        },
      });
    }),

  setLiveVersion: protectedProcedure
    .input(z.object({ toolId: z.string(), versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const tool = await prisma.compositeTool.findFirst({
        where: { id: input.toolId, ownerId: userId },
      });
      if (!tool) throw new TRPCError({ code: "NOT_FOUND" });

      // transaction to set all to false then one to true
      await prisma.$transaction([
        prisma.compositeToolVersion.updateMany({
          where: { compositeToolId: tool.id },
          data: { isLive: false },
        }),
        prisma.compositeToolVersion.update({
          where: { id: input.versionId },
          data: { isLive: true },
        }),
      ]);
      return { success: true };
    }),

  listExecutionLogs: protectedProcedure
    .input(z.object({ toolId: z.string(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const tool = await prisma.compositeTool.findFirst({
        where: { id: input.toolId, ownerId: userId },
      });
      if (!tool) throw new TRPCError({ code: "NOT_FOUND" });

      return prisma.compositeToolExecutionLog.findMany({
        where: { compositeToolId: tool.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          user: { select: { name: true, image: true, email: true } },
          version: { select: { version: true, name: true } },
        }
      });
    }),
});


