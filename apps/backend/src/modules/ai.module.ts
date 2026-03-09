import { Module } from '@nestjs/common';
import { AiController } from '../controllers/ai.controller';

@Module({
    controllers: [AiController],
    providers: [],
})
export class AiModule { }
