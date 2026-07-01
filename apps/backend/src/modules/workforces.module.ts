import { Module } from '@nestjs/common';
import { WorkforcesController } from '../controllers/workforces.controller';

@Module({
  controllers: [WorkforcesController],
})
export class WorkforcesModule {}
