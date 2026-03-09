import { Controller, Get, Post, Param, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { governanceService } from '@/services/governance/governanceService';
import { z } from 'zod';

@Controller('v1/governance')
@UseGuards(JwtAuthGuard)
export class GovernanceController {

    @Get('projects/:projectId/captable')
    async getCapTable(@Param('projectId') projectId: string, @Res() res: ExpressResponse) {
        const table = await governanceService.getCapTable(projectId);
        return res.json(table);
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

            const doc = await governanceService.generateSAFE(projectId, userId, body.type, body.cap, body.discount);
            return res.json(doc);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }

    @Post('projects/:projectId/updates/draft')
    async draftUpdate(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const userId = req.userId!;
            const update = await governanceService.draftInvestorUpdate(projectId, userId);
            return res.json(update);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: 'Failed' });
        }
    }
}
