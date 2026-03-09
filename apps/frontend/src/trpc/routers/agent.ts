import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { agentService } from "@/services/agent.service";
import { randomUUID } from "crypto";

// Default triggers for new agents
interface TriggerConfig {
  scope: string;
  [key: string]: unknown;
}

interface DefaultTrigger {
  triggerType: string;
  triggerConfig: TriggerConfig;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  tags: string[];
}

const DEFAULT_TRIGGERS: DefaultTrigger[] = [
  {
    triggerType: 'ASSIGN_TASK',
    triggerConfig: { scope: 'all' },
    name: 'Task Assignment',
    description: 'Triggers when a task is assigned to a user or agent',
    isActive: true,
    priority: 0,
    tags: ['task', 'assignment'],
  },
  {
    triggerType: 'DIRECT_MESSAGE',
    triggerConfig: { scope: 'all' },
    name: 'Direct Message',
    description: 'Triggers when a direct message is sent to the agent',
    isActive: true,
    priority: 0,
    tags: ['message', 'communication'],
  },
  {
    triggerType: 'MENTION',
    triggerConfig: { scope: 'all' },
    name: 'Mention',
    description: 'Triggers when the agent is mentioned in a comment or message',
    isActive: true,
    priority: 0,
    tags: ['mention', 'notification'],
  },
];

const agentTypeEnum = z.enum([
  'TASK_EXECUTOR',
  'WORKFLOW_MANAGER',
  'DATA_ANALYST',
  'CODE_GENERATOR',
  'CONTENT_CREATOR',
  'CUSTOMER_SUPPORT',
  'RESEARCHER',
  'PROJECT_MANAGER',
  'QA_TESTER',
  'INTEGRATION',
  'MONITORING',
  'GENERAL_ASSISTANT',
  'CUSTOM',
]);

const memoryTypeEnum = z.enum([
  'SHORT_TERM',
  'LONG_TERM',
  'EPISODIC',
  'SEMANTIC',
  'PROCEDURAL',
  'WORKING',
]);

const autonomyLevelEnum = z.enum([
  'SUPERVISED',
  'SEMI_AUTONOMOUS',
  'AUTONOMOUS',
  'COLLABORATIVE',
]);

const permissionLevelEnum = z.enum([
  'RESTRICTED',
  'STANDARD',
  'ELEVATED',
  'ADMIN',
]);

const triggerTypeEnum = z.enum([
  'MANUAL',
  'SCHEDULED',
  'EVENT',
  'WEBHOOK',
  'MESSAGE',
  'TASK_CREATED',
  'TASK_UPDATED',
  'CONDITION_MET',
  'API_CALL',
]);

const statusEnum = z.enum([
  'DRAFT',
  'BUILDING',
  'RECONFIGURING',
  'ACTIVE',
  'EXECUTING',
  'PAUSED',
  'DISABLED',
  'ARCHIVED',
  'ERROR',
]);

const visibilityEnum = z.enum([
  'PUBLIC',
  'PRIVATE',
  'WORKSPACE',
  'TEAM',
  'PROJECT',
  'MEMBERS_ONLY',
]);

export const agentRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      status: z.array(statusEnum).optional(),
      agentType: z.array(agentTypeEnum).optional(),
      query: z.string().optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(12),
      includeRelations: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {};

      if (input.workspaceId) where.workspaceId = input.workspaceId;
      if (input.status?.length) where.status = { in: input.status };
      if (input.agentType?.length) where.agentType = { in: input.agentType };

      // Only show agents user has access to
      where.OR = [
        { createdBy: userId },
        {
          collaborators: {
            some: { userId }
          }
        }
      ];

      if (input.query) {
        const q = input.query.trim();
        where.OR = [
          ...(where.OR || []),
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const include = input.includeRelations
        ? {
          user: { select: { id: true, name: true, email: true, image: true } },
          workspace: { select: { id: true, name: true } },
          aiModel: { select: { id: true, name: true } },
          _count: {
            select: {
              executions: true,
              tasks: true,
              tools: true,
            }
          }
        }
        : undefined;

      const [total, items] = await Promise.all([
        prisma.aiAgent.count({ where }),
        prisma.aiAgent.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          include,
        }),
      ]);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.string(),
      conversationType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId }
              }
            }
          ]
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          workspace: { select: { id: true, name: true } },
          aiModel: true,
          collaborators: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } }
            }
          },
          conversations: {
            where: {
              conversationType: (input.conversationType || 'AGENT_BUILDER') as any
            },
            orderBy: { createdAt: 'desc' },
            take: 1, // Get the most recent conversation of specified type
          },
          triggers: {
            orderBy: { priority: 'asc' },
          },
          tools: {
            orderBy: { createdAt: 'asc' },
          },
          schedules: {
            orderBy: { priority: 'asc' },
          },
          _count: {
            select: {
              tasks: true,
              tools: true,
              memories: true,
            }
          }
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      return agent;
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      avatar: z.string().optional(),
      agentType: agentTypeEnum,
      systemPrompt: z.string().optional(),
      personality: z.any().optional(),
      capabilities: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      modelId: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(100).max(32000).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
      maxIterations: z.number().int().min(1).max(100).optional(),
      maxExecutionTime: z.number().int().min(10).max(3600).optional(),
      autoRetry: z.boolean().optional(),
      maxRetries: z.number().int().min(1).max(10).optional(),
      retryDelay: z.number().int().min(1).max(60).optional(),
      memoryType: memoryTypeEnum.optional(),
      contextWindow: z.number().int().min(1).max(50).optional(),
      useVectorMemory: z.boolean().optional(),
      memoryRetention: z.number().int().min(1).max(365).optional(),
      autonomyLevel: autonomyLevelEnum.optional(),
      requiresApproval: z.boolean().optional(),
      approvalThreshold: z.number().min(0).max(1).optional(),
      availableTools: z.array(z.string()).optional(),
      permissionLevel: permissionLevelEnum.optional(),
      triggerType: triggerTypeEnum.optional(),
      triggerConfig: z.any().optional(),
      schedule: z.string().optional(),
      isScheduleActive: z.boolean().optional(),
      isActive: z.boolean().optional(),
      visibility: visibilityEnum.optional(),
      tags: z.array(z.string()).optional(),
      status: statusEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Get default system tools from database (only tools with isDefault: true)
      const systemTools = await prisma.systemTool.findMany({
        where: {
          isActive: true,
          isDefault: true, // Only get default tools
        },
      });

      // Create agent
      const agent = await prisma.aiAgent.create({
        data: {
          id: randomUUID(),
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.spaceId && { spaceId: input.spaceId }),
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.teamId && { teamId: input.teamId }),
          user: {
            connect: { id: userId },
          },
          ...(input.modelId && {
            aiModel: {
              connect: { id: input.modelId },
            },
          }),
          name: input.name,
          description: input.description,
          avatar: input.avatar,
          agentType: input.agentType,
          systemPrompt: input.systemPrompt || '',
          personality: input.personality || undefined,
          capabilities: input.capabilities || [],
          constraints: input.constraints || [],
          temperature: input.temperature ?? 0.7,
          maxTokens: input.maxTokens ?? 2000,
          topP: input.topP ?? 1.0,
          frequencyPenalty: input.frequencyPenalty ?? 0.0,
          presencePenalty: input.presencePenalty ?? 0.0,
          maxIterations: input.maxIterations ?? 10,
          maxExecutionTime: input.maxExecutionTime ?? 300,
          autoRetry: input.autoRetry ?? true,
          maxRetries: input.maxRetries ?? 3,
          retryDelay: input.retryDelay ?? 5,
          memoryType: input.memoryType || 'SHORT_TERM',
          contextWindow: input.contextWindow ?? 5,
          useVectorMemory: input.useVectorMemory ?? false,
          memoryRetention: input.memoryRetention || undefined,
          autonomyLevel: input.autonomyLevel || 'SEMI_AUTONOMOUS',
          requiresApproval: input.requiresApproval ?? true,
          approvalThreshold: input.approvalThreshold ?? 0.8,
          availableTools: input.availableTools || systemTools.map(t => t.name),
          permissionLevel: input.permissionLevel || 'RESTRICTED',
          schedule: input.schedule || undefined,
          isScheduleActive: input.isScheduleActive ?? false,
          isActive: input.isActive ?? false,
          visibility: input.visibility || 'PRIVATE',
          tags: input.tags || [],
          status: input.status || 'DRAFT',
          updatedAt: new Date(),
          // Create default agent tools from system tools (only default tools)
          tools: {
            create: systemTools.map(systemTool => ({
              id: randomUUID(),
              name: systemTool.name,
              description: systemTool.description,
              toolType: 'INTEGRATION' as any, // Default type - can be customized later
              category: systemTool.category,
              functionSchema: systemTool.functionSchema as any,
              parameters: (systemTool.functionSchema as any)?.parameters || {},
              returns: (systemTool.functionSchema as any)?.returns || {},
              requiresAuth: systemTool.requiresAuth,
              rateLimit: systemTool.rateLimit,
              timeout: systemTool.timeout,
              tags: systemTool.tags || [],
              updatedAt: new Date()
            })),
          },
          // Create default triggers
          triggers: {
            create: DEFAULT_TRIGGERS.map(trigger => ({
              id: randomUUID(),
              triggerType: trigger.triggerType,
              triggerConfig: trigger.triggerConfig,
              name: trigger.name,
              description: trigger.description,
              isActive: trigger.isActive,
              priority: trigger.priority,
              tags: trigger.tags,
              updatedAt: new Date(),
            })),
          },
        } as any,
        include: {
          tools: true,
          triggers: true,
        },
      });

      return agent;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      workspaceId: z.string().optional(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      avatar: z.string().optional(),
      agentType: agentTypeEnum.optional(),
      systemPrompt: z.string().min(1).optional(),
      personality: z.any().optional(),
      capabilities: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      modelId: z.string().optional().nullable(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(100).max(32000).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
      maxIterations: z.number().int().min(1).max(100).optional(),
      maxExecutionTime: z.number().int().min(10).max(3600).optional(),
      autoRetry: z.boolean().optional(),
      maxRetries: z.number().int().min(1).max(10).optional(),
      retryDelay: z.number().int().min(1).max(60).optional(),
      memoryType: memoryTypeEnum.optional(),
      contextWindow: z.number().int().min(1).max(50).optional(),
      useVectorMemory: z.boolean().optional(),
      memoryRetention: z.number().int().min(1).max(365).optional().nullable(),
      autonomyLevel: autonomyLevelEnum.optional(),
      requiresApproval: z.boolean().optional(),
      approvalThreshold: z.number().min(0).max(1).optional(),
      availableTools: z.array(z.string()).optional(),
      permissionLevel: permissionLevelEnum.optional(),
      triggerType: triggerTypeEnum.optional().nullable(),
      triggerConfig: z.any().optional().nullable(),
      schedule: z.string().optional().nullable(),
      isScheduleActive: z.boolean().optional(),
      isActive: z.boolean().optional(),
      visibility: visibilityEnum.optional(),
      tags: z.array(z.string()).optional(),
      status: statusEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, ...updateData } = input;

      const existing = await prisma.aiAgent.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!existing) {
        throw new Error("Agent not found or permission denied");
      }

      const data: any = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] !== undefined) {
          data[key] = updateData[key as keyof typeof updateData];
        }
      });

      return prisma.aiAgent.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      return prisma.aiAgent.delete({
        where: { id: input.id },
      });
    }),

  execute: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      inputData: z.any().optional(),
      executionContext: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId, canExecute: true }
              }
            }
          ]
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      if (!agent.isActive) {
        throw new Error("Agent is not active");
      }

      // Create execution record
      const execution = await prisma.agentExecution.create({
        data: {
          id: randomUUID(),
          agentId: input.agentId,
          triggeredBy: 'MANUAL',
          triggerUserId: userId,
          inputData: input.inputData || {},
          executionContext: input.executionContext || {},
          status: 'QUEUED',
          startedAt: new Date(),
        },
      });

      // Call backend API to trigger execution via secure client
      try {
        const response = await agentService.agents.execute({
          executionId: execution.id,
          agentId: input.agentId,
          inputData: input.inputData,
          executionContext: input.executionContext,
        }, ctx.session);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to trigger execution');
        }

        const result = await response.json();
        return execution;
      } catch (error) {
        // Update execution status to failed
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        throw error;
      }
    }),

  getExecutions: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT']).optional(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Call backend API for execution history
      try {
        const response = await agentService.agents.getExecutions(
          input.agentId,
          {
            page: input.page,
            pageSize: input.pageSize,
            status: input.status,
          },
          ctx.session
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch executions');
        }

        return await response.json();
      } catch (error) {
        // Fallback to direct database query if backend is unavailable
        const userId = ctx.session!.user!.id;

        const agent = await prisma.aiAgent.findFirst({
          where: {
            id: input.agentId,
            OR: [
              { createdBy: userId },
              {
                collaborators: {
                  some: { userId }
                }
              }
            ]
          },
        });

        if (!agent) {
          throw new Error("Agent not found or permission denied");
        }

        const where: any = { agentId: input.agentId };
        if (input.status) where.status = input.status;

        const skip = (input.page - 1) * input.pageSize;
        const take = input.pageSize;

        const [total, items] = await Promise.all([
          prisma.agentExecution.count({ where }),
          prisma.agentExecution.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            skip,
            take,
          }),
        ]);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      }
    }),

  chat: protectedProcedure
    .input(z.object({
      agentId: z.string().min(1),
      message: z.string().min(1),
      conversationId: z.string().optional(),
      context: z.object({
        projects: z.array(z.string()).optional(),
        teams: z.array(z.string()).optional(),
        tasks: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Call backend service to process chat message
      try {
        const response = await agentService.agents.chat({
          userId,
          agentId: input.agentId,
          message: input.message,
          conversationId: input.conversationId,
          context: input.context,
        }, ctx.session);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || 'Failed to process chat message');
        }

        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to process chat message');
      }
    }),

  approveExecution: protectedProcedure
    .input(z.object({
      executionId: z.string(),
      approved: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Call backend service to approve/reject execution
      try {
        const response = await agentService.agents.approveExecution({
          executionId: input.executionId,
          userId,
          approved: input.approved,
          reason: input.reason,
        }, ctx.session);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || 'Failed to approve/reject execution');
        }

        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to approve/reject execution');
      }
    }),

  getExecutionPlan: protectedProcedure
    .input(z.object({
      executionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Get execution with plan
      const execution = await prisma.agentExecution.findFirst({
        where: {
          id: input.executionId,
          aiAgent: {
            OR: [
              { createdBy: userId },
              { collaborators: { some: { userId } } },
            ],
          },
        },
        include: {
          aiAgent: true,
        },
      });

      if (!execution) {
        throw new Error('Execution not found or permission denied');
      }

      // Extract plan from execution metadata or reasoning
      const metadata = execution.metadata as any;
      const plan = metadata?.plan || execution.reasoning?.[0] || null;
      const status = execution.status;
      const currentStep = execution.currentStep;
      const progress = execution.totalSteps > 0
        ? Math.round((execution.completedSteps / execution.totalSteps) * 100)
        : 0;

      return {
        plan,
        status,
        currentStep,
        progress,
      };
    }),

  validate: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId }
              }
            }
          ]
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!agent.name || agent.name.trim().length === 0) {
        errors.push('Agent name is required');
      }

      if (!agent.systemPrompt || agent.systemPrompt.trim().length < 200) {
        errors.push('System prompt must be at least 200 characters');
      }

      if (!agent.agentType) {
        errors.push('Agent type is required');
      }

      // Warnings
      if (!agent.description || agent.description.trim().length < 20) {
        warnings.push('Consider adding a more detailed description');
      }

      if (!agent.capabilities || agent.capabilities.length === 0) {
        warnings.push('No capabilities defined');
      }

      if (!agent.constraints || agent.constraints.length === 0) {
        warnings.push('No constraints defined');
      }

      // Check if agent has triggers in AgentTrigger table
      const triggerCount = await prisma.agentTrigger.count({
        where: { agentId: agent.id, isActive: true },
      });
      if (triggerCount === 0) {
        warnings.push('No active triggers configured');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }),

  activate: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId, canExecute: true }
              }
            }
          ]
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      // Validate before activating
      const errors: string[] = [];
      if (!agent.name || agent.name.trim().length === 0) {
        errors.push('Agent name is required');
      }
      if (!agent.systemPrompt || agent.systemPrompt.trim().length < 200) {
        errors.push('System prompt must be at least 200 characters');
      }
      if (!agent.agentType) {
        errors.push('Agent type is required');
      }

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Update agent status to ACTIVE
      const updated = await prisma.aiAgent.update({
        where: { id: input.agentId },
        data: {
          status: 'ACTIVE',
          isActive: true,
        },
      });

      return updated;
    }),

  deactivate: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId, canExecute: true }
              }
            }
          ]
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      // Update agent status to DRAFT
      const updated = await prisma.aiAgent.update({
        where: { id: input.agentId },
        data: {
          status: 'DRAFT',
          isActive: false,
        },
      });

      return updated;
    }),

  /**
   * System tools & skill-based configuration
   */

  getSystemTools: protectedProcedure
    .query(async ({ ctx }) => {
      const session = ctx.session;
      const response = await agentService.agents.getSystemTools(session);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || 'Failed to fetch system tools');
      }

      return response.json();
    }),

  getAgentSkills: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
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
        throw new Error('Agent not found or permission denied');
      }

      const agentSkills = await prisma.agentToSkill.findMany({
        where: {
          agentId: input.agentId,
          isEnabled: true,
        },
        include: {
          skill: {
            include: {
              toolSkills: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return agentSkills.map(as => ({
        agentSkillId: as.id,
        skillId: as.skillId,
        name: as.skill.name,
        displayName: as.skill.displayName,
        description: as.skill.description,
        category: as.skill.category,
        icon: as.skill.icon,
        isBuiltIn: as.skill.isBuiltIn,
        toolCount: as.skill.toolSkills.length,
      }));
    }),

  listSkills: protectedProcedure
    .query(async () => {
      const skills = await prisma.agentSkill.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          displayName: 'asc',
        },
      });

      return skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        displayName: skill.displayName,
        description: skill.description,
        category: skill.category,
        icon: skill.icon,
        isBuiltIn: skill.isBuiltIn,
      }));
    }),

  addSkill: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      skillId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
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
        throw new Error('Agent not found or permission denied');
      }

      const skill = await prisma.agentSkill.findFirst({
        where: {
          id: input.skillId,
          isActive: true,
        },
      });

      if (!skill) {
        throw new Error('Skill not found or inactive');
      }

      // Enable or create AgentToSkill link
      const existingLink = await prisma.agentToSkill.findFirst({
        where: {
          agentId: input.agentId,
          skillId: input.skillId,
        },
      });

      if (existingLink) {
        if (!existingLink.isEnabled) {
          await prisma.agentToSkill.update({
            where: { id: existingLink.id },
            data: { isEnabled: true },
          });
        }
      } else {
        await prisma.agentToSkill.create({
          data: {
            agentId: input.agentId,
            skillId: input.skillId,
            isEnabled: true,
          },
        });
      }

      // Seed default tools for this skill onto the agent
      const skillTools = await prisma.skillToTool.findMany({
        where: {
          skillId: input.skillId,
          isDefault: true,
        },
        include: {
          tool: true,
        },
      });

      const toolNames = skillTools.map(st => st.tool.name);

      // Fetch any existing agent tools and system tools once
      const [existingAgentTools, systemToolsByName] = await Promise.all([
        prisma.agentTool.findMany({
          where: {
            agentId: input.agentId,
            name: { in: toolNames },
          },
        }),
        prisma.systemTool.findMany({
          where: {
            name: { in: toolNames },
            isActive: true,
          },
        }),
      ]);

      const existingByName = new Map(existingAgentTools.map(t => [t.name, t]));
      const systemByName = new Map(systemToolsByName.map(t => [t.name, t]));

      for (const st of skillTools) {
        const systemTool = systemByName.get(st.tool.name);
        if (!systemTool) continue;

        const existing = existingByName.get(systemTool.name);
        if (existing) {
          if (!existing.isActive || !existing.isEnabled) {
            await prisma.agentTool.update({
              where: { id: existing.id },
              data: {
                isActive: true,
                isEnabled: true,
              },
            });
          }
        } else {
          await prisma.agentTool.create({
            data: {
              id: randomUUID(),
              agentId: input.agentId,
              name: systemTool.name,
              description: systemTool.description,
              toolType: 'INTEGRATION' as any,
              category: systemTool.category,
              functionSchema: systemTool.functionSchema as any,
              parameters: (systemTool.functionSchema as any)?.parameters || {},
              returns: (systemTool.functionSchema as any)?.returns || {},
              requiresAuth: systemTool.requiresAuth,
              rateLimit: systemTool.rateLimit,
              timeout: systemTool.timeout,
              tags: systemTool.tags || [],
              isActive: true,
              isEnabled: true,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Return updated skills for convenience
      const updatedSkills = await prisma.agentToSkill.findMany({
        where: {
          agentId: input.agentId,
          isEnabled: true,
        },
        include: {
          skill: {
            include: {
              toolSkills: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return updatedSkills.map(as => ({
        agentSkillId: as.id,
        skillId: as.skillId,
        name: as.skill.name,
        displayName: as.skill.displayName,
        description: as.skill.description,
        category: as.skill.category,
        icon: as.skill.icon,
        isBuiltIn: as.skill.isBuiltIn,
        toolCount: as.skill.toolSkills.length,
      }));
    }),

  removeSkill: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      skillId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId },
              },
            },
          ],
        },
        include: {
          agentSkills: true,
        },
      });

      if (!agent) {
        throw new Error('Agent not found or permission denied');
      }

      const link = await prisma.agentToSkill.findFirst({
        where: {
          agentId: input.agentId,
          skillId: input.skillId,
        },
      });

      if (!link) {
        // Nothing to do
        return { success: true };
      }

      // Disable the link instead of hard delete for auditability
      await prisma.agentToSkill.update({
        where: { id: link.id },
        data: { isEnabled: false },
      });

      // Determine tools that are unique to this skill for this agent
      const [removedSkillTools, remainingSkillLinks] = await Promise.all([
        prisma.skillToTool.findMany({
          where: { skillId: input.skillId },
          include: { tool: true },
        }),
        prisma.agentToSkill.findMany({
          where: {
            agentId: input.agentId,
            isEnabled: true,
            skillId: { not: input.skillId },
          },
          include: {
            skill: {
              include: {
                toolSkills: true,
              },
            },
          },
        }),
      ]);

      const remainingToolIds = new Set<string>();
      for (const s of remainingSkillLinks) {
        for (const ts of s.skill.toolSkills) {
          remainingToolIds.add(ts.toolId);
        }
      }

      const toolNamesToDisable: string[] = [];
      for (const st of removedSkillTools) {
        if (!remainingToolIds.has(st.toolId)) {
          toolNamesToDisable.push(st.tool.name);
        }
      }

      if (toolNamesToDisable.length > 0) {
        // Disable agent tools
        const affectedAgentTools = await prisma.agentTool.findMany({
          where: {
            agentId: input.agentId,
            name: { in: toolNamesToDisable },
          },
        });

        const affectedIds = affectedAgentTools.map(t => t.id);

        if (affectedIds.length > 0) {
          await prisma.agentTool.updateMany({
            where: {
              id: { in: affectedIds },
            },
            data: {
              isActive: false,
              isEnabled: false,
            },
          });
        }

        // Remove tools from allowlist if present
        const updatedAvailableTools = (agent.availableTools || []).filter(
          (name) => !toolNamesToDisable.includes(name)
        );

        await prisma.aiAgent.update({
          where: { id: input.agentId },
          data: {
            availableTools: updatedAvailableTools,
          },
        });
      }

      return { success: true };
    }),

  getAgentTools: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId },
              },
            },
          ],
        },
        include: {
          agentSkills: {
            include: {
              skill: {
                include: {
                  toolSkills: {
                    include: { tool: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!agent) {
        throw new Error('Agent not found or permission denied');
      }

      const agentTools = await prisma.agentTool.findMany({
        where: {
          agentId: input.agentId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const toolNames = Array.from(new Set(agentTools.map(t => t.name)));

      const systemTools = await prisma.systemTool.findMany({
        where: {
          name: { in: toolNames },
        },
      });

      const systemByName = new Map(systemTools.map(t => [t.name, t]));

      // Map tool name -> skills
      const skillsByToolName = new Map<string, { id: string; displayName: string }[]>();
      for (const at of agent.agentSkills) {
        if (!at.isEnabled) continue;
        for (const ts of at.skill.toolSkills) {
          const toolName = (ts as any).tool?.name;
          if (!toolName) continue;
          const list = skillsByToolName.get(toolName) || [];
          list.push({ id: at.skillId, displayName: at.skill.displayName });
          skillsByToolName.set(toolName, list);
        }
      }

      const result = agentTools.map(t => {
        const systemTool = systemByName.get(t.name);
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          toolType: t.toolType,
          isActive: t.isActive,
          isEnabled: t.isEnabled,
          systemToolId: systemTool?.id,
          skills: skillsByToolName.get(t.name) || [],
        };
      });

      return result;
    }),

  addTools: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      toolIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
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
        throw new Error('Agent not found or permission denied');
      }

      const systemTools = await prisma.systemTool.findMany({
        where: {
          id: { in: input.toolIds },
          isActive: true,
        },
      });

      if (systemTools.length === 0) {
        return { success: true };
      }

      const names = systemTools.map(t => t.name);

      const existingAgentTools = await prisma.agentTool.findMany({
        where: {
          agentId: input.agentId,
          name: { in: names },
        },
      });

      const existingByName = new Map(existingAgentTools.map(t => [t.name, t]));

      for (const systemTool of systemTools) {
        const existing = existingByName.get(systemTool.name);
        if (existing) {
          if (!existing.isActive || !existing.isEnabled) {
            await prisma.agentTool.update({
              where: { id: existing.id },
              data: {
                isActive: true,
                isEnabled: true,
              },
            });
          }
        } else {
          await prisma.agentTool.create({
            data: {
              id: randomUUID(),
              agentId: input.agentId,
              name: systemTool.name,
              description: systemTool.description,
              toolType: 'INTEGRATION' as any,
              category: systemTool.category,
              functionSchema: systemTool.functionSchema as any,
              parameters: (systemTool.functionSchema as any)?.parameters || {},
              returns: (systemTool.functionSchema as any)?.returns || {},
              requiresAuth: systemTool.requiresAuth,
              rateLimit: systemTool.rateLimit,
              timeout: systemTool.timeout,
              tags: systemTool.tags || [],
              isActive: true,
              isEnabled: true,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Ensure tools are allowlisted for this agent
      const newNames = systemTools.map(t => t.name);
      const currentAllowlist = agent.availableTools || [];
      const allowlistSet = new Set<string>(currentAllowlist);
      newNames.forEach(name => allowlistSet.add(name));

      await prisma.aiAgent.update({
        where: { id: input.agentId },
        data: {
          availableTools: Array.from(allowlistSet),
        },
      });

      return { success: true };
    }),

  removeTool: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      toolId: z.string(), // AgentTool id
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
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
        throw new Error('Agent not found or permission denied');
      }

      const tool = await prisma.agentTool.findFirst({
        where: {
          id: input.toolId,
          agentId: input.agentId,
        },
      });

      if (!tool) {
        return { success: true };
      }

      await prisma.agentTool.update({
        where: { id: tool.id },
        data: {
          isActive: false,
          isEnabled: false,
        },
      });

      const updatedAvailableTools = (agent.availableTools || []).filter(
        (name) => name !== tool.name
      );

      await prisma.aiAgent.update({
        where: { id: input.agentId },
        data: {
          availableTools: updatedAvailableTools,
        },
      });

      return { success: true };
    }),

  // Agent Builder endpoints
  builder: router({
    initialize: protectedProcedure
      .input(z.object({
        conversationId: z.string().optional(),
        agentId: z.string().optional(),
        skipWelcome: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        // agentId is optional for builder initialization (can be 'new')
        const response = await agentService.agents.builder.initialize(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to initialize builder');
        }
        return response.json();
      }),

    message: protectedProcedure
      .input(z.object({
        conversationId: z.string(),
        agentId: z.string().min(1), // Required for parameterized route
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.builder.message(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to process message');
        }
        return response.json();
      }),

    updateDraft: protectedProcedure
      .input(z.object({
        conversationId: z.string(),
        agentId: z.string().min(1), // Required for parameterized route
        draft: z.any(), // Partial<AgentDraft>
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.builder.updateDraft(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to update draft');
        }
        return response.json();
      }),

    launch: protectedProcedure
      .input(z.object({
        conversationId: z.string(),
        agentId: z.string().min(1), // Required for parameterized route
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.builder.launch(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to launch agent');
        }
        return response.json();
      }),
  }),

  // Operator endpoints
  operator: router({
    initialize: protectedProcedure
      .input(z.object({
        conversationId: z.string().optional(),
        agentId: z.string().min(1), // Required for Operator
        skipWelcome: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.operator.initialize(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to initialize operator');
        }
        return response.json();
      }),
    message: protectedProcedure
      .input(z.object({
        conversationId: z.string(),
        agentId: z.string().min(1),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.operator.message(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to process message');
        }
        return response.json();
      }),

    chat: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1),
        message: z.string().min(1),
        workspaceId: z.string().optional(),
        conversationId: z.string().optional(),
        context: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.operator.chat(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to process operator chat message');
        }
        return response.json();
      }),

    applyPatch: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1),
        patch: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.operator.apply(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to apply operator patch');
        }
        return response.json();
      }),

    execute: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1),
        inputData: z.any().optional(),
        executionContext: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.operator.execute(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to trigger operator execution');
        }
        return response.json();
      }),
  }),

  // Executor endpoints
  executor: router({
    initialize: protectedProcedure
      .input(z.object({
        conversationId: z.string().optional(),
        agentId: z.string().min(1), // Required for Executor
        skipWelcome: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.executor.initialize(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to initialize executor');
        }
        return response.json();
      }),
    message: protectedProcedure
      .input(z.object({
        conversationId: z.string(),
        agentId: z.string().min(1),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.executor.message(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to process message');
        }
        return response.json();
      }),

    chat: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1),
        message: z.string().min(1),
        conversationId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.executor.chat(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to process executor chat message');
        }
        return response.json();
      }),

    execute: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1),
        inputData: z.any().optional(),
        executionContext: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = ctx.session;
        const response = await agentService.agents.executor.execute(input, session);
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.userMessage || error.message || error.error || 'Failed to trigger executor execution');
        }
        return response.json();
      }),
  }),

  getRelations: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify access
      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: { userId }
              }
            }
          ]
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      const [subAgents, parentAgents, peers] = await Promise.all([
        prisma.agentRelation.findMany({
          where: { parentId: input.agentId, type: 'SUB_AGENT' },
          include: { child: true },
        }),
        prisma.agentRelation.findMany({
          where: { childId: input.agentId, type: 'SUB_AGENT' },
          include: { parent: true },
        }),
        prisma.agentRelation.findMany({
          where: {
            OR: [
              { parentId: input.agentId, type: 'PEER' },
              { childId: input.agentId, type: 'PEER' }
            ]
          },
          include: { parent: true, child: true },
        }),
      ]);

      return {
        subAgents: subAgents.map(r => ({ ...r.child, relationId: r.id })),
        supervisors: parentAgents.map(r => ({ ...r.parent, relationId: r.id })),
        peers: peers.map(r => {
          const peer = r.parentId === input.agentId ? r.child : r.parent;
          return { ...peer, relationId: r.id };
        }),
      };
    }),
});

