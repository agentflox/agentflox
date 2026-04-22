import { Module } from '@nestjs/common';
import { HealthController } from '../controllers/system.controller';

@Module({
  controllers: [HealthController],
})
export class SystemModule {}


