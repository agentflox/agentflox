import { Controller, Get, Post, Param, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { governanceService } from '@/services/governance/governanceService';
import { assertProjectAccessForUser } from '@/utils/socket/granularAuth';
import { z } from 'zod';

@Controller('v1/governance')
@UseGuards(JwtAuthGuard)
export class GovernanceController {

    @Get('projects/:projectId/captable')
    async getCapTable(
        @Param('projectId') projectId: string,
        @Req() req: AuthenticatedRequest,
        @Res() res: ExpressResponse,
    ) {
        try {
            await assertProjectAccessForUser(req.userId!, projectId);
            const table = await governanceService.getCapTable(projectId);
            return res.json(table);
        } catch (e: any) {
            if (e?.message?.includes('access') || e?.message?.includes('not found')) {
                return res.status(403).json({ error: e.message });
            }
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }

    @Post('projects/:projectId/safe')
    async generateSAFE(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const schema = z.object({
                type: z.enum(['VALUATION_CAP', 'DISCOUNT']),
                cap: z.number().optional(),
                discount: z.number().optional()
            });
            const body = schema.parse(req.body);
            const userId = req.userId!;

            await assertProjectAccessForUser(userId, projectId);
            const doc = await governanceService.generateSAFE(projectId, userId, body.type, body.cap, body.discount);
            return res.json(doc);
        } catch (e: any) {
            if (e?.message?.includes('access') || e?.message?.includes('not found')) {
                return res.status(403).json({ error: e.message || 'Access denied' });
            }
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }

    @Post('projects/:projectId/updates/draft')
    async draftUpdate(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const userId = req.userId!;
            await assertProjectAccessForUser(userId, projectId);
            const update = await governanceService.draftInvestorUpdate(projectId, userId);
            return res.json(update);
        } catch (e: any) {
            if (e?.message?.includes('access') || e?.message?.includes('not found')) {
                return res.status(403).json({ error: e.message });
            }
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }
}
