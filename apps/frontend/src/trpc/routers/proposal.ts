import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";

const listInputSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(12),
  sortBy: z.string().optional(),
  query: z.string().optional(),
  industries: z.array(z.string()).optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  commitment: z.string().optional(),
  urgency: z.string().optional(),
  minFunding: z.number().optional(),
  maxFunding: z.number().optional(),
});

export const proposalRouter = router({
  getPublicProposals: protectedProcedure
    .input(listInputSchema)
    .query(async () => ({
      items: [] as Array<Record<string, unknown>>,
      total: 0,
      page: 1,
      pageSize: 12,
    })),

  list: protectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => ({
      items: [] as Array<Record<string, unknown>>,
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
    })),
});
