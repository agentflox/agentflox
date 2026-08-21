import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { WEBHOOK_TYPES } from "@/features/automations/webhookTypes";

const kvPairSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const webhookTypeSchema = z.enum([
  WEBHOOK_TYPES.AUTOMATION,
  WEBHOOK_TYPES.INTEGRATION,
  WEBHOOK_TYPES.AGENT,
]);

const webhookInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: webhookTypeSchema.optional().default(WEBHOOK_TYPES.AUTOMATION),
  sourceId: z.string().optional().nullable(),
  url: z.string().optional().default(""),
  headers: z.array(kvPairSchema).optional().default([]),
  urlParams: z.array(kvPairSchema).optional().default([]),
  isActive: z.boolean().optional().default(true),
  events: z.array(z.enum([
    "TASK_CREATED",
    "TASK_UPDATED",
    "TASK_DELETED",
    "TASK_COMPLETED",
    "COMMENT_ADDED",
    "MEMBER_ADDED",
    "MEMBER_REMOVED",
    "WORKSPACE_UPDATED",
  ])).optional().default(["TASK_CREATED", "TASK_UPDATED"]),
});

function normalizePairs(pairs: Array<{ key: string; value: string }>) {
  return pairs.filter((p) => p.key.trim());
}

function assertOwner(createdBy: string, userId: string) {
  if (createdBy !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Webhook not found or permission denied" });
  }
}

function buildSamplePayload() {
  return {
    event: "task.created",
    task_id: "sample-task-id",
    task_name: "Sample task",
    task_description: "Sample webhook payload",
    creator_username: "demo_user",
    creator_email: "demo@example.com",
    due_date: new Date().toISOString(),
    start_date: new Date().toISOString(),
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    date_closed: null,
  };
}

function appendUrlParams(url: string, params: Array<{ key: string; value: string }>) {
  if (!params.length) return url;
  const u = new URL(url);
  for (const p of params) {
    if (p.key.trim()) u.searchParams.set(p.key.trim(), p.value);
  }
  return u.toString();
}

export const webhookRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: webhookTypeSchema.optional().default(WEBHOOK_TYPES.AUTOMATION),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = { createdBy: userId, type: input.type };
      if (input.isActive !== undefined) where.isActive = input.isActive;
      if (input.search?.trim()) {
        where.OR = [
          { name: { contains: input.search.trim(), mode: "insensitive" } },
          { description: { contains: input.search.trim(), mode: "insensitive" } },
          { url: { contains: input.search.trim(), mode: "insensitive" } },
        ];
      }
      const base = { createdBy: userId, type: input.type };
      const [items, activeCount, inactiveCount] = await Promise.all([
        prisma.webhook.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          include: {
            creator: { select: { id: true, name: true, image: true } },
          },
        }),
        prisma.webhook.count({ where: { ...base, isActive: true } }),
        prisma.webhook.count({ where: { ...base, isActive: false } }),
      ]);
      return { items, activeCount, inactiveCount };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await prisma.webhook.findUnique({
        where: { id: input.id },
        include: { creator: { select: { id: true, name: true, image: true } } },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwner(row.createdBy, ctx.session!.user!.id);
      return row;
    }),

  create: protectedProcedure
    .input(webhookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.webhook.create({
        data: {
          createdBy: userId,
          name: input.name,
          description: input.description ?? null,
          type: input.type,
          sourceId: input.sourceId ?? null,
          url: input.url || "",
          secret: randomBytes(24).toString("hex"),
          headers: normalizePairs(input.headers) as object,
          urlParams: normalizePairs(input.urlParams) as object,
          isActive: input.isActive ?? true,
          events: input.events as any,
        },
      });
    }),

  update: protectedProcedure
    .input(webhookInputSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwner(existing.createdBy, ctx.session!.user!.id);
      return prisma.webhook.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.headers !== undefined ? { headers: normalizePairs(input.headers) as object } : {}),
          ...(input.urlParams !== undefined ? { urlParams: normalizePairs(input.urlParams) as object } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.events !== undefined ? { events: input.events as any } : {}),
        },
      });
    }),

  setActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwner(existing.createdBy, ctx.session!.user!.id);
      return prisma.webhook.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.webhook.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwner(existing.createdBy, ctx.session!.user!.id);
      await prisma.webhook.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  test: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      headers: z.array(kvPairSchema).optional().default([]),
      urlParams: z.array(kvPairSchema).optional().default([]),
      webhookId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.webhookId) {
        const existing = await prisma.webhook.findUnique({ where: { id: input.webhookId } });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwner(existing.createdBy, ctx.session!.user!.id);
      }

      const payload = buildSamplePayload();
      const targetUrl = appendUrlParams(input.url, normalizePairs(input.urlParams));
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      for (const h of normalizePairs(input.headers)) {
        headers[h.key.trim()] = h.value;
      }

      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });
        const text = await res.text().catch(() => "");
        const result = {
          ok: res.ok,
          httpStatus: res.status,
          response: text.slice(0, 2000),
        };

        if (input.webhookId) {
          await prisma.webhookDelivery.create({
            data: {
              webhookId: input.webhookId,
              event: "TASK_CREATED",
              payload: payload as object,
              status: res.ok ? "SUCCESS" : "FAILED",
              httpStatus: res.status,
              response: text.slice(0, 2000),
              error: res.ok ? null : `HTTP ${res.status}`,
              deliveredAt: res.ok ? new Date() : null,
            },
          });
        }

        return result;
      } catch (err: any) {
        if (input.webhookId) {
          await prisma.webhookDelivery.create({
            data: {
              webhookId: input.webhookId,
              event: "TASK_CREATED",
              payload: payload as object,
              status: "FAILED",
              error: err?.message || "request_failed",
            },
          });
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Webhook test failed",
        });
      }
    }),
});
