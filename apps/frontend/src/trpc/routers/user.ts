import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { LimitGuard } from "@/features/usage/utils/limitGuard";

const baseUserSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  firstName: true,
  lastName: true,
  username: true,
  avatar: true,
  bio: true,
  phone: true,
  website: true,
  location: true,
  timezone: true,
  userType: true,
  isActive: true,
  isVerified: true,
  onboardingCompleted: true,
  onboardingStep: true,
  credibilityScore: true,
  verificationLevel: true,
  isKycVerified: true,
  kycDocuments: true,
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
};

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    // Trigger cycle transition check on login/profile fetch
    await LimitGuard.ensureCycle(userId, ctx.session);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: baseUserSelect });
    return user;
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return prisma.user.findUnique({ where: { id: input.id }, select: baseUserSelect });
  }),

  update: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100).optional().nullable(),
      lastName: z.string().min(1).max(100).optional().nullable(),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
      avatar: z.string().url().optional().nullable(),
      bio: z.string().max(2000).optional().nullable(),
      phone: z.string().max(50).optional().nullable(),
      website: z.string().url().optional().nullable(),
      location: z.string().max(200).optional().nullable(),
      timezone: z.string().max(100).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const data: any = {
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        username: input.username ?? undefined,
        avatar: input.avatar ?? undefined,
        bio: input.bio ?? undefined,
        phone: input.phone ?? undefined,
        website: input.website ?? undefined,
        location: input.location ?? undefined,
        timezone: input.timezone ?? undefined,
      };
      return prisma.user.update({ where: { id: userId }, data, select: baseUserSelect });
    }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    // Deleting user cascades via Prisma relations where configured
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }),
});


