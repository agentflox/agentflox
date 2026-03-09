import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const organizationRouter = router({
    get: protectedProcedure
        .input(z.object({ id: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;

            // If no ID, get the first organization where the user is a member or owner
            if (!input?.id) {
                const org = await prisma.organization.findFirst({
                    where: {
                        OR: [
                            { ownerId: userId },
                            { members: { some: { userId } } }
                        ]
                    },
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, name: true, image: true, email: true } }
                            }
                        }
                    }
                });
                return org;
            }

            const org = await prisma.organization.findFirst({
                where: {
                    id: input.id,
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId } } }
                    ]
                },
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, name: true, image: true, email: true } }
                        }
                    }
                }
            });

            return org;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            website: z.string().url().optional().nullable(),
            logo: z.string().optional().nullable(),
            socialLinks: z.any().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session!.user!.id;
            const { id, ...data } = input;

            const org = await prisma.organization.findFirst({
                where: { id, ownerId: userId }
            });

            if (!org) {
                throw new Error("Organization not found or permission denied");
            }

            const updated = await prisma.organization.update({
                where: { id },
                data: {
                    ...data,
                    socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined
                }
            });

            return updated;
        }),
});
