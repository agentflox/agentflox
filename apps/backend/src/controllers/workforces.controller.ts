import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { prisma } from '@/lib/prisma';
import { BuilderProgressEmitter } from '@/services/agents/arch/builderProgressEmitter';
import { runWorkforce } from '@/services/agents/orchestration/workforceExecutionService';
import { swarmOrchestrationService } from '@/services/agents/orchestration/swarmOrchestrationService';
import { routeSwarmMessage } from '@/services/agents/orchestration/swarmMessageRouter';
import { assertSwarmSessionAccess } from '@/utils/http/resourceAccess';
import { workforceEditorAssistant } from '@/services/agents/arch/WorkforceEditorAssistantService';
import { workforceRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';
import { ExecutionQuotaService } from '@/services/billing/executionQuota.service';
import { sendExecutionQuotaError } from '@/services/billing/executionQuota.http';
import { collectArtifactsFromStepResults } from '@/services/agents/artifacts/executionArtifact';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const editorMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
  context: z.unknown(),
  modelId: z.string().optional().nullable(),
  attachments: z.array(z.any()).optional(),
  contexts: z.array(z.any()).optional(),
  mentions: z.array(z.any()).optional(),
});

function buildWorkforceFollowups(): Array<{ id: string; label: string }> {
  return [
    { id: 'explain-workflow', label: 'Explain this workforce graph and its paths' },
    { id: 'optimize-branches', label: 'Optimize branching logic and error paths' },
    { id: 'simplify-flow', label: 'Simplify this workflow while keeping behavior' },
  ];
}

function buildWorkforceActions(): Array<{ id: string; label: string; variant: 'primary' | 'secondary' | 'ghost' }> {
  return [{ id: 'apply-proposed-ops', label: 'Apply these workflow changes', variant: 'primary' }];
}

@Controller('v1/workforces')
@UseGuards(JwtAuthGuard)
export class WorkforcesController {

  // ─── Workforce Run ──────────────────────────────────────────────────────────

  @Post(':workforceId/run')
  async runWorkforceEndpoint(
    @Param('workforceId') workforceId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const schema = z.object({
        task: z.string().optional(),
        input: z.record(z.unknown()).optional(),
      });
      const parsed = schema.parse(req.body ?? {});
      const userId = req.userId!;

      const rl = await consumeRateLimit(workforceRateLimiter, userId, 'workforce:run');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const workforce = await prisma.workforce.findFirst({
        where: { id: workforceId, ownerId: userId },
      });
      if (!workforce) {
        return res.status(404).json({ error: 'Workforce not found' });
      }

      const executionId = randomUUID();
      await ExecutionQuotaService.consumeExecution(userId, executionId, 'workforce', {
        rootRunId: executionId,
        context: {
          runId: executionId,
          workforceId: workforce.id,
          workforceName: workforce.name,
          workspaceId: workforce.workspaceId,
          spaceId: workforce.spaceId,
          conversationId: undefined,
        },
      });

      const input = { task: parsed.task, ...parsed.input };
      const result = await runWorkforce(workforceId, input, userId, { executionId });
      return res.json(result);
    } catch (error) {
      console.error('[WorkforcesController] Error running workforce:', error);
      if (sendExecutionQuotaError(res, error)) return;
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  /**
   * POST /v1/workforces/:workforceId/run-stream
   * SSE endpoint that streams high-level progress for a workforce run.
   */
  @Post(':workforceId/run-stream')
  async runWorkforceStream(
    @Param('workforceId') workforceId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    const schema = z.object({
      task: z.string().min(1),
      input: z.record(z.unknown()).optional(),
      conversationId: z.string().optional(),
      messages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
    });

    let parsed: z.infer<typeof schema>;
    try {
      parsed = schema.parse(req.body ?? {});
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;

    const rl = await consumeRateLimit(workforceRateLimiter, userId, 'workforce:run-stream');
    if (!rl.allowed) {
      return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
    }
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();
    emitter.thinking('Starting workforce run', undefined);

    req.on('close', () => { emitter.end(); });

    try {
      const workforce = await prisma.workforce.findFirst({
        where: { id: workforceId, ownerId: userId },
      });
      if (!workforce) {
        emitter.error('Workforce not found or access denied');
        return;
      }

      const executionId = randomUUID();
      try {
        await ExecutionQuotaService.consumeExecution(userId, executionId, 'workforce', {
          rootRunId: executionId,
          context: {
            runId: executionId,
            workforceId: workforce.id,
            workforceName: workforce.name,
            workspaceId: workforce.workspaceId,
            spaceId: workforce.spaceId,
            conversationId: parsed.conversationId,
          },
        });
      } catch (quotaErr) {
        if (quotaErr instanceof Error && 'category' in quotaErr) {
          const cat = (quotaErr as { category: string }).category;
          if (cat === 'QUOTA') {
            emitter.error('Execution limit reached — upgrade for more runs');
            return;
          }
          if (cat === 'SUBSCRIPTION') {
            emitter.error('No active subscription — reactivate or upgrade your plan');
            return;
          }
        }
        throw quotaErr;
      }

      const input = {
        task: parsed.task,
        conversationId: parsed.conversationId,
        messages: parsed.messages,
        ...parsed.input,
      };
      const result = await runWorkforce(workforceId, input, userId, { executionId });
      const runExecutionId = result.executionId;

      const { redisSub } = await import('@/lib/redis');
      const channel = `workforce:run:${runExecutionId}`;

      const listener = (channelName: string, message: string) => {
        if (channelName !== channel) return;
        try {
          const data = JSON.parse(message);
          if (data.type === 'thinking') {
            emitter.thinking(data.message, data.node);
          } else if (data.type === 'token') {
            emitter.token(data.message);
          } else if (data.type === 'error') {
            emitter.error(data.message);
          } else if (data.type === 'complete') {
            redisSub.unsubscribe(channel).catch(() => { });
            redisSub.removeListener('message', listener);
            const ctx = data.context || {};
            const steps = ctx.steps && typeof ctx.steps === 'object' ? ctx.steps : {};
            const stepEntries = Object.entries(steps as Record<string, any>);
            let naturalSummary: string | undefined;
            const output = ctx.output as any;
            if (output && typeof output === 'object') {
              if (typeof output.summary === 'string') naturalSummary = output.summary;
              else if (typeof output.text === 'string') naturalSummary = output.text;
            }
            if (!naturalSummary && stepEntries.length > 0) {
              const failed = stepEntries.filter(([, v]) => v && typeof v === 'object' && (v.status === 'error' || v.status === 'FAILED' || !!v.error));
              naturalSummary = failed.length > 0
                ? 'One or more steps failed while running the workflow.'
                : `Successfully completed ${stepEntries.length} workflow steps.`;
            }
            emitter.complete({
              executionId,
              workflowId: result.workflowId,
              status: data.status,
              steps,
              output,
              summary: naturalSummary || 'Execution completed.',
              artifacts: collectArtifactsFromStepResults(steps, { finalOutput: output }),
            });
          }
        } catch (e) {
          console.error('[WorkforcesController] Error parsing redis message', e);
        }
      };

      redisSub.on('message', listener);
      await redisSub.subscribe(channel);

      req.on('close', () => {
        redisSub.unsubscribe(channel).catch(() => { });
        redisSub.removeListener('message', listener);
      });
    } catch (error) {
      console.error('[WorkforcesController] Error running workforce (stream):', error);
      emitter.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * GET /v1/workforces/executions/:executionId
   * Returns workflow execution status.
   */
  @Get('executions/:executionId')
  async getWorkflowExecutionStatus(
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      const execution = await prisma.agentWorkflowExecution.findUnique({
        where: { id: executionId },
        include: {
          workflow: {
            include: {
              workspace: {
                select: {
                  ownerId: true,
                  members: { where: { userId }, select: { userId: true } },
                },
              },
            },
          },
        },
      });
      if (!execution?.workflow?.workspace) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      const { workspace } = execution.workflow;
      const isOwner = workspace.ownerId === userId;
      const isMember = workspace.members?.length > 0;
      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const ctx = (execution.context as any) || {};
      const steps = ctx.steps && typeof ctx.steps === 'object' ? ctx.steps : {};
      const stepEntries = Object.entries(steps as Record<string, any>);

      let naturalSummary: string | undefined;
      const output = ctx.output as any;
      if (output && typeof output === 'object') {
        if (typeof output.summary === 'string') naturalSummary = output.summary;
        else if (typeof output.text === 'string') naturalSummary = output.text;
      }

      if (!naturalSummary && stepEntries.length > 0) {
        const skippedPlaceholders = stepEntries.filter(
          ([, v]) => v && typeof v === 'object' && v.skipped === true && v.reason === 'NO_EXECUTOR_PLACEHOLDER'
        );
        const failedSteps = stepEntries.filter(
          ([, v]) => v && typeof v === 'object' && (v.status === 'error' || v.status === 'FAILED' || !!v.error)
        );
        const fragments: string[] = [];
        if (skippedPlaceholders.length > 0) {
          fragments.push(`Some workflow steps were configured as placeholders without an executor and were skipped (steps: ${skippedPlaceholders.map(([id]) => id).join(', ')}).`);
        }
        if (failedSteps.length > 0) {
          fragments.push(`One or more steps failed while running the workflow (steps: ${failedSteps.map(([id]) => id).join(', ')}).`);
        }
        if (fragments.length > 0) naturalSummary = fragments.join(' ');
      }

      return res.json({
        id: execution.id,
        status: execution.status,
        endTime: execution.endTime,
        error: execution.error,
        summary: naturalSummary ?? null,
        steps,
        output: ctx.output ?? null,
        artifacts: collectArtifactsFromStepResults(steps, { finalOutput: ctx.output }),
      });
    } catch (error) {
      console.error('[WorkforcesController] Error fetching execution status:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // ─── Workforce Editor Assistant ────────────────────────────────────────────

  /**
   * POST /v1/workforces/editor-assistant/message-stream
   * SSE endpoint for workforce AI assistant.
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

      const rl = await consumeRateLimit(workforceRateLimiter, userId, 'workforce:editor:stream');
      if (!rl.allowed) {
        emitter.error(`Rate limit exceeded. Try again in ${rl.retryAfter}s`);
        return;
      }

      emitter.thinking('Analyzing current workforce graph…', 'WORKFORCE_EDITOR');

      const conversation = await prisma.aiConversation.findFirst({
        where: { id: body.conversationId, userId, conversationType: 'WORKFORCE_BUILDER' },
        select: { id: true },
      });
      if (!conversation) {
        emitter.error('Conversation not found or access denied');
        return;
      }

      emitter.thinking('Drafting proposed changes…', 'WORKFORCE_EDITOR');

      const result = await workforceEditorAssistant.processMessage({
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

      const followups = buildWorkforceFollowups();
      const actions = buildWorkforceActions();

      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: 'workforce' } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
      });

      emitter.complete({ assistantText: result.assistantText, proposedOps: result.proposedOps, followups, actions });
    } catch (error: any) {
      console.error('[WorkforcesController] Editor assistant stream error:', error);
      if (error instanceof z.ZodError) emitter.error('Invalid request.');
      else emitter.error(error?.message || 'Internal server error');
    }
  }

  /**
   * POST /v1/workforces/editor-assistant/message
   * Non-streaming workforce editor assistant.
   */
  @Post('editor-assistant/message')
  async editorAssistantMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const body = editorMessageSchema.parse(req.body ?? {});
      const userId = req.userId!;

      const rl = await consumeRateLimit(workforceRateLimiter, userId, 'workforce:editor:message');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const conversation = await prisma.aiConversation.findFirst({
        where: { id: body.conversationId, userId, conversationType: 'WORKFORCE_BUILDER' },
        select: { id: true },
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      const result = await workforceEditorAssistant.processMessage({
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

      const followups = buildWorkforceFollowups();

      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: 'workforce' } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
      });

      return res.json(result);
    } catch (error) {
      console.error('[WorkforcesController] Editor assistant message error:', error);
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  // ─── Swarm ─────────────────────────────────────────────────────────────────

  /**
   * POST /v1/workforces/swarm/start
   */
  @Post('swarm/start')
  async startSwarm(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const schema = z.object({
        workforceId: z.string().min(1),
        sessionId: z.string().min(1),
      });
      const { workforceId, sessionId } = schema.parse(req.body);
      const userId = req.userId!;

      const workforce = await prisma.workforce.findFirst({
        where: { id: workforceId, ownerId: userId },
        select: { id: true, name: true, workspaceId: true, spaceId: true, graph: true, data: true },
      });
      if (!workforce) {
        return res.status(404).json({ error: 'Workforce not found or access denied' });
      }

      await ExecutionQuotaService.consumeExecution(userId, sessionId, 'swarm', {
        rootRunId: sessionId,
        context: {
          runId: sessionId,
          workforceId: workforce.id,
          workforceName: workforce.name,
          workspaceId: workforce.workspaceId,
          spaceId: workforce.spaceId,
          conversationId: sessionId,
        },
      });

      const data = (workforce.data as any) || {};
      const nodes: any[] = data.react_flow_graph?.nodes || data.workforce_graph?.nodes || (workforce.graph as any)?.nodes || [];
      const agentNodes = nodes.filter((n: any) => n.type === 'agentNode' || n.type === 'agent');
      const taskNodes = nodes.filter((n: any) => n.type === 'taskNode' || n.type === 'task');

      const coordinatorId = agentNodes[0]?.data?.agentId || agentNodes[0]?.config?.agentId || agentNodes[0]?.id || agentNodes[0]?.node_id || 'coordinator';
      const agentIds = agentNodes.map((n: any) => n.data?.agentId || n.config?.agentId || n.id || n.node_id).filter(Boolean);

      const taskIds = taskNodes.map((n: any) => n.data?.taskId).filter(Boolean) as string[];

      if (taskIds.length > 0) {
        const realTasks = await prisma.task.findMany({
          where: { id: { in: taskIds } },
          include: {
            status: true,
            list: true,
            project: true,
            space: true,
            assignees: { include: { user: { select: { name: true, email: true } } } },
            attachments: true,
            checklists: { include: { items: true } },
            dependencies: true,
          },
        });

        const existing = await (prisma.agentTask as any).findMany({
          where: {
            workspaceId: workforce.workspaceId,
            metadata: { path: ['sessionId'], equals: sessionId },
          },
          select: { metadata: true },
        });
        const alreadySeededTaskIds = new Set(
          existing.map((e: any) => e.metadata?.originalTaskId).filter(Boolean)
        );

        let toCreate = realTasks.filter(t => !alreadySeededTaskIds.has(t.id));

        // Topological sort by dependencies
        const sortedToCreate: any[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const visit = (taskId: string) => {
          if (visited.has(taskId) || visiting.has(taskId)) return;
          visiting.add(taskId);
          const task = toCreate.find(t => t.id === taskId);
          if (task?.dependencies) {
            for (const dep of task.dependencies) {
              if (toCreate.some(t => t.id === dep.dependsOnId)) visit(dep.dependsOnId);
            }
          }
          visiting.delete(taskId);
          visited.add(taskId);
          if (task) sortedToCreate.push(task);
        };
        for (const t of toCreate) visit(t.id);
        toCreate = sortedToCreate;

        if (toCreate.length > 0) {
          const now = Date.now();
          const idMap = new Map<string, string>();
          for (const t of toCreate) idMap.set(t.id, randomUUID());

          await Promise.all(
            toCreate.map((t, idx) => {
              const agentTaskId = idMap.get(t.id)!;
              const dependsOn = (t.dependencies?.map((d: any) => idMap.get(d.dependsOnId)).filter(Boolean) as string[]) || [];
              const status = dependsOn.length > 0 ? 'BLOCKED' : 'PENDING';
              return (prisma.agentTask as any).create({
                data: {
                  id: agentTaskId,
                  title: t.title.slice(0, 255),
                  description: t.description || t.title,
                  taskType: 'CUSTOM',
                  status,
                  priority: (t.priority || 'MEDIUM').toUpperCase(),
                  assignedBy: userId,
                  workspaceId: workforce.workspaceId,
                  inputData: { originalTask: t },
                  metadata: { sessionId, source: 'task_node', originalTaskId: t.id, description: t.description || t.title },
                  requirements: [],
                  dependsOn,
                  blockedBy: dependsOn,
                  createdAt: new Date(now + idx * 1000),
                },
              });
            })
          );
          console.log(`[SwarmStart] Seeded ${toCreate.length} AgentTask(s) for session ${sessionId}`);
        }
      }

      const sid = await swarmOrchestrationService.startSwarm(
        workforce.workspaceId ?? '',
        coordinatorId,
        sessionId,
        { agentIds, userId },
      );

      return res.json({ sessionId: sid, workspaceId: workforce.workspaceId });
    } catch (error) {
      console.error('[SwarmStart] Error:', error);
      if (sendExecutionQuotaError(res, error)) return;
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  @Post('swarm/:sessionId/stop')
  async stopSwarm(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      await assertSwarmSessionAccess(sessionId, userId);
      await swarmOrchestrationService.stopSwarm(sessionId);
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmStop] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * One-time / ops: reschedule running swarm sessions with stale tasks (pre-fix wedged sessions).
   * POST /v1/workforces/swarm/sweep-stuck
   */
  @Post('swarm/sweep-stuck')
  async sweepStuckSwarmSessions(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      // Reuse any authenticated user for now; tighten to admin if needed.
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await swarmOrchestrationService.sweepStuckSessions();
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('[SwarmSweepStuck] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  @Get('swarm/:sessionId/status')
  async getSwarmStatus(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      await assertSwarmSessionAccess(sessionId, userId);
      const session = await swarmOrchestrationService.getSession(sessionId);
      if (session) return res.json({ status: session.status, workspaceId: session.workspaceId });
      return res.json({ status: 'idle' });
    } catch (error) {
      console.error('[SwarmStatus] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  @Get('swarm/:sessionId/events')
  async swarmEvents(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    const userId = req.userId!;
    try {
      await assertSwarmSessionAccess(sessionId, userId);
    } catch {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (evt: any) => {
      if (evt.sessionId !== sessionId) return;
      try {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      } catch { }
    };

    swarmOrchestrationService.eventBus.on('swarm.event', send);
    req.on('close', () => { swarmOrchestrationService.eventBus.off('swarm.event', send); });
  }

  /** @deprecated Use /swarm/:sessionId/message-stream instead */
  @Post('swarm/:sessionId/message')
  async swarmMessage(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    return res.status(410).json({
      error: 'Gone',
      message: 'This endpoint is deprecated. Use POST /swarm/:sessionId/message-stream instead.',
    });
  }

  @Post('swarm/:sessionId/message-stream')
  async swarmMessageStream(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    try {
      const schema = z.object({
        message: z.string().min(1),
        workspaceId: z.string().optional(),
        mentions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['agent', 'task']),
        })).optional(),
        contexts: z.array(z.any()).optional(),
      });
      const { message, workspaceId, mentions = [], contexts = [] } = schema.parse(req.body ?? {});
      const userId = req.userId!;

      const session = await swarmOrchestrationService.getSession(sessionId);
      const wid = workspaceId || session?.workspaceId;
      if (!wid) { emitter.error('Workspace ID not found'); return; }

      const [isOwner, isMember] = await Promise.all([
        prisma.workspace.findFirst({ where: { id: wid, ownerId: userId }, select: { id: true } }),
        prisma.workspaceMember.findFirst({ where: { workspaceId: wid, userId }, select: { id: true } }),
      ]);
      if (!isOwner && !isMember) { emitter.error('Access denied'); return; }

      const savedUserMessage = await prisma.aiMessage.create({
        data: {
          conversationId: sessionId,
          role: 'USER',
          content: message,
          metadata: { source: 'swarm_interrupt_stream', contexts, mentions },
        },
      });

      await prisma.aiConversation.update({
        where: { id: sessionId },
        data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
      }).catch(() => null);

      const { responderName, responseContent, intent } = await routeSwarmMessage({
        sessionId,
        workspaceId: wid,
        userId,
        message,
        mentions,
        emitter,
        excludeMessageId: savedUserMessage.id,
      });

      await prisma.aiMessage.create({
        data: {
          conversationId: sessionId,
          role: 'ASSISTANT',
          content: responseContent,
          metadata: { responder: responderName, source: 'swarm_assistant_response', intent: intent.type },
        },
      });

      await prisma.aiConversation.update({
        where: { id: sessionId },
        data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
      }).catch(() => null);

      emitter.complete({ responder: responderName });
    } catch (err: any) {
      console.error('[SwarmMessageStream] Error:', err);
      const isAuthError = err?.message?.startsWith('Unauthorized') || err?.code === 'UNAUTHORIZED' || err?.message?.startsWith('Access denied');
      emitter.error(isAuthError ? 'Access denied' : (err?.message || 'Internal server error'));
    }
  }

  @Get('swarm/tasks')
  async swarmTasks(
    @Query('sessionId') sessionId: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;

      const accessibleWorkspaces = await prisma.workspace.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        select: { id: true },
      });
      const workspaceIds = accessibleWorkspaces.map((w) => w.id);

      if (workspaceIds.length === 0) {
        return res.json({ tasks: [] });
      }

      if (sessionId) {
        const session = await prisma.aiConversation.findFirst({
          where: { id: sessionId },
          select: { workspaceId: true, userId: true },
        });
        if (!session?.workspaceId || !workspaceIds.includes(session.workspaceId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const where: any = {
        status: { in: ['PENDING', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'PENDING_APPROVAL'] },
        workspaceId: { in: workspaceIds },
      };
      if (sessionId) where.metadata = { path: ['sessionId'], equals: sessionId };

      const tasks = await (prisma.agentTask as any).findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
      return res.json({ tasks });
    } catch (error) {
      console.error('[SwarmTasks] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  @Post('swarm/tasks/:taskId/approve')
  async approveSwarmTask(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const task = await (prisma.agentTask as any).findFirst({ where: { id: taskId }, select: { workspaceId: true } });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const userId = req.userId!;
      const hasAccess = await prisma.workspace.findFirst({
        where: { id: task.workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      });
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

      await (prisma.agentTask as any).update({ where: { id: taskId }, data: { status: 'PENDING', updatedAt: new Date() } });
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmApprove] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  @Post('swarm/tasks/:taskId/deny')
  async denySwarmTask(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const task = await (prisma.agentTask as any).findFirst({ where: { id: taskId }, select: { workspaceId: true } });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const userId = req.userId!;
      const hasAccess = await prisma.workspace.findFirst({
        where: { id: task.workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      });
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

      await (prisma.agentTask as any).update({ where: { id: taskId }, data: { status: 'FAILED', updatedAt: new Date() } });
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmDeny] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
