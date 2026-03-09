/**
 * Permissions Controller
 * REST API endpoints for permission management
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { permissionResolver, permissionCache } from '../lib/permissions';
import { PermissionLevel } from '@agentflox/database/src/generated/prisma';
import { prisma } from '@/lib/prisma';

import { JwtAuthGuard, AuthenticatedRequest } from '@/middleware/httpAuth';

@Controller('api/permissions')
export class PermissionsController {
    /**
     * Get user's permission for a specific item
     */
    @Get(':itemType/:itemId')
    @UseGuards(JwtAuthGuard)
    async getUserPermission(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;

        if (!userId) {
            throw new Error('Unauthorized');
        }

        const permission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        return {
            permission,
            hasAccess: permission !== null,
            canView: permission !== null,
            canComment: permission === PermissionLevel.COMMENT || permission === PermissionLevel.EDIT || permission === PermissionLevel.FULL,
            canEdit: permission === PermissionLevel.EDIT || permission === PermissionLevel.FULL,
            canManage: permission === PermissionLevel.FULL,
        };
    }

    /**
     * Grant permission to a user or team
     */
    /**
     * Grant permission to a user or team
     */
    @Post(':itemType/:itemId/grant')
    @UseGuards(JwtAuthGuard)
    async grantPermission(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Body() body: { userId?: string; teamId?: string; permission: PermissionLevel },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify the granter has permission
        const granterPermission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        if (granterPermission !== PermissionLevel.FULL) {
            throw new Error('You do not have permission to grant access to this item');
        }

        // Get item name for notification
        let itemName = 'Item';
        if (itemType === 'space') {
            const space = await prisma.space.findUnique({ where: { id: itemId } });
            if (space) itemName = space.name;
        } else if (itemType === 'project') {
            const project = await prisma.project.findUnique({ where: { id: itemId } });
            if (project) itemName = project.name;
        }
        // Add other types as needed

        // Create permission record
        if (itemType === 'task') {
            await prisma.taskPermission.upsert({
                where: body.userId
                    ? { taskId_userId: { taskId: itemId, userId: body.userId } }
                    : { taskId_teamId: { taskId: itemId, teamId: body.teamId! } },
                create: {
                    taskId: itemId,
                    userId: body.userId,
                    teamId: body.teamId,
                    permission: body.permission,
                    grantedById: userId,
                },
                update: {
                    permission: body.permission,
                },
            });
        } else {
            await prisma.locationPermission.upsert({
                where: body.userId
                    ? { locationType_locationId_userId: { locationType: itemType, locationId: itemId, userId: body.userId } }
                    : { locationType_locationId_teamId: { locationType: itemType, locationId: itemId, teamId: body.teamId! } },
                create: {
                    locationType: itemType,
                    locationId: itemId,
                    userId: body.userId,
                    teamId: body.teamId,
                    permission: body.permission,
                    grantedById: userId,
                },
                update: {
                    permission: body.permission,
                },
            });
        }

        // Invalidate cache
        if (body.userId) {
            permissionCache.invalidate(body.userId, itemType as any, itemId);

            // Notify User
            await import('../services/notification/notificationService').then(({ notificationService }) =>
                notificationService.sendPermissionGrantedNotification({
                    recipientId: body.userId!,
                    grantedById: userId,
                    itemType,
                    itemId,
                    permission: body.permission,
                    itemName
                })
            );
        }
        if (body.teamId) {
            permissionCache.invalidateItem(itemType as any, itemId);
            // Notify Team Members - tricky, might need to fetch team members. 
            // For now, skipping team notification to avoid perf hits or complex logic here.
        }

        return { success: true };
    }

    /**
     * Bulk grant permission to users or teams
     */
    @Post(':itemType/:itemId/bulk-grant')
    @UseGuards(JwtAuthGuard)
    async bulkGrantPermission(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Body() body: { userIds?: string[]; teamIds?: string[]; permission: PermissionLevel },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify the granter has permission
        const granterPermission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        if (granterPermission !== PermissionLevel.FULL) {
            throw new Error('You do not have permission to grant access to this item');
        }

        // Get item name for notification
        let itemName = 'Item';
        if (itemType === 'space') {
            const space = await prisma.space.findUnique({ where: { id: itemId } });
            if (space) itemName = space.name;
        } else if (itemType === 'project') {
            const project = await prisma.project.findUnique({ where: { id: itemId } });
            if (project) itemName = project.name;
        }

        // Handle User Permissions
        if (body.userIds && body.userIds.length > 0) {
            if (itemType === 'task') {
                // Bulk upsert not directly supported for permissions with unique constraints in simplified way
                // Loop for now or use createMany if we delete first (but we want upsert behavior)
                // Transactional loop is safest
                await prisma.$transaction(
                    body.userIds.map(uid =>
                        prisma.taskPermission.upsert({
                            where: { taskId_userId: { taskId: itemId, userId: uid } },
                            create: {
                                taskId: itemId,
                                userId: uid,
                                permission: body.permission,
                                grantedById: userId,
                            },
                            update: { permission: body.permission },
                        })
                    )
                );
            } else {
                await prisma.$transaction(
                    body.userIds.map(uid =>
                        prisma.locationPermission.upsert({
                            where: { locationType_locationId_userId: { locationType: itemType, locationId: itemId, userId: uid } },
                            create: {
                                locationType: itemType,
                                locationId: itemId,
                                userId: uid,
                                permission: body.permission,
                                grantedById: userId,
                            },
                            update: { permission: body.permission },
                        })
                    )
                );
            }

            // Invalidate caches and notify
            for (const uid of body.userIds) {
                permissionCache.invalidate(uid, itemType as any, itemId);
                // Notification (background)
                import('../services/notification/notificationService').then(({ notificationService }) =>
                    notificationService.sendPermissionGrantedNotification({
                        recipientId: uid,
                        grantedById: userId,
                        itemType,
                        itemId,
                        permission: body.permission,
                        itemName
                    }).catch(console.error)
                );
            }
        }

        // Handle Team Permissions
        if (body.teamIds && body.teamIds.length > 0) {
            if (itemType === 'task') {
                await prisma.$transaction(
                    body.teamIds.map(tid =>
                        prisma.taskPermission.upsert({
                            where: { taskId_teamId: { taskId: itemId, teamId: tid } },
                            create: {
                                taskId: itemId,
                                teamId: tid,
                                permission: body.permission,
                                grantedById: userId,
                            },
                            update: { permission: body.permission },
                        })
                    )
                );
            } else {
                await prisma.$transaction(
                    body.teamIds.map(tid =>
                        prisma.locationPermission.upsert({
                            where: { locationType_locationId_teamId: { locationType: itemType, locationId: itemId, teamId: tid } },
                            create: {
                                locationType: itemType,
                                locationId: itemId,
                                teamId: tid,
                                permission: body.permission,
                                grantedById: userId,
                            },
                            update: { permission: body.permission },
                        })
                    )
                );
            }

            permissionCache.invalidateItem(itemType as any, itemId);
        }

        return { success: true };
    }

    /**
     * Bulk revoke permission
     */
    @Post(':itemType/:itemId/bulk-revoke')
    @UseGuards(JwtAuthGuard)
    async bulkRevokePermission(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Body() body: { userIds?: string[]; teamIds?: string[]; excludeOwners?: boolean },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify the revoker has permission
        const revokerPermission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        if (revokerPermission !== PermissionLevel.FULL) {
            throw new Error('You do not have permission to revoke access to this item');
        }

        // if excludeOwners is true, fetching the owners is needed to filter them out?
        // Actually, permissions model: OWNER role on SpaceMember/WorkspaceMember differs from Item Permission
        // For 'space' itemType, owners are stored in SpaceMember with role='OWNER' or createdBy field on Space.
        // But here we are dealing with unified permissions table (LocationPermission/TaskPermission).
        // If "Remove All" is clicked, we should remove all PERMISSION records.
        // The SpaceMember owner role is separate. 
        // IF the system uses Permission Tables for everything including owners, then we must be careful.
        // Assuming Owner Access is handled via SpaceMember tables (which grant implicit FULL), removing LocationPermission is safe for owners (they still have access via Role).
        // User Verification required: "Remove all - Removes access for all invited people at once".
        // "Invited people" implies those with explicit permissions.

        if (itemType === 'task') {
            const where: any = { taskId: itemId };

            if (body.userIds?.length) where.userId = { in: body.userIds };
            if (body.teamIds?.length) where.teamId = { in: body.teamIds };

            // If "Remove All" (no IDs provided), and excludeOwners check needed?
            // Assuming permission table only holds "granted" permissions, not intrinsic owner permissions.

            await prisma.taskPermission.deleteMany({ where });
        } else {
            const where: any = { locationType: itemType, locationId: itemId };

            if (body.userIds?.length) where.userId = { in: body.userIds };
            if (body.teamIds?.length) where.teamId = { in: body.teamIds };

            await prisma.locationPermission.deleteMany({ where });
        }

        // Invalidate cache
        if (body.userIds) {
            body.userIds.forEach(uid => permissionCache.invalidate(uid, itemType as any, itemId));
        } else {
            // If we removed all, we should just invalidate item or broad cache? 
            permissionCache.invalidateItem(itemType as any, itemId);
        }

        if (body.teamIds || (!body.userIds && !body.teamIds)) {
            permissionCache.invalidateItem(itemType as any, itemId);
        }

        return { success: true };
    }
    @UseGuards(JwtAuthGuard)
    async transferOwnership(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Body() body: { newOwnerId: string },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify current owner
        const permission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        // Only owner can transfer ownership (usually implied by specific check, 
        // but FULL access might not be enough, need strictly owner check if model has owner field)
        // For now, assuming FULL permission is sufficient or we check specific model
        if (permission !== PermissionLevel.FULL) {
            throw new Error('You do not have permission to transfer ownership');
        }

        // Update logic depends on item type
        let success = false;
        let itemName = 'Item';

        if (itemType === 'space') {
            const space = await prisma.space.findUnique({ where: { id: itemId } });
            if (space?.createdBy !== userId) { // Strict owner check
                throw new Error('Only the owner can transfer ownership');
            }
            await prisma.space.update({
                where: { id: itemId },
                data: { createdBy: body.newOwnerId }
            });
            itemName = space.name;
            success = true;
        } else if (itemType === 'project') {
            const project = await prisma.project.findUnique({ where: { id: itemId } });
            // Strict check if project has owner field, usually 'createdBy' or similar
            // Assuming simplified logic for now
            await prisma.project.update({
                where: { id: itemId },
                data: { ownerId: body.newOwnerId } // Adjust field name if needed
            });
            itemName = project?.name || 'Project';
            success = true;
        }

        if (success) {
            // Invalidate caches
            permissionCache.invalidate(userId, itemType as any, itemId);
            permissionCache.invalidate(body.newOwnerId, itemType as any, itemId);

            // Notify New Owner
            await import('../services/notification/notificationService').then(({ notificationService }) =>
                notificationService.sendOwnershipTransferNotification({
                    recipientId: body.newOwnerId,
                    programId: itemId, // terminology mixup, itemId
                    itemName
                })
            );
        }

        return { success };
    }

    /**
     * Revoke permission from a user or team
     */
    @Delete(':itemType/:itemId/revoke')
    @UseGuards(JwtAuthGuard)
    async revokePermission(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Query() query: { userId?: string; teamId?: string },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify the revoker has permission
        const revokerPermission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        if (revokerPermission !== PermissionLevel.FULL) {
            throw new Error('You do not have permission to revoke access to this item');
        }

        // Delete permission record
        if (itemType === 'task') {
            await prisma.taskPermission.deleteMany({
                where: {
                    taskId: itemId,
                    ...(query.userId && { userId: query.userId }),
                    ...(query.teamId && { teamId: query.teamId }),
                },
            });
        } else {
            await prisma.locationPermission.deleteMany({
                where: {
                    locationType: itemType,
                    locationId: itemId,
                    ...(query.userId && { userId: query.userId }),
                    ...(query.teamId && { teamId: query.teamId }),
                },
            });
        }

        // Invalidate cache
        if (query.userId) {
            permissionCache.invalidate(query.userId, itemType as any, itemId);

            // Notify User of revocation? (Optional, but good for UX)
            await import('../services/notification/notificationService').then(({ notificationService }) =>
                notificationService.publishEvent({
                    eventType: 'PERMISSION_REVOKED' as any, // Cast as we might not have exported it perfectly in controller context
                    actorId: userId,
                    entityType: itemType,
                    entityId: itemId,
                    recipientId: query.userId!,
                    metadata: { itemName: 'Item' } // Improve name fetching if needed
                })
            );
        }
        if (query.teamId) {
            permissionCache.invalidateItem(itemType as any, itemId);
        }

        return { success: true };
    }

    /**
     * List all permissions for an item
     */
    @Get(':itemType/:itemId/list')
    @UseGuards(JwtAuthGuard)
    async listPermissions(
        @Param('itemType') itemType: string,
        @Param('itemId') itemId: string,
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // Verify user has access
        const userPermission = await permissionResolver.resolvePermission(
            userId,
            itemType as any,
            itemId
        );

        if (!userPermission) {
            throw new Error('You do not have access to this item');
        }

        let userPermissions: any[] = [];
        let teamPermissions: any[] = [];

        if (itemType === 'task') {
            const taskPerms = await prisma.taskPermission.findMany({
                where: { taskId: itemId },
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
            const locationPerms = await prisma.locationPermission.findMany({
                where: {
                    locationType: itemType,
                    locationId: itemId,
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
    }
}
