/**
 * Tool Invocation Gate
 * 
 * THE SINGLE, NON-BYPASSABLE ENFORCEMENT POINT for all tool execution.
 * 
 * All tool calls MUST pass through this gate. It enforces:
 * - Schema validation
 * - Permission & scope checks
 * - Approval requirements
 * - Rate limiting & quotas
 * - Execution tracking & audit
 * 
 * CRITICAL: No code should bypass this gate to execute tools.
 */

import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import Ajv, { type ValidateFunction } from 'ajv';
import { randomUUID } from 'crypto';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { getToolById, getToolByName } from '../registry/toolRegistry';
import { metrics } from '@/monitoring/metrics';
import { GuardrailService } from '../safety/guardrailService';
import {
  CONTENT_CREATION_TOOLS,
  CODE_OPERATION_TOOLS,
  BROWSER_AUTOMATION_TOOLS,
  MEDIA_GENERATION_TOOLS,
  FILE_OPERATION_TOOLS
} from '../registry/skillTools';

// Map specific tools to required skills
const TOOL_SKILL_MAP: Record<string, string> = {};

function registerToolSkills(tools: any[], skillName: string) {
  tools.forEach(tool => {
    TOOL_SKILL_MAP[tool.name] = skillName;
  });
}

registerToolSkills(CONTENT_CREATION_TOOLS, 'content_creation');
registerToolSkills(CODE_OPERATION_TOOLS, 'code_operations');
registerToolSkills(BROWSER_AUTOMATION_TOOLS, 'browser_automation');
registerToolSkills(MEDIA_GENERATION_TOOLS, 'media_generation');
registerToolSkills(FILE_OPERATION_TOOLS, 'file_operations');
// Task management tools map to task_management
['createTask', 'updateTask', 'deleteTask', 'listTasks', 'getTask', 'assignTask'].forEach(tool => {
  TOOL_SKILL_MAP[tool] = 'task_management';
});

const ajv = new Ajv({ allErrors: true, strict: false });

export interface ToolInvocationRequest {
  executionId: string;
  agentId: string;
  userId: string;
  workspaceId?: string;
  toolName: string;
  parameters: Record<string, any>;
  stepId?: string;
}

export interface ToolInvocationResult {
  status: 'success' | 'failed' | 'approval_required';
  toolCallId: string;
  result?: any;
  error?: string;
  durationMs: number;
  approvalRequired?: boolean;
  approvalReason?: string;
}

export interface HealthCapabilities {
  canWrite: boolean;
  canRead: boolean;
  redisHealthy: boolean;
  dbHealthy: boolean;
}

@Injectable()
export class ToolInvocationGate {
  private rateLimiters: Map<string, RateLimiterRedis> = new Map();
  private validatorCache: Map<string, ValidateFunction> = new Map();

  constructor(private guardrailService: GuardrailService) { }

  /**
   * Check system health and determine capabilities
   */
  private async checkHealthCapabilities(): Promise<HealthCapabilities> {
    let redisHealthy = false;
    let dbHealthy = false;

    try {
      await redis.ping();
      redisHealthy = true;
      metrics.gateHealthChecks.inc({ component: 'redis', status: 'healthy' });
    } catch (error) {
      console.error('[ToolInvocationGate] Redis health check failed:', error);
      metrics.gateHealthChecks.inc({ component: 'redis', status: 'unhealthy' });
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
      metrics.gateHealthChecks.inc({ component: 'database', status: 'healthy' });
    } catch (error) {
      console.error('[ToolInvocationGate] DB health check failed:', error);
      metrics.gateHealthChecks.inc({ component: 'database', status: 'unhealthy' });
    }

    // Update degraded mode gauge
    if (!redisHealthy || !dbHealthy) {
      const reason = !redisHealthy && !dbHealthy ? 'redis_db_down' : !redisHealthy ? 'redis_down' : 'db_down';
      metrics.gateDegradedMode.set({ reason }, 1);
    } else {
      metrics.gateDegradedMode.set({ reason: 'none' }, 0);
    }

    // Degraded mode rules:
    // - Read-only allowed if DB is healthy
    // - Write operations require both Redis (for rate limiting) and DB
    return {
      redisHealthy,
      dbHealthy,
      canRead: dbHealthy,
      canWrite: redisHealthy && dbHealthy,
    };
  }

  /**
   * Determine if a tool is destructive/write operation
   */
  private isDestructiveTool(toolName: string): boolean {
    const destructiveTools = ['deleteTask', 'updateTask', 'createTask', 'deleteProject', 'updateProject'];
    return destructiveTools.includes(toolName);
  }

  /**
   * Get or create rate limiter for a specific key
   */
  private getRateLimiter(key: string, points: number, duration: number): RateLimiterRedis {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `rate_limit:${key}`,
        points,
        duration,
      }));
    }
    return this.rateLimiters.get(key)!;
  }

  /**
   * Validate tool parameters against JSON schema
   */
  private async validateParameters(tool: any, parameters: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const schema = tool.functionSchema.parameters;

      // Get or create validator
      let validator = this.validatorCache.get(tool.id);
      if (!validator) {
        validator = ajv.compile(schema);
        this.validatorCache.set(tool.id, validator);
      }

      const valid = validator(parameters);

      if (!valid && validator.errors) {
        return {
          valid: false,
          errors: validator.errors.map(err => `${err.instancePath} ${err.message}`),
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Check if user has permission to execute this tool on this agent
   */
  private async checkPermissions(
    request: ToolInvocationRequest
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Load agent with permissions and skills
      const agent = await prisma.aiAgent.findUnique({
        where: { id: request.agentId },
        include: {
          collaborators: {
            where: { userId: request.userId },
          },
          agentSkills: {
            include: { skill: true }
          }
        },
      });

      if (!agent) {
        return { allowed: false, reason: 'Agent not found' };
      }

      // Check if tool requires specific skill
      const requiredSkill = TOOL_SKILL_MAP[request.toolName];
      let hasSkill = false;
      if (requiredSkill) {
        hasSkill = (agent as any).agentSkills?.some(
          (as: any) => as.isEnabled && (as.skill?.name === requiredSkill || as.skillId === requiredSkill)
        );

        if (!hasSkill) {
          return {
            allowed: false,
            reason: `Agent lacks required skill: ${requiredSkill}`
          };
        }
      }

      // Check if user is owner or collaborator with execute permission
      const isOwner = agent.createdBy === request.userId;
      const isCollaborator = agent.collaborators.some(
        (c) => c.userId === request.userId && c.canExecute
      );

      if (!isOwner && !isCollaborator) {
        return { allowed: false, reason: 'User does not have execute permission on this agent' };
      }

      // Check if tool is allowlisted for agent
      const isAllowedBySkill = requiredSkill && hasSkill;
      if (agent.availableTools && agent.availableTools.length > 0) {
        if (!agent.availableTools.includes(request.toolName) && !isAllowedBySkill) {
          return { allowed: false, reason: 'Tool not allowlisted for this agent' };
        }
      }

      // Check scope restrictions (allowedResources)
      if (agent.allowedResources && typeof agent.allowedResources === 'object') {
        const resources = agent.allowedResources as any;

        // If agent has workspace restriction, validate
        if (resources.allowedWorkspaces && Array.isArray(resources.allowedWorkspaces)) {
          if (request.workspaceId && !resources.allowedWorkspaces.includes(request.workspaceId)) {
            return { allowed: false, reason: 'Workspace not in agent scope' };
          }
        }

        // Check project/team scope if present in parameters
        if (resources.allowedProjects && request.parameters.projectId) {
          if (!resources.allowedProjects.includes(request.parameters.projectId)) {
            return { allowed: false, reason: 'Project not in agent scope' };
          }
        }

        if (resources.allowedTeams && request.parameters.teamId) {
          if (!resources.allowedTeams.includes(request.parameters.teamId)) {
            return { allowed: false, reason: 'Team not in agent scope' };
          }
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('[ToolInvocationGate] Permission check error:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check if approval is required for this tool call
   */
  private async checkApprovalRequired(
    request: ToolInvocationRequest,
    agent: any
  ): Promise<{ required: boolean; reason?: string }> {
    // Destructive operations always require approval
    if (this.isDestructiveTool(request.toolName)) {
      return { required: true, reason: `Destructive operation: ${request.toolName}` };
    }

    // Check if agent has requiresApproval flag and approval threshold
    if (agent.requiresApproval) {
      // Could add more sophisticated logic here (e.g., approval threshold)
      return { required: true, reason: 'Agent requires approval for all actions' };
    }

    // Check for bulk operations (e.g., createTask with many tasks)
    if (request.toolName === 'createTask' && Array.isArray(request.parameters.tasks)) {
      if (request.parameters.tasks.length > 5) {
        return { required: true, reason: `Bulk operation: creating ${request.parameters.tasks.length} tasks` };
      }
    }

    return { required: false };
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(request: ToolInvocationRequest, tool: any): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Per-user rate limit
      const userLimiter = this.getRateLimiter('user', 50, 60); // 50 calls per minute
      await userLimiter.consume(request.userId);

      // Per-agent rate limit
      const agentLimiter = this.getRateLimiter('agent', 100, 60); // 100 calls per minute
      await agentLimiter.consume(request.agentId);

      // Per-tool rate limit (if tool specifies it)
      if (tool.rateLimit) {
        const toolLimiter = this.getRateLimiter(`tool:${tool.name}`, tool.rateLimit, 60);
        await toolLimiter.consume(`${request.userId}:${request.agentId}`);
      }

      return { allowed: true };
    } catch (error: any) {
      if (error.msBeforeNext) {
        metrics.toolRateLimitHits.inc({ tool_name: request.toolName, limiter_type: 'rate_limit' });
        return {
          allowed: false,
          reason: `Rate limit exceeded. Try again in ${Math.ceil(error.msBeforeNext / 1000)} seconds`,
        };
      }
      // If rate limiting fails due to Redis, we fail closed for write operations
      return { allowed: false, reason: 'Rate limiting unavailable' };
    }
  }

  /**
   * Execute the tool (dispatch to actual implementation)
   */
  private async dispatchToolExecution(
    tool: any,
    parameters: Record<string, any>,
    userId: string,
    workspaceId?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      // Import and execute the tool implementation
      const { executeTool } = await import('./toolExecutor');

      const result = await executeTool(
        {
          toolId: tool.id,
          toolName: tool.name,
          parameters,
        } as any,
        userId,
        workspaceId
      );

      return {
        success: result.success,
        result: result.result,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Main gate: invoke a tool with full enforcement
   */
  async invoke(request: ToolInvocationRequest): Promise<ToolInvocationResult> {
    const startTime = Date.now();
    const toolCallId = randomUUID();

    try {
      // 1. Health check - enforce degraded mode
      const health = await this.checkHealthCapabilities();
      const isDestructive = this.isDestructiveTool(request.toolName);

      if (isDestructive && !health.canWrite) {
        return {
          status: 'failed',
          toolCallId,
          error: 'System in degraded mode: write operations unavailable',
          durationMs: Date.now() - startTime,
        };
      }

      if (!health.canRead) {
        return {
          status: 'failed',
          toolCallId,
          error: 'System unavailable: database connectivity lost',
          durationMs: Date.now() - startTime,
        };
      }

      // 2. Tool resolution
      let tool = await getToolByName(request.toolName);
      if (!tool) {
        tool = await getToolById(request.toolName); // Fallback to ID lookup
      }

      if (!tool) {
        return {
          status: 'failed',
          toolCallId,
          error: `Tool not found: ${request.toolName}`,
          durationMs: Date.now() - startTime,
        };
      }

      // 3. Schema validation
      const validation = await this.validateParameters(tool, request.parameters);
      if (!validation.valid) {
        return {
          status: 'failed',
          toolCallId,
          error: `Parameter validation failed: ${validation.errors?.join(', ')}`,
          durationMs: Date.now() - startTime,
        };
      }

      // 4. Permission & scope checks
      const permissionCheck = await this.checkPermissions(request);
      if (!permissionCheck.allowed) {
        return {
          status: 'failed',
          toolCallId,
          error: permissionCheck.reason || 'Permission denied',
          durationMs: Date.now() - startTime,
        };
      }

      // Load agent for subsequent checks
      const agent = await prisma.aiAgent.findUnique({ where: { id: request.agentId } });
      if (!agent) {
        return {
          status: 'failed',
          toolCallId,
          error: 'Agent not found',
          durationMs: Date.now() - startTime,
        };
      }

      // 5. Approval check
      const approvalCheck = await this.checkApprovalRequired(request, agent);
      if (approvalCheck.required) {
        // Check if approval already exists and is approved
        const execution = await prisma.agentExecution.findUnique({
          where: { id: request.executionId },
        });

        if (execution?.approvalStatus !== 'APPROVED') {
          // Persist tool call as "failed" (since approval not granted)
          // Note: There's no PENDING status in ToolCallStatus enum
          await prisma.agentToolCall.create({
            data: {
              id: toolCallId,
              executionId: request.executionId,
              toolId: tool.id,
              toolName: tool.name,
              action: 'invoke',
              request: request.parameters,
              status: 'UNAUTHORIZED',  // Using UNAUTHORIZED to indicate approval required
              startedAt: new Date(),
              completedAt: new Date(),
              metadata: { approvalRequired: true, approvalReason: approvalCheck.reason },
            },
          }).catch(() => {
            // If AgentToolCall fails (FK constraint), just log and continue
            console.warn('[ToolInvocationGate] Failed to persist tool call - FK constraint');
          });

          // Track approval request metric
          metrics.toolApprovalRequests.inc({
            tool_name: request.toolName,
            agent_id: request.agentId,
            reason: approvalCheck.reason || 'unknown',
          });

          return {
            status: 'approval_required',
            toolCallId,
            approvalRequired: true,
            approvalReason: approvalCheck.reason,
            durationMs: Date.now() - startTime,
          };
        }
      }

      // 6. Rate limiting (if Redis is healthy)
      if (health.redisHealthy) {
        const rateLimitCheck = await this.enforceRateLimit(request, tool);
        if (!rateLimitCheck.allowed) {
          return {
            status: 'failed',
            toolCallId,
            error: rateLimitCheck.reason || 'Rate limit exceeded',
            durationMs: Date.now() - startTime,
          };
        }
      }

      // 7. Execute the tool
      const workspaceId = request.workspaceId || agent.workspaceId || undefined;
      const execResult = await this.dispatchToolExecution(tool, request.parameters, request.userId, workspaceId);

      const durationMs = Date.now() - startTime;

      // Track metrics
      metrics.toolInvocations.inc({
        tool_name: request.toolName,
        status: execResult.success ? 'success' : 'failed',
        agent_id: request.agentId,
      });
      metrics.toolInvocationDuration.observe(
        { tool_name: request.toolName, status: execResult.success ? 'success' : 'failed' },
        durationMs / 1000
      );

      // 8. Persist AgentToolCall
      try {
        await prisma.agentToolCall.create({
          data: {
            id: toolCallId,
            executionId: request.executionId,
            toolId: tool.id,
            toolName: tool.name,
            action: 'invoke',
            request: request.parameters,
            response: execResult.result,
            status: execResult.success ? 'SUCCESS' : 'FAILED',
            error: execResult.error,
            startedAt: new Date(startTime),
            completedAt: new Date(),
            duration: durationMs,
          },
        }).catch(() => {
          // FK constraint issue - log but don't fail execution
          console.warn('[ToolInvocationGate] Failed to persist tool call - FK constraint');
        });
      } catch (persistError) {
        console.error('[ToolInvocationGate] Failed to persist tool call:', persistError);
      }

      // 9. Persist AgentExecutionStep
      if (request.stepId) {
        try {
          await prisma.agentExecutionStep.create({
            data: {
              id: randomUUID(),
              executionId: request.executionId,
              stepNumber: 0, // Will be updated to proper order
              stepName: `Execute ${tool.name}`,
              stepType: 'TOOL_CALL',
              input: request.parameters,
              output: execResult.result,
              toolUsed: tool.name,
              status: execResult.success ? 'COMPLETED' : 'FAILED',
              error: execResult.error,
              startedAt: new Date(startTime),
              completedAt: new Date(),
              duration: durationMs,
            },
          }).catch((e) => {
            console.warn('[ToolInvocationGate] Failed to persist execution step:', e.message);
          });
        } catch (stepError) {
          console.error('[ToolInvocationGate] Failed to persist execution step:', stepError);
        }
      }

      return {
        status: execResult.success ? 'success' : 'failed',
        toolCallId,
        result: execResult.result,
        error: execResult.error,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error('[ToolInvocationGate] Unexpected error:', error);

      return {
        status: 'failed',
        toolCallId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      };
    }
  }
}
