import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const postsRouter = router({
  list: protectedProcedure
    .input(z.object({
      feedType: z.enum(["global", "user", "project", "team"]).default("global"),
      feedId: z.string().optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const where: any = { type: "POST" };

      if (input.feedType === "user") {
        where.userId = input.feedId ?? userId;
      }

      if (input.feedType === "project") {
        if (!input.feedId) throw new Error("feedId (projectId) required");
        where.projectId = input.feedId;
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: {
            user: true,
            project: true,
            team: true,
          },
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // 🆕 getProjectDiscussion
  getProjectDiscussion: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        discussionId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session!.user!.id;

      // Ensure project exists and user has access
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          members: { where: { userId } },
        },
      });

      if (!project) throw new Error("Project not found");
      if (project.members.length === 0)
        throw new Error("Access denied to this project discussion");

      // Get the discussion post
      const discussion = await prisma.post.findUnique({
        where: { id: input.discussionId },
        include: {
          user: true,
          comments: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!discussion || discussion.projectId !== input.projectId)
        throw new Error("Discussion not found or does not belong to this project");

      return discussion;
    }),
});

export type PostsRouter = typeof postsRouter;
