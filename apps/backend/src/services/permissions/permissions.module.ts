import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionsController } from '../../controllers/permissions.controller';
import { InvitationController } from '../../controllers/invitation.controller';

@Global()
@Module({
    controllers: [PermissionsController, InvitationController],
    providers: [PermissionService],
    exports: [PermissionService],
})
export class PermissionsModule { }
