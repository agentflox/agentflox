import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const connectionsRouter = router({
  status: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      if (me === input.userId) return { status: "SELF" as const };
      const existing = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: me, receiverId: input.userId },
            { requesterId: input.userId, receiverId: me },
          ],
        },
      });
      return { status: (existing?.status || "NONE") as any };
    }),

  request: protectedProcedure
    .input(z.object({ userId: z.string(), message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      if (me === input.userId) throw new Error("Cannot connect to yourself");
      const existing = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: me, receiverId: input.userId },
            { requesterId: input.userId, receiverId: me },
          ],
        },
      });
      if (existing) return { id: existing.id } as const;
      const created = await prisma.connection.create({
        data: { requesterId: me, receiverId: input.userId, status: "PENDING", message: input.message },
      } as any);
      return { id: created.id } as const;
    }),

  respond: protectedProcedure
    .input(z.object({ requesterId: z.string(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conn = await prisma.connection.findFirst({ where: { requesterId: input.requesterId, receiverId: me } });
      if (!conn) throw new Error("Connection not found");
      const updated = await prisma.connection.update({ where: { id: conn.id }, data: { status: input.accept ? "ACCEPTED" : "REJECTED", acceptedAt: input.accept ? new Date() : null } });
      return { id: updated.id, status: updated.status } as const;
    }),

  list: protectedProcedure
    .input(z.object({
      scope: z.enum(["received", "sent"]).default("received"),
      status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const where: any = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.scope === "received"
          ? { receiverId: me }
          : { requesterId: me }),
      };
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const [total, items] = await Promise.all([
        prisma.connection.count({ where }),
        prisma.connection.findMany({
          where,
          orderBy: { requestedAt: "desc" },
          include: {
            requester: { select: { id: true, name: true, username: true, avatar: true } },
            receiver: { select: { id: true, name: true, username: true, avatar: true } },
          },
          skip,
          take,
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize } as const;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conn = await prisma.connection.findFirst({
        where: { id: input.id, OR: [{ requesterId: me }, { receiverId: me }] as any },
        include: {
          requester: { select: { id: true, name: true, username: true, avatar: true, bio: true } },
          receiver: { select: { id: true, name: true, username: true, avatar: true, bio: true } },
        },
      });
      if (!conn) throw new Error("Connection not found");
      return conn as any;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conn = await prisma.connection.findFirst({ where: { id: input.id, requesterId: me } });
      if (!conn) throw new Error("Connection not found");
      if (conn.status !== "PENDING") throw new Error("Only pending requests can be cancelled");
      await prisma.connection.delete({ where: { id: conn.id } });
      return { ok: true } as const;
    }),

  resend: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conn = await prisma.connection.findFirst({ where: { id: input.id, requesterId: me } });
      if (!conn) throw new Error("Connection not found");
      if (conn.status === "ACCEPTED") throw new Error("Already connected");
      const updated = await prisma.connection.update({
        where: { id: conn.id },
        data: { status: "PENDING", requestedAt: new Date(), acceptedAt: null },
      });
      return { id: updated.id, status: updated.status } as const;
    }),

  suggestions: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).optional().default(1), pageSize: z.number().int().min(1).max(50).optional().default(10) }))
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;

      // Users who share a team or project with me, excluding myself and existing connections/pending
      const connectedUserIds = await prisma.connection.findMany({
        where: {
          OR: [
            { requesterId: me, status: { in: ["PENDING", "ACCEPTED"] as any } },
            { receiverId: me, status: { in: ["PENDING", "ACCEPTED"] as any } },
          ],
        },
        select: { requesterId: true, receiverId: true },
      });
      const excludeIds = new Set<string>([me]);
      for (const c of connectedUserIds) {
        excludeIds.add(c.requesterId);
        excludeIds.add(c.receiverId);
      }

      // Collect teammates and projectmates
      const teammateIds = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT ut.user_id AS id
        FROM team_members tm
        JOIN user_teams ut ON ut.team_id = tm.team_id
        WHERE tm.user_id = ${me}
      `;
      const projectmateIds = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT up.user_id AS id
        FROM project_members pm
        JOIN user_projects up ON up.project_id = pm.project_id
        WHERE pm.user_id = ${me}
      `;
      const candidateIds = Array.from(new Set([...teammateIds.map((r:any)=>r.id), ...projectmateIds.map((r:any)=>r.id)])).filter((id) => !excludeIds.has(id));

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const total = candidateIds.length;
      const pageIds = candidateIds.slice(skip, skip + take);
      const users = await prisma.user.findMany({
        where: { id: { in: pageIds } },
        select: { id: true, name: true, username: true, avatar: true, bio: true },
      });
      return { items: users, total, page: input.page, pageSize: input.pageSize } as const;
    }),
});

export type ConnectionsRouter = typeof connectionsRouter;

