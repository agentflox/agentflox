import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { inngest } from '@/lib/inngest';
import { checkRateLimit } from '@/utils/ai/checkRateLimit';
import { agentBuilderRateLimiter, agentBuilderInitRateLimiter, consumeRateLimit } from '@/lib/rateLimiter';
import { createAgentGraph, type AgentGraphState } from '@/services/agents/orchestration/agentGraph';
import { agentBuilderService, AgentBuilderError } from '@/services/agents/arch/agentBuilderService';
import { BuilderProgressEmitter } from '@/services/agents/arch/builderProgressEmitter';
import { AgentUpdateService } from '@/services/agents/core/agentUpdateService';
import { agentBuilderContextService } from '@/services/agents/state/agentBuilderContextService';
import { agentBuilderAssistantService } from '@/services/agents/core/agentBuilderAssistantService';
import { agentOperatorService } from '@/services/agents/arch/agentOperatorService';
import { agentExecutorService } from '@/services/agents/arch/agentExecutorService';
import { metrics } from '@/monitoring/metrics';
import { agentHiringService } from '@/services/agents/orchestration/agentHiringService';
import { AgentDepartment } from '@/services/agents/types/types';
import { agentSimulationService } from '@/services/agents/simulation/agentSimulationService';
import { GuardrailService } from '@/services/agents/safety/guardrailService';
import { PermissionService } from '@/services/permissions/permission.service';
import {
  assertProjectAccessForUser,
  assertSimulationAccess,
  assertAgentRunAccess,
  registerAgentRunOwner,
  assertAgentAccess,
} from '@/utils/http/resourceAccess';
import { ExecutionQuotaService } from '@/services/billing/executionQuota.service';
import { sendExecutionQuotaError } from '@/services/billing/executionQuota.http';

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

      await assertProjectAccessForUser(userId, body.projectId);
      for (const agentId of body.agentIds) {
        await assertAgentAccess(agentId, userId, 'execute');
      }

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
      const userId = req.userId!;
      await assertSimulationAccess(simulationId, userId);
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
      await assertSimulationAccess(simulationId, userId);
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
      await assertSimulationAccess(simulationId, userId);
      const summary = await agentSimulationService.summarizeSimulation(simulationId, userId);
      return res.json(summary);
    } catch (error) {
      console.error('Error summarizing simulation:', error);
      return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' });
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
              { ownerId: userId },
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
              name: true,
              isActive: true,
              status: true,
              workspaceId: true,
              spaceId: true,
            },
          },
        },
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found or access denied' });
      }

      if (execution.agentId !== body.agentId) {
        return res.status(400).json({ error: 'Agent ID does not match execution' });
      }

      if (!execution.aiAgent.isActive) {
        return res.status(400).json({ error: 'Agent is not active' });
      }

      await ExecutionQuotaService.consumeExecution(userId, body.executionId, 'agent', {
        rootRunId: body.executionId,
        context: {
          runId: body.executionId,
          agentId: execution.aiAgent.id,
          agentName: execution.aiAgent.name,
          workspaceId: execution.aiAgent.workspaceId,
          spaceId: execution.aiAgent.spaceId,
        },
      });

      await inngest.send({
        name: 'agent/execute',
        data: {
          executionId: body.executionId,
          agentId: body.agentId,
          userId,
          inputData: body.inputData || {},
          executionContext: body.executionContext || {},
          rootRunId: body.executionId,
        },
      });

      return res.status(202).json({
        success: true,
        executionId: execution.id,
        message: 'Agent execution started',
      });
    } catch (error) {
      console.error('Error executing agent:', error);

      if (sendExecutionQuotaError(res, error)) return;

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
      const userId = req.userId!;
      await assertAgentRunAccess(runId, userId);

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
            { ownerId: userId },
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
              { ownerId: userId },
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
              { ownerId: userId },
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
            { ownerId: userId },
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

      const billingKey = body.conversationId ?? execution.id;
      if (!body.conversationId) {
        console.warn('[AgentsController] metric=execution.chat.legacy_per_message_fallback', {
          userId,
          executionId: execution.id,
        });
      }

      await ExecutionQuotaService.consumeExecution(userId, billingKey, 'chat', {
        rootRunId: billingKey,
        context: {
          runId: execution.id,
          agentId: agent.id,
          agentName: agent.name,
          conversationId: body.conversationId,
          workspaceId: body.workspaceId || agent.workspaceId,
          spaceId: agent.spaceId,
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
      if (sendExecutionQuotaError(res, error)) return;
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
        contexts: z.array(z.object({
          type: z.string(),
          id: z.string(),
        })).optional(),
        mentions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['agent', 'task']),
        })).optional(),
        attachments: z.array(z.object({
          type: z.string(),
          filename: z.string(),
          content: z.string().optional(),
        })).optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentOperatorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId,
        { contexts: body.contexts, mentions: body.mentions, attachments: body.attachments }
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
      if (error instanceof AgentBuilderError) {
        const statusCode =
          error.code === 'AGENT_EXECUTOR_NO_CONVERSATION' ||
          error.code === 'AGENT_EXECUTOR_CONVERSATION_NOT_FOUND'
            ? 404
            : error.code === 'AGENT_EXECUTOR_UNAUTHORIZED' || error.code === 'PERMISSION_DENIED'
              ? 403
              : error.code === 'RATE_LIMIT_EXCEEDED'
                ? 429
                : 500;
        return res.status(statusCode).json({
          error: error.code,
          message: error.message,
          userMessage: error.userMessage,
        });
      }
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
        contexts: z.array(z.object({
          type: z.string(),
          id: z.string(),
        })).optional(),
        mentions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['agent', 'task']),
        })).optional(),
        attachments: z.array(z.object({
          type: z.string(),
          filename: z.string(),
          content: z.string().optional(),
        })).optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.userId!;

      const result = await agentExecutorService.processMessage(
        body.conversationId,
        agentId,
        body.message,
        userId,
        { contexts: body.contexts, mentions: body.mentions, attachments: body.attachments }
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
      }

      // No conversationId — load latest existing chat; do not create here.
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
      const userId = req.userId!;

      const rl = await consumeRateLimit(agentBuilderInitRateLimiter, userId, 'agent:builder:initialize');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const schema = z.object({
        conversationId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      });

      const body = schema.parse(req.body);

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
      if (targetAgentId) {
        await assertAgentAccess(targetAgentId, userId, 'write');
      }

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
      const userId = req.userId!;

      const rl = await consumeRateLimit(agentBuilderRateLimiter, userId, 'agent:builder:message');
      if (!rl.allowed) {
        return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
      }

      const schema = z.object({
        conversationId: z.string(),
        message: z.string().min(1),
        contexts: z.array(z.object({
          type: z.string(),
          id: z.string(),
        })).optional(),
        mentions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['agent', 'task']),
        })).optional(),
        attachments: z.array(z.object({
          type: z.string(),
          filename: z.string(),
          content: z.string().optional(),
        })).optional(),
      });

      const body = schema.parse(req.body);

      // Route through Inngest-backed async workflow, matching Executor/Operator.
      // The caller can poll /v1/agents/runs/:runId for status and result.
      const { runId } = await agentBuilderService.processMessageAsync(
        body.conversationId,
        body.message,
        userId,
        agentId,
        { contexts: body.contexts, mentions: body.mentions, attachments: body.attachments }
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
      contexts: z.array(z.object({
        type: z.string(),
        id: z.string(),
      })).optional(),
      mentions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['agent', 'task']),
      })).optional(),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;

    const rl = await consumeRateLimit(agentBuilderRateLimiter, userId, 'agent:builder:message-stream');
    if (!rl.allowed) {
      return res.status(429).json({ error: rl.error, retryAfter: rl.retryAfter });
    }
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
        (text: string) => emitter.token(text),
        { contexts: body.contexts, mentions: body.mentions }
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
      contexts: z.array(z.object({
        type: z.string(),
        id: z.string(),
      })).optional(),
      mentions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['agent', 'task']),
      })).optional(),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;
    const runId = randomUUID();
    await registerAgentRunOwner(runId, userId);
    const channel = `agent_run:${runId}`;

    const emitter = new BuilderProgressEmitter(res);
    emitter.init();
    emitter.thinking('Starting...', undefined);

    const { redisSub } = await import('@/lib/redis');

    const listener = (channelName: string, message: string) => {
      if (channelName !== channel) return;
      try {
        const data = JSON.parse(message);
        if (data.type === 'thinking') {
          emitter.thinking(data.message, data.node);
        } else if (data.type === 'token') {
          emitter.token(data.message);
        } else if (data.type === 'error') {
          redisSub.unsubscribe(channel).catch(() => { });
          redisSub.removeListener('message', listener);
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

    // Shim: runs executeWorkflow directly without Inngest for immediate streaming
    const shimStep = { run: async (_name: string, fn: () => any) => fn() };
    agentExecutorService.executeWorkflow(shimStep, {
      runId,
      conversationId: body.conversationId,
      agentId,
      message: body.message,
      userId,
      options: { contexts: body.contexts, mentions: body.mentions },
    }).catch((error: Error) => {
      console.error('[AgentExecutor] Direct workflow error:', error);
      redisSub.unsubscribe(channel).catch(() => { });
      redisSub.removeListener('message', listener);
      emitter.error(error.message || 'Unknown error');
    });
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
      contexts: z.array(z.object({
        type: z.string(),
        id: z.string(),
      })).optional(),
      mentions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['agent', 'task']),
      })).optional(),
    });

    let body: z.infer<typeof schema>;
    try {
      body = schema.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err });
    }

    const userId = req.userId!;
    const runId = randomUUID();
    await registerAgentRunOwner(runId, userId);
    const channel = `agent_run:${runId}`;

    const emitter = new BuilderProgressEmitter(res);
    emitter.init();
    emitter.thinking('Starting...', undefined);

    const { redisSub } = await import('@/lib/redis');

    const listener = (channelName: string, message: string) => {
      if (channelName !== channel) return;
      try {
        const data = JSON.parse(message);
        if (data.type === 'thinking') {
          emitter.thinking(data.message, data.node);
        } else if (data.type === 'token') {
          emitter.token(data.message);
        } else if (data.type === 'error') {
          redisSub.unsubscribe(channel).catch(() => { });
          redisSub.removeListener('message', listener);
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

    // Shim: runs executeWorkflow directly without Inngest for immediate streaming
    const shimStep = { run: async (_name: string, fn: () => any) => fn() };
    agentOperatorService.executeWorkflow(shimStep, {
      runId,
      conversationId: body.conversationId,
      agentId,
      message: body.message,
      userId,
      options: { contexts: body.contexts, mentions: body.mentions },
    }).catch((error: Error) => {
      console.error('[AgentOperator] Direct workflow error:', error);
      redisSub.unsubscribe(channel).catch(() => { });
      redisSub.removeListener('message', listener);
      emitter.error(error.message || 'Unknown error');
    });
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
              { ownerId: userId },
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
              { ownerId: userId },
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
              { ownerId: userId },
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
          isResume: true,
          billingExempt: true,
          rootRunId: execution.id,
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

      await assertProjectAccessForUser(userId, projectId);
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
      const userId = req.userId!;
      await assertProjectAccessForUser(userId, projectId);
      const agents = await agentHiringService.getProjectAgents(projectId);
      return res.json(agents);
    } catch (error) {
      console.error('[AgentHiring] Error fetching project agents:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
