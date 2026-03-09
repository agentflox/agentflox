/**
 * Invitation Controller
 * REST API endpoints for invitation management
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { notificationService } from '../services/notification/notificationService';
import { randomBytes } from 'crypto';
import { PermissionLevel, WorkspaceRole } from '@agentflox/database/src/generated/prisma';
import { permissionResolver } from '../lib/permissions';
import { JwtAuthGuard, AuthenticatedRequest } from '@/middleware/httpAuth';
import emailService from '@/utils/email/emailService';
import InvitationEmailTemplates from '@/utils/email/templates/invitation.template';

function generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
}

function getExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

@Controller('api/invitations')
export class InvitationController {

    /**
     * Invite member to workspace
     */
    @Post('member')
    @UseGuards(JwtAuthGuard)
    async inviteMember(
        @Body() body: { workspaceId: string; email: string; role: WorkspaceRole },
        @Request() req: AuthenticatedRequest
    ) {
        // Enforce authentication
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // 1. Verify Inviter Permissions
        // Enterprise Grade: Check if inviter is OWNER, ADMIN, or has specific 'canInvite' permission
        const member = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: body.workspaceId,
                    userId: userId
                }
            }
        });

        if (!member) {
            throw new Error('You are not a member of this workspace');
        }

        const canInvite =
            member.role === WorkspaceRole.OWNER ||
            member.role === WorkspaceRole.ADMIN ||
            member.canInvite;

        if (!canInvite) {
            throw new Error('You do not have permission to invite members to this workspace');
        }

        // 2. Check if user is already a member
        const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
        if (existingUser) {
            const existingMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: body.workspaceId,
                        userId: existingUser.id
                    }
                }
            });
            if (existingMember) {
                throw new Error('User is already a member of this workspace');
            }
        }

        // 3. Fetch workspace name for better notifications
        const workspace = await prisma.workspace.findUnique({
            where: { id: body.workspaceId },
            select: { name: true }
        });

        // 4. Handle Duplicate/Collision Logic
        let invitation = await prisma.permissionInvitation.findFirst({
            where: {
                workspaceId: body.workspaceId,
                email: body.email,
                inviteType: 'member',
                status: 'pending'
            }
        });

        let token: string;

        if (invitation) {
            // Collision found
            // Enterprise Grade: "Idempotent" vs "Supersede" Logic
            if (invitation.role === body.role) {
                // Idempotent: same role, just extend expiry and resend
                // This prevents spamming DB with duplicates for retries
                token = invitation.token;
                invitation = await prisma.permissionInvitation.update({
                    where: { id: invitation.id },
                    data: { expiresAt: getExpiryDate(7) }
                });
            } else {
                // Supersede: different role (upgrade/downgrade), cancel old and create new
                // Strict "One Pending Invite Per Workspace" rule
                await prisma.permissionInvitation.update({
                    where: { id: invitation.id },
                    data: {
                        status: 'cancelled',
                        cancelledById: userId,
                        cancelledAt: new Date(),
                        metadata: { ...(invitation.metadata as any || {}), reason: 'superseded' }
                    }
                });

                token = generateInvitationToken();
                invitation = await prisma.permissionInvitation.create({
                    data: {
                        workspaceId: body.workspaceId,
                        email: body.email,
                        invitedById: userId,
                        invitedUserId: existingUser?.id,
                        inviteType: 'member',
                        role: body.role, // Handles MEMBER, LIMITED_MEMBER, ADMIN, etc.
                        token: token,
                        expiresAt: getExpiryDate(7),
                    },
                });
            }
        } else {
            // No collision, create new
            token = generateInvitationToken();
            invitation = await prisma.permissionInvitation.create({
                data: {
                    workspaceId: body.workspaceId,
                    email: body.email,
                    invitedById: userId,
                    invitedUserId: existingUser?.id,
                    inviteType: 'member',
                    role: body.role,
                    token: token,
                    expiresAt: getExpiryDate(7),
                },
            });
        }

        // 5. Send Notification (only if recipient user exists)
        if (existingUser) {
            await notificationService.sendInvitationNotification({
                recipientId: existingUser.id, // User ID, not email!
                inviterId: userId,
                itemType: 'workspace',
                itemId: body.workspaceId,
                role: body.role,
                itemName: workspace?.name || 'Workspace',
            });
        }

        // 6. Send Email Invitation (ALWAYS send to email address)
        try {
            const inviterUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true, firstName: true, lastName: true }
            });

            const inviterName = inviterUser?.name ||
                (inviterUser?.firstName && inviterUser?.lastName
                    ? `${inviterUser.firstName} ${inviterUser.lastName}`
                    : inviterUser?.email) || 'Someone';

            const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;

            const emailTemplate = InvitationEmailTemplates.getWorkspaceMemberInvite(
                {
                    recipientName: existingUser?.name || undefined,
                    inviterName,
                    workspaceName: workspace?.name,
                    role: body.role,
                    invitationUrl,
                    expiresAt: invitation.expiresAt
                },
                {
                    brandColor: '#346df1',
                    buttonText: '#ffffff',
                    backgroundColor: '#f9f9f9',
                    textColor: '#444444',
                    headerColor: '#000000'
                }
            );

            await emailService.sendNodemailerEmail(
                body.email,
                emailTemplate.subject,
                emailTemplate.html,
                emailTemplate.text
            );

            console.log(`✅ Invitation email sent to ${body.email}`);
        } catch (emailError) {
            console.error('❌ Failed to send invitation email:', emailError);
            // Don't fail the entire invitation if email fails
            // The invitation is still created and in-app notification still sent
        }

        return { success: true, invitationId: invitation.id, token };
    }

    /**
     * Invite guest to item (Space, Project, Task, etc.)
     */
    @Post('guest')
    @UseGuards(JwtAuthGuard)
    async inviteGuest(
        @Body() body: {
            workspaceId: string;
            email: string;
            targetType: string;
            targetId: string;
            permission: PermissionLevel
        },
        @Request() req: AuthenticatedRequest
    ) {
        const userId = req.userId;
        if (!userId) throw new Error('Unauthorized');

        // 1. Verify Inviter has FULL access to the target item
        // Enterprise Grade: Using the unified PermissionResolver to check granular permissions
        const userPermission = await permissionResolver.resolvePermission(
            userId,
            body.targetType as any,
            body.targetId
        );

        if (userPermission !== PermissionLevel.FULL) {
            throw new Error('You need FULL permission on the item to invite guests');
        }

        // 2. Check if recipient user exists
        const recipientUser = await prisma.user.findUnique({ where: { email: body.email } });

        // 3. Handle Duplicate/Collision Logic
        let invitation = await prisma.permissionInvitation.findFirst({
            where: {
                targetType: body.targetType,
                targetId: body.targetId,
                email: body.email,
                inviteType: 'guest',
                status: 'pending'
            }
        });

        let token: string;

        if (invitation) {
            // Collision found
            if (invitation.permission === body.permission) {
                // Idempotent behavior
                token = invitation.token;
                invitation = await prisma.permissionInvitation.update({
                    where: { id: invitation.id },
                    data: { expiresAt: getExpiryDate(30) }
                });
            } else {
                // Supersede
                await prisma.permissionInvitation.update({
                    where: { id: invitation.id },
                    data: {
                        status: 'cancelled',
                        cancelledById: userId,
                        cancelledAt: new Date(),
                        metadata: { ...(invitation.metadata as any || {}), reason: 'superseded' }
                    }
                });

                token = generateInvitationToken();
                invitation = await prisma.permissionInvitation.create({
                    data: {
                        workspaceId: body.workspaceId,
                        email: body.email,
                        invitedById: userId,
                        invitedUserId: recipientUser?.id,
                        inviteType: 'guest',
                        targetType: body.targetType,
                        targetId: body.targetId,
                        permission: body.permission,
                        token: token,
                        expiresAt: getExpiryDate(30),
                    },
                });
            }
        } else {
            // Create New
            token = generateInvitationToken();
            invitation = await prisma.permissionInvitation.create({
                data: {
                    workspaceId: body.workspaceId,
                    email: body.email,
                    invitedById: userId,
                    invitedUserId: recipientUser?.id,
                    inviteType: 'guest',
                    targetType: body.targetType,
                    targetId: body.targetId,
                    permission: body.permission,
                    token: token,
                    expiresAt: getExpiryDate(30),
                },
            });
        }

        // 4. Send Notification (only if recipient user exists)
        if (recipientUser) {
            await notificationService.sendInvitationNotification({
                recipientId: recipientUser.id, // User ID, not email!
                inviterId: userId,
                itemType: body.targetType,
                itemId: body.targetId,
                role: body.permission,
                itemName: body.targetType, // Could fetch actual name from DB
            });
        }

        // 5. Send Email Invitation (ALWAYS send to email address)
        try {
            const inviterUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, email: true, firstName: true, lastName: true }
            });

            const inviterName = inviterUser?.name ||
                (inviterUser?.firstName && inviterUser?.lastName
                    ? `${inviterUser.firstName} ${inviterUser.lastName}`
                    : inviterUser?.email) || 'Someone';

            const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;

            // Fetch item name for better email context
            let itemName = body.targetType;
            try {
                if (body.targetType === 'space') {
                    const space = await prisma.space.findUnique({ where: { id: body.targetId }, select: { name: true } });
                    itemName = space?.name || body.targetType;
                } else if (body.targetType === 'project') {
                    const project = await prisma.project.findUnique({ where: { id: body.targetId }, select: { name: true } });
                    itemName = project?.name || body.targetType;
                } else if (body.targetType === 'task') {
                    const task = await prisma.task.findUnique({ where: { id: body.targetId }, select: { title: true } });
                    itemName = task?.title || body.targetType;
                }
            } catch (e) {
                // If fetching fails, use targetType as fallback
            }

            const workspace = await prisma.workspace.findUnique({
                where: { id: body.workspaceId },
                select: { name: true }
            });

            const emailTemplate = InvitationEmailTemplates.getItemGuestInvite(
                {
                    recipientName: recipientUser?.name || undefined,
                    inviterName,
                    workspaceName: workspace?.name,
                    itemName,
                    itemType: body.targetType,
                    permission: body.permission,
                    invitationUrl,
                    expiresAt: invitation.expiresAt
                },
                {
                    brandColor: '#346df1',
                    buttonText: '#ffffff',
                    backgroundColor: '#f9f9f9',
                    textColor: '#444444',
                    headerColor: '#000000'
                }
            );

            await emailService.sendNodemailerEmail(
                body.email,
                emailTemplate.subject,
                emailTemplate.html,
                emailTemplate.text
            );

            console.log(`✅ Guest invitation email sent to ${body.email} for ${body.targetType}`);
        } catch (emailError) {
            console.error('❌ Failed to send guest invitation email:', emailError);
            // Don't fail the entire invitation if email fails
        }

        return { success: true, invitationId: invitation.id, token };
    }

    /**
     * List pending invitations (sent by user or for workspace)
     * This endpoint is used by RequestsView to show invitations RECEIVED by the user
     */
    @Get('pending')
    @UseGuards(JwtAuthGuard)
    async listPendingInvitations(@Request() req: AuthenticatedRequest) {
        const userEmail = req.email;
        if (!userEmail) return [];

        const invitations = await prisma.permissionInvitation.findMany({
            where: {
                email: userEmail,
                OR: [
                    { status: 'pending', expiresAt: { gt: new Date() } },
                    {
                        status: { in: ['accepted', 'cancelled', 'expired'] },
                        updatedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Show history for last 7 days
                    }
                ]
            },
            include: {
                workspace: { select: { name: true } },
                invitedBy: {
                    select: {
                        name: true,
                        email: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return invitations.map(inv => {
            // Robust sender name with fallback logic
            const senderName = inv.invitedBy.name ||
                inv.invitedBy.username ||
                (inv.invitedBy.firstName && inv.invitedBy.lastName
                    ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`
                    : null) ||
                inv.invitedBy.email;

            return {
                id: inv.id,
                token: inv.token,
                status: inv.status,
                type: 'invitation',
                title: `Invitation to ${inv.inviteType === 'member' ? inv.workspace?.name : ((inv.targetType || 'item') + (inv.workspace ? ' in ' + inv.workspace.name : ''))}`,
                description: `You have been invited to join as ${inv.role || inv.permission}`,
                sender: {
                    name: senderName,
                    email: inv.invitedBy.email
                },
                metadata: {
                    role: inv.role,
                    permission: inv.permission,
                    workspaceName: inv.workspace?.name,
                    inviteType: inv.inviteType,
                    targetType: inv.targetType
                },
                createdAt: inv.createdAt
            };
        });
    }

    /**
     * Accept invitation
     * Securely accepts an invitation via token.
     */
    @Post('accept')
    @UseGuards(JwtAuthGuard)
    async acceptInvitation(@Body() body: { token: string }, @Request() req: AuthenticatedRequest) {
        const userId = req.userId;
        const userEmail = req.email;
        if (!userId) throw new Error('Must be logged in to accept');

        // 1. Validate Token
        const invitation = await prisma.permissionInvitation.findUnique({
            where: { token: body.token }
        });

        if (!invitation) {
            throw new Error('Invalid invitation token');
        }

        if (invitation.status !== 'pending') {
            throw new Error('Invitation is no longer valid');
        }

        if (invitation.expiresAt < new Date()) {
            await prisma.permissionInvitation.update({
                where: { id: invitation.id },
                data: { status: 'expired' }
            });
            throw new Error('Invitation has expired');
        }

        // 2. Email Verification (Enterprise Security)
        // Ensure the current user matches the invited email
        if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new Error(`This invitation is for ${invitation.email}. You are logged in as ${userEmail}.`);
        }

        // 3. Process Acceptance
        await prisma.$transaction(async (tx) => {
            // Update status to prevent reuse
            await tx.permissionInvitation.update({
                where: { id: invitation.id },
                data: { status: 'accepted', acceptedAt: new Date() }
            });

            // Grant Access
            if (invitation.inviteType === 'member') {
                // Ensure workspace exists (handle optional workspaceId)
                if (!invitation.workspaceId) {
                    throw new Error('Workspace ID is required for member invitations');
                }

                // Check if already a member to avoid errors
                const existing = await tx.workspaceMember.findUnique({
                    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } }
                });

                if (!existing) {
                    await tx.workspaceMember.create({
                        data: {
                            workspaceId: invitation.workspaceId,
                            userId,
                            role: invitation.role || WorkspaceRole.MEMBER,
                        }
                    });
                }
            } else if (invitation.inviteType === 'guest') {
                const targetType = invitation.targetType;
                const targetId = invitation.targetId!;
                const permission = invitation.permission!;

                if (targetType === 'task') {
                    await tx.taskPermission.upsert({
                        where: { taskId_userId: { taskId: targetId, userId } },
                        create: {
                            taskId: targetId,
                            userId,
                            permission: permission,
                            grantedById: 'system',
                        },
                        update: { permission: permission }
                    });
                } else {
                    // Space, Project, Folder etc
                    await tx.locationPermission.upsert({
                        where: {
                            locationType_locationId_userId: {
                                locationType: targetType!,
                                locationId: targetId,
                                userId
                            }
                        },
                        create: {
                            locationType: targetType!,
                            locationId: targetId,
                            userId,
                            permission: permission,
                            grantedById: 'system',
                        },
                        update: { permission: permission }
                    });
                }

                // Ensure they are marked as a guest in the workspace (if workspace context exists)
                if (invitation.workspaceId) {
                    await tx.workspaceGuest.upsert({
                        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
                        create: {
                            workspaceId: invitation.workspaceId,
                            userId,
                            guestType: 'PERMISSION_CONTROLLED',
                            invitedById: invitation.invitedById // Use the actual inviter
                        },
                        update: {}
                    }).catch(() => { /* ignore */ });
                }
            }
        });

        return { success: true };
    }

    /**
     * Decline invitation
     * Allows a user to decline/reject an invitation they received
     */
    @Post('decline')
    @UseGuards(JwtAuthGuard)
    async declineInvitation(@Body() body: { token: string }, @Request() req: AuthenticatedRequest) {
        const userId = req.userId;
        const userEmail = req.email;
        if (!userId) throw new Error('Must be logged in to decline');

        // 1. Validate Token
        const invitation = await prisma.permissionInvitation.findUnique({
            where: { token: body.token }
        });

        if (!invitation) {
            throw new Error('Invalid invitation token');
        }

        if (invitation.status !== 'pending') {
            throw new Error('Invitation is no longer valid');
        }

        if (invitation.expiresAt < new Date()) {
            await prisma.permissionInvitation.update({
                where: { id: invitation.id },
                data: { status: 'expired' }
            });
            throw new Error('Invitation has expired');
        }

        // 2. Email Verification (Enterprise Security)
        // Ensure the current user matches the invited email
        if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new Error(`This invitation is for ${invitation.email}. You are logged in as ${userEmail}.`);
        }

        // 3. Update invitation status to cancelled
        await prisma.permissionInvitation.update({
            where: { id: invitation.id },
            data: {
                status: 'cancelled',
                cancelledById: userId,
                cancelledAt: new Date()
            }
        });

        return { success: true };
    }
}
