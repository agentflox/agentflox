import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const toolRouter = router({
  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(12),
      scope: z.enum(["owned", "all"]).optional().default("owned"),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const toolWhere: any = {};
      const compositeWhere: any = {};

      if (input.scope === "owned") {
        toolWhere.ownerId = userId;
        compositeWhere.ownerId = userId;
      }
      if (input.category) {
        toolWhere.category = input.category;
        compositeWhere.category = input.category;
      }
      if (input.isPublic !== undefined) {
        toolWhere.isPublic = input.isPublic;
        compositeWhere.isPublic = input.isPublic;
      }
      if (input.query) {
        const q = input.query.trim();
        const orFilter = [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ];
        toolWhere.OR = orFilter;
        compositeWhere.OR = orFilter;
      }

      const [tools, compositeTools] = await Promise.all([
        prisma.tool.findMany({
          where: toolWhere,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.compositeTool.findMany({
          where: compositeWhere,
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const mappedComposite = compositeTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        category: t.category ?? undefined,
        productUrl: null as string | null,
        isPublic: t.isPublic,
        ownerId: t.ownerId,
        workspaceId: t.workspaceId,
        spaceId: t.spaceId,
        updatedAt: t.updatedAt,
        isComposite: true,
      })) as any[];

      const combined = [
        ...(tools as any[]),
        ...mappedComposite,
      ].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      const total = combined.length;
      const start = (input.page - 1) * input.pageSize;
      const end = start + input.pageSize;
      const items = combined.slice(start, end);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  systemList: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const where: any = { isActive: true };
      if (input?.query) {
        const q = input.query.trim();
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ];
      }
      return prisma.systemTool.findMany({
        where,
        orderBy: { name: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.tool.findFirst({
        where: {
          id: input.id,
          OR: [{ ownerId: userId }, { isPublic: true }],
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().min(1),
      productUrl: z.string().min(1),
      isPublic: z.boolean().default(true),
      spaceId: z.string().optional(),
      workspaceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      return prisma.tool.create({
        data: {
          ownerId,
          name: input.name,
          description: input.description,
          category: input.category,
          productUrl: input.productUrl,
          isPublic: input.isPublic,
          spaceId: input.spaceId,
          workspaceId: input.workspaceId,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      productUrl: z.string().optional(),
      isPublic: z.boolean().optional(),
      spaceId: z.string().optional().nullable(),
      workspaceId: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      const { id, ...updateData } = input;

      // First try to update a classic Tool
      const existingTool = await prisma.tool.findFirst({ where: { id, ownerId } });
      if (existingTool) {
        const updatePayload: any = {
          ...updateData,
          description: updateData.description ?? undefined,
        };

        return prisma.tool.update({
          where: { id },
          data: updatePayload,
        });
      }

      // Fallback: try to update a CompositeTool so callers can attach composite tools
      const existingComposite = await prisma.compositeTool.findFirst({
        where: { id, ownerId },
      });

      if (!existingComposite) {
        throw new Error("Tool not found or permission denied");
      }

      const { spaceId, workspaceId, name, description, category, isPublic } = updateData;

      const compositeUpdate: any = {};
      if (name !== undefined) compositeUpdate.name = name;
      if (description !== undefined) compositeUpdate.description = description ?? undefined;
      if (category !== undefined) compositeUpdate.category = category;
      if (isPublic !== undefined) compositeUpdate.isPublic = isPublic;
      if (spaceId !== undefined) compositeUpdate.spaceId = spaceId;
      if (workspaceId !== undefined) compositeUpdate.workspaceId = workspaceId;

      return prisma.compositeTool.update({
        where: { id },
        data: compositeUpdate,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      const existing = await prisma.tool.findFirst({ where: { id: input.id, ownerId } });
      if (!existing) {
        throw new Error("Tool not found or permission denied");
      }
      return prisma.tool.delete({ where: { id: input.id } });
    }),
});

