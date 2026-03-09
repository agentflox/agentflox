import { Module } from '@nestjs/common';
import { AgentsController } from '../controllers/agents.controller';

@Module({
  controllers: [AgentsController],
})
export class AgentsModule {}



