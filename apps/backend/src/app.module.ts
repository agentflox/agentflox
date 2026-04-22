import { Module } from '@nestjs/common';
import { PermissionsModule } from './services/permissions/permissions.module';
import { AgentsModule } from './modules/agents.module';
import { AnalyticsModule } from './modules/analytics.module';
import { SystemModule } from './modules/system.module';
import { ChatModule } from './modules/chat.module';
import { MarketplaceModule } from './modules/marketplace.module';
import { GovernanceModule } from './modules/governance.module';
import { ProjectsModule } from './modules/projects.module';
import { OrganizationModule } from './modules/organization.module';
import { BillingModule } from './modules/billing.module';
import { CommandModule } from './modules/command.module';
import { AiModule } from './modules/ai.module';
import { SupportModule } from './modules/support.module';

@Module({
  imports: [
    PermissionsModule,
    SystemModule,
    AnalyticsModule,
    AgentsModule,
    ChatModule,
    MarketplaceModule,
    GovernanceModule,
    ProjectsModule,
    OrganizationModule,
    BillingModule,
    CommandModule,
    AiModule,
    SupportModule
  ],
})
export class AppModule { }


