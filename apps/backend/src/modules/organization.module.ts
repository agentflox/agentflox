import { Module } from '@nestjs/common';
import { OrganizationController } from '../controllers/organization.controller';
import { OrganizationService } from '../services/organization/organizationService';

@Module({
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService]
})
export class OrganizationModule { }
