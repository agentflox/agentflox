import { Module } from '@nestjs/common';
import { GovernanceController } from '@/controllers/governance.controller';

@Module({
    controllers: [GovernanceController],
    providers: [],
})
export class GovernanceModule { }
