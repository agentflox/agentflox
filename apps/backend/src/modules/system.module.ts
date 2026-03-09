import { Module } from '@nestjs/common';
import { HealthController, NotificationsController } from '../controllers/system.controller';

@Module({
  controllers: [HealthController, NotificationsController],
})
export class SystemModule {}


