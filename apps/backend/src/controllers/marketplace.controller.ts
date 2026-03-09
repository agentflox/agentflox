import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { marketplaceService } from '@/services/marketplace/marketplaceService';
import { z } from 'zod';

@Controller('v1/marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {

    @Get('services')
    async getServices(@Res() res: ExpressResponse) {
        const services = marketplaceService.getServices();
        return res.json(services);
    }

    @Post('orders')
    async placeOrder(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        try {
            const schema = z.object({
                projectId: z.string().min(1),
                serviceId: z.string().min(1)
            });
            const body = schema.parse(req.body);
            const userId = req.userId!;

            const result = await marketplaceService.placeOrder(userId, body.projectId, body.serviceId);
            return res.json(result);

        } catch (error) {
            console.error('Marketplace Order Error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Invalid request', details: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
        }
    }
}
