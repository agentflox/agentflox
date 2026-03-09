import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const materialRouter = router({
  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      scope: z.enum(["owned","all"]).optional().default("owned"),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(12),
    }))
    .query(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      const where: any = {};

      if (input.scope === "owned") {
        where.ownerId = ownerId;
      }
      if (input.category) where.category = input.category;
      if (input.isPublic !== undefined) where.isPublic = input.isPublic;
      if (input.query) {
        const q = input.query.trim();
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ];
      }
      if (typeof input.minPrice === "number" || typeof input.maxPrice === "number") {
        where.priceUsd = {
          ...(typeof input.minPrice === "number" ? { gte: input.minPrice } : {}),
          ...(typeof input.maxPrice === "number" ? { lte: input.maxPrice } : {}),
        };
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.material.count({ where }),
        prisma.material.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.material.findFirst({
        where: {
          id: input.id,
          OR: [{ ownerId: userId }, { isPublic: true }],
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string(),
      priceUsd: z.number().min(0),
      fileUrl: z.string().optional(),
      externalUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      isPublic: z.boolean().default(true),
      spaceId: z.string().optional(),
      workspaceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      return prisma.material.create({
        data: {
          ownerId,
          title: input.title,
          description: input.description,
          category: input.category,
          priceUsd: input.priceUsd,
          isPublic: input.isPublic,
          fileUrl: input.fileUrl,
          externalUrl: input.externalUrl,
          spaceId: input.spaceId,
          thumbnailUrl: input.thumbnailUrl,
          workspaceId: input.workspaceId,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      priceUsd: z.number().min(0).optional(),
      fileUrl: z.string().optional().nullable(),
      externalUrl: z.string().optional().nullable(),
      isPublic: z.boolean().optional(),
      spaceId: z.string().optional().nullable(),
      workspaceId: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      const { id, ...updateData } = input;
      
      // Keep null values as is to properly set them to NULL in the database
      // This ensures that when we want to detach a material by setting spaceId/workspaceId to null,
      // the values are properly set to NULL in the database
      const existing = await prisma.material.findFirst({ where: { id, ownerId } });
      if (!existing) {
        throw new Error("Material not found or permission denied");
      }

      const updatePayload: any = {
        ...updateData,
        description: updateData.description ?? undefined,
        fileUrl: updateData.fileUrl ?? undefined,
        externalUrl: updateData.externalUrl ?? undefined,
      };
      return prisma.material.update({
        where: { id },
        data: updatePayload,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      const existing = await prisma.material.findFirst({ where: { id: input.id, ownerId } });
      if (!existing) {
        throw new Error("Material not found or permission denied");
      }
      return prisma.material.delete({ where: { id: input.id } });
    }),

  purchase: protectedProcedure
    .input(z.object({ materialId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Payment would be handled by existing Stripe/PayPal flows; here we record purchase with 10% fee
      const buyerId = ctx.session!.user!.id;
      const material = await prisma.material.findUnique({ where: { id: input.materialId } });
      if (!material) throw new Error("Material not found");

      const amount = material.priceUsd;
      const fee = +(amount * 0.10).toFixed(2);
      const net = +(amount - fee).toFixed(2);

      const purchase = await prisma.materialPurchase.create({
        data: { materialId: material.id, buyerId, amountUsd: amount, feeUsd: fee, netUsd: net },
      });

      // Accrue payout balance (simple: create a payout record in PENDING, to be aggregated later)
      await prisma.payout.create({
        data: {
          userId: material.ownerId,
          amountUsd: net,
          method: "UNSPECIFIED",
          status: "PENDING",
        },
      });

      return purchase;
    }),
});

