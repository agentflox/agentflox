import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { BuilderProgressEmitter } from '@/services/agents/arch/builderProgressEmitter';
import { toolBuilderService } from '@/services/tools/toolBuilderService';
import { prisma } from '@/lib/prisma';
import { toolEditorAssistant } from '@/services/agents/arch/ToolEditorAssistantService';
import { getAllTools } from '@/services/agents/registry/toolRegistry';
import { inngest } from '@/lib/inngest';
import { toolExecutionRateLimiter, toolBuilderRateLimiter, toolBuilderInitRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';
import { publishToolLog, publishToolError } from '@/services/tools/toolExecutionLogService';
import { ExecutionQuotaService } from '@/services/billing/executionQuota.service';
import { sendExecutionQuotaError } from '@/services/billing/executionQuota.http';
import { toUserFacingError } from '@/services/models';

const editorMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
  context: z.unknown(),
  modelId: z.string().optional().nullable(),
  attachments: z.array(z.any()).optional(),
  contexts: z.array(z.any()).optional(),
  mentions: z.array(z.any()).optional(),
});

function buildToolFollowups(): Array<{ id: string; label: string }> {
  return [
    { id: 'explain-tool', label: 'Explain this tool step by step' },
    { id: 'optimize-tool', label: 'Optimize this tool for performance and reliability' },
    { id: 'add-validation', label: 'Add input validation and error handling' },
  ];
}

function buildToolActions(): Array<{ id: string; label: string; variant: 'primary' | 'secondary' | 'ghost' }> {
  return [{ id: 'apply-proposed-ops', label: 'Apply these tool changes', variant: 'primary' }];
}

@Controller('v1/tools')
@UseGuards(JwtAuthGuard)
export class ToolsController {
  
  @Post(':toolId/builder/initialize')
  async builderInitialize(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      const rl = await consumeRateLimit(toolBuilderInitRateLimiter, userId, 'tool:builder:initialize');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const schema = z.object({
        conversationId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      });
      const body = schema.parse(req.body);

      const targetToolId = toolId === 'new' ? undefined : toolId;

      const result = await toolBuilderService.initializeConversation(
        userId,
        body.conversationId,
        targetToolId,
        body.skipWelcome || false,
      );

      return res.json(result);
    } catch (error) {
      console.error('[ToolsController] Error initializing builder:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
        error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
      return res.status(statusCode).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':toolId/builder/message')
  async builderMessage(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      const rl = await consumeRateLimit(toolBuilderRateLimiter, userId, 'tool:builder:message');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const schema = z.object({
        conversationId: z.string(),
        message: z.string().min(1),
        modelId: z.string().optional().nullable(),
        attachments: z.array(z.any()).optional(),
        contexts: z.array(z.any()).optional(),
        mentions: z.array(z.any()).optional(),
      });

      const body = schema.parse(req.body);

      // Sync path — create-tool flow awaits this before navigating to the builder.
      // (message-stream remains the interactive SSE path.)
      const result = await toolBuilderService.processMessage(
        body.conversationId,
        body.message,
        userId,
        undefined,
        undefined,
        {
          attachments: body.attachments,
          contexts: body.contexts,
          mentions: body.mentions,
          modelId: body.modelId,
        }
      );

      return res.json(result);
    } catch (error) {
      console.error('Error processing tool builder message:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':toolId/builder/message-stream')
  async builderMessageStream(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    const schema = z.object({
      conversationId: z.string(),
      message: z.string().min(1),
      modelId: z.string().optional().nullable(),
      attachments: z.array(z.any()).optional(),
      contexts: z.array(z.any()).optional(),
      mentions: z.array(z.any()).optional(),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;

    const rl = await consumeRateLimit(toolBuilderRateLimiter, userId, 'tool:builder:message-stream');
    if (!rl.allowed) {
      return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
    }
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    emitter.thinking('Starting...', undefined);

    req.on('close', () => {
      emitter.end();
    });

    try {
      const result = await toolBuilderService.processMessage(
        body.conversationId,
        body.message,
        userId,
        (step: string, node?: string) => emitter.thinking(step, node),
        (text: string) => emitter.token(text),
        {
          attachments: body.attachments,
          contexts: body.contexts,
          mentions: body.mentions,
          modelId: body.modelId,
        }
      );

      const { response: _stripped, ...metaPayload } = result as any;
      emitter.complete(metaPayload as Record<string, unknown>);
    } catch (error) {
      console.error('[ToolBuilder] SSE stream error:', error);
      const facing = toUserFacingError(error);
      emitter.error(facing.message, { code: facing.code, kind: facing.kind });
    }
  }

  @Post(':toolId/builder/update-draft')
  async builderUpdateDraft(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
        draft: z.any(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await toolBuilderService.updateDraft(
        body.conversationId,
        body.draft,
        userId
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  @Post(':toolId/builder/launch')
  async builderLaunch(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await toolBuilderService.launchTool(
        body.conversationId,
        toolId,
        userId
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // ─── Tool Editor Assistant ──────────────────────────────────────────────────

  /**
   * POST /v1/tools/editor-assistant/message-stream
   * SSE endpoint for the tool editor AI assistant.
   */
  @Post('editor-assistant/message-stream')
  async editorAssistantStream(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    try {
      const body = editorMessageSchema.parse(req.body ?? {});
      const userId = req.userId!;

      const rl = await consumeRateLimit(toolBuilderRateLimiter, userId, 'tool:editor:stream');
      if (!rl.allowed) {
        emitter.error(`Rate limit exceeded. Try again in ${rl.retryAfter}s`);
        return;
      }

      emitter.thinking('Analyzing current tool configuration…', 'TOOL_EDITOR');

      const conversation = await prisma.aiConversation.findFirst({
        where: { id: body.conversationId, userId, conversationType: 'TOOL_BUILDER' },
        select: { id: true },
      });
      if (!conversation) {
        emitter.error('Conversation not found or access denied');
        return;
      }

      emitter.thinking('Drafting proposed changes…', 'TOOL_EDITOR');

      const result = await toolEditorAssistant.processMessage({
        userId,
        conversationId: body.conversationId,
        message: body.message,
        context: body.context,
        modelId: body.modelId,
        onToken: (t) => emitter.token(t),
        options: {
          attachments: body.attachments,
          contexts: body.contexts,
          mentions: body.mentions,
          modelId: body.modelId,
        },
      });

      const followups = buildToolFollowups();
      const actions = buildToolActions();

      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: 'tool' } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
      });

      emitter.complete({ assistantText: result.assistantText, proposedOps: result.proposedOps, followups, actions });
    } catch (error: any) {
      console.error('[ToolsController] Editor assistant stream error:', error);
      if (error instanceof z.ZodError) emitter.error('Invalid request.');
      else {
        const facing = toUserFacingError(error);
        emitter.error(facing.message, { code: facing.code, kind: facing.kind });
      }
    }
  }

  /**
   * POST /v1/tools/editor-assistant/message
   * Non-streaming tool editor assistant.
   */
  @Post('editor-assistant/message')
  async editorAssistantMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const body = editorMessageSchema.parse(req.body ?? {});
      const userId = req.userId!;

      const rl = await consumeRateLimit(toolBuilderRateLimiter, userId, 'tool:editor:message');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const conversation = await prisma.aiConversation.findFirst({
        where: { id: body.conversationId, userId, conversationType: 'TOOL_BUILDER' },
        select: { id: true },
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      const result = await toolEditorAssistant.processMessage({
        userId,
        conversationId: body.conversationId,
        message: body.message,
        context: body.context,
        modelId: body.modelId,
        options: {
          attachments: body.attachments,
          contexts: body.contexts,
          mentions: body.mentions,
          modelId: body.modelId,
        },
      });

      const followups = buildToolFollowups();

      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: 'tool' } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
      });

      return res.json(result);
    } catch (error) {
      console.error('[ToolsController] Editor assistant message error:', error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  // ─── Composite Tool Run ─────────────────────────────────────────────────────

  /**
   * POST /v1/tools/composite/:toolId/run
   *
   * Async trigger endpoint — does NOT block on execution.
   * 1. Rate-limits via atomic Redis INCR+EXPIRE.
   * 2. Generates a runId, persists a PENDING log row.
   * 3. Dispatches 'tool/composite.execute' Inngest event.
   * 4. Returns { runId } immediately so the client can subscribe via WebSocket.
   *
   * The Inngest worker publishes <trace> logs to Redis channel `tool:logs:{runId}`.
   * The client subscribes via socket.emit('tool:subscribe-logs', { runId }).
   */
  @Post('composite/:toolId/run')
  async runCompositeTool(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const schema = z.object({
        input: z.record(z.any()).optional().default({}),
        startStepId: z.string().min(1).optional(),
        endStepId: z.string().min(1).optional(),
      });
      const body = schema.parse(req.body ?? {});
      const userId = req.userId!;

      // ── 1. Atomic rate limit ─────────────────────────────────────────────
      const rl = await consumeRateLimit(toolExecutionRateLimiter, userId, 'tool:execute');
      if (!rl.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: rl.retryAfter,
        });
      }

      // ── 2. Verify tool ownership ─────────────────────────────────────────
      const tool = await (prisma as any).compositeTool.findFirst({
        where: { id: toolId, OR: [{ ownerId: userId }] },
        select: { id: true, name: true, workspaceId: true, spaceId: true },
      });
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found or access denied' });
      }

      // ── 3. Execution quota (atomic ledger + decrement) ───────────────────
      const runId = uuidv4();
      await ExecutionQuotaService.consumeExecution(userId, runId, 'composite_tool', {
        rootRunId: runId,
        context: {
          runId,
          toolId: tool.id,
          toolName: tool.name,
          workspaceId: tool.workspaceId,
          spaceId: tool.spaceId,
        },
      });

      // ── 4. Create execution log (PENDING) ────────────────────────────────
      await (prisma as any).compositeToolExecutionLog.create({
        data: {
          id: runId,
          compositeToolId: toolId,
          userId,
          status: 'PENDING',
          input: body.input,
        },
      });

      // ── 5. Dispatch to Inngest (non-blocking) ────────────────────────────
      await inngest.send({
        name: 'tool/composite.execute',
        data: {
          toolId,
          input: body.input,
          userId,
          runId,
          rootRunId: runId,
          ...(body.startStepId ? { startStepId: body.startStepId } : {}),
          ...(body.endStepId ? { endStepId: body.endStepId } : {}),
        },
      });

      // Publish initial log so clients see the run start immediately
      await publishToolLog(runId, {
        type: 'thinking',
        content: `Starting tool: ${tool.name}`,
        stepId: 'init',
        phase: 'start',
        payload: {
          inputs: body.input ?? {},
        },
      });

      return res.json({ runId, status: 'PENDING' });
    } catch (error: any) {
      console.error('[ToolsController] composite run error:', error);
      if (sendExecutionQuotaError(res, error)) return;
      return res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }

  /**
   * POST /v1/tools/composite/runs/:runId/cancel
   * Cancels an in-flight composite tool run owned by the caller.
   */
  @Post('composite/runs/:runId/cancel')
  async cancelCompositeToolRun(
    @Param('runId') runId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      if (!runId) {
        return res.status(400).json({ error: 'runId is required' });
      }

      const log = await (prisma as any).compositeToolExecutionLog.findFirst({
        where: { id: runId, userId },
        select: { id: true, status: true },
      });
      if (!log) {
        return res.status(404).json({ error: 'Run not found or access denied' });
      }

      const terminal = ['SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(String(log.status));
      if (terminal) {
        return res.json({ runId, status: log.status, cancelled: false });
      }

      const { requestToolRunCancel } = await import('@/services/tools/toolExecutionLogService');
      await requestToolRunCancel(runId);

      await (prisma as any).compositeToolExecutionLog.updateMany({
        where: { id: runId, userId },
        data: {
          status: 'CANCELLED',
          error: 'Cancelled by user',
          finishedAt: new Date(),
        },
      }).catch(() => {});

      await publishToolError(runId, 'Run cancelled by user').catch(() => {});

      await ExecutionQuotaService.deregisterActiveRun(userId, runId).catch(() => {});

      return res.json({ runId, status: 'CANCELLED', cancelled: true });
    } catch (error: any) {
      console.error('[ToolsController] composite cancel error:', error);
      return res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }

  // ─── System Tools ───────────────────────────────────────────────────────────

  @Get('system-tools')
  async getSystemTools(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const tools = await getAllTools();
      return res.json(tools.map(tool => ({ id: tool.id, name: tool.name, description: tool.description, category: tool.category })));
    } catch (error) {
      console.error('[ToolsController] Error fetching system tools:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * GET /v1/tools/composite/:toolId/runs
   * Returns paginated run history for a tool, newest first.
   */
  @Get('composite/:toolId/runs')
  async getCompositeToolRuns(
    @Param('toolId') toolId: string,
    @Query('limit') limitStr: string,
    @Query('cursor') cursor: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      const limit = Math.min(parseInt(limitStr || '50', 10) || 50, 100);

      // Fetch one extra to detect whether more pages exist
      const rows = await (prisma as any).compositeToolExecutionLog.findMany({
        where: { compositeToolId: toolId, userId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        // When a cursor is provided, skip the cursor row itself and start after it
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          status: true,
          input: true,
          output: true,
          steps: true,
          error: true,
          createdAt: true,
          finishedAt: true,
        },
      });

      const hasMore = rows.length > limit;
      const runs = hasMore ? rows.slice(0, limit) : rows;
      // The next cursor is the id of the last item in the current page
      const nextCursor: string | null = hasMore ? runs[runs.length - 1].id : null;

      return res.json({ runs, nextCursor });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }

  /**
   * DELETE /v1/tools/composite/runs/:runId
   * Deletes a run record (must belong to the calling user).
   */
  @Delete('composite/runs/:runId')
  async deleteCompositeToolRun(
    @Param('runId') runId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      const existing = await (prisma as any).compositeToolExecutionLog.findFirst({
        where: { id: runId, userId },
        select: { id: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Run not found or access denied' });
      }
      await (prisma as any).compositeToolExecutionLog.delete({ where: { id: runId } });
      return res.json({ deleted: true, runId });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }
}
