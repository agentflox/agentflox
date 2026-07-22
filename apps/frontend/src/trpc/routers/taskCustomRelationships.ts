import { z } from 'zod';
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from '@agentflox/database';

export const taskCustomRelationshipsRouter = router({
    create: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().optional(),
                name: z.string(),
                relatedTo: z.string().default('specific'),
                relatedListId: z.string().optional().nullable(),
                createRollupFields: z.boolean().default(false),
                description: z.string().optional(),
                permissionLevel: z.string().default('workspace'),
                customPermissions: z.any().optional(),
                isRequired: z.boolean().default(false),
                isVisibleToGuests: z.boolean().default(true),

                // Context
                spaceId: z.string().optional(),
                projectId: z.string().optional(),
                teamId: z.string().optional(),
                folderId: z.string().optional(),
                listId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const relationship = await prisma.taskCustomRelationship.create({
                data: {
                    ...input,
                    createdBy: ctx.session.user.id,
                },
            });

            return relationship;
        }),
    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                relatedTo: z.string().default('specific'),
                relatedListId: z.string().optional().nullable(),
                createRollupFields: z.boolean().default(false),
                description: z.string().optional(),
                permissionLevel: z.string().default('workspace'),
                customPermissions: z.any().optional(),
                isRequired: z.boolean().default(false),
                isVisibleToGuests: z.boolean().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const relationship = await prisma.taskCustomRelationship.update({
                where: { id },
                data,
            });
            return relationship;
        }),
    list: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const relationships = await prisma.taskCustomRelationship.findMany({
                where: {
                    workspaceId: input.workspaceId,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
            return relationships;
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.taskCustomRelationship.delete({
                where: { id: input.id },
            });
            return { success: true };
        }),
});
