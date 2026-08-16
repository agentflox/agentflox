import { Module } from '@nestjs/common';
import { IntegrationsController, SystemToolsController } from '../controllers/integrations.controller';

@Module({
  controllers: [IntegrationsController, SystemToolsController],
})
export class IntegrationsModule {}
