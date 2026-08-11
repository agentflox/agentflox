import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { LimitGuard } from "@/features/usage/utils/limitGuard";

export const usageRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    await LimitGuard.ensureCycle(userId);
    const [quota, meters] = await Promise.all([
      prisma.userQuota.findUnique({ where: { userId } }),
      LimitGuard.getQuotaMeters(userId),
    ]);
    return {
      ...quota,
      meters,
    };
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

  customModelsSummary: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).optional().default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const days = input?.days ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [customModels, logs] = await Promise.all([
        prisma.aiModel.findMany({
          where: {
            isCustom: true,
            isActive: true,
            userId,
          },
          select: {
            id: true,
            displayName: true,
            provider: true,
            apiModelId: true,
            slug: true,
            createdAt: true,
          },
          orderBy: { displayName: "asc" },
        }),
        prisma.aiUsageLog.findMany({
          where: {
            userId,
            isCustom: true,
            createdAt: { gte: since },
          },
          select: {
            id: true,
            modelId: true,
            model: true,
            inputTokens: true,
            outputTokens: true,
            tokensUsed: true,
            success: true,
            action: true,
            createdAt: true,
            errorMessage: true,
            metadata: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);

      type Agg = {
        modelId: string | null;
        model: string;
        displayName: string;
        provider: string | null;
        apiModelId: string | null;
        slug: string | null;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        errors: number;
        recent: Array<{
          id: string;
          action: string;
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          success: boolean;
          createdAt: Date;
          errorMessage: string | null;
        }>;
      };

      const byModel = new Map<string, Agg>();

      for (const m of customModels) {
        byModel.set(m.id, {
          modelId: m.id,
          model: m.displayName,
          displayName: m.displayName,
          provider: m.provider,
          apiModelId: m.apiModelId,
          slug: m.slug,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          errors: 0,
          recent: [],
        });
      }

      for (const log of logs) {
        const key = log.modelId || `orphan:${log.model || "unknown"}`;
        let cur = byModel.get(key);
        if (!cur) {
          cur = {
            modelId: log.modelId,
            model: log.model,
            displayName: log.model,
            provider: (log.metadata as any)?.provider ?? null,
            apiModelId: log.model,
            slug: (log.metadata as any)?.slug ?? null,
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            errors: 0,
            recent: [],
          };
          byModel.set(key, cur);
        }
        cur.requests += 1;
        cur.inputTokens += log.inputTokens || 0;
        cur.outputTokens += log.outputTokens || 0;
        cur.totalTokens += log.tokensUsed || 0;
        if (!log.success) cur.errors += 1;
        if (cur.recent.length < 20) {
          cur.recent.push({
            id: log.id,
            action: log.action,
            inputTokens: log.inputTokens || 0,
            outputTokens: log.outputTokens || 0,
            totalTokens: log.tokensUsed || 0,
            success: log.success,
            createdAt: log.createdAt,
            errorMessage: log.errorMessage,
          });
        }
      }

      const items = Array.from(byModel.values()).sort((a, b) => {
        if (b.totalTokens !== a.totalTokens) return b.totalTokens - a.totalTokens;
        return a.displayName.localeCompare(b.displayName);
      });

      // Keep legacy `items` shape + richer `models`
      const totals = items.reduce(
        (acc, i) => {
          acc.requests += i.requests;
          acc.inputTokens += i.inputTokens;
          acc.outputTokens += i.outputTokens;
          acc.totalTokens += i.totalTokens;
          return acc;
        },
        { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      );

      return {
        days,
        items,
        models: items,
        totals,
      };
    }),

  /** System + custom model usage for analytics/ai-models detail page */
  modelsDetail: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).optional().default(30),
          scope: z.enum(["all", "system", "custom"]).optional().default("all"),
          recentLimit: z.number().int().min(5).max(50).optional().default(25),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const days = input?.days ?? 30;
      const scope = input?.scope ?? "all";
      const recentLimit = input?.recentLimit ?? 25;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const isCustomFilter =
        scope === "custom" ? true : scope === "system" ? false : undefined;

      const [userModels, logs] = await Promise.all([
        prisma.aiModel.findMany({
          where: {
            isActive: true,
            OR: [
              { isSystem: true },
              { isCustom: true, userId },
            ],
          },
          select: {
            id: true,
            displayName: true,
            provider: true,
            apiModelId: true,
            slug: true,
            isCustom: true,
            isSystem: true,
            createdAt: true,
          },
          orderBy: { displayName: "asc" },
        }),
        prisma.aiUsageLog.findMany({
          where: {
            userId,
            createdAt: { gte: since },
            ...(isCustomFilter === undefined ? {} : { isCustom: isCustomFilter }),
          },
          select: {
            id: true,
            modelId: true,
            model: true,
            inputTokens: true,
            outputTokens: true,
            tokensUsed: true,
            success: true,
            action: true,
            createdAt: true,
            errorMessage: true,
            isCustom: true,
            requestDuration: true,
            metadata: true,
          },
          orderBy: { createdAt: "desc" },
          take: 2000,
        }),
      ]);

      type Agg = {
        modelId: string | null;
        model: string;
        displayName: string;
        provider: string | null;
        apiModelId: string | null;
        slug: string | null;
        isCustom: boolean;
        isSystem: boolean;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        errors: number;
        avgDurationMs: number | null;
        lastUsedAt: Date | null;
        recent: Array<{
          id: string;
          action: string;
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          success: boolean;
          createdAt: Date;
          errorMessage: string | null;
          requestDuration: number | null;
          isCustom: boolean;
        }>;
      };

      const byModel = new Map<string, Agg>();
      const durationSum = new Map<string, { sum: number; n: number }>();

      for (const m of userModels) {
        if (scope === "custom" && !m.isCustom) continue;
        if (scope === "system" && m.isCustom) continue;
        byModel.set(m.id, {
          modelId: m.id,
          model: m.displayName,
          displayName: m.displayName,
          provider: m.provider,
          apiModelId: m.apiModelId,
          slug: m.slug,
          isCustom: m.isCustom,
          isSystem: m.isSystem,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          errors: 0,
          avgDurationMs: null,
          lastUsedAt: null,
          recent: [],
        });
      }

      for (const log of logs) {
        const key = log.modelId || `orphan:${log.isCustom ? "custom" : "system"}:${log.model || "unknown"}`;
        let cur = byModel.get(key);
        if (!cur) {
          cur = {
            modelId: log.modelId,
            model: log.model,
            displayName: log.model,
            provider: (log.metadata as any)?.provider ?? null,
            apiModelId: log.model,
            slug: (log.metadata as any)?.slug ?? null,
            isCustom: Boolean(log.isCustom),
            isSystem: !log.isCustom,
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            errors: 0,
            avgDurationMs: null,
            lastUsedAt: null,
            recent: [],
          };
          byModel.set(key, cur);
        }
        cur.requests += 1;
        cur.inputTokens += log.inputTokens || 0;
        cur.outputTokens += log.outputTokens || 0;
        cur.totalTokens += log.tokensUsed || 0;
        if (!log.success) cur.errors += 1;
        if (!cur.lastUsedAt || log.createdAt > cur.lastUsedAt) {
          cur.lastUsedAt = log.createdAt;
        }
        if (typeof log.requestDuration === "number" && log.requestDuration >= 0) {
          const d = durationSum.get(key) || { sum: 0, n: 0 };
          d.sum += log.requestDuration;
          d.n += 1;
          durationSum.set(key, d);
        }
        if (cur.recent.length < recentLimit) {
          cur.recent.push({
            id: log.id,
            action: log.action,
            inputTokens: log.inputTokens || 0,
            outputTokens: log.outputTokens || 0,
            totalTokens: log.tokensUsed || 0,
            success: log.success,
            createdAt: log.createdAt,
            errorMessage: log.errorMessage,
            requestDuration: log.requestDuration,
            isCustom: Boolean(log.isCustom),
          });
        }
      }

      for (const [key, d] of durationSum) {
        const cur = byModel.get(key);
        if (cur && d.n > 0) cur.avgDurationMs = Math.round(d.sum / d.n);
      }

      // Drop unused catalog models with zero activity for cleaner UI
      const items = Array.from(byModel.values())
        .filter((i) => i.requests > 0 || i.isCustom)
        .sort((a, b) => {
          if (b.totalTokens !== a.totalTokens) return b.totalTokens - a.totalTokens;
          return a.displayName.localeCompare(b.displayName);
        });

      const totals = items.reduce(
        (acc, i) => {
          acc.requests += i.requests;
          acc.inputTokens += i.inputTokens;
          acc.outputTokens += i.outputTokens;
          acc.totalTokens += i.totalTokens;
          acc.errors += i.errors;
          if (i.isCustom) {
            acc.customRequests += i.requests;
            acc.customTokens += i.totalTokens;
          } else {
            acc.systemRequests += i.requests;
            acc.systemTokens += i.totalTokens;
          }
          return acc;
        },
        {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          errors: 0,
          systemRequests: 0,
          systemTokens: 0,
          customRequests: 0,
          customTokens: 0,
        },
      );

      return {
        days,
        scope,
        models: items,
        totals,
      };
    }),

  /** Per-execution billed runs for analytics/executions detail page */
  executionsDetail: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).optional().default(30),
          kind: z
            .enum(["all", "composite_tool", "workforce", "agent", "swarm", "chat"])
            .optional()
            .default("all"),
          page: z.number().int().min(1).optional().default(1),
          pageSize: z.number().int().min(1).max(100).optional().default(25),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const days = input?.days ?? 30;
      const kind = input?.kind ?? "all";
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 25;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const where = {
        userId,
        createdAt: { gte: since },
        ...(kind === "all" ? {} : { kind }),
      };

      const [total, items, grouped] = await Promise.all([
        prisma.executionLog.count({ where }),
        prisma.executionLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.executionLog.groupBy({
          by: ["kind"],
          where: { userId, createdAt: { gte: since } },
          _count: { _all: true },
        }),
      ]);

      const byKind = {
        composite_tool: 0,
        workforce: 0,
        agent: 0,
        swarm: 0,
        chat: 0,
      } as Record<string, number>;
      for (const row of grouped) {
        byKind[row.kind] = row._count._all;
      }

      return {
        days,
        kind,
        page,
        pageSize,
        total,
        items,
        totals: {
          executions: Object.values(byKind).reduce((a, b) => a + b, 0),
          byKind,
        },
      };
    }),

  executionById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const item = await prisma.executionLog.findFirst({
        where: { id: input.id, userId },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Execution log not found" });
      }
      return item;
    }),
});

export type UsageRouter = typeof usageRouter;
