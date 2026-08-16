import { Controller, Post, Body, Param, Req, Res, UseGuards, Headers } from '@nestjs/common';
import type { Request, Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { syncOAuthAccountsToVault } from '@/modules/integrations/oauth/connectSync';
import { syncToolsToDatabase } from '@/services/agents/registry/sync';
import { handleInboundWebhook } from '@/modules/workforce/integrations/triggerDispatcher';

@Controller('v1/integrations')
export class IntegrationsController {
  @Post('sync-vault')
  @UseGuards(JwtAuthGuard)
  async syncVault(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const synced = await syncOAuthAccountsToVault(req.userId!);
      return res.json({ success: true, synced });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Vault sync failed',
      });
    }
  }

  @Post('webhooks/inbound/:workspaceId')
  async inboundWebhook(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Headers('x-webhook-secret') headerSecret: string | undefined,
    @Res() res: ExpressResponse,
  ) {
    try {
      const schema = z.object({
        secret: z.string().min(8).optional(),
        payload: z.record(z.unknown()).default({}),
      });
      const parsed = schema.parse(body ?? {});
      const secret = parsed.secret || String(headerSecret ?? '');
      if (!secret || secret.length < 8) {
        return res.status(401).json({ error: 'Webhook secret required (body.secret or x-webhook-secret header)' });
      }

      const result = await handleInboundWebhook({
        workspaceId,
        secret,
        payload: parsed.payload,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid webhook payload', details: error.errors });
      }
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Webhook dispatch failed',
      });
    }
  }
}

@Controller('api')
export class SystemToolsController {
  @Post('sync-tools')
  @UseGuards(JwtAuthGuard)
  async syncTools(@Res() res: ExpressResponse) {
    try {
      await syncToolsToDatabase();
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Tool sync failed',
      });
    }
  }
}
