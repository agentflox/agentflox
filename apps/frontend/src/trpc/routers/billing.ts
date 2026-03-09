import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { LimitGuard } from "@/features/usage/utils/limitGuard";

export const billingRouter = router({
  currentPlan: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    await LimitGuard.ensureCycle(userId, ctx.session);
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { updatedAt: "desc" },
      include: { plan: true },
    });
    return subscription;
  }),

  listPlans: protectedProcedure
    .input(z.object({ planType: z.enum(["FREE", "BASIC", "PROFESSIONAL", "BUSINESS", "ENTERPRISE", "CUSTOM"]).optional() }))
    .query(async ({ input }) => {
      return prisma.plan.findMany({
        where: {
          isActive: true,
          ...(input?.planType ? { planType: input.planType as any } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
        include: { feature: true },
      });
    }),

  listPackages: protectedProcedure
    .input(z.object({ packageType: z.enum(["SMALL", "MEDIUM", "LARGE", "ENTERPRISE", "CUSTOM"]).optional() }))
    .query(async ({ input }) => {
      return prisma.creditPackage.findMany({
        where: {
          isActive: true,
          ...(input?.packageType ? { packageType: input.packageType as any } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
        include: { feature: true },
      });
    }),

  payments: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).optional().default(1), pageSize: z.number().int().min(1).max(50).optional().default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        prisma.payment.count({ where: { userId } }),
        prisma.payment.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  creditPurchases: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).optional().default(1), pageSize: z.number().int().min(1).max(50).optional().default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        prisma.creditPurchase.count({ where: { userId } }),
        prisma.creditPurchase.findMany({
          where: { userId },
          orderBy: { purchasedAt: "desc" },
          skip,
          take: input.pageSize,
          include: { package: true },
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    await LimitGuard.ensureCycle(userId, ctx.session);
    const [subscription, quota, paymentsCount, purchasesCount] = await Promise.all([
      prisma.subscription.findFirst({ where: { userId }, include: { plan: true } }),
      prisma.userQuota.findUnique({ where: { userId } }),
      prisma.payment.count({ where: { userId } }),
      prisma.creditPurchase.count({ where: { userId } }),
    ]);
    return { subscription, quota, paymentsCount, purchasesCount };
  }),
});

export type BillingRouter = typeof billingRouter;


