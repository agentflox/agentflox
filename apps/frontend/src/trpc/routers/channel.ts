import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const channelRouter = router({
  create: protectedProcedure
    .input(z.object({ workspaceId: z.string(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;
      return prisma.channel.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          createdBy: ownerId
        },
      });
    }),
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      query: z.string().optional(),
      withCounts: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = { workspaceId: input.workspaceId };
      if (input.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }
      return prisma.channel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: input.withCounts ? { _count: { select: { tasks: true } } } : undefined,
      });
    }),
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const channel = await prisma.channel.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            select: { id: true, name: true, ownerId: true },
          },
          tasks: {
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              status: true,
              description: true,
              assigneeId: true,
              projectId: true,
              teamId: true,
              updatedAt: true,
            },
          },
          _count: { select: { tasks: true } },
        },
      });
      if (!channel) return null;

      const [projects, teams] = await Promise.all([
        prisma.project.findMany({
          where: { workspaceId: channel.workspaceId },
          select: { id: true, name: true, status: true },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.team.findMany({
          where: { workspaceId: channel.workspaceId },
          select: { id: true, name: true },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return { ...channel, projects, teams };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.channel.update({
        where: { id },
        data: {
          ...data,
          description: data.description ?? undefined,
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.task.updateMany({ where: { channelId: input.id }, data: { channelId: null } });
      return prisma.channel.delete({ where: { id: input.id } });
    }),
});

