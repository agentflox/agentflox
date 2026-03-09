import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

@Injectable()
export class OrganizationService {
    private logger = new Logger(OrganizationService.name);

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

    async getOrganization(id: string) {
        return prisma.organization.findUnique({
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
    }

    async createDepartment(organizationId: string, data: { name: string; description?: string; color?: string; headId?: string }) {
        return prisma.department.create({
            data: {
                ...data,
                organizationId
            }
        });
    }

    async getDepartments(organizationId: string) {
        return prisma.department.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { teams: true, projects: true, aiAgents: true }
                }
            }
        });
    }

    async linkWorkspaceToOrganization(workspaceId: string, organizationId: string) {
        return prisma.workspace.update({
            where: { id: workspaceId },
            data: { organizationId }
        });
    }

    async linkProjectToOrganization(projectId: string, organizationId: string, departmentId?: string) {
        return prisma.project.update({
            where: { id: projectId },
            data: {
                organizationId,
                departmentId: departmentId || undefined
            }
        });
    }

    async linkTeamToOrganization(teamId: string, organizationId: string, departmentId?: string) {
        return prisma.team.update({
            where: { id: teamId },
            data: {
                organizationId,
                departmentId: departmentId || undefined
            }
        });
    }

    async linkAgentToOrganization(agentId: string, organizationId: string, departmentId?: string) {
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
