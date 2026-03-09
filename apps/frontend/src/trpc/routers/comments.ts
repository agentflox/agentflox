import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      postId: z.string(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ input }) => {
      const where = { postId: input.postId } as const;
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.postComment.count({ where }),
        prisma.postComment.findMany({
          where,
          orderBy: { createdAt: "asc" },
          skip,
          take,
          include: { user: true },
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // List comments for a proposal
  listProposal: protectedProcedure
    .input(z.object({
      proposalId: z.string(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ input }) => {
      const where = { proposalId: input.proposalId } as const;
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.proposalComment.count({ where }),
        prisma.proposalComment.findMany({
          where,
          orderBy: { createdAt: "asc" },
          skip,
          take,
          include: { user: true },
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Create a comment for a proposal
  createProposal: protectedProcedure
    .input(z.object({
      proposalId: z.string(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const created = await prisma.proposalComment.create({
        data: {
          proposalId: input.proposalId,
          userId,
          content: input.content,
        },
        include: { user: true },
      });
      return created;
    }),
});

export type CommentsRouter = typeof commentsRouter;


