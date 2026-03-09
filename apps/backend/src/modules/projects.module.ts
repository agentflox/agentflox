import { Module } from '@nestjs/common';
import { ProjectsController } from '@/controllers/projects.controller';

@Module({
    controllers: [ProjectsController],
    providers: [],
})
export class ProjectsModule { }
