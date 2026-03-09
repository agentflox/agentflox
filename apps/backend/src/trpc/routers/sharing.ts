/**
 * Sharing tRPC Router
 * Handles item sharing, privacy controls, and public links
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { PermissionLevel } from '@agentflox/database/src/generated/prisma';
import { prisma } from '@agentflox/database';
import { TRPCError } from '@trpc/server';
import { permissionResolver, permissionCache } from '../../lib/permissions';
import { randomBytes } from 'crypto';

const itemTypeSchema = z.enum(['space', 'folder', 'list', 'task', 'project', 'team']);
const permissionLevelSchema = z.nativeEnum(PermissionLevel);

/**
 * Generate secure public link token
 */
function generatePublicToken(): string {
    return randomBytes(16).toString('hex');
}

export const sharingRouter = router({
    /**
     * Share item with user or team
     */
    shareItem: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
                userId: z.string().optional(),
                teamId: z.string().optional(),
                permission: permissionLevelSchema,
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify sharer has permission
            const sharerPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (!sharerPermission || sharerPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to share this item',
                });
            }

            // Cannot grant higher permission than you have
            const grantedPermission = input.permission;

            // Grant permission
            if (input.itemType === 'task') {
                await prisma.taskPermission.upsert({
                    where: input.userId
                        ? { taskId_userId: { taskId: input.itemId, userId: input.userId } }
                        : { taskId_teamId: { taskId: input.itemId, teamId: input.teamId! } },
                    create: {
                        taskId: input.itemId,
                        userId: input.userId,
                        teamId: input.teamId,
                        permission: grantedPermission,
                        grantedById: ctx.user.id,
                    },
                    update: {
                        permission: grantedPermission,
                    },
                });
            } else {
                await prisma.locationPermission.upsert({
                    where: input.userId
                        ? {
                            locationType_locationId_userId: {
                                locationType: input.itemType,
                                locationId: input.itemId,
                                userId: input.userId,
                            },
                        }
                        : {
                            locationType_locationId_teamId: {
                                locationType: input.itemType,
                                locationId: input.itemId,
                                teamId: input.teamId!,
                            },
                        },
                    create: {
                        locationType: input.itemType,
                        locationId: input.itemId,
                        userId: input.userId,
                        teamId: input.teamId,
                        permission: grantedPermission,
                        grantedById: ctx.user.id,
                    },
                    update: {
                        permission: grantedPermission,
                    },
                });
            }

            // Invalidate cache
            if (input.userId) {
                permissionCache.invalidate(input.userId, input.itemType, input.itemId);
            }
            if (input.teamId) {
                permissionCache.invalidateItem(input.itemType, input.itemId);
            }

            return { success: true };
        }),

    /**
     * Make item private
     */
    makePrivate: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
                keepCreatorAccess: z.boolean().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify user has permission to manage privacy
            const userPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (!userPermission || userPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to change privacy settings',
                });
            }

            // Get the item to find creator
            const model = this.getPrismaModel(input.itemType);
            const item = await model.findUnique({
                where: { id: input.itemId },
                select: { createdBy: true, ownerId: true },
            });

            if (!item) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Item not found',
                });
            }

            const creatorId = (item as any).createdBy || (item as any).ownerId;

            // Update privacy field
            if (input.itemType === 'project') {
                await prisma.project.update({
                    where: { id: input.itemId },
                    data: { isPublic: false },
                });
            } else if (input.itemType === 'team') {
                await prisma.team.update({
                    where: { id: input.itemId },
                    data: { visibility: 'OWNERS_ADMINS' },
                });
            } else if (input.itemType === 'task') {
                await prisma.task.update({
                    where: { id: input.itemId },
                    data: { isPublic: false },
                });
            } else {
                // For space, folder, list - add isPrivate field if it exists
                await model.update({
                    where: { id: input.itemId },
                    data: { isPrivate: true },
                });
            }

            // Grant creator full access if requested
            if (input.keepCreatorAccess && creatorId) {
                if (input.itemType === 'task') {
                    await prisma.taskPermission.upsert({
                        where: {
                            taskId_userId: {
                                taskId: input.itemId,
                                userId: creatorId,
                            },
                        },
                        create: {
                            taskId: input.itemId,
                            userId: creatorId,
                            permission: PermissionLevel.FULL,
                            grantedById: ctx.user.id,
                        },
                        update: {},
                    });
                } else {
                    await prisma.locationPermission.upsert({
                        where: {
                            locationType_locationId_userId: {
                                locationType: input.itemType,
                                locationId: input.itemId,
                                userId: creatorId,
                            },
                        },
                        create: {
                            locationType: input.itemType,
                            locationId: input.itemId,
                            userId: creatorId,
                            permission: PermissionLevel.FULL,
                            grantedById: ctx.user.id,
                        },
                        update: {},
                    });
                }
            }

            // Invalidate all caches for this item
            permissionCache.invalidateItem(input.itemType, input.itemId);

            return { success: true };
        }),

    /**
     * Make item public
     */
    makePublic: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify user has permission
            const userPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (!userPermission || userPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to change privacy settings',
                });
            }

            // Update privacy field
            const model = this.getPrismaModel(input.itemType);

            if (input.itemType === 'project') {
                await prisma.project.update({
                    where: { id: input.itemId },
                    data: { isPublic: true },
                });
            } else if (input.itemType === 'team') {
                await prisma.team.update({
                    where: { id: input.itemId },
                    data: { visibility: 'PUBLIC' },
                });
            } else if (input.itemType === 'task') {
                await prisma.task.update({
                    where: { id: input.itemId },
                    data: { isPublic: true },
                });
            } else {
                await model.update({
                    where: { id: input.itemId },
                    data: { isPrivate: false },
                });
            }

            // Invalidate all caches
            permissionCache.invalidateItem(input.itemType, input.itemId);

            return { success: true };
        }),

    /**
     * Create public sharing link
     */
    createPublicLink: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
                locationType: z.enum(['folder', 'list']), // Only folders and lists support public links
                locationId: z.string(),
                permission: permissionLevelSchema,
                expiresInDays: z.number().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify user has permission
            const userPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.locationType,
                input.locationId
            );

            if (!userPermission || userPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to create public links for this item',
                });
            }

            // Create or update public link
            const expiresAt = input.expiresInDays
                ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
                : null;

            const publicLink = await prisma.publicLink.upsert({
                where: {
                    locationType_locationId: {
                        locationType: input.locationType,
                        locationId: input.locationId,
                    },
                },
                create: {
                    workspaceId: input.workspaceId,
                    locationType: input.locationType,
                    locationId: input.locationId,
                    token: generatePublicToken(),
                    permission: input.permission,
                    createdById: ctx.user.id,
                    expiresAt,
                },
                update: {
                    permission: input.permission,
                    expiresAt,
                    isActive: true,
                },
            });

            return {
                token: publicLink.token,
                url: `/public/${publicLink.token}`,
                expiresAt: publicLink.expiresAt,
            };
        }),

    /**
     * Revoke public link
     */
    revokePublicLink: protectedProcedure
        .input(
            z.object({
                locationType: z.enum(['folder', 'list']),
                locationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await prisma.publicLink.updateMany({
                where: {
                    locationType: input.locationType,
                    locationId: input.locationId,
                },
                data: { isActive: false },
            });

            return { success: true };
        }),

    /**
     * Get public link for an item
     */
    getPublicLink: protectedProcedure
        .input(
            z.object({
                locationType: z.enum(['folder', 'list']),
                locationId: z.string(),
            })
        )
        .query(async ({ input }) => {
            const publicLink = await prisma.publicLink.findUnique({
                where: {
                    locationType_locationId: {
                        locationType: input.locationType,
                        locationId: input.locationId,
                    },
                },
            });

            if (!publicLink || !publicLink.isActive) {
                return null;
            }

            // Check if expired
            if (publicLink.expiresAt && new Date() > publicLink.expiresAt) {
                return null;
            }

            return {
                token: publicLink.token,
                url: `/public/${publicLink.token}`,
                permission: publicLink.permission,
                expiresAt: publicLink.expiresAt,
            };
        }),

    /**
     * Helper: Get Prisma model
     */
    getPrismaModel(itemType: string): any {
        const models: Record<string, any> = {
            space: prisma.space,
            folder: prisma.folder,
            list: prisma.list,
            task: prisma.task,
            project: prisma.project,
            team: prisma.team,
        };
        return models[itemType];
    },
});
