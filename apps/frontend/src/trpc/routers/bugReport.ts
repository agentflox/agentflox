import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import {
	BugReportPriority,
	BugReportSeverity,
	BugReportStatus,
} from "@agentflox/database/src/generated/prisma/client";
// ─── Shared zod enums ─────────────────────────────────────────────────────────
const categorySchema      = z.enum(["UI", "PERFORMANCE", "FUNCTIONALITY", "SECURITY", "DATA", "INTEGRATION", "OTHER"]);
const severitySchema      = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const prioritySchema      = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const statusSchema        = z.enum(["OPEN", "TRIAGED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "DUPLICATE", "WONT_FIX"]);
const reproducibilitySchema = z.enum(["ALWAYS", "SOMETIMES", "RARELY", "UNABLE"]);

// ─── Router ───────────────────────────────────────────────────────────────────
export const bugReportRouter = router({

  // ── Submit a new bug report (any authenticated user) ───────────────────────
  create: protectedProcedure
    .input(
      z.object({
        // Global entity reference
        entityType: z.string().optional(),
        entityId:   z.string().optional(),

        // Core content
        title:             z.string().min(1, "Title is required"),
        description:       z.string().min(10, "At least 10 characters required"),
        stepsToReproduce:  z.string().optional(),
        expectedBehavior:  z.string().optional(),
        actualBehavior:    z.string().optional(),
        reproducibility:   reproducibilitySchema.optional(),

        // Classification
        category: categorySchema,
        severity: severitySchema.default(BugReportSeverity.MEDIUM),
        priority: prioritySchema.default(BugReportPriority.NORMAL),
        tags:     z.array(z.string()).optional(),

        // Auto-captured context (passed from client)
        pageUrl:    z.string().optional(),
        region:     z.string().optional(),
        locale:     z.string().optional(),
        userAgent:  z.string().optional(),
        appVersion: z.string().optional(),
        os:         z.string().optional(),
        deviceType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const report = await prisma.bugReport.create({
        data: {
          userId,
          entityType:       input.entityType,
          entityId:         input.entityId,
          title:            input.title,
          description:      input.description,
          stepsToReproduce: input.stepsToReproduce,
          expectedBehavior: input.expectedBehavior,
          actualBehavior:   input.actualBehavior,
          reproducibility:  input.reproducibility,
          category:         input.category,
          severity:         input.severity,
          priority:         input.priority,
          status:           BugReportStatus.OPEN,
          tags:             input.tags ?? [],
          pageUrl:          input.pageUrl,
          region:           input.region,
          locale:           input.locale,
          userAgent:        input.userAgent,
          appVersion:       input.appVersion,
          os:               input.os,
          deviceType:       input.deviceType,
        },
      });

      // Seed the status audit trail
      await prisma.bugReportStatusHistory.create({
        data: {
          bugReportId: report.id,
          fromStatus:  null,
          toStatus:    BugReportStatus.OPEN,
          changedById: userId,
          note:        "Bug report submitted.",
        },
      });

      return report;
    }),

  // ── Current user's own reports ─────────────────────────────────────────────
  myReports: protectedProcedure
    .input(
      z.object({
        status:   statusSchema.optional(),
        take:     z.number().min(1).max(100).default(20),
        skip:     z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const where  = { userId, ...(input?.status ? { status: input.status } : {}) };

      const [items, total] = await Promise.all([
        prisma.bugReport.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input?.take ?? 20,
          skip: input?.skip ?? 0,
          include: {
            attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true } },
            _count:      { select: { comments: true } },
          },
        }),
        prisma.bugReport.count({ where }),
      ]);

      return { items, total };
    }),

  // ── Get a single report (owner) ────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const report = await prisma.bugReport.findUniqueOrThrow({
        where:   { id: input.id },
        include: {
          attachments: true,
          comments:    { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
          statusLog:   { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { id: true, name: true, image: true } } } },
          assignedTo:  { select: { id: true, name: true, image: true } },
          duplicateOf: { select: { id: true, title: true, status: true } },
        },
      });

      if (report.userId !== userId) throw new Error("Not authorized.");
      return report;
    }),

  // ── Admin: list all reports ────────────────────────────────────────────────
  adminList: protectedProcedure
    .input(
      z.object({
        status:     statusSchema.optional(),
        severity:   severitySchema.optional(),
        priority:   prioritySchema.optional(),
        category:   categorySchema.optional(),
        entityType: z.string().optional(),
        take:       z.number().min(1).max(100).default(25),
        skip:       z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const where = {
        ...(input?.status     ? { status:     input.status }     : {}),
        ...(input?.severity   ? { severity:   input.severity }   : {}),
        ...(input?.priority   ? { priority:   input.priority }   : {}),
        ...(input?.category   ? { category:   input.category }   : {}),
        ...(input?.entityType ? { entityType: input.entityType } : {}),
        deletedAt: null,
      };

      const [items, total] = await Promise.all([
        prisma.bugReport.findMany({
          where,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take:    input?.take ?? 25,
          skip:    input?.skip ?? 0,
          include: {
            user:       { select: { id: true, email: true, name: true, image: true } },
            assignedTo: { select: { id: true, name: true, image: true } },
            _count:     { select: { attachments: true, comments: true } },
          },
        }),
        prisma.bugReport.count({ where }),
      ]);

      return { items, total };
    }),

  // ── Admin: update status / triage fields ─────────────────────────────────
  adminUpdate: protectedProcedure
    .input(
      z.object({
        id:            z.string(),
        status:        statusSchema.optional(),
        priority:      prioritySchema.optional(),
        severity:      severitySchema.optional(),
        assignedToId:  z.string().optional(),
        resolution:    z.string().optional(),
        adminNotes:    z.string().optional(),
        duplicateOfId: z.string().optional(),
        externalRef:   z.string().optional(),
        note:          z.string().optional(),  // audit trail note
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, note, ...data } = input;
      const userId = ctx.session.user.id;

      // Fetch current status for audit
      const current = await prisma.bugReport.findUniqueOrThrow({ where: { id }, select: { status: true } });

      const extra: Record<string, unknown> = {};
      if (data.status === BugReportStatus.RESOLVED) extra.resolvedAt = new Date();
      if (data.status === BugReportStatus.CLOSED || data.status === BugReportStatus.WONT_FIX) {
        extra.closedAt = new Date();
      }

      const [updated] = await prisma.$transaction([
        prisma.bugReport.update({ where: { id }, data: { ...data, ...extra } }),
        ...(data.status && data.status !== current.status
          ? [prisma.bugReportStatusHistory.create({
              data: { bugReportId: id, fromStatus: current.status, toStatus: data.status, changedById: userId, note: note ?? null },
            })]
          : []),
      ]);

      return updated;
    }),

  // ── Add a comment ──────────────────────────────────────────────────────────
  addComment: protectedProcedure
    .input(
      z.object({
        bugReportId: z.string(),
        body:        z.string().min(1),
        isInternal:  z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.bugReportComment.create({
        data: {
          bugReportId: input.bugReportId,
          authorId:    ctx.session.user.id,
          body:        input.body,
          isInternal:  input.isInternal,
        },
      });
    }),
});
