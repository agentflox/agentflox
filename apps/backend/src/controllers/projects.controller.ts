import { Controller, Post, Param, Req, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { projectSchedulerService } from '@/services/projects/projectSchedulerService';
import { assertProjectAccessForUser } from '@/utils/http/resourceAccess';

@Controller('v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {

    @Post(':projectId/auto-schedule')
    async autoSchedule(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const userId = req.userId!;
            await assertProjectAccessForUser(userId, projectId);
            const result = await projectSchedulerService.autoSchedule(projectId, userId);
            return res.json(result);
        } catch (e: any) {
            if (e?.message?.includes('access') || e?.message?.includes('not found')) {
                throw new ForbiddenException(e.message);
            }
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }
}
