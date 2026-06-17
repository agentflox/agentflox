import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { inngest } from '@/lib/inngest';
import { checkRateLimit } from '@/utils/ai/checkRateLimit';
import { createAgentGraph, type AgentGraphState } from '@/services/agents/orchestration/agentGraph';
import { agentBuilderService } from '@/services/agents/arch/agentBuilderService';
import { BuilderProgressEmitter } from '@/services/agents/arch/builderProgressEmitter';
import { AgentUpdateService } from '@/services/agents/core/agentUpdateService';
import { agentBuilderContextService } from '@/services/agents/state/agentBuilderContextService';
import { agentBuilderAssistantService } from '@/services/agents/core/agentBuilderAssistantService';
import { agentOperatorService } from '@/services/agents/arch/agentOperatorService';
import { agentExecutorService } from '@/services/agents/arch/agentExecutorService';
import { getAllTools } from '@/services/agents/registry/toolRegistry';
import { metrics } from '@/monitoring/metrics';
import { agentHiringService } from '@/services/agents/orchestration/agentHiringService';
import { AgentDepartment } from '@/services/agents/types/types';
import { agentSimulationService } from '@/services/agents/simulation/agentSimulationService';
import { runWorkforce } from '@/services/agents/orchestration/workforceExecutionService';
import { swarmOrchestrationService } from '@/services/agents/orchestration/swarmOrchestrationService';
import { routeSwarmMessage } from '@/services/agents/orchestration/swarmMessageRouter';
import { toolEditorAssistant } from '@/services/agents/arch/ToolEditorAssistantService';
import { workforceEditorAssistant } from '@/services/agents/arch/WorkforceEditorAssistantService';
import { GuardrailService } from '@/services/agents/safety/guardrailService';
import { PermissionService } from '@/services/permissions/permission.service';

const runEditorAssistantMessage = async (params: { mode: 'tool' | 'workforce'; userId: string; conversationId: string; message: string; context: any; onToken?: (text: string) => void }) => {
  if (params.mode === 'tool') {
    return toolEditorAssistant.processMessage(params);
  } else {
    return workforceEditorAssistant.processMessage(params);
  }
};

@Controller('v1/agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  private agentUpdateService = new AgentUpdateService();

  private buildEditorFollowups(
    mode: 'tool' | 'workforce',
  ): Array<{ id: string; label: string }> {
    if (mode === 'tool') {
      return [
        { id: 'explain-tool', label: 'Explain this tool step by step' },
        { id: 'optimize-tool', label: 'Optimize this tool for performance and reliability' },
        { id: 'add-validation', label: 'Add input validation and error handling' },
      ];
    }
    return [
      { id: 'explain-workflow', label: 'Explain this workforce graph and its paths' },
      { id: 'optimize-branches', label: 'Optimize branching logic and error paths' },
      { id: 'simplify-flow', label: 'Simplify this workflow while keeping behavior' },
    ];
  }

  private buildEditorActions(
    mode: 'tool' | 'workforce',
  ): Array<{ id: string; label: string; variant: 'primary' | 'secondary' | 'ghost' }> {
    return [
      {
        id: 'apply-proposed-ops',
        label: mode === 'tool' ? 'Apply these tool changes' : 'Apply these workflow changes',
        variant: 'primary',
      },
    ];
  }

  @Post('simulations/start')
  async startSimulation(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const schema = z.object({
        projectId: z.string().min(1),
        topic: z.string().min(1),
        agentIds: z.array(z.string().min(1)).min(1),
        mode: z.enum(['ROUND_ROBIN', 'DYNAMIC']).optional().default('ROUND_ROBIN')
      });
      const body = schema.parse(req.body);
      const userId = req.userId!;

      const conversation = await agentSimulationService.startSimulation(
        body.projectId,
        userId,
        body.topic,
        body.agentIds,
        body.mode as 'ROUND_ROBIN' | 'DYNAMIC'
      );
      return res.json(conversation);
    } catch (error) {
      console.error('Error starting simulation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  @Get('simulations/:simulationId')
  async getSimulation(@Param('simulationId') simulationId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const simulation = await agentSimulationService.getSimulation(simulationId);
      if (!simulation) return res.status(404).json({ error: 'Simulation not found' });
      return res.json(simulation);
    } catch (error) {
      console.error('Error getting simulation:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  @Post('simulations/:simulationId/step')
  async stepSimulation(@Param('simulationId') simulationId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const userId = req.userId!;
      const message = await agentSimulationService.stepSimulation(simulationId, userId);
      return res.json(message);
    } catch (error) {
      console.error('Error stepping simulation:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  @Post('simulations/:simulationId/summarize')
  async summarizeSimulation(@Param('simulationId') simulationId: string, @Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const userId = req.userId!;
      const summary = await agentSimulationService.summarizeSimulation(simulationId, userId);
      return res.json(summary);
    } catch (error) {
      console.error('Error summarizing simulation:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  // ─── Swarm Endpoints ────────────────────────────────────────────────────────

  /**
   * POST /v1/agents/swarm/start
   * Starts a new swarm session for a given workforce + conversation.
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

      // Resolve workspaceId from the workforce record
      const workforce = await prisma.workforce.findFirst({
        where: { id: workforceId, createdBy: userId },
        select: { id: true, workspaceId: true, graph: true, data: true },
      });
      if (!workforce) {
        return res.status(404).json({ error: 'Workforce not found or access denied' });
      }

      // Extract nodes from graph
      const data = (workforce.data as any) || {};
      const nodes: any[] = data.react_flow_graph?.nodes || data.workforce_graph?.nodes || (workforce.graph as any)?.nodes || [];
      const agentNodes = nodes.filter((n: any) => n.type === 'agentNode' || n.type === 'agent');
      const taskNodes = nodes.filter((n: any) => n.type === 'taskNode' || n.type === 'task');

      const coordinatorId = agentNodes[0]?.data?.agentId || agentNodes[0]?.config?.agentId || agentNodes[0]?.id || agentNodes[0]?.node_id || 'coordinator';
      const agentIds = agentNodes.map((n: any) => n.data?.agentId || n.config?.agentId || n.id || n.node_id).filter(Boolean);

      // ── Seed AgentTask rows from the real Task records linked to graph task nodes ──
      // Each taskNode stores data.taskId  Ethe ID of the real Task in the tasks table.
      // We look up those Tasks and create AgentTask entries so the swarm coordinator
      // has work to pick up on the very first cycle.
      const taskIds = taskNodes
        .map((n: any) => n.data?.taskId)
        .filter(Boolean) as string[];

      if (taskIds.length > 0) {
        // Fetch the real Task records
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

        // Only create AgentTask rows that don't already exist for this session
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

        // Topologically sort toCreate based on dependencies so upstream tasks execute first
        const sortedToCreate: any[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (taskId: string) => {
          if (visited.has(taskId)) return;
          if (visiting.has(taskId)) return; // Cycle detected, ignore
          visiting.add(taskId);

          const task = toCreate.find(t => t.id === taskId);
          if (task && task.dependencies) {
            for (const dep of task.dependencies) {
              if (toCreate.some(t => t.id === dep.dependsOnId)) {
                visit(dep.dependsOnId); // Visit dependencies first
              }
            }
          }

          visiting.delete(taskId);
          visited.add(taskId);
          if (task) {
            sortedToCreate.push(task);
          }
        };

        for (const t of toCreate) {
          visit(t.id);
        }
        toCreate = sortedToCreate;

        if (toCreate.length > 0) {
          const now = Date.now();

          // Generate deterministic IDs for the AgentTasks mapping from the original Task ID
          // to preserve dependency relationships
          const idMap = new Map<string, string>();
          for (const t of toCreate) {
            idMap.set(t.id, randomUUID());
          }

          await Promise.all(
            toCreate.map((t, idx) => {
              const agentTaskId = idMap.get(t.id)!;

              // Only consider dependencies that are ALSO being seeded in this session
              const dependsOn = t.dependencies
                ?.map((d: any) => idMap.get(d.dependsOnId))
                .filter(Boolean) as string[] || [];

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
                  createdAt: new Date(now + idx * 1000), // Stagger by 1s to enforce execution order among peers
                },
              });
            })
          );
          console.log(`[SwarmStart] Seeded ${toCreate.length} AgentTask(s) from Task table for session ${sessionId}`);
        }
      } else {
        console.log(`[SwarmStart] No linked tasks found in graph for workforce ${workforceId}  Ecoordinator will wait for user messages`);
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  /**
   * POST /v1/agents/swarm/:sessionId/stop
   * Gracefully stops a running swarm session.
   */
  @Post('swarm/:sessionId/stop')
  async stopSwarm(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      const session = await swarmOrchestrationService.getSession(sessionId);
      if (session?.workspaceId) {
        const [isOwner, isMember] = await Promise.all([
          prisma.workspace.findFirst({ where: { id: session.workspaceId, ownerId: userId }, select: { id: true } }),
          prisma.workspaceMember.findFirst({ where: { workspaceId: session.workspaceId, userId }, select: { id: true } }),
        ]);
        if (!isOwner && !isMember) return res.status(403).json({ error: 'Access denied' });
      }
      await swarmOrchestrationService.stopSwarm(sessionId);
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmStop] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /v1/agents/swarm/:sessionId/status
   * Returns the current status of the swarm session.
   */
  @Get('swarm/:sessionId/status')
  async getSwarmStatus(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const userId = req.userId!;
      const session = await swarmOrchestrationService.getSession(sessionId);
      if (session?.workspaceId) {
        const [isOwner, isMember] = await Promise.all([
          prisma.workspace.findFirst({ where: { id: session.workspaceId, ownerId: userId }, select: { id: true } }),
          prisma.workspaceMember.findFirst({ where: { workspaceId: session.workspaceId, userId }, select: { id: true } }),
        ]);
        if (!isOwner && !isMember) return res.status(403).json({ error: 'Access denied' });
      }
      if (session) {
        return res.json({ status: session.status, workspaceId: session.workspaceId });
      }
      return res.json({ status: 'idle' });
    } catch (error) {
      console.error('[SwarmStatus] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /v1/agents/swarm/:sessionId/events
   * SSE stream  Epushes swarm cycle events to the browser in real-time.
   */
  @Get('swarm/:sessionId/events')
  async swarmEvents(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    // Auth check before opening SSE stream
    const userId = req.userId!;
    const session = await swarmOrchestrationService.getSession(sessionId);
    if (session?.workspaceId) {
      const [isOwner, isMember] = await Promise.all([
        prisma.workspace.findFirst({ where: { id: session.workspaceId, ownerId: userId }, select: { id: true } }),
        prisma.workspaceMember.findFirst({ where: { workspaceId: session.workspaceId, userId }, select: { id: true } }),
      ]);
      if (!isOwner && !isMember) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
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
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      } catch { }
    };

    swarmOrchestrationService.eventBus.on('swarm.event', send);

    req.on('close', () => {
      swarmOrchestrationService.eventBus.off('swarm.event', send);
    });
  }

  /**
   * POST /v1/agents/swarm/:sessionId/message
   * @deprecated Use swarmMessageStream instead  Ethis endpoint bypasses intent routing.
   * Kept for backwards compatibility. Routes all messages as TASK_CREATE directly.
   */
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

  /**
   * POST /v1/agents/swarm/:sessionId/message-stream
   * Streams the response to user questions/requests using BuilderProgressEmitter.
   */
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

      if (!wid) {
        emitter.error('Workspace ID not found');
        return;
      }

      // ── #2: Authorize  Everify userId owns or is a member of this workspace ──
      const [isOwner, isMember] = await Promise.all([
        prisma.workspace.findFirst({ where: { id: wid, ownerId: userId }, select: { id: true } }),
        prisma.workspaceMember.findFirst({ where: { workspaceId: wid, userId }, select: { id: true } }),
      ]);
      if (!isOwner && !isMember) {
        emitter.error('Access denied');
        return;
      }

      // Persist USER message to DB
      const savedUserMessage = await prisma.aiMessage.create({
        data: {
          conversationId: sessionId,
          role: 'USER',
          content: message,
          metadata: {
            source: 'swarm_interrupt_stream',
            contexts,
            mentions,
          }
        }
      });

      await prisma.aiConversation.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      }).catch(() => null);

      // Route the message through our enterprise-grade router
      const { responderName, responseContent, intent } = await routeSwarmMessage({
        sessionId,
        workspaceId: wid,
        userId,
        message,
        mentions,
        emitter,
        excludeMessageId: savedUserMessage.id,
      });

      // Save ASSISTANT message to database
      await prisma.aiMessage.create({
        data: {
          conversationId: sessionId,
          role: 'ASSISTANT',
          content: responseContent,
          metadata: {
            responder: responderName,
            source: 'swarm_assistant_response',
            intent: intent.type,
          }
        }
      });

      await prisma.aiConversation.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      }).catch(() => null);

      emitter.complete({
        responder: responderName
      });

    } catch (err: any) {
      console.error('[SwarmMessageStream] Error:', err);
      const isAuthError = err?.message?.startsWith('Unauthorized') || err?.code === 'UNAUTHORIZED' || err?.message?.startsWith('Access denied');
      emitter.error(isAuthError ? 'Access denied' : (err?.message || 'Internal server error'));
    }
  }

  /**
   * GET /v1/agents/swarm/tasks?sessionId=...
   * Returns agent tasks associated with a swarm session.
   */
  @Get('swarm/tasks')
  async swarmTasks(
    @Query('sessionId') sessionId: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const where: any = {
        status: { in: ['PENDING', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'PENDING_APPROVAL'] },
      };
      if (sessionId) {
        where.metadata = { path: ['sessionId'], equals: sessionId };
      }
      const tasks = await (prisma.agentTask as any).findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return res.json({ tasks });
    } catch (error) {
      console.error('[SwarmTasks] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /v1/agents/swarm/tasks/:taskId/approve
   * Approves a PENDING_APPROVAL task and moves it to PENDING.
   */
  @Post('swarm/tasks/:taskId/approve')
  async approveSwarmTask(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const task = await (prisma.agentTask as any).findFirst({
        where: { id: taskId },
        select: { workspaceId: true },
      });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const userId = req.userId!;
      const hasAccess = await prisma.workspace.findFirst({
        where: {
          id: task.workspaceId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      });
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

      await (prisma.agentTask as any).update({
        where: { id: taskId },
        data: { status: 'PENDING', updatedAt: new Date() },
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmApprove] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /v1/agents/swarm/tasks/:taskId/deny
   * Denies a PENDING_APPROVAL task and marks it as FAILED.
   */
  @Post('swarm/tasks/:taskId/deny')
  async denySwarmTask(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    try {
      const task = await (prisma.agentTask as any).findFirst({
        where: { id: taskId },
        select: { workspaceId: true },
      });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const userId = req.userId!;
      const hasAccess = await prisma.workspace.findFirst({
        where: {
          id: task.workspaceId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      });
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

      await (prisma.agentTask as any).update({
        where: { id: taskId },
        data: { status: 'FAILED', updatedAt: new Date() },
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error('[SwarmDeny] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── Workforce Endpoints ────────────────────────────────────────────────────

  @Post('workforces/:workforceId/run')
  async runWorkforceEndpoint(
    @Param('workforceId') workforceId: string,
    @Body() body: { task?: string; input?: Record<string, unknown> },
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        task: z.string().optional(),
        input: z.record(z.unknown()).optional(),
      });
      const parsed = schema.parse(body ?? {});
      const userId = req.userId!;

      const workforce = await prisma.workforce.findFirst({
        where: {
          id: workforceId,
          createdBy: userId,
        },
      });
      if (!workforce) {
        return res.status(404).json({ error: 'Workforce not found' });
      }

      const input = { task: parsed.task, ...parsed.input };
      const result = await runWorkforce(workforceId, input, userId);
      return res.json(result);
    } catch (error) {
      console.error('Error running workforce:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  /**
   * POST /v1/agents/tools/editor-assistant/message-stream
   * POST /v1/agents/workforces/editor-assistant/message-stream
   *
   * SSE endpoints that mirror the Agent Builder stream format for the editor
   * assistant (Tool / Workforce). We currently stream progress steps and the
   * final payload (assistantText + proposedOps); response text is not streamed
   * token-by-token yet.
   */
  @Post('tools/editor-assistant/message-stream')
  async toolEditorAssistantStream(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    return this.editorAssistantStreamInternal('tool', req, res);
  }

  @Post('workforces/editor-assistant/message-stream')
  async workforceEditorAssistantStream(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    return this.editorAssistantStreamInternal('workforce', req, res);
  }

  private async editorAssistantStreamInternal(
    mode: 'tool' | 'workforce',
    req: AuthenticatedRequest,
    res: ExpressResponse,
  ) {
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    try {
      const schema = z.object({
        conversationId: z.string().min(1),
        message: z.string().min(1),
        context: z.unknown(),
      });

      const body = schema.parse(req.body ?? {});
      const userId = req.userId!;

      emitter.thinking(
        mode === 'tool'
          ? 'Analyzing current tool configuration…'
          : 'Analyzing current workforce graph…',
        mode === 'tool' ? 'TOOL_EDITOR' : 'WORKFORCE_EDITOR',
      );

      const conversation = await prisma.aiConversation.findFirst({
        where: {
          id: body.conversationId,
          userId,
          conversationType:
            mode === 'tool'
              ? 'TOOL_BUILDER'
              : 'WORKFORCE_BUILDER',
        },
        select: { id: true },
      });

      if (!conversation) {
        emitter.error('Conversation not found or access denied');
        return;
      }

      emitter.thinking(
        'Drafting proposed changes…',
        mode === 'tool' ? 'TOOL_EDITOR' : 'WORKFORCE_EDITOR',
      );

      const result = await runEditorAssistantMessage({
        mode,
        userId,
        conversationId: body.conversationId,
        message: body.message,
        context: body.context,
        onToken: (t) => emitter.token(t),
      });

      const followups = this.buildEditorFollowups(mode);
      const actions = this.buildEditorActions(mode);

      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: mode } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: {
          messageCount: { increment: 2 }, // user + assistant
          lastMessageAt: new Date(),
        },
      });

      emitter.complete({
        assistantText: result.assistantText,
        proposedOps: result.proposedOps,
        followups,
        actions,
      });
    } catch (error: any) {
      console.error('Error in editor assistant stream:', error);
      if (error instanceof z.ZodError) {
        emitter.error('Invalid editor assistant request.');
      } else {
        emitter.error(error?.message || 'Internal server error');
      }
    }
  }

  /**
   * POST /v1/agents/tools/editor-assistant/message
   * POST /v1/agents/workforces/editor-assistant/message
   *
   * Shared editor assistant for Tool & Workforce builders.
   * Returns strict JSON { assistantText, proposedOps } where proposedOps
   * are validated ToolOp / WorkforceOp objects.
   */
  @Post('tools/editor-assistant/message')
  async toolEditorAssistantMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    return this.editorAssistantMessageInternal('tool', req, res);
  }

  @Post('workforces/editor-assistant/message')
  async workforceEditorAssistantMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    return this.editorAssistantMessageInternal('workforce', req, res);
  }

  private async editorAssistantMessageInternal(
    mode: 'tool' | 'workforce',
    req: AuthenticatedRequest,
    res: ExpressResponse,
  ) {
    try {
      const schema = z.object({
        conversationId: z.string().min(1),
        message: z.string().min(1),
        context: z.unknown(),
      });

      const body = schema.parse(req.body ?? {});
      const userId = req.userId!;

      // Ensure the conversation belongs to this user and matches the editor mode.
      const conversation = await prisma.aiConversation.findFirst({
        where: {
          id: body.conversationId,
          userId,
          conversationType:
            mode === 'tool'
              ? 'TOOL_BUILDER'
              : 'WORKFORCE_BUILDER',
        },
        select: { id: true },
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      const result = await runEditorAssistantMessage({
        mode,
        userId,
        conversationId: body.conversationId,
        message: body.message,
        context: body.context,
      });

      const followups = this.buildEditorFollowups(mode);

      // Persist assistant message with proposedOps metadata for frontend to consume.
      await prisma.aiMessage.create({
        data: {
          conversationId: body.conversationId,
          role: 'ASSISTANT',
          content: result.assistantText,
          metadata: { proposedOps: result.proposedOps, followups, editorMode: mode } as any,
        },
      });

      await prisma.aiConversation.update({
        where: { id: body.conversationId },
        data: {
          messageCount: { increment: 2 }, // user + assistant
          lastMessageAt: new Date(),
        },
      });

      return res.json(result);
    } catch (error) {
      console.error('Error in editor assistant message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * POST /v1/agents/workforces/:workforceId/run-stream
   *
   * SSE endpoint that streams high-level progress for a workforce run.
   * Uses the same SSE wire format as the builder stream (thinking / complete / error).
   */
  @Post('workforces/:workforceId/run-stream')
  async runWorkforceStream(
    @Param('workforceId') workforceId: string,
    @Body() body: {
      task?: string;
      input?: Record<string, unknown>;
      conversationId?: string;
      messages?: Array<{ role: string; content: string }>;
    },
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    const schema = z.object({
      task: z.string().min(1),
      input: z.record(z.unknown()).optional(),
      conversationId: z.string().optional(),
      messages: z
        .array(z.object({ role: z.string(), content: z.string() }))
        .optional(),
    });

    let parsed: z.infer<typeof schema>;
    try {
      parsed = schema.parse(body ?? {});
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();
    emitter.thinking('Starting workforce run', undefined);

    req.on('close', () => {
      emitter.end();
    });

    try {
      const workforce = await prisma.workforce.findFirst({
        where: {
          id: workforceId,
          createdBy: userId,
        },
      });
      if (!workforce) {
        emitter.error('Workforce not found or access denied');
        return;
      }

      const input = {
        task: parsed.task,
        conversationId: parsed.conversationId,
        messages: parsed.messages,
        ...parsed.input,
      };
      const result = await runWorkforce(workforceId, input, userId);
      const executionId = result.executionId;

      const { redisSub } = await import('@/lib/redis');
      const channel = `workforce:run:${executionId}`;

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
              if (typeof output.summary === 'string') {
                naturalSummary = output.summary;
              } else if (typeof output.text === 'string') {
                naturalSummary = output.text;
              }
            }
            if (!naturalSummary && stepEntries.length > 0) {
              const failedSteps = stepEntries.filter(([, value]) => value && typeof value === 'object' && (value.status === 'error' || value.status === 'FAILED' || !!value.error));
              if (failedSteps.length > 0) {
                naturalSummary = `One or more steps failed while running the workflow.`;
              } else {
                naturalSummary = `Successfully completed ${stepEntries.length} workflow steps.`;
              }
            }

            emitter.complete({
              executionId,
              workflowId: result.workflowId,
              status: data.status,
              steps,
              output,
              summary: naturalSummary || 'Execution completed.',
            });
          }
        } catch (e) {
          console.error('Error parsing redis message', e);
        }
      };

      redisSub.on('message', listener);
      await redisSub.subscribe(channel);

      req.on('close', () => {
        redisSub.unsubscribe(channel).catch(() => { });
        redisSub.removeListener('message', listener);
      });
    } catch (error) {
      console.error('Error running workforce (stream):', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      emitter.error(message);
    }
  }

  /**
   * GET /v1/agents/workforces/executions/:executionId
   * Returns workflow execution status for polling until RUNNING -> COMPLETED/FAILED.
   */
  @Get('workforces/executions/:executionId')
  async getWorkflowExecutionStatus(
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
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

      // Build a human-readable summary from the execution context when available.
      const ctx = (execution.context as any) || {};
      const steps = ctx.steps && typeof ctx.steps === 'object' ? ctx.steps : {};
      const stepEntries = Object.entries(steps as Record<string, any>);

      let naturalSummary: string | undefined;
      const output = ctx.output as any;
      if (output && typeof output === 'object') {
        if (typeof output.summary === 'string') {
          naturalSummary = output.summary;
        } else if (typeof output.text === 'string') {
          naturalSummary = output.text;
        }
      }

      // Fallback: derive a short explanation from step results.
      if (!naturalSummary && stepEntries.length > 0) {
        const skippedPlaceholders = stepEntries.filter(
          ([, value]) =>
            value &&
            typeof value === 'object' &&
            value.skipped === true &&
            value.reason === 'NO_EXECUTOR_PLACEHOLDER'
        );

        const failedSteps = stepEntries.filter(
          ([, value]) =>
            value &&
            typeof value === 'object' &&
            (value.status === 'error' || value.status === 'FAILED' || !!value.error)
        );

        const fragments: string[] = [];

        if (skippedPlaceholders.length > 0) {
          const ids = skippedPlaceholders.map(([id]) => id).join(', ');
          fragments.push(
            `Some workflow steps were configured as placeholders without an executor and were skipped (steps: ${ids}).`
          );
        }

        if (failedSteps.length > 0) {
          const ids = failedSteps.map(([id]) => id).join(', ');
          fragments.push(
            `One or more steps failed while running the workflow (steps: ${ids}).`
          );
        }

        if (fragments.length > 0) {
          naturalSummary = fragments.join(' ');
        }
      }

      return res.json({
        id: execution.id,
        status: execution.status,
        endTime: execution.endTime,
        error: execution.error,
        summary: naturalSummary ?? null,
        steps: steps,
        output: ctx.output ?? null,
      });
    } catch (error) {
      console.error('Error fetching workflow execution status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('execute')
  async execute(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const rateLimited = await checkRateLimit(
        {
          headers: {
            get: (key: string) => {
              const headerValue = req.headers[key.toLowerCase()];
              if (Array.isArray(headerValue)) {
                return headerValue[0];
              }
              return headerValue as string | undefined;
            },
          },
        },
        { RPM: 30, RPD: 500 }
      );

      if (rateLimited instanceof Response) {
        const text = await rateLimited.text();
        return res.status(rateLimited.status).type('application/json').send(text);
      }

      const schema = z.object({
        executionId: z.string().min(1),
        agentId: z.string().min(1),
        inputData: z.any().optional(),
        executionContext: z.any().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: body.executionId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId, canExecute: true },
                },
              },
            ],
          },
        },
        include: {
          aiAgent: {
            select: {
              id: true,
              isActive: true,
              status: true,
            },
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (!execution.aiAgent.isActive) {
        return res.status(400).json({ error: 'Agent is not active' });
      }

      await inngest.send({
        name: 'agent/execute',
        data: {
          executionId: body.executionId,
          agentId: body.agentId,
          userId,
          inputData: body.inputData || {},
          executionContext: body.executionContext || {},
        },
      });

      return res.status(202).json({
        success: true,
        executionId: execution.id,
        message: 'Agent execution started',
      });
    } catch (error) {
      console.error('Error executing agent:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Get('runs/:runId')
  async getRunResult(
    @Param('runId') runId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      // Fetch the async run result from Redis
      const result = await import('@/lib/redis').then(m => m.redis.get(`agent_run:${runId}`));
      if (result) {
        return res.json(JSON.parse(result));
      }
      return res.json({ status: 'running' });
    } catch (error) {
      console.error('Error fetching run result:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /v1/agents/runs/:runId/events
   *
   * Execution replay / decision trace endpoint  Ereturns the full AgentEvent[]
   * timeline for a given runId. Uses the durable AgentEvent store (Postgres +
   * Redis) and enforces that the requesting user matches the event tenant.
   */
  @Get('runs/:runId/events')
  async getRunEventsEndpoint(
    @Param('runId') runId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;
      const { getRunEvents } = await import('@/services/agents/execution/agentEventStore');
      const events = await getRunEvents(runId);

      if (events.length === 0) {
        return res.status(404).json({ error: 'No events found for run', runId });
      }

      // Enforce tenant boundary: all events for a run share the same tenant_id.
      const tenantId = events[0].tenant_id;
      if (tenantId !== userId) {
        return res.status(403).json({ error: 'Access denied for run events' });
      }

      return res.json({ runId, events });
    } catch (error) {
      console.error('Error fetching run events:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Get(':agentId/executions')
  async listExecutions(
    @Param('agentId') agentId: string,
    @Query('page') pageParam: string | undefined,
    @Query('pageSize') pageSizeParam: string | undefined,
    @Query('status') status: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;
      const page = parseInt(pageParam as string) || 1;
      const pageSize = Math.min(parseInt(pageSizeParam as string) || 20, 50);

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId },
              },
            },
          ],
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found or access denied' });
      }

      const where: any = { agentId };
      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * pageSize;

      const [total, items] = await Promise.all([
        prisma.agentExecution.count({ where }),
        prisma.agentExecution.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          skip,
          take: pageSize,
          include: {
            agentExecutionSteps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        }),
      ]);

      return res.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error('Error fetching executions:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Get(':agentId/executions/:executionId')
  async getExecution(
    @Param('agentId') agentId: string,
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: executionId,
          agentId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId },
                },
              },
            ],
          },
        },
        include: {
          agentExecutionSteps: {
            orderBy: { stepNumber: 'asc' },
          },
          toolCalls: {
            include: {
              agentTool: true,
            },
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      return res.json(execution);
    } catch (error) {
      console.error('Error fetching execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/cancel/:executionId')
  async cancelExecution(
    @Param('agentId') agentId: string,
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: executionId,
          agentId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId, canExecute: true },
                },
              },
            ],
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (!['QUEUED', 'RUNNING'].includes(execution.status)) {
        return res.status(400).json({ error: 'Execution cannot be cancelled' });
      }

      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'Execution cancelled',
      });
    } catch (error) {
      console.error('Error cancelling execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('chat')
  async chat(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const schema = z.object({
        message: z.string().min(1),
        conversationId: z.string().optional(),
        workspaceId: z.string().optional(),
        agentId: z.string().min(1),
        context: z.any().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      // Validate agent exists and user has access
      // Note: Allow DRAFT agents during creation, not just active ones
      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: body.agentId,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId, canExecute: true } } }
          ]
        }
      });

      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found or access denied',
          message: 'The specified agent does not exist or you do not have access to it.'
        });
      }

      const execution = await prisma.agentExecution.create({
        data: {
          id: randomUUID(),
          agentId: body.agentId,
          triggeredBy: 'MANUAL',
          triggerUserId: userId,
          inputData: { message: body.message, context: body.context },
          status: 'QUEUED',
          startedAt: new Date(),
        },
      });

      const permissionService = new PermissionService();
      const guardrailService = new GuardrailService(permissionService);
      const graph = createAgentGraph(guardrailService);
      const initialState = {
        executionId: execution.id,
        userId: userId,
        agentId: body.agentId,
        message: body.message,
        conversationId: body.conversationId,
        workspaceId: body.workspaceId || agent.workspaceId,
        status: 'PENDING' as const,
      };

      const result = await graph.invoke(initialState as any);

      // Map graph status to DB execution status
      let executionStatus: any = 'FAILED';
      if (result.status === 'COMPLETED') {
        executionStatus = 'COMPLETED';
      } else if (result.status === 'WAITING_APPROVAL') {
        executionStatus = 'PENDING_APPROVAL';
      } else if (result.status === 'RUNNING') {
        executionStatus = 'RUNNING';
      }

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: executionStatus,
          outputData: result,
          // Store plan for resumability
          executionContext: result.plan ? { plan: result.plan, intent: result.intent } : undefined,
          completedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(executionStatus) ? new Date() : undefined,
          reasoning: result.intent ? [result.intent] : [],
          requiresApproval: result.approvalRequest ? true : false,
          approvalStatus: result.approvalRequest ? 'PENDING' : undefined,
        },
      });

      return res.json({
        executionId: execution.id,
        response: result.response || 'Processing complete',
        intent: result.intent,
        plan: result.plan,
        requiresApproval: result.plan?.requiresApproval || false,
        approvalRequest: result.approvalRequest,
        contextUsed: result.plan?.contextUsed || [],
        conversationId: body.conversationId || `conv_${Date.now()}`,
        status: result.status,
      });
    } catch (error) {
      console.error('Error in chat:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Agent Operator endpoints
  @Post(':agentId/operator/initialize')
  async initializeOperator(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.initializeConversation(
        userId,
        agentId,
        body.conversationId,
        body.skipWelcome
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentOperator] Error initializing operator:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
        error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
      return res.status(statusCode).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/operator/message')
  async operatorMessage(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
        message: z.string().min(1),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentOperator] Error processing operator message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/operator/chat')
  async operatorChat(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        message: z.string().min(1),
        workspaceId: z.string().optional(),
        conversationId: z.string().optional(),
        context: z.any().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      // If conversationId is provided, use processMessage; otherwise initialize first
      if (body.conversationId) {
        const result = await agentOperatorService.processMessage(
          body.conversationId,
          agentId,
          body.message,
          userId
        );
        return res.json(result);
      } else {
        // Initialize conversation first, then process message
        const initResult = await agentOperatorService.initializeConversation(
          userId,
          agentId,
          undefined,
          true // Skip welcome for chat
        );

        const result = await agentOperatorService.processMessage(
          initResult.conversationId,
          agentId,
          body.message,
          userId
        );
        return res.json(result);
      }
    } catch (error) {
      console.error('[AgentOperator] Error in operator chat:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/operator/apply')
  async operatorApply(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        patch: z.record(z.any()),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.applySuggestedChanges(agentId, userId, body.patch);
      return res.json(result);
    } catch (error) {
      console.error('[AgentOperator] Error applying patch:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/operator/execute')
  async operatorExecute(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        inputData: z.any().optional(),
        executionContext: z.any().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.triggerExecution(
        agentId,
        userId,
        body.inputData,
        body.executionContext
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentOperator] Error triggering execution:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/operator/launch')
  async operatorLaunch(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.launchAgent(body.conversationId, userId);

      return res.json(result);
    } catch (error) {
      console.error('[AgentOperator] Error launching agent:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Agent Executor endpoints
  @Post(':agentId/executor/initialize')
  async initializeExecutor(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentExecutorService.initializeConversation(
        userId,
        agentId,
        body.conversationId,
        body.skipWelcome
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentExecutor] Error initializing executor:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
        error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
      return res.status(statusCode).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/executor/message')
  async executorMessage(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
        message: z.string().min(1),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentExecutorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentExecutor] Error processing executor message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/executor/chat')
  async executorChat(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        message: z.string().min(1),
        conversationId: z.string().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      if (body.conversationId) {
        const result = await agentExecutorService.processMessage(
          body.conversationId,
          agentId,
          body.message,
          userId
        );
        return res.json(result);
      } else {
        const initResult = await agentExecutorService.initializeConversation(
          userId,
          agentId,
          undefined,
          true
        );

        const result = await agentExecutorService.processMessage(
          initResult.conversationId,
          agentId,
          body.message,
          userId
        );
        return res.json(result);
      }
    } catch (error) {
      console.error('[AgentExecutor] Error in executor chat:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/executor/execute')
  async executorExecute(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        inputData: z.any().optional(),
        executionContext: z.any().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentExecutorService.triggerExecution(
        agentId,
        userId,
        body.inputData,
        body.executionContext
      );

      return res.json(result);
    } catch (error) {
      console.error('[AgentExecutor] Error triggering execution:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Agent Builder endpoints
  @Post(':agentId/builder/initialize')
  async initializeBuilder(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      // Log for debugging
      console.log('[AgentBuilder] Initialize request:', {
        userId,
        conversationId: body.conversationId || 'NEW',
        agentId: agentId || 'NONE', // Use agentId from param
        skipWelcome: body.skipWelcome || false,
      });

      // Handle "new" or placeholder agentId if needed, but existing logic supports string | undefined.
      // If agentId is passed in route, we use it.
      const targetAgentId = agentId === 'new' ? undefined : agentId;

      const result = await agentBuilderService.initializeConversation(
        userId,
        body.conversationId,
        targetAgentId,
        body.skipWelcome || false,
      );

      console.log('[AgentBuilder] Initialize result:', {
        conversationId: result.conversationId,
        hasState: !!result.conversationState,
        stage: result.conversationState?.stage,
      });

      return res.json(result);
    } catch (error) {
      console.error('[AgentBuilder] Error initializing builder:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
        error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
      return res.status(statusCode).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/builder/message')
  async builderMessage(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
        message: z.string().min(1),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      // Route through Inngest-backed async workflow, matching Executor/Operator.
      // The caller can poll /v1/agents/runs/:runId for status and result.
      const { runId } = await agentBuilderService.processMessageAsync(
        body.conversationId,
        body.message,
        userId
      );

      return res.json({ runId });
    } catch (error) {
      console.error('Error processing builder message:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /:agentId/builder/message-stream
   *
   * SSE variant of the builder message endpoint. Opens a keep-alive stream and
   * emits `thinking` events as processing happens, followed by a final `complete`
   * event containing the same payload that the non-streaming endpoint returns.
   *
   * Wire format (newline-delimited JSON over text/event-stream):
   *   data: {"type":"thinking","step":"...","node":"BEHAVIOR","timestamp":1234}\n\n
   *   data: {"type":"complete","payload":{...},"timestamp":1234}\n\n
   *   data: {"type":"error","message":"...","timestamp":1234}\n\n
   */
  @Post(':agentId/builder/message-stream')
  async builderMessageStream(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    const schema = z.object({
      conversationId: z.string(),
      message: z.string().min(1),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    // Immediately send a heartbeat so the client knows the connection is live
    emitter.thinking('Starting...', undefined);

    // Handle client disconnect gracefully
    req.on('close', () => {
      // emitter.end() is a no-op if already closed  Esafe to call multiple times
      emitter.end();
    });

    try {
      const result = await agentBuilderService.processMessage(
        body.conversationId,
        body.message,
        userId,
        // Progress callback: thinking steps
        (step: string, node?: string) => emitter.thinking(step, node),
        // Token callback: each streamed LLM response character
        (text: string) => emitter.token(text)
      );

      // Send the final metadata  Eresponse text was already streamed token-by-token,
      // so we strip it from the complete payload to keep the event small.
      const { response: _stripped, ...metaPayload } = result as any;
      emitter.complete(metaPayload as Record<string, unknown>);
    } catch (error) {
      console.error('[AgentBuilder] SSE stream error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      emitter.error(message);
    }
  }

  // ─── Executor: SSE message stream ─────────────────────────────────────────
  @Post(':agentId/executor/message-stream')
  async executorMessageStream(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    const schema = z.object({
      conversationId: z.string(),
      message: z.string().min(1),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;

    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    // End stream if client disconnects early
    req.on('close', () => {
      // Stream is over.
    });

    try {
      const result = await agentExecutorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId
      );

      const runId = result.runId;
      const { redisSub } = await import('@/lib/redis');
      const channel = `agent_run:${runId}`;

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
            const { response: _stripped, ...metaPayload } = data.payload || {};
            emitter.complete(metaPayload as Record<string, unknown>);
          }
        } catch (e) {
          console.error('[AgentExecutor] Error parsing redis message', e);
        }
      };

      redisSub.on('message', listener);
      await redisSub.subscribe(channel);

      req.on('close', () => {
        redisSub.unsubscribe(channel).catch(() => { });
        redisSub.removeListener('message', listener);
      });
    } catch (error) {
      console.error('[AgentExecutor] Flow error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      emitter.error(message);
    }
  }

  // ─── Operator: SSE message stream ─────────────────────────────────────────
  @Post(':agentId/operator/message-stream')
  async operatorMessageStream(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    const schema = z.object({
      conversationId: z.string(),
      message: z.string().min(1),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;

    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    // End stream if client disconnects early
    req.on('close', () => {
      // Stream is over.
    });

    try {
      const result = await agentOperatorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId
      );

      const runId = result.runId;
      const { redisSub } = await import('@/lib/redis');
      const channel = `agent_run:${runId}`;

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
            const { response: _stripped, ...metaPayload } = data.payload || {};
            emitter.complete(metaPayload as Record<string, unknown>);
          }
        } catch (e) {
          console.error('[AgentOperator] Error parsing redis message', e);
        }
      };

      redisSub.on('message', listener);
      await redisSub.subscribe(channel);

      req.on('close', () => {
        redisSub.unsubscribe(channel).catch(() => { });
        redisSub.removeListener('message', listener);
      });
    } catch (error) {
      console.error('[AgentOperator] Flow error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      emitter.error(message);
    }
  }

  @Post(':agentId/builder/update-draft')
  async updateDraft(
    @Param('agentId') agentId: string,
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

      const result = await agentBuilderService.updateDraft(
        body.conversationId,
        body.draft,
        userId
      );

      return res.json(result);
    } catch (error) {
      console.error('Error updating draft:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post(':agentId/builder/launch')
  async launchAgent(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        conversationId: z.string(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentBuilderService.launchAgent(body.conversationId, userId);

      return res.json(result);
    } catch (error) {
      console.error('Error launching agent:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /v1/agents/composite-tools/:toolId/run
   *
   * Runs a composite tool by ID and streams progress via SSE.
   * Events: thinking, complete, error  Ematching the useToolRun frontend hook format.
   */
  @Post('composite-tools/:toolId/run')
  async runCompositeTool(
    @Param('toolId') toolId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse,
  ) {
    const emitter = new BuilderProgressEmitter(res);
    emitter.init();

    try {
      const schema = z.object({
        input: z.record(z.any()).optional().default({}),
        startStepId: z.string().optional(),
      });

      const body = schema.parse(req.body ?? {});
      const userId = req.userId!;

      // Verify the tool exists and belongs to this user (or is accessible)
      const tool = await (prisma as any).compositeTool.findFirst({
        where: {
          id: toolId,
          OR: [
            { ownerId: userId },
          ],
        },
        select: { id: true, name: true },
      });

      if (!tool) {
        emitter.error('Tool not found or access denied');
        return;
      }

      emitter.thinking(`Starting tool: ${tool.name}`, 'TOOL_RUNNER');

      const { compositeToolExecutionService } = await import('@/services/agents/execution/compositeToolExecutionService');

      await compositeToolExecutionService.execute(
        toolId,
        body.input,
        userId,
        (event) => {
          if (event.type === 'thinking') {
            const stepId = event.metadata?.stepId;
            emitter.thinking(event.content, stepId);
          } else if (event.type === 'token') {
            emitter.token(event.content);
          } else if (event.type === 'complete') {
            emitter.complete({ output: event.metadata?.result ?? event.metadata });
          } else if (event.type === 'error') {
            emitter.error(event.content);
          }
        },
      );
    } catch (error: any) {
      console.error('[composite-tools/run] Error:', error);
      emitter.error(error?.message || 'Internal server error');
    }
  }

  @Get('system-tools')
  async getSystemTools(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const tools = await getAllTools();

      // Map to frontend-friendly format
      const formattedTools = tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
      }));

      return res.json(formattedTools);
    } catch (error) {
      console.error('Error fetching system tools:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /v1/agents/executions/:executionId/approve
   * Approve a pending execution
   */
  @Post('executions/:executionId/approve')
  async approveExecution(
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      // Find execution and verify permission
      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: executionId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId, canExecute: true },
                },
              },
            ],
          },
        },
        include: {
          aiAgent: true,
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (execution.approvalStatus !== 'PENDING') {
        return res.status(400).json({ error: `Execution is not pending approval (status: ${execution.approvalStatus})` });
      }

      // Track approval wait time
      const waitTimeSeconds = (Date.now() - new Date(execution.startedAt).getTime()) / 1000;
      metrics.approvalWaitTime.observe({ agent_id: execution.agentId }, waitTimeSeconds);
      metrics.approvalActions.inc({ action: 'approved', agent_id: execution.agentId });

      // Update approval status
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          approvalStatus: 'APPROVED',
          status: 'QUEUED',  // Ready to resume
        },
      });

      return res.json({
        success: true,
        executionId,
        message: 'Execution approved. Use /run to resume execution.',
      });
    } catch (error) {
      console.error('Error approving execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /v1/agents/executions/:executionId/reject
   * Reject a pending execution
   */
  @Post('executions/:executionId/reject')
  async rejectExecution(
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        reason: z.string().optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      // Find execution and verify permission
      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: executionId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId, canExecute: true },
                },
              },
            ],
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (execution.approvalStatus !== 'PENDING') {
        return res.status(400).json({ error: `Execution is not pending approval (status: ${execution.approvalStatus})` });
      }

      // Track rejection
      metrics.approvalActions.inc({ action: 'rejected', agent_id: execution.agentId });

      // Update approval status
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          approvalStatus: 'REJECTED',
          status: 'CANCELLED',
          error: body.reason || 'Rejected by user',
          completedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        executionId,
        message: 'Execution rejected and cancelled.',
      });
    } catch (error) {
      console.error('Error rejecting execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /v1/agents/executions/:executionId/run
   * Resume an approved execution
   */
  @Post('executions/:executionId/run')
  async runExecution(
    @Param('executionId') executionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const userId = req.userId!;

      // Find execution and verify permission
      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: executionId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId, canExecute: true },
                },
              },
            ],
          },
        },
        include: {
          aiAgent: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (!execution.aiAgent.isActive) {
        return res.status(400).json({ error: 'Agent is not active' });
      }

      if (execution.approvalStatus !== 'APPROVED') {
        return res.status(400).json({
          error: `Execution must be approved before running (status: ${execution.approvalStatus})`,
        });
      }

      // Enqueue execution with BullMQ (via Inngest for now)
      await inngest.send({
        name: 'agent/execute',
        data: {
          executionId: execution.id,
          agentId: execution.agentId,
          userId,
          inputData: execution.inputData || {},
          executionContext: execution.executionContext || {},
          isResume: true,  // Flag to indicate this is a resume
        },
      });

      // Update status to RUNNING
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
        },
      });

      return res.status(202).json({
        success: true,
        executionId: execution.id,
        message: 'Execution resumed and queued for processing',
      });
    } catch (error) {
      console.error('Error running execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Agent Hiring Endpoints
  @Get('hiring/roles')
  async getHiringRoles(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
    try {
      const roles = agentHiringService.getAvailableRoles();
      return res.json(roles);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  @Post('projects/:projectId/hire')
  async hireAgent(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const schema = z.object({
        department: z.nativeEnum(AgentDepartment)
      });
      const body = schema.parse(req.body);
      const userId = req.userId!;

      const agent = await agentHiringService.hireAgentForProject(projectId, body.department, userId);
      return res.json(agent);
    } catch (error) {
      console.error('[AgentHiring] Error hiring agent:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  @Get('projects/:projectId/agents')
  async getProjectAgents(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: ExpressResponse
  ) {
    try {
      const agents = await agentHiringService.getProjectAgents(projectId);
      return res.json(agents);
    } catch (error) {
      console.error('[AgentHiring] Error fetching project agents:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
