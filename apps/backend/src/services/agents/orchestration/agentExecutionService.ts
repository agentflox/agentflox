import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { createAgentGraph } from './agentGraph';
import { AGENT_CONSTANTS } from '../constants/agentConstants';
import { redis } from '@/lib/redis';
import { PermissionService } from '../../permissions/permission.service';
import { GuardrailService } from '../safety/guardrailService';

export interface ExecuteChatParams {
  userId: string;
  agentId?: string;
  message: string;
  conversationId?: string;
  workspaceId?: string;
  context?: any;
}

export interface AgentExecutionResult {
  status: 'COMPLETED' | 'FAILED';
  response?: string;
  intent?: any;
  plan?: any;
  executionResults?: any[];
  approvalRequest?: any;
  error?: string;
}

@Injectable()
export class AgentExecutionService {

  /**
   * Validate execution boundaries (Safety, Policy, Capacity)
   */
  private async validateExecutionBoundaries(userId: string, agentId?: string): Promise<void> {
    // 1. Capacity Check (Concurrent Executions)
    if (agentId) {
      const activeExecutionsKey = `agent:active_executions:${agentId}`;
      const activeCount = await redis.scard(activeExecutionsKey);

      // Hard limit of 10 concurrent runs per agent for now (can be config driven)
      if (activeCount >= 10) {
        throw new Error('Agent capacity exceeded. Too many concurrent executions.');
      }
    }

    // 2. Global User Rate Limit
    const userRateKey = `user:execution_rate:${userId}`;
    const userRate = await redis.incr(userRateKey);
    if (userRate === 1) await redis.expire(userRateKey, 60);

    if (userRate > 50) { // 50 runs per minute
      throw new Error('User execution rate limit exceeded.');
    }

    // 3. Agent Status Check
    if (agentId && agentId !== 'chat-agent' && agentId !== 'undefined' && agentId !== 'null') {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { status: true, isActive: true, isPaused: true }
      });

      if (agent) {
        if (!agent.isActive || agent.isPaused || !['ACTIVE', 'RECONFIGURING', 'EXECUTING'].includes(agent.status)) {
          throw new Error(`Agent (ID: ${agentId}) is not active, paused, or currently unavailable (Status: ${agent.status}).`);
        }
      } else if (agentId.includes('-')) {
        // Only throw for UUID-like IDs that weren't found. 
        // Simple strings like 'chat-agent' or tool names are allowed to skip.
        console.warn(`[AgentExecution] Agent ID ${agentId} provided but not found in database.`);
      }
    }
  }

  /**
   * Execute agent chat interaction
   */
  async executeChat(params: ExecuteChatParams): Promise<AgentExecutionResult> {
    try {

      // Validate Boundaries FIRST
      await this.validateExecutionBoundaries(params.userId, params.agentId);

      // Get agent configuration if agentId is provided
      let agent = null;
      if (params.agentId) {
        agent = await prisma.aiAgent.findUnique({
          where: { id: params.agentId },
        });
      }

      // Create execution record
      const execution = await (prisma as any).agentExecution.create({
        data: {
          id: randomUUID(),
          agentId: params.agentId || 'chat-agent',
          triggeredBy: 'MANUAL',
          triggerUserId: params.userId,
          inputData: { message: params.message, context: params.context },
          status: 'QUEUED',
          startedAt: new Date(),
        },
      });

      // Track Active Execution in Redis
      if (params.agentId) {
        await redis.sadd(`agent:active_executions:${params.agentId}`, execution.id);
      }

      try {
        // Create services manually (since this runs outside DI context often)
        const permissionService = new PermissionService();
        const guardrailService = new GuardrailService(permissionService);
        const graph = createAgentGraph(guardrailService);
        const initialState = {
          executionId: execution.id,
          userId: params.userId,
          agentId: params.agentId,
          message: params.message,
          conversationId: params.conversationId,
          workspaceId: params.workspaceId || agent?.workspaceId,
          status: 'PENDING' as const,
        };

        const result = await graph.invoke(initialState);

        // Update execution with result
        await (prisma as any).agentExecution.update({
          where: { id: execution.id },
          data: {
            status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
            outputData: result,
            completedAt: new Date(),
            reasoning: result.intent ? [result.intent] : [],
            error: result.status === 'FAILED' ? 'Execution failed' : null,
          },
        });

        // Cleanup Active Execution
        if (params.agentId) {
          await redis.srem(`agent:active_executions:${params.agentId}`, execution.id);
        }

        return {
          status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          response: result.response,
          intent: result.intent,
          plan: result.plan,
          executionResults: result.executionResults,
          approvalRequest: result.approvalRequest,
        };
      } catch (error) {
        // Cleanup Active Execution on failure
        if (params.agentId) {
          await redis.srem(`agent:active_executions:${params.agentId}`, execution.id);
        }

        // Update execution with error
        await (prisma as any).agentExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    } catch (error) {
      return {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute agent with specific configuration
   */
  async executeAgent(params: {
    agentId: string;
    userId: string;
    inputData?: any;
    executionContext?: any;
  }): Promise<AgentExecutionResult> {
    return this.executeChat({
      userId: params.userId,
      agentId: params.agentId,
      message: (params.inputData as any)?.message || 'Execute agent',
      workspaceId: undefined, // Will be fetched in executeChat
      context: params.executionContext,
    });
  }
}

/**
 * Execute agent logic - used by Inngest functions
 */
export async function executeAgentLogic(params: {
  executionId: string;
  agentId: string;
  userId: string;
  inputData?: any;
  executionContext?: any;
}): Promise<{ success: boolean; output?: any; error?: string }> {
  const service = new AgentExecutionService();

  try {
    const result = await service.executeAgent({
      agentId: params.agentId,
      userId: params.userId,
      inputData: params.inputData,
      executionContext: params.executionContext,
    });

    return {
      success: result.status === 'COMPLETED',
      output: result,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const agentExecutionService = new AgentExecutionService();
