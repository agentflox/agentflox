import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/services/billing.service";

async function assertSubscribed(userId: string, session: any) {
  const response = await billingService.subscriptions.getCurrent(userId, session);
  const subscription = await response.json();
  if (!subscription || subscription.plan?.planType === "FREE") {
    throw new Error("Advanced AI matching is available for paid plans only");
  }
}

export const marketplaceRouter = router({
  listRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      return prisma.marketplaceListing.findMany({
        where: { status: 'active' },
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, verified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
    }),

  myListings: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session!.user!.id;
      return prisma.marketplaceListing.findMany({
        where: { authorId: me },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true, orders: true } },
        },
      });
    }),

  searchListings: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.string().optional(),
      isFree: z.boolean().optional(),
      sortBy: z.enum(['latest', 'oldest', 'popular', 'likes']).optional().default('latest'),
      limit: z.number().int().min(1).max(50).default(20)
    }))
    .query(async ({ input }) => {
      const where: any = { status: 'active' };

      if (input.query) {
        where.title = { contains: input.query, mode: 'insensitive' };
      }
      
      if (input.type && input.type !== 'all') {
        where.type = input.type;
      }
      
      if (input.isFree === true) {
        where.priceCredits = 0;
      } else if (input.isFree === false) {
        where.priceCredits = { gt: 0 };
      }

      let orderBy: any = { createdAt: 'desc' };
      if (input.sortBy === 'oldest') orderBy = { createdAt: 'asc' };
      if (input.sortBy === 'popular') orderBy = { orders: { _count: 'desc' } };
      if (input.sortBy === 'likes') orderBy = { applications: { _count: 'desc' } };

      return prisma.marketplaceListing.findMany({
        where,
        take: input.limit,
        orderBy,
        include: {
          author: { select: { id: true, name: true, verified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
    }),

  myEarnings: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session!.user!.id;
      const earnings = await prisma.earning.findMany({
        where: { userId: me },
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { title: true, type: true } },
        },
      });

      const totalCredits = earnings.reduce((acc, curr) => acc + curr.amountCredits, 0);

      return {
        totalCredits,
        history: earnings,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, name: true, verified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
      if (!listing) throw new Error("Listing not found");
      return listing;
    }),
});
