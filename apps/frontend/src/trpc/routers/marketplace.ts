import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/services/billing.service";
import { matchingService } from "@/services/matching.service";

async function assertSubscribed(userId: string, session: any) {
  const response = await billingService.subscriptions.getCurrent(userId, session);
  const subscription = await response.json();
  if (!subscription || subscription.plan?.planType === "FREE") {
    throw new Error("Advanced AI matching is available for paid plans only");
  }
}

export const marketplaceRouter = router({
  searchProjects: protectedProcedure
    .input(z.object({ query: z.string().min(1), advancedAi: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20), filters: z.any().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      if (input.advancedAi) await assertSubscribed(userId, ctx.session);

      if (!input.advancedAi) {
        return prisma.project.findMany({
          where: { isPublic: true, isActive: true, name: { contains: input.query, mode: "insensitive" } },
          take: input.limit,
          select: { id: true, name: true, description: true, tags: true, industry: true },
        });
      }

      // AI matching via service-server
      const response = await matchingService.search({
        userId,
        type: "projects",
        query: input.query,
        limit: input.limit,
        filters: input.filters,
        advancedAi: true
      }, ctx.session);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Service matching failed");
      }
      return result;
    }),
});

