import { Module } from '@nestjs/common';
import { MatchingController } from '../controllers/matching.controller';

@Module({
  controllers: [MatchingController],
})
export class MatchingModule {}


