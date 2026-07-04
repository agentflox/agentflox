import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const requestRouter = router({
  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"]).optional(),
      sortBy: z.enum(["recent"]).optional().default("recent"),
      scope: z.enum(["received", "sent"]).optional().default("received"),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {};
      if (input.scope === "received") {
        where.receiverId = userId;
      } else {
        where.senderId = userId;
      }
      if (input.status) where.status = input.status;
      if (input.query) {
        where.OR = [
          { message: { contains: input.query, mode: "insensitive" } },
        ];
      }
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const [total, items] = await Promise.all([
        prisma.request.count({ where }),
        prisma.request.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: { project: true, team: true, sender: true, receiver: true },
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const app = await prisma.request.findFirst({
        where: { id: input.id, receiverId: userId },
        include: { project: true, team: true, sender: true },
      });
      if (!app) throw new Error("Request not found");
      return app;
    }),

  accept: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const app = await prisma.request.findFirst({ where: { id: input.id, receiverId: userId } });
      if (!app) throw new Error("Request not found");
      if (app.status !== "PENDING") {
        throw new Error("Only pending requests can be accepted");
      }

      if (app.targetType === "COLLABORATION" && app.projectId && app.roleApplied) {
        // Add sender to project
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: app.projectId, userId: app.senderId } },
          create: {
            projectId: app.projectId,
            userId: app.senderId,
            role: app.roleApplied,
            title: "Member",
            permissions: [],
            status: "ACTIVE",
          },
          update: {},
        });
      }

      // Add membership based on targetType
      if (app.targetType === "PROJECT" && app.projectId) {
        // Add sender to project
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: app.projectId, userId: app.senderId } },
          create: {
            projectId: app.projectId,
            userId: app.senderId,
            role: "member",
            title: "Member",
            permissions: [],
            status: "ACTIVE",
          },
          update: {},
        });
      }
      if (app.targetType === "TEAM" && app.teamId) {
        // Add sender to team
        await prisma.teamMember.upsert({
          where: { teamId_userId: { teamId: app.teamId, userId: app.senderId } },
          create: { teamId: app.teamId, userId: app.senderId, role: "member", permissions: [] },
          update: {},
        });
      }

      const updated = await prisma.request.update({ where: { id: app.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });

      // Notify sender about acceptance
      await prisma.notification.create({
        data: {
          userId: app.senderId,
          type: "REQUEST_STATUS",
          title: "Request Accepted",
          message: app.targetType === "PROJECT"
            ? "Your request was accepted. You have been added to the project."
            : app.targetType === "TEAM"
              ? "Your request was accepted. You have been added to the team."
              : "Your request was accepted.",
          entityId: app.id,
          entityType: "REQUEST",
          metadata: {},
          aggregateKey: `request_${app.id}_accepted`,
        },
      });

      return { id: updated.id, status: updated.status };
    }),

  reject: protectedProcedure
    .input(z.object({ id: z.string(), response: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const app = await prisma.request.findFirst({ where: { id: input.id, receiverId: userId } });
      if (!app) throw new Error("Request not found");
      if (app.status !== "PENDING") {
        throw new Error("Only pending requests can be rejected");
      }

      const updated = await prisma.request.update({ where: { id: app.id }, data: { status: "REJECTED", response: input.response, respondedAt: new Date() } });

      // Notify sender about rejection
      await prisma.notification.create({
        data: {
          userId: app.senderId,
          type: "REQUEST_STATUS",
          title: "Request Rejected",
          message: input.response || "Your request was rejected.",
          entityId: app.id,
          entityType: "REQUEST",
          metadata: {},
          aggregateKey: `request_${app.id}_rejected`,
        },
      });

      return { id: updated.id, status: updated.status };
    }),

  create: protectedProcedure
    .input(z.object({
      proposalId: z.string().optional(),
      proposalOwnerId: z.string(),
      title: z.string().min(1),
      message: z.string().min(1),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      intent: z.enum(["SEEKING", "OFFERING"]).optional(),
      roleApplied: z.enum(["INVESTOR", "MENTOR", "TEAM", "COFOUNDER", "PARTNER", "CUSTOMER"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.session!.user!.id;
      if (senderId === input.proposalOwnerId) {
        throw new Error("Cannot send a request to yourself");
      }

      const targetType = input.teamId ? "TEAM" : input.projectId ? "PROJECT" : "COLLABORATION";

      const request = await prisma.request.create({
        data: {
          senderId,
          receiverId: input.proposalOwnerId,
          targetType,
          projectId: input.projectId,
          teamId: input.teamId,
          message: input.message,
          roleApplied: input.roleApplied,
          proposedTerms: {
            title: input.title,
            proposalId: input.proposalId,
            intent: input.intent,
          },
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: input.proposalOwnerId,
          type: "REQUEST_RECEIVED",
          title: "New Request",
          message: input.title,
          entityId: request.id,
          entityType: "REQUEST",
          aggregateKey: `request:${request.id}`,
          metadata: { requestId: request.id },
        },
      });

      return { id: request.id, notificationId: notification.id };
    }),
});


