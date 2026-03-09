import { Module } from '@nestjs/common';
import { CommandController } from '../controllers/command.controller';
import { CommandService } from '../services/command/command.service';
import { ModelService } from '../services/ai/model.service';

@Module({
    controllers: [CommandController],
    providers: [CommandService, ModelService],
    exports: [CommandService],
})
export class CommandModule { }
