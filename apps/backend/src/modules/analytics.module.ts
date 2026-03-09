import { Module } from '@nestjs/common';
import { AnalyticsController } from '../controllers/analytics.controller';

@Module({
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}


