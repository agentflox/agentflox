import { Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { executeDbOperation } from '@/lib/circuitBreaker';
import { ScopeAuthData } from '../../middleware/socket/scopeAuth.js';

/**
 * Granular Socket Authorization Utilities
 * Provides context-specific authorization for different socket operations
 */

export interface AuthContext {
    userId: string;
    workspaceId?: string | null;
    projectId?: string;
    teamId?: string;
}

/**
 * Validate project access with optional workspace context
 * Rules:
 * - If workspaceId is provided, validate both project and workspace membership
 * - If workspaceId is not provided, only validate project access
 * - Project ID is always required
 */
export async function validateProjectAccess(
    socket: Socket,
    projectId: string,
    workspaceId?: string | null
): Promise<{ authorized: boolean; reason?: string }> {
    if (!projectId) {
        return { authorized: false, reason: 'Project ID is required' };
    }

    const userId = (socket.data as ScopeAuthData).userId;

    try {
        const project = await executeDbOperation(() =>
            prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    workspaceId: true,
                    ownerId: true,
                    visibility: true,
                    members: {
                        where: {
                            userId,
                            status: 'ACTIVE',
                        },
                        select: { id: true },
                    },
                },
            })
        );

        if (!project) {
            return { authorized: false, reason: 'Project not found' };
        }

        // If workspace ID is provided, validate workspace membership
        if (workspaceId) {
            // Check if project belongs to the specified workspace
            if (project.workspaceId !== workspaceId) {
                return {
                    authorized: false,
                    reason: 'Project does not belong to the specified workspace',
                };
            }

            // Validate workspace membership
            const workspaceMember = await executeDbOperation(() =>
                prisma.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId,
                        },
                    },
                    select: { status: true },
                })
            );

            if (!workspaceMember || workspaceMember.status !== 'ACTIVE') {
                return {
                    authorized: false,
                    reason: 'Not a member of the specified workspace',
                };
            }
        }

        // Check project access
        const isOwner = project.ownerId === userId;
        const isMember = project.members.length > 0;
        const isPublic = project.visibility === 'PUBLIC';

        if (isOwner || isMember || isPublic) {
            return { authorized: true };
        }

        return { authorized: false, reason: 'No access to this project' };
    } catch (error) {
        console.error('[Auth] Error validating project access:', error);
        return { authorized: false, reason: 'Authorization check failed' };
    }
}

/**
 * Validate team access with optional workspace context
 * Rules:
 * - If team belongs to a workspace, workspaceId must be provided and validated
 * - If workspaceId is not provided but team has a workspace, deny access
 * - Team ID is always required
 */
export async function validateTeamAccess(
    socket: Socket,
    teamId: string,
    workspaceId?: string | null
): Promise<{ authorized: boolean; reason?: string }> {
    if (!teamId) {
        return { authorized: false, reason: 'Team ID is required' };
    }

    const userId = (socket.data as ScopeAuthData).userId;

    try {
        const team = await executeDbOperation(() =>
            prisma.team.findUnique({
                where: { id: teamId },
                select: {
                    id: true,
                    workspaceId: true,
                    ownerId: true,
                    visibility: true,
                    members: {
                        where: {
                            userId,
                            status: 'ACTIVE',
                        },
                        select: { id: true },
                    },
                },
            })
        );

        if (!team) {
            return { authorized: false, reason: 'Team not found' };
        }

        // If team belongs to a workspace, workspace ID must be provided
        if (team.workspaceId) {
            if (!workspaceId) {
                return {
                    authorized: false,
                    reason: 'Team belongs to a workspace, workspace ID is required',
                };
            }

            // Check if team belongs to the specified workspace
            if (team.workspaceId !== workspaceId) {
                return {
                    authorized: false,
                    reason: 'Team does not belong to the specified workspace',
                };
            }

            // Validate workspace membership
            const workspaceMember = await executeDbOperation(() =>
                prisma.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId,
                            userId,
                        },
                    },
                    select: { status: true },
                })
            );

            if (!workspaceMember || workspaceMember.status !== 'ACTIVE') {
                return {
                    authorized: false,
                    reason: 'Not a member of the specified workspace',
                };
            }
        }

        // Check team access
        const isOwner = team.ownerId === userId;
        const isMember = team.members.length > 0;
        const isPublic = team.visibility === 'PUBLIC';

        if (isOwner || isMember || isPublic) {
            return { authorized: true };
        }

        return { authorized: false, reason: 'No access to this team' };
    } catch (error) {
        console.error('[Auth] Error validating team access:', error);
        return { authorized: false, reason: 'Authorization check failed' };
    }
}

/**
 * Validate notification access
 * Rules:
 * - No workspace ID required
 * - Only userId validation
 */
export async function validateNotificationAccess(
    socket: Socket,
    notificationId: string
): Promise<{ authorized: boolean; reason?: string }> {
    const userId = (socket.data as ScopeAuthData).userId;

    try {
        const notification = await executeDbOperation(() =>
            prisma.notification.findUnique({
                where: { id: notificationId },
                select: { userId: true },
            })
        );

        if (!notification) {
            return { authorized: false, reason: 'Notification not found' };
        }

        if (notification.userId !== userId) {
            return { authorized: false, reason: 'Not your notification' };
        }

        return { authorized: true };
    } catch (error) {
        console.error('[Auth] Error validating notification access:', error);
        return { authorized: false, reason: 'Authorization check failed' };
    }
}

/**
 * Validate message access
 * Rules:
 * - No workspace ID required
 * - Only userId validation (sender or receiver)
 */
export async function validateMessageAccess(
    socket: Socket,
    messageId: string
): Promise<{ authorized: boolean; reason?: string }> {
    const userId = (socket.data as ScopeAuthData).userId;

    try {
        const message = await executeDbOperation(() =>
            prisma.message.findUnique({
                where: { id: messageId },
                select: {
                    senderId: true,
                    receiverId: true,
                },
            })
        );

        if (!message) {
            return { authorized: false, reason: 'Message not found' };
        }

        if (message.senderId !== userId && message.receiverId !== userId) {
            return { authorized: false, reason: 'Not authorized to access this message' };
        }

        return { authorized: true };
    } catch (error) {
        console.error('[Auth] Error validating message access:', error);
        return { authorized: false, reason: 'Authorization check failed' };
    }
}

/**
 * Helper to extract and validate context from socket event data
 */
export function extractAuthContext(socket: Socket, data: Record<string, any>): AuthContext {
    return {
        userId: (socket.data as ScopeAuthData).userId,
        workspaceId: (socket.data as ScopeAuthData).workspaceId || data?.workspaceId || null,
        projectId: data?.projectId,
        teamId: data?.teamId,
    };
}
