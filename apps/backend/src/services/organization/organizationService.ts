import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

@Injectable()
export class OrganizationService {
    private logger = new Logger(OrganizationService.name);

    async assertOrgMember(organizationId: string, userId: string): Promise<void> {
        const org = await prisma.organization.findFirst({
            where: {
                id: organizationId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });
        if (!org) {
            throw new ForbiddenException('Access denied');
        }
    }

    private async assertWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
        const workspace = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });
        if (!workspace) {
            throw new ForbiddenException('Access denied to workspace');
        }
    }

    private async assertProjectAccess(projectId: string, userId: string): Promise<void> {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId, status: 'ACTIVE' } } },
                ],
            },
            select: { id: true },
        });
        if (!project) {
            throw new ForbiddenException('Access denied to project');
        }
    }

    private async assertTeamAccess(teamId: string, userId: string): Promise<void> {
        const team = await prisma.team.findFirst({
            where: {
                id: teamId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });
        if (!team) {
            throw new ForbiddenException('Access denied to team');
        }
    }

    private async assertAgentAccess(agentId: string, userId: string): Promise<void> {
        const agent = await prisma.aiAgent.findFirst({
            where: {
                id: agentId,
                OR: [
                    { createdBy: userId },
                    { workspace: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } },
                ],
            },
            select: { id: true },
        });
        if (!agent) {
            throw new ForbiddenException('Access denied to agent');
        }
    }

    async createOrganization(userId: string, data: { name: string; slug: string; domain?: string }) {
        return prisma.organization.create({
            data: {
                ...data,
                ownerId: userId,
                members: {
                    create: { userId, role: 'OWNER' }
                }
            }
        });
    }

    async getUserOrganizations(userId: string) {
        return prisma.organization.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                departments: true,
                workspaces: true,
                _count: {
                    select: { members: true, projects: true }
                }
            }
        });
    }

    async getOrganization(id: string, userId: string) {
        await this.assertOrgMember(id, userId);
        const org = await prisma.organization.findUnique({
            where: { id },
            include: {
                departments: {
                    include: {
                        _count: { select: { teams: true, projects: true } }
                    }
                },
                workspaces: true,
                owner: { select: { id: true, name: true, email: true, avatar: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatar: true } }
                    }
                }
            }
        });
        if (!org) {
            throw new NotFoundException('Organization not found');
        }
        return org;
    }

    async createDepartment(organizationId: string, userId: string, data: { name: string; description?: string; color?: string; headId?: string }) {
        await this.assertOrgMember(organizationId, userId);
        return prisma.department.create({
            data: {
                ...data,
                organizationId
            }
        });
    }

    async getDepartments(organizationId: string, userId: string) {
        await this.assertOrgMember(organizationId, userId);
        return prisma.department.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { teams: true, projects: true, aiAgents: true }
                }
            }
        });
    }

    async linkWorkspaceToOrganization(workspaceId: string, organizationId: string, userId: string) {
        await this.assertOrgMember(organizationId, userId);
        await this.assertWorkspaceAccess(workspaceId, userId);
        return prisma.workspace.update({
            where: { id: workspaceId },
            data: { organizationId }
        });
    }

    async linkProjectToOrganization(projectId: string, organizationId: string, userId: string, departmentId?: string) {
        await this.assertOrgMember(organizationId, userId);
        await this.assertProjectAccess(projectId, userId);
        return prisma.project.update({
            where: { id: projectId },
            data: {
                organizationId,
                departmentId: departmentId || undefined
            }
        });
    }

    async linkTeamToOrganization(teamId: string, organizationId: string, userId: string, departmentId?: string) {
        await this.assertOrgMember(organizationId, userId);
        await this.assertTeamAccess(teamId, userId);
        return prisma.team.update({
            where: { id: teamId },
            data: {
                organizationId,
                departmentId: departmentId || undefined
            }
        });
    }

    async linkAgentToOrganization(agentId: string, organizationId: string, userId: string, departmentId?: string) {
        await this.assertOrgMember(organizationId, userId);
        await this.assertAgentAccess(agentId, userId);
        return prisma.aiAgent.update({
            where: { id: agentId },
            data: {
                organizationId,
                departmentId: departmentId || undefined
            }
        });
    }
}

export const organizationService = new OrganizationService();
