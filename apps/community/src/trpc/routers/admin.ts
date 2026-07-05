import { z } from "zod";
import { adminProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function toMonthlyPrice(plan: { price: number; billingPeriod?: string | null }) {
  const period = String(plan.billingPeriod ?? "").toUpperCase();
  if (period === "YEARLY" || period === "ANNUAL" || period === "YEAR") return plan.price / 12;
  return plan.price;
}

export const adminRouter = router({
  overview: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(7).max(180).optional().default(30),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      const startWindow = addDays(now, -input.days);

      const [activeUsers, totalUsers, usersActiveWindow, newUsersToday, newUsersWeek, newUsersMonth] =
        await Promise.all([
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count(),
          prisma.user.count({ where: { lastActiveAt: { gte: startWindow } } }),
          prisma.user.count({ where: { createdAt: { gte: startOfDay(now) } } }),
          prisma.user.count({ where: { createdAt: { gte: addDays(startOfDay(now), -7) } } }),
          prisma.user.count({ where: { createdAt: { gte: addMonths(startOfDay(now), -1) } } }),
        ]);

      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
        include: { plan: true },
      });

      const mrr = activeSubscriptions.reduce((sum, s) => sum + toMonthlyPrice({ price: s.plan.price, billingPeriod: (s.plan as any).billingPeriod }), 0);
      const arr = mrr * 12;

      const churned = await prisma.subscription.count({
        where: {
          status: { in: ["CANCELLED", "CANCELED", "ENDED"] as any },
          updatedAt: { gte: startWindow },
        },
      });
      const churnRate = activeSubscriptions.length > 0 ? (churned / (activeSubscriptions.length + churned)) * 100 : 0;

      const [failedPayments7d, errors1h] = await Promise.all([
        prisma.payment.count({
          where: { status: "FAILED" as any, createdAt: { gte: addDays(now, -7) } },
        }),
        prisma.activityLog.count({
          where: { severity: "ERROR" as any, createdAt: { gte: addDays(now, -1) } },
        }),
      ]);

      const status = errors1h > 0 || failedPayments7d > 0 ? "DEGRADED" : "HEALTHY";

      return {
        revenue: {
          mrr,
          arr,
          churnRate,
          activeSubscriptions: activeSubscriptions.length,
          churnedWindow: churned,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          activeWindow: usersActiveWindow,
          signups: { today: newUsersToday, week: newUsersWeek, month: newUsersMonth },
        },
        system: {
          status,
          failedPayments7d,
          errors24h: errors1h,
        },
      };
    }),

  usersList: adminProcedure
    .input(
      z.object({
        query: z.string().optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional(),
        sort: z.enum(["createdAt", "lastActiveAt", "email"]).optional().default("createdAt"),
        order: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(25),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.role) where.role = input.role;
      if (typeof input.isActive === "boolean") where.isActive = input.isActive;
      if (input.query?.trim()) {
        const q = input.query.trim();
        where.OR = [
          { email: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { [input.sort]: input.order },
          skip,
          take,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            lastActiveAt: true,
          },
        }),
      ]);

      return { total, items, page: input.page, pageSize: input.pageSize };
    }),

  userDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [user, subscription, sessions, activity] = await Promise.all([
        prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            lastActiveAt: true,
            timezone: true,
            location: true,
          },
        }),
        prisma.subscription.findFirst({
          where: { userId: input.userId },
          orderBy: { updatedAt: "desc" },
          include: { plan: true },
        }),
        prisma.session.findMany({
          where: { userId: input.userId },
          orderBy: { expires: "desc" },
          take: 20,
          select: { id: true, expires: true },
        }),
        prisma.activityLog.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return { user, subscription, sessions, activity };
    }),

  userSetRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.string().nullable() }))
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, role: true },
      });
    }),

  userSetActive: adminProcedure
    .input(z.object({ userId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { isActive: input.isActive },
        select: { id: true, isActive: true },
      });
    }),

  usersBulkSetActive: adminProcedure
    .input(z.object({ userIds: z.array(z.string()).min(1).max(500), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const res = await prisma.user.updateMany({
        where: { id: { in: input.userIds } },
        data: { isActive: input.isActive },
      });
      return { updated: res.count };
    }),

  subscriptionsList: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        query: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(25),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.query?.trim()) {
        const q = input.query.trim();
        where.OR = [
          { user: { email: { contains: q, mode: "insensitive" } } },
          { user: { username: { contains: q, mode: "insensitive" } } },
          { plan: { name: { contains: q, mode: "insensitive" } } },
          { plan: { displayName: { contains: q, mode: "insensitive" } } },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.subscription.count({ where }),
        prisma.subscription.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          include: { plan: true, user: { select: { id: true, email: true, username: true, avatar: true, firstName: true, lastName: true } } },
        }),
      ]);

      return { total, items, page: input.page, pageSize: input.pageSize };
    }),

  plansList: adminProcedure.query(async () => {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      select: { id: true, name: true, displayName: true, billingPeriod: true, price: true, currency: true, planType: true },
    });
  }),

  subscriptionOverridePlan: adminProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        planId: z.string(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          planId: input.planId,
          ...(input.status ? { status: input.status as any } : {}),
        },
        include: { plan: true, user: { select: { id: true, email: true } } },
      });
    }),

  failedPayments: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(180).optional().default(14),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(25),
      })
    )
    .query(async ({ input }) => {
      const since = addDays(new Date(), -input.days);
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const where = { status: "FAILED" as any, createdAt: { gte: since } };
      const [total, items] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: { user: { select: { id: true, email: true, username: true, firstName: true, lastName: true, avatar: true } } },
        }),
      ]);
      return { total, items, page: input.page, pageSize: input.pageSize };
    }),

  auditLogs: adminProcedure
    .input(
      z.object({
        query: z.string().optional(),
        severity: z.string().optional(),
        category: z.string().optional(),
        userId: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.severity) where.severity = input.severity as any;
      if (input.category) where.category = input.category as any;
      if (input.userId) where.userId = input.userId;
      if (input.query?.trim()) {
        const q = input.query.trim();
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { entityType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const [total, items] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: { user: { select: { id: true, email: true, username: true, avatar: true, firstName: true, lastName: true } } },
        }),
      ]);
      return { total, items, page: input.page, pageSize: input.pageSize };
    }),

  userSessions: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const items = await prisma.session.findMany({
        where: { userId: input.userId },
        orderBy: { expires: "desc" },
        take: 50,
        select: { id: true, expires: true },
      });
      return { items };
    }),

  bugReports: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        handled: z.boolean().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(25),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.userId) where.userId = input.userId;
      // Treat any feedback with a non-empty comment/suggestions as "report" material.
      where.OR = [{ comment: { not: null } }, { suggestions: { not: null } }];

      if (typeof input.handled === "boolean") {
        where.metadata = { path: ["handled"], equals: input.handled };
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const [total, items] = await Promise.all([
        (prisma as any).agentFeedback.count({ where }),
        (prisma as any).agentFeedback.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: {
            user: { select: { id: true, email: true, username: true, avatar: true, firstName: true, lastName: true } },
            aiAgent: { select: { id: true, name: true } },
          },
        }),
      ]);
      return { total, items, page: input.page, pageSize: input.pageSize };
    }),

  setBugReportHandled: adminProcedure
    .input(z.object({ feedbackId: z.string(), handled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db: any = prisma as any;
      const existing = await db.agentFeedback.findUnique({ where: { id: input.feedbackId }, select: { id: true, metadata: true } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const metadata = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
      return db.agentFeedback.update({
        where: { id: input.feedbackId },
        data: { metadata: { ...(metadata as any), handled: input.handled, handledAt: new Date().toISOString() } },
        select: { id: true, metadata: true },
      });
    }),
});

export type AdminRouter = typeof adminRouter;

