import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const documentActivityRouter = router({
  logView: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Log activity in ActivityLog table
      await prisma.activityLog.create({
        data: {
          userId,
          entityType: "DOCUMENT",
          entityId: input.documentId,
          action: "VIEW",
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { success: true };
    }),

  getActivity: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check access to document
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, activities] = await Promise.all([
        prisma.activityLog.count({
          where: {
            entityType: "DOCUMENT",
            entityId: input.documentId,
          },
        }),
        prisma.activityLog.findMany({
          where: {
            entityType: "DOCUMENT",
            entityId: input.documentId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
      ]);

      return { activities, total, page: input.page, pageSize: input.pageSize };
    }),

  getAnalytics: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check access
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          createdBy: userId,
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      // Get analytics data
      const [totalViews, uniqueViewers, recentActivity] = await Promise.all([
        prisma.activityLog.count({
          where: {
            entityType: "DOCUMENT",
            entityId: input.documentId,
            action: "VIEW",
          },
        }),
        prisma.activityLog.groupBy({
          by: ["userId"],
          where: {
            entityType: "DOCUMENT",
            entityId: input.documentId,
            action: "VIEW",
          },
        }),
        prisma.activityLog.findMany({
          where: {
            entityType: "DOCUMENT",
            entityId: input.documentId,
          },
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        totalViews,
        uniqueViewers: uniqueViewers.length,
        recentActivity,
      };
    }),
});
