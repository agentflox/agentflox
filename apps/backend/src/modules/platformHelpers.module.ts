import { Module } from '@nestjs/common';
import { PlatformHelpersController } from '../services/platformHelpers/http/helpers.controller';

@Module({
  controllers: [PlatformHelpersController],
})
export class PlatformHelpersModule {}
