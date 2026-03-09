import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const payoutRouter = router({
  myPayouts: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session!.user!.id;
      const [pending, history] = await Promise.all([
        prisma.payout.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
        prisma.payout.findMany({ where: { userId, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" } }),
      ]);
      const totalPending = pending.reduce((s, p) => s + p.amountUsd, 0);
      return { totalPending, pending, history };
    }),

  requestWithdrawal: protectedProcedure
    .input(z.object({ amountUsd: z.number().min(1), method: z.enum(["STRIPE","PAYPAL"]) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // In real flow, validate available balance; for simplicity, record request.
      return prisma.payout.create({ data: { userId, amountUsd: input.amountUsd, method: input.method, status: "REQUESTED" } });
    }),
});

