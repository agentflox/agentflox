import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

const filterEnum = z.enum([
  "all",
  "feature",
  "design",
  "implementation",
  "bugs",
  "announcements",
  "others",
  "issues",
  "pinned",
  "author",
  "active",
  "upvoted",
]);

const topicEnum = z.enum([
  "FEATURE",
  "DESIGN",
  "IMPLEMENTATION",
  "BUG",
  "ANNOUNCEMENT",
  "ISSUE",
  "OTHERS",
]);

export const discussionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        feedType: z.enum(["project", "team"]).default("project"),
        feedId: z.string(),
        query: z.string().optional(),
        filter: filterEnum.optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const where: any = { type: "DISCUSSION" };

      // Check permissions
      if (input.feedType === "project") {
        const canView = await prisma.project.findFirst({
          where: {
            id: input.feedId,
            OR: [
              { ownerId: userId },
              { members: { some: { userId, isBlocked: false, canViewProject: true } } },
              { teams: { some: { team: { members: { some: { userId } } } } } },
            ],
          },
          select: { id: true },
        });
        if (!canView) return { items: [], total: 0, page: input.page, pageSize: input.pageSize } as const;
        where.projectId = input.feedId;
      }

      if (input.feedType === "team") {
        where.teamId = input.feedId;
      }

      // Apply search query
      if (input.query) {
        where.OR = [
          { content: { contains: input.query, mode: "insensitive" } },
          { tags: { hasSome: [input.query] } },
        ];
      }

      // Apply filter
      if (input.filter && input.filter !== "all") {
        switch (input.filter) {
          case "feature":
            where.topic = "FEATURE";
            break;
          case "design":
            where.topic = "DESIGN";
            break;
          case "implementation":
            where.topic = "IMPLEMENTATION";
            break;
          case "bugs":
            where.topic = "BUG";
            break;
          case "announcements":
            where.topic = "ANNOUNCEMENT";
            break;
          case "issues":
            where.topic = "ISSUE";
            break;
          case "others":
            where.OR = [{ topic: "OTHERS" }, { topic: null }];
            break;
          case "pinned":
            where.isPinned = true;
            break;
          case "author":
            where.userId = userId;
            break;
        }
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      // Apply sorting based on filter
      let orderBy: any = { updatedAt: "desc" as const };
      if (input.filter === "active") {
        orderBy = { comments: { _count: "desc" as const } };
      } else if (input.filter === "upvoted") {
        orderBy = { likeCount: "desc" as const };
      }

      const [total, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            _count: { select: { comments: true } },
            user: { select: { id: true, name: true, image: true } },
          },
        }),
      ]);

      const items = posts.map((p) => ({
        id: p.id,
        projectId: p.projectId!,
        teamId: p.teamId!,
        title: p.content.split("\n")[0]?.slice(0, 120) || "Untitled discussion",
        summary: p.content.split("\n").slice(1).join(" ").slice(0, 180),
        content: p.content,
        topic: p.topic as any,
        tags: (p.tags as string[]) || [],
        isPinned: p.isPinned,
        upvotes: p.likeCount,
        commentCount: (p as any)._count?.comments ?? 0,
        author: p.user
          ? {
              id: p.user.id,
              name: p.user.name,
              image: p.user.image,
            }
          : undefined,
        _count: { comments: (p as any)._count?.comments ?? 0 },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      return { items, total, page: input.page, pageSize: input.pageSize } as const;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const post = await prisma.post.findFirst({
        where: { id: input.id, type: "DISCUSSION" },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { comments: true } },
        },
      });
      if (!post) return null;
      return {
        id: post.id,
        projectId: post.projectId!,
        teamId: post.teamId!,
        title: post.content.split("\n")[0] || "Untitled discussion",
        body: post.content.split("\n").slice(1).join("\n"),
        content: post.content,
        topic: post.topic as any,
        tags: (post.tags as string[]) || [],
        isPinned: post.isPinned,
        upvotes: post.likeCount,
        commentCount: (post as any)._count?.comments ?? 0,
        author: post.user,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      } as const;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        teamId: z.string().optional(),
        title: z.string().min(1),
        body: z.string().optional(),
        topic: topicEnum.optional(),
        tags: z.array(z.string()).optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Validate project or team access
      if (input.projectId) {
        const canPost = await prisma.project.findFirst({
          where: {
            id: input.projectId,
            OR: [
              { ownerId: userId },
              { members: { some: { userId, isBlocked: false, canPost: true } } },
            ],
          },
          select: { id: true },
        });
        if (!canPost) throw new Error("Not authorized to post in this project");
      }

      if (input.teamId) {
        const canPost = await prisma.team.findFirst({
          where: {
            id: input.teamId,
            members: { some: { userId } },
          },
          select: { id: true },
        });
        if (!canPost) throw new Error("Not authorized to post in this team");
      }

      const content = [input.title, input.body?.trim()].filter(Boolean).join("\n\n");
      const created = await prisma.post.create({
        data: {
          userId,
          projectId: input.projectId,
          teamId: input.teamId,
          content,
          topic: input.topic,
          tags: input.tags || [],
          isPinned: input.isPinned ?? false,
          type: "DISCUSSION",
          visibility: "TEAM",
        },
        select: { id: true },
      });

      return { id: created.id } as const;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        topic: topicEnum.optional(),
        tags: z.array(z.string()).optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const post = await prisma.post.findFirst({
        where: { id: input.id, userId, type: "DISCUSSION" },
        select: { id: true, content: true },
      });

      if (!post) throw new Error("Discussion not found or not authorized");

      const currentLines = post.content.split("\n");
      const newTitle = input.title || currentLines[0];
      const newBody = input.body !== undefined ? input.body : currentLines.slice(1).join("\n");
      const content = [newTitle, newBody.trim()].filter(Boolean).join("\n\n");

      await prisma.post.update({
        where: { id: input.id },
        data: {
          content,
          topic: input.topic,
          tags: input.tags,
          isPinned: input.isPinned,
        },
      });

      return { success: true } as const;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const post = await prisma.post.findFirst({
        where: { id: input.id, userId, type: "DISCUSSION" },
        select: { id: true },
      });

      if (!post) throw new Error("Discussion not found or not authorized");

      await prisma.post.delete({ where: { id: input.id } });

      return { success: true } as const;
    }),
});
