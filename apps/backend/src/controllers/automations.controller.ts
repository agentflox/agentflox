import { Body, Controller, Headers, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { emitTaskEvent } from '../services/automations/emit';
import { prisma } from '@/lib/prisma';
import { verifyWebhookRequest } from '../services/automations/webhook';
import { createCascadeContext } from '../services/automations/cascade';
import { inngest } from '@/lib/inngest';
import { WEBHOOK_TYPES } from '../services/webhooks/types';

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

  @Post('webhooks/:webhookId')
  async inboundWebhook(
    @Param('webhookId') webhookId: string,
    @Headers('x-automation-signature') signature: string,
    @Headers('x-automation-timestamp') timestamp: string,
    @Headers('x-automation-nonce') nonce: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const hook = await prisma.webhook.findFirst({
      where: {
        type: WEBHOOK_TYPES.AUTOMATION,
        isActive: true,
        OR: [{ id: webhookId }, { sourceId: webhookId }],
      },
    });

    const secret = hook?.secret;
    if (!secret) {
      const automation = await prisma.automation.findUnique({
        where: { id: webhookId },
        select: { id: true, webhookSecret: true, workspaceId: true, isActive: true },
      });
      if (!automation?.webhookSecret || !automation.isActive) {
        return res.status(404).json({ error: 'not_found' });
      }
      return this.dispatchAutomationWebhook({
        automationId: automation.id,
        workspaceId: automation.workspaceId,
        secret: automation.webhookSecret,
        signature,
        timestamp,
        nonce,
        req,
        res,
      });
    }

    const automationId = hook.sourceId || webhookId;
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { id: true, workspaceId: true, isActive: true },
    });

    return this.dispatchAutomationWebhook({
      automationId: automation?.id || automationId,
      workspaceId: automation?.workspaceId ?? null,
      secret,
      signature,
      timestamp,
      nonce,
      req,
      res,
    });
  }

  private async dispatchAutomationWebhook(opts: {
    automationId: string;
    workspaceId: string | null;
    secret: string;
    signature: string;
    timestamp: string;
    nonce: string;
    req: Request;
    res: Response;
  }) {
    const raw = typeof (opts.req as any).rawBody === 'string'
      ? (opts.req as any).rawBody
      : JSON.stringify(opts.req.body ?? {});
    const verified = verifyWebhookRequest({
      secret: opts.secret,
      signature: opts.signature,
      timestamp: opts.timestamp,
      nonce: opts.nonce,
      body: raw,
    });
    if (!verified.ok) {
      return opts.res.status(401).json({ error: verified.reason });
    }
    await inngest.send({
      name: 'automation/task.event',
      data: {
        event: {
          type: 'WEBHOOK',
          taskId: (opts.req.body && opts.req.body.taskId) || `webhook:${opts.automationId}`,
          workspaceId: opts.workspaceId,
        },
        cascade: createCascadeContext({ source: 'webhook' }),
      },
    });
    await prisma.webhook.updateMany({
      where: {
        type: WEBHOOK_TYPES.AUTOMATION,
        OR: [{ id: opts.automationId }, { sourceId: opts.automationId }],
      },
      data: { lastTriggeredAt: new Date() },
    });
    return opts.res.status(202).json({ ok: true });
  }
}
