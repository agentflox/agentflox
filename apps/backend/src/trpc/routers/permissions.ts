/**
 * Permissions tRPC Router
 * Handles permission queries, granting, and revoking
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { permissionResolver, permissionCache } from '../../lib/permissions';
import { PermissionLevel } from '@agentflox/database/src/generated/prisma';
import { prisma } from '@agentflox/database';
import { TRPCError } from '@trpc/server';

const itemTypeSchema = z.enum(['workspace', 'space', 'folder', 'list', 'project', 'team', 'task']);
const permissionLevelSchema = z.nativeEnum(PermissionLevel);

export const permissionsRouter = router({
    /**
     * Get user's permission for a specific item
     */
    getUserPermission: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const permission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            return {
                permission,
                hasAccess: permission !== null,
                canView: permission !== null,
                canComment: permission === PermissionLevel.COMMENT || permission === PermissionLevel.EDIT || permission === PermissionLevel.FULL,
                canEdit: permission === PermissionLevel.EDIT || permission === PermissionLevel.FULL,
                canManage: permission === PermissionLevel.FULL,
            };
        }),

    /**
     * Grant permission to a user or team
     */
    grantPermission: protectedProcedure
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
            // Verify the granter has permission to grant access
            const granterPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (granterPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to grant access to this item',
                });
            }

            // Ensure userId OR teamId is provided
            if (!input.userId && !input.teamId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Either userId or teamId must be provided',
                });
            }

            // Create permission record
            if (input.itemType === 'task') {
                await prisma.taskPermission.upsert({
                    where: input.userId
                        ? { taskId_userId: { taskId: input.itemId, userId: input.userId } }
                        : { taskId_teamId: { taskId: input.itemId, teamId: input.teamId! } },
                    create: {
                        taskId: input.itemId,
                        userId: input.userId,
                        teamId: input.teamId,
                        permission: input.permission,
                        grantedById: ctx.user.id,
                    },
                    update: {
                        permission: input.permission,
                    },
                });
            } else {
                await prisma.locationPermission.upsert({
                    where: input.userId
                        ? { locationType_locationId_userId: { locationType: input.itemType, locationId: input.itemId, userId: input.userId } }
                        : { locationType_locationId_teamId: { locationType: input.itemType, locationId: input.itemId, teamId: input.teamId! } },
                    create: {
                        locationType: input.itemType,
                        locationId: input.itemId,
                        userId: input.userId,
                        teamId: input.teamId,
                        permission: input.permission,
                        grantedById: ctx.user.id,
                    },
                    update: {
                        permission: input.permission,
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
     * Revoke permission from a user or team
     */
    revokePermission: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
                userId: z.string().optional(),
                teamId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify the revoker has permission
            const revokerPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (revokerPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to revoke access to this item',
                });
            }

            // Delete permission record
            if (input.itemType === 'task') {
                await prisma.taskPermission.deleteMany({
                    where: {
                        taskId: input.itemId,
                        ...(input.userId && { userId: input.userId }),
                        ...(input.teamId && { teamId: input.teamId }),
                    },
                });
            } else {
                await prisma.locationPermission.deleteMany({
                    where: {
                        locationType: input.itemType,
                        locationId: input.itemId,
                        ...(input.userId && { userId: input.userId }),
                        ...(input.teamId && { teamId: input.teamId }),
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
     * List all permissions for an item
     */
    listPermissions: protectedProcedure
        .input(
            z.object({
                itemType: itemTypeSchema,
                itemId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            // Verify user has access to view permissions
            const userPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.itemType,
                input.itemId
            );

            if (!userPermission) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this item',
                });
            }

            let userPermissions: any[] = [];
            let teamPermissions: any[] = [];

            if (input.itemType === 'task') {
                // Get task permissions
                const taskPerms = await prisma.taskPermission.findMany({
                    where: { taskId: input.itemId },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                        team: {
                            select: { id: true, name: true, avatar: true },
                        },
                        grantedBy: {
                            select: { id: true, name: true },
                        },
                    },
                });

                userPermissions = taskPerms.filter((p) => p.userId).map((p) => ({
                    user: p.user,
                    permission: p.permission,
                    grantedBy: p.grantedBy,
                    createdAt: p.createdAt,
                }));

                teamPermissions = taskPerms.filter((p) => p.teamId).map((p) => ({
                    team: p.team,
                    permission: p.permission,
                    grantedBy: p.grantedBy,
                    createdAt: p.createdAt,
                }));
            } else {
                // Get location permissions
                const locationPerms = await prisma.locationPermission.findMany({
                    where: {
                        locationType: input.itemType,
                        locationId: input.itemId,
                    },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                        team: {
                            select: { id: true, name: true, avatar: true },
                        },
                        grantedBy: {
                            select: { id: true, name: true },
                        },
                    },
                });

                userPermissions = locationPerms.filter((p) => p.userId).map((p) => ({
                    user: p.user,
                    permission: p.permission,
                    grantedBy: p.grantedBy,
                    createdAt: p.createdAt,
                }));

                teamPermissions = locationPerms.filter((p) => p.teamId).map((p) => ({
                    team: p.team,
                    permission: p.permission,
                    grantedBy: p.grantedBy,
                    createdAt: p.createdAt,
                }));
            }

            return {
                userPermissions,
                teamPermissions,
            };
        }),
});
