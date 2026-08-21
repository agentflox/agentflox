import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { randomBytes, randomUUID } from "crypto";
import { assertWorkspaceMember, assertWorkspaceWriter, isAutomationsEnabled } from "@/features/automations/auth";
import { AUTOMATION_ACTION_TYPES } from "@/features/automations/actionCatalog";
import { AUTOMATION_TRIGGER_TYPES } from "@/features/automations/triggerCatalog";
import { inferKindFromActions, type ActionSpec } from "@/features/automations/types";

const triggerTypeEnum = z.enum(AUTOMATION_TRIGGER_TYPES);

const actionSchema = z.object({
  type: z.enum(AUTOMATION_ACTION_TYPES),
  input: z.record(z.string(), z.any()).default({}),
});

const triggerSchema = z.object({
  triggerType: triggerTypeEnum,
  triggerConfig: z.record(z.string(), z.any()).default({}),
  conditions: z.any().optional(),
  name: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const scopeInput = z.object({
  workspaceId: z.string(),
  teamId: z.string().optional().nullable(),
  spaceId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
});

async function materializeAgent(opts: {
  userId: string;
  workspaceId: string;
  name: string;
  prompt: string;
  knowledge?: unknown;
  existingAgentId?: string | null;
  spaceId?: string | null;
  projectId?: string | null;
  teamId?: string | null;
}) {
  if (opts.existingAgentId) {
    await prisma.aiAgent.update({
      where: { id: opts.existingAgentId },
      data: {
        systemPrompt: opts.prompt,
        metadata: { knowledge: opts.knowledge } as object,
      },
    });
    return opts.existingAgentId;
  }
  const agent = await prisma.aiAgent.create({
    data: {
      id: randomUUID(),
      name: opts.name,
      ownerId: opts.userId,
      workspaceId: opts.workspaceId,
      spaceId: opts.projectId ? null : opts.spaceId ?? null,
      projectId: opts.projectId ?? null,
      teamId: opts.projectId || opts.spaceId ? null : opts.teamId ?? null,
      agentType: "TASK_EXECUTOR",
      systemPrompt: opts.prompt,
      status: "ACTIVE",
      isActive: true,
      metadata: { knowledge: opts.knowledge, createdByAutomation: true } as object,
    },
  });
  return agent.id;
}

const RECOMMENDED = [
  { id: "project-summarizer", title: "Project Summarizer", description: "Summarize project activity" },
  { id: "task-triage", title: "Task Triage", description: "Triage and prioritize new tasks" },
  { id: "meeting-secretary", title: "Meeting Secretary", description: "Capture follow-ups from meetings" },
];

export const automationRouter = router({
  isEnabled: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const ws = await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      return { enabled: isAutomationsEnabled(ws.settings) };
    }),

  list: protectedProcedure
    .input(scopeInput.extend({
      kind: z.enum(["CLASSIC", "AGENT"]).optional(),
      isActive: z.boolean().optional(),
      triggerType: triggerTypeEnum.optional(),
      triggerTypes: z.array(triggerTypeEnum).optional(),
      actionType: z.string().optional(),
      actionTypes: z.array(z.enum(AUTOMATION_ACTION_TYPES)).optional(),
      ownerIds: z.array(z.string()).optional(),
      search: z.string().optional(),
      sort: z.enum(["updated", "name", "created"]).optional().default("updated"),
      sortDesc: z.boolean().optional().default(true),
      exactScope: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      const where: any = {
        workspaceId: input.workspaceId,
        status: { not: "ARCHIVED" },
      };
      if (input.exactScope) {
        if (input.listId) {
          where.listId = input.listId;
        } else if (input.folderId) {
          where.folderId = input.folderId;
          where.listId = null;
        } else if (input.projectId) {
          where.projectId = input.projectId;
          where.folderId = null;
          where.listId = null;
        } else if (input.spaceId) {
          where.spaceId = input.spaceId;
          where.projectId = null;
          where.folderId = null;
          where.listId = null;
        } else if (input.teamId) {
          where.teamId = input.teamId;
          where.spaceId = null;
          where.projectId = null;
          where.folderId = null;
          where.listId = null;
        } else {
          where.teamId = null;
          where.spaceId = null;
          where.projectId = null;
          where.folderId = null;
          where.listId = null;
        }
      } else {
        if (input.teamId) where.teamId = input.teamId;
        if (input.spaceId) where.spaceId = input.spaceId;
        if (input.projectId) where.projectId = input.projectId;
        if (input.folderId) where.folderId = input.folderId;
        if (input.listId) where.listId = input.listId;
      }
      if (input.kind) where.kind = input.kind;
      if (input.isActive !== undefined) where.isActive = input.isActive;
      const triggerTypes =
        input.triggerTypes && input.triggerTypes.length > 0
          ? input.triggerTypes
          : input.triggerType
            ? [input.triggerType]
            : null;
      if (input.search?.trim()) {
        where.name = { contains: input.search.trim(), mode: "insensitive" };
      }
      if (triggerTypes) {
        where.triggers = { some: { triggerType: { in: triggerTypes } } };
      }
      const ownerIds =
        input.ownerIds && input.ownerIds.length > 0 ? input.ownerIds : null;
      if (ownerIds) {
        where.ownerId = { in: ownerIds };
      }
      const items = await prisma.automation.findMany({
        where,
        include: {
          triggers: true,
          aiAgent: { select: { id: true, name: true, isActive: true, isPaused: true, avatar: true } },
          owner: { select: { id: true, name: true, image: true } },
          logs: { orderBy: { executedAt: "desc" }, take: 1 },
        },
        orderBy:
          input.sort === "name"
            ? { name: input.sortDesc ? "desc" : "asc" }
            : input.sort === "created"
              ? { createdAt: input.sortDesc ? "desc" : "asc" }
              : { updatedAt: input.sortDesc ? "desc" : "asc" },
      });
      const actionTypes = input.actionTypes && input.actionTypes.length > 0 ? input.actionTypes : null;
      const filtered = actionTypes
        ? items.filter((a) => Array.isArray(a.actions) && (a.actions as any[]).some((x) => actionTypes.includes(x.type)))
        : input.actionType
          ? items.filter((a) => Array.isArray(a.actions) && (a.actions as any[]).some((x) => x.type === input.actionType))
          : items;
      return { items: filtered, activeCount: filtered.filter((a) => a.isActive).length };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await prisma.automation.findUnique({
        where: { id: input.id },
        include: {
          triggers: true,
          aiAgent: true,
          logs: { orderBy: { executedAt: "desc" }, take: 20 },
          owner: { select: { id: true, name: true, image: true } },
        },
      });
      if (!row?.workspaceId) throw new TRPCError({ code: "NOT_FOUND" });
      await assertWorkspaceMember(row.workspaceId, ctx.session!.user!.id);
      return row;
    }),

  create: protectedProcedure
    .input(scopeInput.extend({
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      triggers: z.array(triggerSchema).min(1),
      actions: z.array(actionSchema).min(1),
      agentId: z.string().uuid().optional().nullable(),
      cronExpression: z.string().optional().nullable(),
      isScheduled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await assertWorkspaceWriter(input.workspaceId, userId);
      const actions = input.actions as ActionSpec[];
      const kind = inferKindFromActions(actions);
      let agentId = input.agentId ?? null;
      if (kind === "AGENT") {
        const launch = actions.find((a) => a.type === "LAUNCH_AI_AGENT");
        const ai = actions.find((a) => a.type === "DO_ANYTHING_WITH_AI");
        if (launch?.input?.agentId) {
          agentId = launch.input.agentId;
        } else {
          agentId = await materializeAgent({
            userId,
            workspaceId: input.workspaceId,
            name: input.name,
            prompt: ai?.input?.prompt || launch?.input?.prompt || "You are a helpful automation agent.",
            knowledge: ai?.input?.workspaceKnowledge,
            existingAgentId: agentId,
            spaceId: input.spaceId,
            projectId: input.projectId,
            teamId: input.teamId,
          });
        }
      }
      return prisma.automation.create({
        data: {
          name: input.name,
          description: input.description,
          ownerId: userId,
          workspaceId: input.workspaceId,
          teamId: input.teamId ?? null,
          spaceId: input.spaceId ?? null,
          projectId: input.projectId ?? null,
          listId: input.listId ?? null,
          folderId: input.folderId ?? null,
          kind,
          actions: actions as object,
          agentId,
          isScheduled: input.isScheduled ?? input.triggers.some((t) => t.triggerType === "EVERY_SCHEDULED_TIME"),
          cronExpression: input.cronExpression,
          isActive: true,
          status: "ACTIVE",
          triggers: {
            create: input.triggers.map((t) => ({
              triggerType: t.triggerType,
              triggerConfig: t.triggerConfig,
              conditions: t.conditions,
              name: t.name,
              isActive: t.isActive,
            })),
          },
        },
        include: { triggers: true, aiAgent: true },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      triggers: z.array(triggerSchema).optional(),
      actions: z.array(actionSchema).optional(),
      agentId: z.string().uuid().optional().nullable(),
      cronExpression: z.string().optional().nullable(),
      isScheduled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.automation.findUnique({ where: { id: input.id } });
      if (!existing?.workspaceId) throw new TRPCError({ code: "NOT_FOUND" });
      await assertWorkspaceWriter(existing.workspaceId, userId);

      const actions = (input.actions ?? existing.actions) as ActionSpec[];
      const kind = inferKindFromActions(Array.isArray(actions) ? actions : []);
      let agentId = input.agentId !== undefined ? input.agentId : existing.agentId;
      if (kind === "AGENT" && input.actions) {
        const launch = actions.find((a) => a.type === "LAUNCH_AI_AGENT");
        const ai = actions.find((a) => a.type === "DO_ANYTHING_WITH_AI");
        if (launch?.input?.agentId) {
          agentId = launch.input.agentId;
        } else {
          agentId = await materializeAgent({
            userId,
            workspaceId: existing.workspaceId,
            name: input.name || existing.name,
            prompt: ai?.input?.prompt || launch?.input?.prompt || "You are a helpful automation agent.",
            knowledge: ai?.input?.workspaceKnowledge,
            existingAgentId: agentId,
            spaceId: existing.spaceId,
            projectId: existing.projectId,
            teamId: existing.teamId,
          });
        }
      }

      if (input.triggers) {
        await prisma.automationTrigger.deleteMany({ where: { automationId: input.id } });
      }

      return prisma.automation.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.actions && { actions: actions as object }),
          kind,
          agentId,
          ...(input.cronExpression !== undefined && { cronExpression: input.cronExpression }),
          ...(input.isScheduled !== undefined && { isScheduled: input.isScheduled }),
          ...(input.triggers && {
            isScheduled: input.triggers.some((t) => t.triggerType === "EVERY_SCHEDULED_TIME"),
            triggers: {
              create: input.triggers.map((t) => ({
                triggerType: t.triggerType,
                triggerConfig: t.triggerConfig,
                conditions: t.conditions,
                name: t.name,
                isActive: t.isActive,
              })),
            },
          }),
        },
        include: { triggers: true, aiAgent: true },
      });
    }),

  setActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.automation.findUnique({ where: { id: input.id } });
      if (!existing?.workspaceId) throw new TRPCError({ code: "NOT_FOUND" });
      await assertWorkspaceWriter(existing.workspaceId, ctx.session!.user!.id);
      return prisma.automation.update({
        where: { id: input.id },
        data: { isActive: input.isActive, status: input.isActive ? "ACTIVE" : "DRAFT" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.automation.findUnique({ where: { id: input.id } });
      if (!existing?.workspaceId) throw new TRPCError({ code: "NOT_FOUND" });
      await assertWorkspaceWriter(existing.workspaceId, ctx.session!.user!.id);
      return prisma.automation.update({
        where: { id: input.id },
        data: { status: "ARCHIVED", isActive: false },
      });
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.automation.findUnique({
        where: { id: input.id },
        include: { triggers: true },
      });
      if (!existing?.workspaceId) throw new TRPCError({ code: "NOT_FOUND" });
      await assertWorkspaceWriter(existing.workspaceId, userId);
      return prisma.automation.create({
        data: {
          name: `${existing.name} (copy)`,
          description: existing.description,
          ownerId: userId,
          workspaceId: existing.workspaceId,
          teamId: existing.teamId,
          spaceId: existing.spaceId,
          projectId: existing.projectId,
          listId: existing.listId,
          folderId: existing.folderId,
          kind: existing.kind,
          actions: existing.actions as object,
          agentId: existing.agentId,
          isScheduled: existing.isScheduled,
          cronExpression: existing.cronExpression,
          isActive: false,
          status: "DRAFT",
          triggers: {
            create: existing.triggers.map((t) => ({
              triggerType: t.triggerType,
              triggerConfig: t.triggerConfig ?? {},
              conditions: t.conditions ?? undefined,
              name: t.name,
              isActive: t.isActive,
            })),
          },
        },
        include: { triggers: true, aiAgent: true },
      });
    }),

  listLogs: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      automationId: z.string().optional(),
      teamId: z.string().optional().nullable(),
      spaceId: z.string().optional().nullable(),
      projectId: z.string().optional().nullable(),
      folderId: z.string().optional().nullable(),
      listId: z.string().optional().nullable(),
      exactScope: z.boolean().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      activityStatuses: z.array(z.enum(["FAILED", "SUCCESS", "SKIPPED", "AI_CONDITION_SKIPPED"])).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      const automationWhere: any = { workspaceId: input.workspaceId };
      if (input.exactScope) {
        if (input.listId) {
          automationWhere.listId = input.listId;
        } else if (input.folderId) {
          automationWhere.folderId = input.folderId;
          automationWhere.listId = null;
        } else if (input.projectId) {
          automationWhere.projectId = input.projectId;
          automationWhere.folderId = null;
          automationWhere.listId = null;
        } else if (input.spaceId) {
          automationWhere.spaceId = input.spaceId;
          automationWhere.projectId = null;
          automationWhere.folderId = null;
          automationWhere.listId = null;
        } else if (input.teamId) {
          automationWhere.teamId = input.teamId;
          automationWhere.spaceId = null;
          automationWhere.projectId = null;
          automationWhere.folderId = null;
          automationWhere.listId = null;
        } else {
          automationWhere.teamId = null;
          automationWhere.spaceId = null;
          automationWhere.projectId = null;
          automationWhere.folderId = null;
          automationWhere.listId = null;
        }
      } else {
        if (input.teamId) automationWhere.teamId = input.teamId;
        if (input.spaceId) automationWhere.spaceId = input.spaceId;
        if (input.projectId) automationWhere.projectId = input.projectId;
        if (input.folderId) automationWhere.folderId = input.folderId;
        if (input.listId) automationWhere.listId = input.listId;
      }
      const where: any = { automation: automationWhere };
      if (input.automationId) where.automationId = input.automationId;
      if (input.dateFrom || input.dateTo) {
        where.executedAt = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        };
      }
      if (input.activityStatuses && input.activityStatuses.length > 0) {
        const or: any[] = [];
        if (input.activityStatuses.includes("SUCCESS")) or.push({ status: "SUCCESS" });
        if (input.activityStatuses.includes("SKIPPED")) or.push({ status: "PARTIAL" });
        if (input.activityStatuses.includes("FAILED")) {
          or.push({
            status: "FAILED",
            NOT: { error: { contains: "condition_gate", mode: "insensitive" } },
          });
        }
        if (input.activityStatuses.includes("AI_CONDITION_SKIPPED")) {
          or.push({
            status: "FAILED",
            error: { contains: "condition_gate", mode: "insensitive" },
          });
        }
        where.AND = [...(where.AND || []), { OR: or }];
      }
      const [total, items] = await Promise.all([
        prisma.automationLog.count({ where }),
        prisma.automationLog.findMany({
          where,
          orderBy: { executedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            automation: { select: { id: true, name: true, kind: true, description: true } },
          },
        }),
      ]);
      return { total, items };
    }),

  listRecurring: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      limit: z.number().int().min(1).max(100).default(100),
    }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      const items = await prisma.automation.findMany({
        where: {
          workspaceId: input.workspaceId,
          isActive: true,
          status: { not: "ARCHIVED" },
          OR: [
            { isScheduled: true },
            { triggers: { some: { triggerType: "EVERY_SCHEDULED_TIME", isActive: true } } },
          ],
        },
        select: {
          id: true,
          name: true,
          lastRanAt: true,
          runCount: true,
          cronExpression: true,
          triggers: {
            where: { triggerType: "EVERY_SCHEDULED_TIME" },
            select: { triggerConfig: true },
            take: 1,
          },
        },
        orderBy: [{ lastRanAt: "desc" }, { updatedAt: "desc" }],
        take: input.limit,
      });

      return {
        items: items.map((row) => {
          const triggerConfig = row.triggers[0]?.triggerConfig as Record<string, unknown> | undefined;
          const cronFromTrigger = triggerConfig?.cronExpression ?? triggerConfig?.cron;
          const cronExpression =
            row.cronExpression ||
            (typeof cronFromTrigger === "string" ? cronFromTrigger : null);
          return {
            id: row.id,
            name: row.name,
            lastRanAt: row.lastRanAt,
            runCount: row.runCount,
            cronExpression,
          };
        }),
      };
    }),

  usageSummary: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      const [active, logs] = await Promise.all([
        prisma.automation.count({ where: { workspaceId: input.workspaceId, isActive: true, status: { not: "ARCHIVED" } } }),
        prisma.automationLog.groupBy({
          by: ["status"],
          where: { automation: { workspaceId: input.workspaceId } },
          _count: true,
        }),
      ]);
      const byStatus = Object.fromEntries(logs.map((l) => [l.status, l._count]));
      return {
        active,
        success: byStatus.SUCCESS ?? 0,
        failed: byStatus.FAILED ?? 0,
        partial: byStatus.PARTIAL ?? 0,
      };
    }),

  createWebhookTrigger: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.automation.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.workspaceId) {
        await assertWorkspaceWriter(existing.workspaceId, ctx.session!.user!.id);
      } else if (existing.ownerId !== ctx.session!.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const secret = randomBytes(32).toString("hex");
      const hook = await prisma.webhook.findFirst({
        where: { type: "automation", sourceId: existing.id },
      });
      const saved = hook
        ? await prisma.webhook.update({
            where: { id: hook.id },
            data: { secret, isActive: existing.isActive, name: existing.name },
          })
        : await prisma.webhook.create({
            data: {
              createdBy: ctx.session!.user!.id,
              name: existing.name,
              type: "automation",
              sourceId: existing.id,
              url: "",
              secret,
              isActive: existing.isActive,
            },
          });
      await prisma.automation.update({
        where: { id: input.id },
        data: { webhookSecret: secret },
      });
      return { id: existing.id, webhookId: saved.id, webhookSecret: secret };
    }),

  rotateWebhookSecret: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.automation.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.workspaceId) {
        await assertWorkspaceWriter(existing.workspaceId, ctx.session!.user!.id);
      } else if (existing.ownerId !== ctx.session!.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const secret = randomBytes(32).toString("hex");
      const hook = await prisma.webhook.findFirst({
        where: { type: "automation", sourceId: existing.id },
      });
      if (hook) {
        await prisma.webhook.update({ where: { id: hook.id }, data: { secret } });
      } else {
        await prisma.webhook.create({
          data: {
            createdBy: ctx.session!.user!.id,
            name: existing.name,
            type: "automation",
            sourceId: existing.id,
            url: "",
            secret,
            isActive: existing.isActive,
          },
        });
      }
      await prisma.automation.update({ where: { id: input.id }, data: { webhookSecret: secret } });
      return { webhookSecret: secret };
    }),

  recommendedAgents: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.session!.user!.id);
      return { items: RECOMMENDED };
    }),

  applyTemplate: protectedProcedure
    .input(scopeInput.extend({
      templateId: z.enum(["auto-assign", "update-status-on-create", "launch-ai-on-create"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await assertWorkspaceWriter(input.workspaceId, userId);
      const key = `tpl:${input.templateId}:${input.workspaceId}:${input.spaceId || ""}:${input.projectId || ""}:${input.teamId || ""}:${userId}`;
      try {
        await prisma.automationIdempotencyKey.create({ data: { key, status: "PENDING" } });
      } catch {
        const existing = await prisma.automationIdempotencyKey.findUnique({ where: { key } });
        if (existing?.status === "COMPLETED") return existing.result;
        if (existing?.status === "PENDING") {
          throw new TRPCError({ code: "CONFLICT", message: "Template apply already in progress" });
        }
      }

      try {
        let created;
        if (input.templateId === "update-status-on-create") {
          created = await prisma.automation.create({
            data: {
              name: "Update Status on New Task",
              ownerId: userId,
              workspaceId: input.workspaceId,
              spaceId: input.spaceId,
              projectId: input.projectId,
              teamId: input.teamId,
              kind: "CLASSIC",
              actions: [{ type: "UPDATE_STATUS", input: { statusId: "" } }] as object,
              isActive: true,
              triggers: {
                create: [{
                  triggerType: "TASK_OR_SUBTASK_CREATED",
                  triggerConfig: { creationSources: { automations: false, users: true, forms: true } },
                }],
              },
            },
          });
        } else if (input.templateId === "auto-assign") {
          created = await prisma.automation.create({
            data: {
              name: "Auto assign",
              ownerId: userId,
              workspaceId: input.workspaceId,
              spaceId: input.spaceId,
              projectId: input.projectId,
              teamId: input.teamId,
              kind: "CLASSIC",
              actions: [{ type: "ADD_ASSIGNEE", input: { userId } }] as object,
              isActive: true,
              triggers: {
                create: [{
                  triggerType: "TASK_OR_SUBTASK_CREATED",
                  triggerConfig: { creationSources: { automations: false, users: true } },
                }],
              },
            },
          });
        } else {
          created = await prisma.automation.create({
            data: {
              name: "Launch AI Agent on Task Creation",
              ownerId: userId,
              workspaceId: input.workspaceId,
              spaceId: input.spaceId,
              projectId: input.projectId,
              teamId: input.teamId,
              kind: "AGENT",
              actions: [{
                type: "DO_ANYTHING_WITH_AI",
                input: { prompt: "Review new tasks and set them up for success.", version: "0.5" },
              }] as object,
              isActive: true,
              triggers: {
                create: [{
                  triggerType: "TASK_OR_SUBTASK_CREATED",
                  triggerConfig: { creationSources: { automations: true, users: true } },
                  conditions: {},
                }],
              },
            },
          });
        }
        await prisma.automationIdempotencyKey.update({
          where: { key },
          data: { status: "COMPLETED", result: { id: created.id } as object },
        });
        return created;
      } catch (err) {
        await prisma.automationIdempotencyKey.update({
          where: { key },
          data: { status: "FAILED" },
        });
        throw err;
      }
    }),
});
