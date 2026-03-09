import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { LimitGuard } from "@/features/usage/utils/limitGuard";

export const usageRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    await LimitGuard.ensureCycle(userId);
    const quota = await prisma.userQuota.findUnique({ where: { userId } });
    return quota;
  }),

  history: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).optional().default(1), pageSize: z.number().int().min(1).max(50).optional().default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        prisma.usage.count({ where: { userId } }),
        prisma.usage.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
});

export type UsageRouter = typeof usageRouter;


