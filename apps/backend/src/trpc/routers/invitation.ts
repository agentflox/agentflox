/**
 * Invitation tRPC Router
 * Handles member and guest invitations
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { PermissionLevel, WorkspaceRole } from '@agentflox/database/src/generated/prisma';
import { prisma } from '@agentflox/database';
import { TRPCError } from '@trpc/server';
import { permissionResolver } from '../../lib/permissions';
import { randomBytes } from 'crypto';

const itemTypeSchema = z.enum(['space', 'folder', 'list', 'task', 'project', 'team']);
const permissionLevelSchema = z.nativeEnum(PermissionLevel);
const workspaceRoleSchema = z.nativeEnum(WorkspaceRole);

/**
 * Generate secure invitation token
 */
function generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Get expiry date for invitation
 */
function getExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export const invitationRouter = router({
    /**
     * Invite member to workspace
     */
    inviteMember: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
                email: z.string().email(),
                role: workspaceRoleSchema,
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if inviter has permission to invite members
            const workspace = await prisma.workspace.findUnique({
                where: { id: input.workspaceId },
                include: {
                    members: {
                        where: { userId: ctx.user.id },
                    },
                },
            });

            if (!workspace) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Workspace not found',
                });
            }

            const inviterMember = workspace.members[0];
            if (!inviterMember) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You are not a member of this workspace',
                });
            }

            // Check if inviter can invite (Owners, Admins, Members can invite)
            if (
                inviterMember.role !== WorkspaceRole.OWNER &&
                inviterMember.role !== WorkspaceRole.ADMIN &&
                inviterMember.role !== WorkspaceRole.MEMBER
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to invite members',
                });
            }

            // Check if user is already a member
            const existingMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: input.workspaceId,
                        userId: input.email, // This should be looked up by email first
                    },
                },
            });

            // Create invitation
            const invitation = await prisma.permissionInvitation.create({
                data: {
                    workspaceId: input.workspaceId,
                    email: input.email,
                    inviteType: 'member',
                    role: input.role,
                    token: generateInvitationToken(),
                    expiresAt: getExpiryDate(7), // 7 days for member invitations
                },
            });

            // TODO: Send invitation email

            return {
                invitationId: invitation.id,
                token: invitation.token,
                expiresAt: invitation.expiresAt,
            };
        }),

    /**
     * Invite guest to specific item
     */
    inviteGuest: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
                email: z.string().email(),
                targetType: itemTypeSchema,
                targetId: z.string(),
                permission: permissionLevelSchema,
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Guests cannot be invited to Spaces
            if (input.targetType === 'space') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Guests cannot be invited to Spaces',
                });
            }

            // Check if inviter has access to the target
            const inviterPermission = await permissionResolver.resolvePermission(
                ctx.user.id,
                input.targetType,
                input.targetId
            );

            if (!inviterPermission || inviterPermission !== PermissionLevel.FULL) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to invite guests to this item',
                });
            }

            // Create guest invitation
            const invitation = await prisma.permissionInvitation.create({
                data: {
                    workspaceId: input.workspaceId,
                    email: input.email,
                    inviteType: 'guest',
                    targetType: input.targetType,
                    targetId: input.targetId,
                    permission: input.permission,
                    token: generateInvitationToken(),
                    expiresAt: getExpiryDate(30), // 30 days for guest invitations
                },
            });

            // TODO: Send invitation email

            return {
                invitationId: invitation.id,
                token: invitation.token,
                expiresAt: invitation.expiresAt,
            };
        }),

    /**
     * Accept invitation
     */
    acceptInvitation: protectedProcedure
        .input(
            z.object({
                token: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const invitation = await prisma.permissionInvitation.findUnique({
                where: { token: input.token },
            });

            if (!invitation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invitation not found',
                });
            }

            if (invitation.status !== 'pending') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation has already been used or cancelled',
                });
            }

            if (new Date() > invitation.expiresAt) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation has expired',
                });
            }

            // Process invitation based on type
            if (invitation.inviteType === 'member') {
                // Add as workspace member
                await prisma.workspaceMember.upsert({
                    where: {
                        workspaceId_userId: {
                            workspaceId: invitation.workspaceId,
                            userId: ctx.user.id,
                        },
                    },
                    create: {
                        workspaceId: invitation.workspaceId,
                        userId: ctx.user.id,
                        role: invitation.role!,
                    },
                    update: {
                        role: invitation.role!,
                    },
                });
            } else if (invitation.inviteType === 'guest') {
                // Add as workspace guest
                await prisma.workspaceGuest.upsert({
                    where: {
                        workspaceId_userId: {
                            workspaceId: invitation.workspaceId,
                            userId: ctx.user.id,
                        },
                    },
                    create: {
                        workspaceId: invitation.workspaceId,
                        userId: ctx.user.id,
                        guestType: 'PERMISSION_CONTROLLED',
                        invitedById: ctx.user.id, // Should track the actual inviter
                    },
                    update: {},
                });

                // Grant permission to the target item
                if (invitation.targetType === 'task') {
                    await prisma.taskPermission.create({
                        data: {
                            taskId: invitation.targetId!,
                            userId: ctx.user.id,
                            permission: invitation.permission!,
                            grantedById: ctx.user.id,
                        },
                    });
                } else {
                    await prisma.locationPermission.create({
                        data: {
                            locationType: invitation.targetType!,
                            locationId: invitation.targetId!,
                            userId: ctx.user.id,
                            permission: invitation.permission!,
                            grantedById: ctx.user.id,
                        },
                    });
                }
            }

            // Mark invitation as accepted
            await prisma.permissionInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'accepted',
                    acceptedAt: new Date(),
                },
            });

            return { success: true, workspaceId: invitation.workspaceId };
        }),

    /**
     * Resend invitation
     */
    resendInvitation: protectedProcedure
        .input(
            z.object({
                invitationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const invitation = await prisma.permissionInvitation.findUnique({
                where: { id: input.invitationId },
            });

            if (!invitation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invitation not found',
                });
            }

            // Extend expiration
            await prisma.permissionInvitation.update({
                where: { id: input.invitationId },
                data: {
                    expiresAt: getExpiryDate(invitation.inviteType === 'member' ? 7 : 30),
                },
            });

            // TODO: Resend invitation email

            return { success: true };
        }),

    /**
     * Cancel invitation
     */
    cancelInvitation: protectedProcedure
        .input(
            z.object({
                invitationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await prisma.permissionInvitation.update({
                where: { id: input.invitationId },
                data: { status: 'cancelled' },
            });

            return { success: true };
        }),

    /**
     * List pending invitations for a workspace
     */
    listInvitations: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const invitations = await prisma.permissionInvitation.findMany({
                where: {
                    workspaceId: input.workspaceId,
                    status: 'pending',
                },
                orderBy: { createdAt: 'desc' },
            });

            return invitations;
        }),
});
