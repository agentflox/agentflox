import { Module } from '@nestjs/common';
import { AutomationsController } from '../controllers/automations.controller';

@Module({
  controllers: [AutomationsController],
})
export class AutomationsModule {}
