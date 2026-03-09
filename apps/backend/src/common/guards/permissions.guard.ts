import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionService } from '@/services/permissions/permission.service';
import { Capability } from '@/services/permissions/capabilities.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionService: PermissionService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<Capability[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true;
        }

        const { user, params, query, body } = context.switchToHttp().getRequest();

        if (!user) {
            // Assume AuthGuard has already run, but if not:
            return false;
        }

        // Attempt to infer context from request params/body
        // This is a naive inference and might need to be more robust or configured per route
        const requestContext = {
            organizationId: params.organizationId || query.organizationId || body.organizationId,
            workspaceId: params.workspaceId || query.workspaceId || body.workspaceId,
            projectId: params.projectId || query.projectId || body.projectId,
        };

        for (const permission of requiredPermissions) {
            const hasPermission = await this.permissionService.checkCapability(
                user.id,
                permission,
                requestContext
            );

            if (!hasPermission) {
                throw new ForbiddenException(`Missing required permission: ${permission}`);
            }
        }

        return true;
    }
}
