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
});

export type CommentsRouter = typeof commentsRouter;


