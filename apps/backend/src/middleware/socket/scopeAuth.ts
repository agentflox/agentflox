import { Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { executeDbOperation } from '@/lib/circuitBreaker';
import env from '@/config/env';
import { WorkspaceRole } from '@agentflox/database/src/generated/prisma/index.js';

interface PermissionData {
    allowed: string[];
}

/**
 * Scope Authorization Middleware
 * Enforces tenant, project, and team isolation for all socket operations
 */

export interface ScopeAuthData {
    userId: string;
    username: string;
    workspaceId: string | null;
    workspaceRole?: WorkspaceRole | 'GUEST' | null;

    projectId: string | null;
    teamId: string | null;

    permissions: string[];
}

/**
 * Verify user has access to workspace
 */
export async function verifyWorkspaceAccess(
    userId: string,
    workspaceId: string
): Promise<{
    workspaceId: string;
    workspaceRole: WorkspaceRole | 'GUEST';
    username: string;
    permissions: string[]
} | null> {

    // 🧪 BYPASS FOR LOAD TESTING
    if (env.NODE_ENV === 'development' && userId.startsWith('load-test-')) {
        return {
            username: `Tester-${userId.split('-')[2] || 'LoadTest'}`,
            workspaceId,
            workspaceRole: 'MEMBER',
            permissions: ['*'],
        };
    }

    try {
        const membership = await executeDbOperation(() =>
            prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            })
        );

        if (!membership || membership.status !== 'ACTIVE') {
            return null;
        }

        return {
            username: membership.user.username || 'Unknown',
            workspaceId: membership.workspaceId,
            workspaceRole: membership.role,
            permissions: (membership.permissions as unknown as PermissionData | null)?.allowed || [],
        };
    } catch (error) {
        console.error('[ScopeAuth] Error verifying workspace access:', error);
        return null;
    }
}

/**
 * Verify user has access to project
 */
export async function verifyProjectAccess(
    userId: string,
    projectId: string
): Promise<boolean> {
    if (env.NODE_ENV === 'development' && userId.startsWith('load-test-')) return true;

    try {
        const project = await executeDbOperation(() =>
            prisma.project.findFirst({
                where: {
                    id: projectId,
                    OR: [
                        { visibility: 'PUBLIC' },
                        { ownerId: userId },
                        {
                            members: {
                                some: {
                                    userId,
                                    status: 'ACTIVE',
                                },
                            },
                        },
                    ],
                },
            })
        );
        return !!project;
    } catch (error) {
        console.error('[ScopeAuth] Error verifying project access:', error);
        return false;
    }
}

/**
 * Verify user has access to team
 */
export async function verifyTeamAccess(
    userId: string,
    teamId: string
): Promise<boolean> {
    if (env.NODE_ENV === 'development' && userId.startsWith('load-test-')) return true;

    try {
        const team = await executeDbOperation(() =>
            prisma.team.findFirst({
                where: {
                    id: teamId,
                    members: {
                        some: {
                            userId,
                            status: 'ACTIVE',
                        },
                    },
                },
            })
        );
        return !!team;
    } catch (error) {
        console.error('[ScopeAuth] Error verifying team access:', error);
        return false;
    }
}

/**
 * Verify user can access specific resource in workspace
 */
export async function verifyResourceAccess(
    userId: string,
    workspaceId: string,
    resourceType: 'channel' | 'project' | 'post' | 'task' | 'document',
    resourceId: string
): Promise<boolean> {
    try {
        // First verify workspace membership
        const wsAccess = await verifyWorkspaceAccess(userId, workspaceId);
        if (!wsAccess) {
            return false;
        }

        // Check resource-specific access based on type
        switch (resourceType) {
            case 'channel': {
                const membership = await executeDbOperation(() =>
                    prisma.channelMember.findUnique({
                        where: {
                            channelId_userId: {
                                channelId: resourceId,
                                userId,
                            },
                        },
                    })
                );
                return membership !== null;
            }

            case 'project': {
                // Use our dedicated helper but ensure workspace matches if needed?
                // The dedicated helper checks generic access. Here we force workspace scope.
                const project = await executeDbOperation(() =>
                    prisma.project.findFirst({
                        where: {
                            id: resourceId,
                            workspaceId,
                            OR: [
                                { visibility: 'PUBLIC' },
                                { ownerId: userId },
                                {
                                    members: {
                                        some: {
                                            userId,
                                            status: 'ACTIVE',
                                        },
                                    },
                                },
                            ],
                        },
                    })
                );
                return project !== null;
            }

            case 'post': {
                const post = await executeDbOperation(() =>
                    prisma.post.findFirst({
                        where: {
                            id: resourceId,
                            OR: [
                                { visibility: 'PUBLIC' },
                                { ownerId: userId },
                                // Add connection/friend check if needed
                            ],
                        },
                    })
                );
                return post !== null;
            }

            case 'task': {
                const task = await executeDbOperation(() =>
                    prisma.task.findFirst({
                        where: {
                            id: resourceId,
                            workspaceId,
                            OR: [
                                { createdBy: userId },
                                { assignees: { some: { userId } } },
                                { watchers: { some: { userId } } },
                            ],
                        },
                    })
                );
                return task !== null;
            }

            case 'document': {
                const document = await executeDbOperation(() =>
                    prisma.document.findFirst({
                        where: {
                            id: resourceId,
                            workspaceId,
                            OR: [
                                { isPublished: true },
                                { createdBy: userId },
                                { collaborators: { some: { userId } } },
                            ],
                        },
                    })
                );
                return document !== null;
            }

            default:
                return false;
        }
    } catch (error) {
        console.error('[ScopeAuth] Error verifying resource access:', error);
        return false;
    }
}

/**
 * Socket middleware to enforce scope contexts (Workspace, Project, Team)
 */
export async function scopeAuthMiddleware(socket: Socket<any, any, any, ScopeAuthData>, next: (err?: Error) => void) {
    const auth = socket.handshake.auth || {};
    const query = socket.handshake.query || {};

    const workspaceId = (auth.workspaceId || query.workspaceId) as string | undefined;
    const projectId = (auth.projectId || query.projectId) as string | undefined;
    const teamId = (auth.teamId || query.teamId) as string | undefined;

    const userId = socket.data.userId;

    if (!userId) {
        return next(new Error('User not authenticated'));
    }

    // Initialize data
    socket.data.workspaceId = null;
    socket.data.workspaceRole = null;
    socket.data.permissions = [];
    socket.data.projectId = null;
    socket.data.teamId = null;

    try {
        // 1. Validate Workspace
        if (workspaceId) {
            const wsAuth = await verifyWorkspaceAccess(userId, workspaceId);
            if (!wsAuth) {
                return next(new Error('Not authorized to access this workspace'));
            }
            socket.data.workspaceId = wsAuth.workspaceId;
            socket.data.workspaceRole = wsAuth.workspaceRole;
            socket.data.permissions = wsAuth.permissions;

            console.log(
                `✅ Scope auth: User ${userId} verified for workspace ${workspaceId}`
            );
        } else {
            if (!projectId && !teamId) {
                console.log(`⚠️ Socket connected without workspace context: User ${userId} (${socket.id})`);
            }
        }

        // 2. Validate Project
        if (projectId) {
            const hasAccess = await verifyProjectAccess(userId, projectId);
            if (!hasAccess) {
                return next(new Error('Not authorized to access this project'));
            }
            socket.data.projectId = projectId;
            console.log(
                `✅ Scope auth: User ${userId} verified for project ${projectId}`
            );
        }

        // 3. Validate Team
        if (teamId) {
            const hasAccess = await verifyTeamAccess(userId, teamId);
            if (!hasAccess) {
                return next(new Error('Not authorized to access this team'));
            }
            socket.data.teamId = teamId;
            console.log(
                `✅ Scope auth: User ${userId} verified for team ${teamId}`
            );
        }

        next();

    } catch (error) {
        console.error('[ScopeAuth] Middleware error:', error);
        next(new Error('Authorization failed'));
    }
}

/**
 * Room join authorization middleware
 * Prevents users from joining rooms they don't have access to
 */
export async function authorizeRoomJoin(
    socket: Socket<any, any, any, ScopeAuthData>,
    roomName: string
): Promise<{ allowed: boolean; reason?: string }> {
    const { userId, workspaceId } = socket.data;

    // Parse room name to extract resource type and ID
    const parts = roomName.split(':');

    // Workspace-scoped room: ws:workspaceId:type:id
    if (parts[0] === 'ws') {
        const roomWorkspaceId = parts[1];

        // Verify user is in the correct workspace
        if (roomWorkspaceId !== workspaceId) {
            return {
                allowed: false,
                reason: 'Cannot join room from different workspace',
            };
        }

        const resourceType = parts[2] as 'channel' | 'project' | 'post' | 'task' | 'document' | 'user';
        const resourceId = parts[3];

        // User rooms are always allowed
        if (resourceType === 'user') {
            return {
                allowed: resourceId === userId,
                reason: resourceId === userId ? undefined : 'Cannot join another user\'s private room'
            };
        }

        // Check resource access
        const hasAccess = await verifyResourceAccess(
            userId,
            workspaceId,
            resourceType,
            resourceId
        );

        return {
            allowed: hasAccess,
            reason: hasAccess ? undefined : 'No access to this resource',
        };
    }

    // Legacy room format - allow for backward compatibility but log warning
    console.warn(`[ScopeAuth] Legacy room format detected: ${roomName}`);
    return { allowed: true };
}
