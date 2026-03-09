import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrganizationService } from '../services/organization/organizationService';
import { JwtAuthGuard } from '../middleware/httpAuth';
import { z } from 'zod';

const CreateOrgSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    domain: z.string().optional()
});

const CreateDeptSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    color: z.string().optional(),
    headId: z.string().optional()
});

@Controller('v1/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) { }

    @Get()
    async getUserOrganizations(@Request() req) {
        return this.organizationService.getUserOrganizations(req.user.id);
    }

    @Post()
    async createOrganization(@Request() req, @Body() body: unknown) {
        const data = CreateOrgSchema.parse(body);
        return this.organizationService.createOrganization(req.user.id, data);
    }

    @Get(':id')
    async getOrganization(@Param('id') id: string) {
        return this.organizationService.getOrganization(id);
    }

    @Get(':id/departments')
    async getDepartments(@Param('id') id: string) {
        return this.organizationService.getDepartments(id);
    }

    @Post(':id/departments')
    async createDepartment(@Param('id') id: string, @Body() body: unknown) {
        const data = CreateDeptSchema.parse(body);
        return this.organizationService.createDepartment(id, data);
    }

    @Post(':id/link/workspace/:workspaceId')
    async linkWorkspace(@Param('id') orgId: string, @Param('workspaceId') workspaceId: string) {
        return this.organizationService.linkWorkspaceToOrganization(workspaceId, orgId);
    }

    @Post(':id/link/project/:projectId')
    async linkProject(
        @Param('id') orgId: string,
        @Param('projectId') projectId: string,
        @Body() body: { departmentId?: string }
    ) {
        return this.organizationService.linkProjectToOrganization(projectId, orgId, body.departmentId);
    }

    @Post(':id/link/team/:teamId')
    async linkTeam(
        @Param('id') orgId: string,
        @Param('teamId') teamId: string,
        @Body() body: { departmentId?: string }
    ) {
        return this.organizationService.linkTeamToOrganization(teamId, orgId, body.departmentId);
    }

    @Post(':id/link/agent/:agentId')
    async linkAgent(
        @Param('id') orgId: string,
        @Param('agentId') agentId: string,
        @Body() body: { departmentId?: string }
    ) {
        return this.organizationService.linkAgentToOrganization(agentId, orgId, body.departmentId);
    }
}
