import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const settingsRouter = router({
  getProfileVisibility: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { profileVisibility: true },
    });
    return settings?.profileVisibility ?? "PUBLIC";
  }),

  updateProfileVisibility: protectedProcedure
    .input(z.object({
      profileVisibility: z.enum(["PUBLIC", "CONNECTIONS_ONLY", "PRIVATE"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          profileVisibility: input.profileVisibility,
        },
        update: {
          profileVisibility: input.profileVisibility,
        },
      });
    }),

  getMessagingConfig: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { messagingConfig: true },
    });
    return settings?.messagingConfig || null;
  }),

  updateMessagingConfig: protectedProcedure
    .input(z.object({
      showArchived: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
      blockAll: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      
      const currentSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { messagingConfig: true },
      });

      const currentConfig = (currentSettings?.messagingConfig as any) || {};
      const newConfig = {
        ...currentConfig,
        ...input,
      };

      return prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          messagingConfig: newConfig,
        },
        update: {
          messagingConfig: newConfig,
        },
      });
    }),
});
