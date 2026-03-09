import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { Capability, ROLE_CAPABILITIES } from './capabilities.constant';

@Injectable()
export class PermissionService {
    constructor() { }

    /**
     * Check if a user has a specific capability within a context
     */
    async checkCapability(
        userId: string,
        capability: Capability,
        context?: {
            organizationId?: string,
            workspaceId?: string,
            projectId?: string
        }
    ): Promise<boolean> {
        // 1. Get User Roles
        const roles = await this.getUserRoles(userId, context);

        // 2. Resolve Capabilities
        const userCapabilities = this.resolveCapabilities(roles);

        // 3. Check for Capability
        return userCapabilities.has(capability);
    }

    /**
     * Resolve all capabilities for a set of roles
     */
    private resolveCapabilities(roles: string[]): Set<Capability> {
        const capabilities = new Set<Capability>();

        for (const role of roles) {
            const roleCaps = ROLE_CAPABILITIES[role] || [];
            roleCaps.forEach(cap => capabilities.add(cap));
        }

        return capabilities;
    }

    /**
     * Fetch active roles for the user in the given context
     */
    private async getUserRoles(
        userId: string,
        context?: { organizationId?: string, workspaceId?: string, projectId?: string }
    ): Promise<string[]> {
        const roles: string[] = [];

        // Global User Type (e.g. Platform Admin)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { userType: true }
        });

        if (user?.userType === 'ADMIN') {
            roles.push('SUPER_ADMIN');
        }

        if (context?.organizationId) {
            const orgMember = await prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: {
                        organizationId: context.organizationId,
                        userId
                    }
                }
            });
            if (orgMember) {
                roles.push(orgMember.role);
            }
        }

        if (context?.workspaceId) {
            const workspaceMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: context.workspaceId,
                        userId
                    }
                }
            });
            if (workspaceMember) {
                roles.push(workspaceMember.role);
            }
        }

        // Default fallback could be guest if no context/role
        if (roles.length === 0) {
            roles.push('GUEST');
        }

        return roles;
    }
}
