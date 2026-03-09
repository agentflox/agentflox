import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const profileRouter = router({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    // Aggregate a lightweight profile view from User and optional role profiles
    const user = await prisma.user.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        bio: true,
        website: true,
        userType: true,
        memberProfile: true,
        founderProfile: true,
        investorProfile: true,
      },
    });
    return user;
  }),

  // Public endpoints for marketplace
  getSinglePublicProfile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.user.findFirst({
        where: { id: input.id, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
          bio: true,
          website: true,
          userType: true,
          memberProfile: true,
          founderProfile: true,
          investorProfile: true,
          likesReceived: true,
          settings: {
            select: {
              profileVisibility: true,
            }
          },
        },
      });
    }),

  getPublicProfiles: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      skills: z.array(z.string()).optional(),
      country: z.string().optional(),
      commitment: z.enum(["PART_TIME","FULL_TIME","CONTRACT","FLEXIBLE"]).optional(),
      sortBy: z.enum(["relevance","latest"]).optional().default("latest"),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(12),
    }))
    .query(async ({ input }) => {
      const where: any = { isActive: true };
      if (input.query) {
        where.OR = [
          { firstName: { contains: input.query, mode: "insensitive" } },
          { lastName: { contains: input.query, mode: "insensitive" } },
          { username: { contains: input.query, mode: "insensitive" } },
          { bio: { contains: input.query, mode: "insensitive" } },
        ];
      }
      if (input.skills && input.skills.length > 0) {
        where.memberProfile = { skills: { hasSome: input.skills } };
      }
      if (input.country) where.location = { contains: input.country, mode: "insensitive" };
      if (input.commitment) {
        where.memberProfile = { ...(where.memberProfile || {}), availability: input.commitment };
      }
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;
      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            bio: true,
            userType: true,
            memberProfile: true,
            likesReceived: true,
          },
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  toggleInterest: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.userLike.findFirst({ where: { targetUserId: input.profileId, userId } });
      if (existing) {
        await prisma.userLike.delete({ where: { id: existing.id } });
        return { interested: false } as const;
      }
      await prisma.userLike.create({ data: { targetUserId: input.profileId, userId } });
      return { interested: true } as const;
    }),
});


