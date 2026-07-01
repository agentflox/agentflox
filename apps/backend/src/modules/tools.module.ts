import { Module } from '@nestjs/common';
import { ToolsController } from '../controllers/tools.controller';

@Module({
  controllers: [ToolsController],
})
export class ToolsModule {}
