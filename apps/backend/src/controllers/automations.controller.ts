import { Body, Controller, Headers, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { emitTaskEvent } from '../services/automations/emit';
import { prisma } from '@/lib/prisma';
import { verifyWebhookRequest } from '../services/automations/webhook';
import { createCascadeContext } from '../services/automations/cascade';
import { inngest } from '@/lib/inngest';

@Controller('v1/automations')
export class AutomationsController {
  @Post('events')
  async emitEvent(@Body() body: any, @Res() res: Response) {
    try {
      const result = await emitTaskEvent(body.event, body.cascade);
      return res.status(202).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'emit_failed' });
    }
  }

  @Post('webhooks/:automationId')
  async inboundWebhook(
    @Param('automationId') automationId: string,
    @Headers('x-automation-signature') signature: string,
    @Headers('x-automation-timestamp') timestamp: string,
    @Headers('x-automation-nonce') nonce: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { id: true, webhookSecret: true, workspaceId: true, isActive: true },
    });
    if (!automation?.webhookSecret || !automation.isActive) {
      return res.status(404).json({ error: 'not_found' });
    }
    const raw = typeof (req as any).rawBody === 'string'
      ? (req as any).rawBody
      : JSON.stringify(req.body ?? {});
    const verified = verifyWebhookRequest({
      secret: automation.webhookSecret,
      signature,
      timestamp,
      nonce,
      body: raw,
    });
    if (!verified.ok) {
      return res.status(401).json({ error: verified.reason });
    }
    await inngest.send({
      name: 'automation/task.event',
      data: {
        event: {
          type: 'WEBHOOK',
          taskId: (req.body && req.body.taskId) || `webhook:${automationId}`,
          workspaceId: automation.workspaceId,
        },
        cascade: createCascadeContext({ source: 'webhook' }),
      },
    });
    return res.status(202).json({ ok: true });
  }
}
