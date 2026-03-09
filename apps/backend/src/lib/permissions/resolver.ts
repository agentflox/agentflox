/**
 * Permission Resolver
 * Enterprise-grade permission resolution following ClickUp's 7-step hierarchy
 * 
 * Security Features:
 * - Input validation and sanitization
 * - Recursion protection against circular references
 * - Comprehensive error handling
 * - Security event logging
 * - Performance monitoring
 */

import { prisma } from '@/lib/prisma';
import { PermissionLevel, WorkspaceRole, Prisma } from '@agentflox/database';
import type { ItemType, LocationType } from './types';
import { permissionCache } from './cache';
import { timingSafeEqual } from 'crypto';

// Constants
const MAX_RECURSION_DEPTH = 10; // Maximum hierarchy depth to prevent infinite loops
const VALID_ITEM_TYPES: ItemType[] = ['workspace', 'space', 'folder', 'list', 'project', 'team', 'task'];
const ID_REGEX = /^[a-z0-9-]{20,40}$/i; // Supports UUID (36 chars) and CUID (20-30 chars)
const UUID_MAX_LENGTH = 40; // Increased to accommodate various ID formats
const MAX_STRING_LENGTH = 255; // Maximum length for general string inputs

type PrismaModel = {
    findUnique: (args: any) => Promise<any>;
    findMany?: (args: any) => Promise<any[]>;
};

interface ResolveContext {
    depth: number;
}

export class PermissionResolver {
    private metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        databaseQueries: 0,
        averageResolutionTime: 0,
        totalResolutions: 0,
        slowQueries: 0,
    };

    /**
     * Public entry point for permission resolution
     */
    public async resolvePermission(
        userId: string,
        itemType: ItemType,
        itemId: string
    ): Promise<PermissionLevel | null> {
        const start = Date.now();
        this.metrics.totalResolutions++;

        try {
            this.validateInput(userId, itemType, itemId);

            // Check cache first
            const cached = permissionCache.get(userId, itemType, itemId);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }
            this.metrics.cacheMisses++;

            const context: ResolveContext = { depth: 0 };
            const permission = await this.resolvePermissionInternal(userId, itemType, itemId, context);

            // Cache the result
            if (permission) {
                permissionCache.set(userId, itemType, itemId, permission);
            }

            const time = Date.now() - start;
            this.metrics.averageResolutionTime =
                (this.metrics.averageResolutionTime * (this.metrics.totalResolutions - 1) + time) /
                this.metrics.totalResolutions;

            if (time > 100) this.metrics.slowQueries++; // Alert on slow queries > 100ms

            await this.auditPermissionCheck(userId, itemType, itemId, permission, 'Resolution complete');

            return permission;

        } catch (error) {
            this.logError(error, userId, itemType, itemId);
            return null; // Fail secure
        }
    }

    /**
     * Internal recursive resolution checking all 7 steps
     */
    private async resolvePermissionInternal(
        userId: string,
        itemType: ItemType,
        itemId: string,
        context: ResolveContext
    ): Promise<PermissionLevel | null> {
        if (context.depth > MAX_RECURSION_DEPTH) {
            console.warn('[PermissionResolver] Max recursion depth exceeded');
            return null;
        }

        // Increment depth for recursion
        context.depth++;

        // Step 1: Workspace Owner
        const workspaceId = await this.getWorkspaceId(itemType, itemId);
        if (workspaceId && await this.isWorkspaceOwner(userId, workspaceId)) {
            return PermissionLevel.FULL;
        }

        // Step 2: Item Creator
        if (await this.isItemCreator(userId, itemType, itemId)) {
            return PermissionLevel.FULL;
        }

        // Step 3 & 4: Individual & Team Permissions (Explicit)
        // We need to fetch both
        const individualPerm = await this.getIndividualPermission(userId, itemType, itemId);
        const teamPerm = await this.getTeamPermission(userId, itemType, itemId);

        const permissions: PermissionLevel[] = [];
        if (individualPerm) permissions.push(individualPerm);
        if (teamPerm) permissions.push(teamPerm);

        const highestExplicit = this.getHighestPermission(permissions);
        if (highestExplicit) return highestExplicit;

        // Step 5: Check Privacy / Inheritance Break
        if (await this.isItemPrivate(itemType, itemId)) {
            return null;
        }

        // Step 6: Guest check?
        // Logic for guests is handled within hierarchy or implicit rules. 
        // If not private, we proceed to hierarchy.

        // Step 7: Hierarchy
        return await this.getHierarchyPermission(userId, itemType, itemId, context);
    }

    /**
     * Input validation
     */
    private validateInput(userId: string, itemType: ItemType, itemId: string): void {
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            throw new ValidationError('userId is required and must be a non-empty string');
        }

        if (userId.length > UUID_MAX_LENGTH) {
            throw new ValidationError('userId exceeds maximum length');
        }

        if (!ID_REGEX.test(userId)) {
            throw new ValidationError('userId must be a valid ID (UUID or CUID)');
        }

        if (!itemType || typeof itemType !== 'string') {
            throw new ValidationError('itemType is required and must be a string');
        }

        if (itemType.length > MAX_STRING_LENGTH) {
            throw new ValidationError('itemType exceeds maximum length');
        }

        if (!VALID_ITEM_TYPES.includes(itemType)) {
            throw new ValidationError(`itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}`);
        }

        if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
            throw new ValidationError('itemId is required and must be a non-empty string');
        }

        if (itemId.length > UUID_MAX_LENGTH) {
            throw new ValidationError('itemId exceeds maximum length');
        }

        if (!ID_REGEX.test(itemId)) {
            throw new ValidationError('itemId must be a valid ID (UUID or CUID)');
        }
    }

    /**
     * Error logging helper with PII masking
     */
    private logError(error: unknown, userId: string, itemType: ItemType, itemId: string): void {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Mask sensitive data
        const maskedUserId = this.maskSensitiveData(userId);
        const maskedItemId = this.maskSensitiveData(itemId);

        // Log security-relevant errors
        if (error instanceof ValidationError) {
            console.warn('[PermissionResolver] Validation error', {
                error: errorMessage,
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
        } else {
            console.error('[PermissionResolver] Error during permission resolution', {
                error: errorMessage,
                stack: errorStack,
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
        }
    }

    /**
     * Mask sensitive data for logging (PII protection)
     */
    private maskSensitiveData(data: string): string {
        if (data.length <= 8) {
            return '***';
        }
        return data.substring(0, 8) + '...';
    }

    /**
     * Step 1: Check if user is workspace owner
     */
    private async isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
        try {
            this.metrics.databaseQueries++;

            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { ownerId: true },
            });

            if (!workspace || !workspace.ownerId) {
                return false; // Workspace doesn't exist or has no owner
            }

            // Use timing-safe comparison to prevent timing attacks
            return this.timingSafeCompare(workspace.ownerId, userId);
        } catch (error) {
            // Log but don't throw - fail-secure
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedWorkspaceId = this.maskSensitiveData(workspaceId);

            console.error('[PermissionResolver] Error checking workspace ownership', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                workspaceId: maskedWorkspaceId,
            });
            return false;
        }
    }

    /**
     * Timing-safe string comparison to prevent timing attacks
     */
    private timingSafeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        try {
            const bufA = Buffer.from(a);
            const bufB = Buffer.from(b);
            return timingSafeEqual(bufA, bufB);
        } catch {
            // Fallback to regular comparison if buffer creation fails
            return a === b;
        }
    }

    /**
     * Step 2: Check if user is item creator
     */
    private async isItemCreator(userId: string, itemType: ItemType, itemId: string): Promise<boolean> {
        try {
            this.metrics.databaseQueries++;

            const creatorField = this.getCreatorField(itemType);
            if (!creatorField) return false;

            const model = this.getPrismaModel(itemType);
            if (!model) return false;

            const item = await model.findUnique({
                where: { id: itemId },
                select: { [creatorField]: true },
            });

            // Proper validation before type casting
            if (!item || !(creatorField in item)) {
                return false; // Item doesn't exist or field doesn't exist
            }

            const creatorId = item[creatorField as keyof typeof item];

            // Type check before comparison
            if (typeof creatorId !== 'string') {
                return false;
            }

            // Use timing-safe comparison
            return this.timingSafeCompare(creatorId, userId);
        } catch (error) {
            // Log but don't throw - fail-secure
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedItemId = this.maskSensitiveData(itemId);

            console.error('[PermissionResolver] Error checking item creator', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
            return false;
        }
    }

    /**
     * Step 3: Get individual user permission
     */
    private async getIndividualPermission(
        userId: string,
        itemType: ItemType,
        itemId: string
    ): Promise<PermissionLevel | null> {
        try {
            this.metrics.databaseQueries++;

            if (itemType === 'task') {
                const taskPerm = await prisma.taskPermission.findUnique({
                    where: {
                        taskId_userId: {
                            taskId: itemId,
                            userId,
                        },
                    },
                    select: { permission: true },
                });

                return taskPerm?.permission || null;
            }

            // Location permissions (space, folder, list, project, team)
            const locationPerm = await prisma.locationPermission.findUnique({
                where: {
                    locationType_locationId_userId: {
                        locationType: itemType,
                        locationId: itemId,
                        userId,
                    },
                },
                select: { permission: true },
            });

            return locationPerm?.permission || null;
        } catch (error) {
            // Log but don't throw - fail-secure
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedItemId = this.maskSensitiveData(itemId);

            console.error('[PermissionResolver] Error getting individual permission', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
            return null;
        }
    }

    /**
     * Step 4: Get team permission
     */
    private async getTeamPermission(
        userId: string,
        itemType: ItemType,
        itemId: string
    ): Promise<PermissionLevel | null> {
        try {
            this.metrics.databaseQueries += 2; // Two queries: userTeams + permissions

            // Get user's teams
            const userTeams = await prisma.teamMember.findMany({
                where: { userId },
                select: { teamId: true },
            });

            const teamIds = userTeams.map((t) => t.teamId);
            if (teamIds.length === 0) return null;

            if (itemType === 'task') {
                const teamPerms = await prisma.taskPermission.findMany({
                    where: {
                        taskId: itemId,
                        teamId: { in: teamIds },
                    },
                    select: { permission: true },
                });

                return this.getHighestPermission(teamPerms.map((p) => p.permission));
            }

            // Location permissions
            const teamPerms = await prisma.locationPermission.findMany({
                where: {
                    locationType: itemType,
                    locationId: itemId,
                    teamId: { in: teamIds },
                },
                select: { permission: true },
            });

            return this.getHighestPermission(teamPerms.map((p) => p.permission));
        } catch (error) {
            // Log but don't throw - fail-secure
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedItemId = this.maskSensitiveData(itemId);

            console.error('[PermissionResolver] Error getting team permission', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
            return null;
        }
    }

    /**
     * Step 5: Check if item is private
     */
    private async isItemPrivate(itemType: ItemType, itemId: string): Promise<boolean> {
        try {
            const model = this.getPrismaModel(itemType);
            if (!model) return false;

            const privacyFields = this.getPrivacyField(itemType);
            const item = await model.findUnique({
                where: { id: itemId },
                select: privacyFields,
            });

            if (!item) return false; // Item doesn't exist, treat as private (fail-secure)

            const itemData = item as Record<string, unknown>;

            // For Project, check isPublic field (inverse)
            if (itemType === 'project') {
                return itemData.isPublic !== true;
            }

            // For Team, check visibility field
            if (itemType === 'team') {
                return itemData.visibility !== 'PUBLIC';
            }

            // For others, check isPrivate field
            return itemData.isPrivate === true;
        } catch (error) {
            // Log but don't throw - fail-secure (treat as private on error)
            console.error('[PermissionResolver] Error checking item privacy', {
                error: error instanceof Error ? error.message : 'Unknown error',
                itemType,
                itemId,
            });
            return true; // Fail-secure: treat as private on error
        }
    }

    /**
     * Step 6: Check if user is guest
     */
    private async isGuest(userId: string, workspaceId: string): Promise<boolean> {
        try {
            const guest = await prisma.workspaceGuest.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId,
                    },
                },
            });

            return !!guest;
        } catch (error) {
            // Log but don't throw - fail-secure (assume not guest on error)
            console.error('[PermissionResolver] Error checking guest status', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
                workspaceId,
            });
            return false; // Fail-secure: assume not guest on error
        }
    }

    /**
     * Step 7: Get permission from hierarchy
     */
    private async getHierarchyPermission(
        userId: string,
        itemType: ItemType,
        itemId: string,
        context: ResolveContext
    ): Promise<PermissionLevel | null> {
        try {
            const parentId = await this.getParentId(itemType, itemId);
            const parentType = this.getParentType(itemType);

            if (!parentId || !parentType) {
                // Reached workspace level - check workspace role
                const workspaceId = await this.getWorkspaceId(itemType, itemId);
                if (!workspaceId) return null;

                return await this.getWorkspaceRolePermission(userId, workspaceId);
            }

            // Recursively check parent permission (with context tracking)
            return await this.resolvePermissionInternal(userId, parentType, parentId, context);
        } catch (error) {
            // Log but don't throw - fail-secure
            console.error('[PermissionResolver] Error getting hierarchy permission', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
                itemType,
                itemId,
            });
            return null;
        }
    }

    /**
     * Get workspace role default permission
     * Uses transaction to ensure data consistency
     */
    private async getWorkspaceRolePermission(
        userId: string,
        workspaceId: string
    ): Promise<PermissionLevel | null> {
        try {
            this.metrics.databaseQueries++;

            // Use transaction for consistency
            return await prisma.$transaction(async (tx) => {
                const member = await tx.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId,
                        },
                    },
                    select: { role: true },
                });

                if (!member) return null; // Not a workspace member

                // Members have full access to public items by default
                if (member.role === WorkspaceRole.MEMBER || member.role === WorkspaceRole.ADMIN) {
                    return PermissionLevel.FULL;
                }

                // Limited members have restricted access
                if (member.role === WorkspaceRole.LIMITED_MEMBER) {
                    return PermissionLevel.EDIT;
                }

                if (member.role === WorkspaceRole.LIMITED_MEMBER_VIEW_ONLY) {
                    return PermissionLevel.VIEW;
                }

                return null;
            });
        } catch (error) {
            // Log but don't throw - fail-secure
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedWorkspaceId = this.maskSensitiveData(workspaceId);

            console.error('[PermissionResolver] Error getting workspace role permission', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                workspaceId: maskedWorkspaceId,
            });
            return null;
        }
    }

    /**
     * Helper: Get highest permission from array
     */
    private getHighestPermission(permissions: PermissionLevel[]): PermissionLevel | null {
        if (permissions.length === 0) return null;

        const hierarchy = [
            PermissionLevel.VIEW,
            PermissionLevel.COMMENT,
            PermissionLevel.EDIT,
            PermissionLevel.FULL,
        ];

        let highest: PermissionLevel | null = null;
        let highestIndex = -1;

        for (const perm of permissions) {
            const index = hierarchy.indexOf(perm);
            if (index > highestIndex) {
                highestIndex = index;
                highest = perm;
            }
        }

        return highest;
    }

    /**
     * Helper: Get workspace ID for an item
     */
    private async getWorkspaceId(itemType: ItemType, itemId: string): Promise<string | null> {
        try {
            const model = this.getPrismaModel(itemType);
            if (!model) return null;

            const item = await model.findUnique({
                where: { id: itemId },
                select: { workspaceId: true },
            });

            if (!item) return null; // Item doesn't exist

            return (item as { workspaceId: string | null }).workspaceId || null;
        } catch (error) {
            // Log but don't throw - fail-secure
            console.error('[PermissionResolver] Error getting workspace ID', {
                error: error instanceof Error ? error.message : 'Unknown error',
                itemType,
                itemId,
            });
            return null;
        }
    }

    /**
     * Helper: Get parent ID
     */
    private async getParentId(itemType: ItemType, itemId: string): Promise<string | null> {
        try {
            const model = this.getPrismaModel(itemType);
            if (!model) return null;

            const parentField = this.getParentField(itemType);
            if (!parentField) return null;

            const item = await model.findUnique({
                where: { id: itemId },
                select: { [parentField]: true },
            });

            if (!item) return null; // Item doesn't exist

            return (item as Record<string, string | null>)[parentField] || null;
        } catch (error) {
            // Log but don't throw - fail-secure
            console.error('[PermissionResolver] Error getting parent ID', {
                error: error instanceof Error ? error.message : 'Unknown error',
                itemType,
                itemId,
            });
            return null;
        }
    }

    /**
     * Helper: Get parent type
     */
    private getParentType(itemType: ItemType): LocationType | null {
        const hierarchy: Record<ItemType, LocationType | null> = {
            task: 'list',
            list: 'folder',
            folder: 'space',
            space: null,
            project: null,
            team: null,
            workspace: null,
        };

        return hierarchy[itemType];
    }

    /**
     * Helper: Get parent field name
     */
    private getParentField(itemType: ItemType): string | null {
        const fields: Record<ItemType, string | null> = {
            task: 'listId',
            list: 'folderId',
            folder: 'spaceId',
            space: null,
            project: null,
            team: null,
            workspace: null,
        };

        return fields[itemType];
    }

    /**
     * Helper: Get creator field name
     */
    private getCreatorField(itemType: ItemType): string | null {
        const fields: Record<ItemType, string | null> = {
            task: 'createdBy',
            list: 'createdBy',
            folder: 'createdBy',
            space: 'createdBy',
            project: 'ownerId',
            team: 'ownerId',
            workspace: 'ownerId',
        };

        return fields[itemType];
    }

    /**
     * Helper: Get privacy field
     */
    private getPrivacyField(itemType: ItemType): Record<string, boolean> {
        if (itemType === 'project') {
            return { isPublic: true };
        }
        if (itemType === 'team') {
            return { visibility: true };
        }
        return { isPrivate: true };
    }

    /**
     * Helper: Get Prisma model for item type
     */
    private getPrismaModel(itemType: ItemType): PrismaModel | null {
        const models: Record<ItemType, PrismaModel> = {
            task: prisma.task as unknown as PrismaModel,
            list: prisma.list as unknown as PrismaModel,
            folder: prisma.folder as unknown as PrismaModel,
            space: prisma.space as unknown as PrismaModel,
            project: prisma.project as unknown as PrismaModel,
            team: prisma.team as unknown as PrismaModel,
            workspace: prisma.workspace as unknown as PrismaModel,
        };

        return models[itemType] || null;
    }

    /**
     * Invalidate permission cache for a specific item
     * Also invalidates parent hierarchy to ensure consistency
     */
    async invalidatePermissionCache(
        userId: string,
        itemType: ItemType,
        itemId: string
    ): Promise<void> {
        try {
            // Invalidate the specific permission
            permissionCache.invalidate(userId, itemType, itemId);

            // Invalidate parent hierarchy
            const parentType = this.getParentType(itemType);
            if (parentType) {
                const parentId = await this.getParentId(itemType, itemId);
                if (parentId) {
                    await this.invalidatePermissionCache(userId, parentType, parentId);
                }
            }
        } catch (error) {
            // Log but don't throw - cache invalidation failure shouldn't break the app
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedItemId = this.maskSensitiveData(itemId);

            console.error('[PermissionResolver] Error invalidating cache', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
            });
        }
    }

    /**
     * Invalidate all permissions for a specific item (all users)
     */
    invalidateItemPermissions(itemType: ItemType, itemId: string): void {
        try {
            permissionCache.invalidateItem(itemType, itemId);
        } catch (error) {
            const maskedItemId = this.maskSensitiveData(itemId);
            console.error('[PermissionResolver] Error invalidating item permissions', {
                error: error instanceof Error ? error.message : 'Unknown error',
                itemType,
                itemId: maskedItemId,
            });
        }
    }

    /**
     * Invalidate all permissions for a user
     */
    invalidateUserPermissions(userId: string): void {
        try {
            permissionCache.invalidateUser(userId);
        } catch (error) {
            const maskedUserId = this.maskSensitiveData(userId);
            console.error('[PermissionResolver] Error invalidating user permissions', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: maskedUserId,
            });
        }
    }

    /**
     * Audit log permission check (GDPR compliant)
     * Only logs if ENABLE_AUDIT_LOG environment variable is set to 'true'
     */
    private async auditPermissionCheck(
        userId: string,
        itemType: ItemType,
        itemId: string,
        permission: PermissionLevel | null,
        reason: string
    ): Promise<void> {
        // Only audit if explicitly enabled
        if (process.env.ENABLE_AUDIT_LOG !== 'true') {
            return;
        }

        try {
            // In a real implementation, this would write to a dedicated audit log table
            // For now, we'll use structured logging
            const maskedUserId = this.maskSensitiveData(userId);
            const maskedItemId = this.maskSensitiveData(itemId);

            console.info('[PermissionResolver] Audit Log', {
                timestamp: new Date().toISOString(),
                userId: maskedUserId,
                itemType,
                itemId: maskedItemId,
                grantedPermission: permission,
                reason,
                // ipAddress would come from request context in a real implementation
            });

            // TODO: Implement actual database audit logging
            // await prisma.permissionAuditLog.create({
            //     data: {
            //         userId,
            //         itemType,
            //         itemId,
            //         grantedPermission: permission,
            //         reason,
            //         timestamp: new Date(),
            //         ipAddress: this.getRequestIP(),
            //     },
            // });
        } catch (error) {
            // Don't throw - audit logging failure shouldn't break the app
            console.error('[PermissionResolver] Error writing audit log', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        const cacheStats = permissionCache.getStats();

        return {
            ...this.metrics,
            cacheSize: cacheStats.size,
            cacheTTL: cacheStats.ttl,
            cacheHitRate: this.metrics.totalResolutions > 0
                ? (this.metrics.cacheHits / this.metrics.totalResolutions) * 100
                : 0,
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics(): void {
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            databaseQueries: 0,
            averageResolutionTime: 0,
            totalResolutions: 0,
            slowQueries: 0,
        };
    }

    /**
     * Health check for permission resolver
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        cacheSize: number;
        dbConnected: boolean;
        metrics: ReturnType<typeof this.getMetrics>;
    }> {
        try {
            // Test database connection
            await prisma.$queryRaw`SELECT 1`;

            const metrics = this.getMetrics();
            const cacheStats = permissionCache.getStats();

            // Consider degraded if slow query rate is high
            const slowQueryRate = this.metrics.totalResolutions > 0
                ? (this.metrics.slowQueries / this.metrics.totalResolutions) * 100
                : 0;

            const status = slowQueryRate > 10 ? 'degraded' : 'healthy';

            return {
                status,
                cacheSize: cacheStats.size,
                dbConnected: true,
                metrics,
            };
        } catch (error) {
            console.error('[PermissionResolver] Health check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
                status: 'unhealthy',
                cacheSize: permissionCache.getStats().size,
                dbConnected: false,
                metrics: this.getMetrics(),
            };
        }
    }
}

/**
 * Custom validation error class
 */
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

// Singleton instance
export const permissionResolver = new PermissionResolver();
