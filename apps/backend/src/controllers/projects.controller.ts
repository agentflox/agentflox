import { Controller, Post, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { projectSchedulerService } from '@/services/projects/projectSchedulerService';

@Controller('v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {

    @Post(':projectId/auto-schedule')
    async autoSchedule(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const userId = req.userId!;
            const result = await projectSchedulerService.autoSchedule(projectId, userId);
            return res.json(result);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }
}
