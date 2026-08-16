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
import { ToolsModule } from './modules/tools.module';
import { WorkforcesModule } from './modules/workforces.module';
import { PlatformHelpersModule } from './modules/platformHelpers.module';
import { IntegrationsModule } from './modules/integrations.module';

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
    SupportModule,
    ToolsModule,
    WorkforcesModule,
    PlatformHelpersModule,
    IntegrationsModule,
  ],
})
export class AppModule { }


