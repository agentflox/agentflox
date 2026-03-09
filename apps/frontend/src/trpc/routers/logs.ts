import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const logsRouter = router({
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      userId: z.string().optional(),
      category: z.string().optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.projectId) where.projectId = input.projectId;
      if (input.teamId) where.teamId = input.teamId;
      if (input.userId) where.userId = input.userId;
      if (input.category) where.category = input.category as any;

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});

export type LogsRouter = typeof logsRouter;


