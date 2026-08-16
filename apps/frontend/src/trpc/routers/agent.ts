import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { DEFAULT_MEMORY_METADATA } from "@/lib/agentMemory/memoryPolicy";
import {
  buildDefaultAgentMetadata,
  clearAgentMemoryStores,
  deleteAgentMemoryNotebook,
  ensureAgentMemoryDoc,
} from "@/lib/agentMemory/ensureAgentMemoryDoc";
import { isAgentMemoryDocEnabled } from "@/lib/agentMemory/memoryPolicy";

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

const visibilityEnum = z.enum(['PUBLIC', 'PRIVATE', 'ADMINS', 'MEMBERS', 'EVERYONE']);

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
        { ownerId: userId },
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
          owner: { select: { id: true, name: true, email: true, image: true } },
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
      includeSections: z.object({
        conversations: z.boolean().optional(),
        tools: z.boolean().optional(),
        triggers: z.boolean().optional(),
        schedules: z.boolean().optional(),
        collaborators: z.boolean().optional(),
        counts: z.boolean().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const sections = input.includeSections ?? {};

      const include: Record<string, unknown> = {
        owner: { select: { id: true, name: true, email: true, image: true } },
        workspace: { select: { id: true, name: true } },
        aiModel: true,
      };

      if (sections.collaborators) {
        include.collaborators = {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        };
      }

      if (sections.conversations) {
        include.conversations = {
          where: {
            conversationType: (input.conversationType || 'AGENT_BUILDER') as any
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        };
      }

      if (sections.triggers) {
        include.triggers = { orderBy: { priority: 'asc' } };
      }

      if (sections.tools) {
        include.tools = { orderBy: { createdAt: 'asc' } };
      }

      if (sections.schedules) {
        include.schedules = { orderBy: { priority: 'asc' } };
      }

      if (sections.counts) {
        include._count = {
          select: {
            tasks: true,
            tools: true,
            memories: true,
          }
        };
      }

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            {
              collaborators: {
                some: { userId }
              }
            }
          ]
        },
        include,
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      return {
        ...agent,
        /** Server-authoritative; do not derive from client useSession().user.id */
        viewerIsOwner: agent.ownerId === userId,
      };
    }),

  /** Lightweight ownership check for Memory tab (avoids fragile client session id). */
  getMemoryAccess: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
          ],
        },
        select: { ownerId: true, memoryViewId: true },
      });
      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }
      return {
        isOwner: agent.ownerId === userId,
        memoryViewId: agent.memoryViewId ?? null,
      };
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
      // Create agent
      const agent = await prisma.aiAgent.create({
        data: {
          id: randomUUID(),
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.spaceId && { spaceId: input.spaceId }),
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.teamId && { teamId: input.teamId }),
          owner: {
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
          permissionLevel: input.permissionLevel || 'RESTRICTED',
          schedule: input.schedule || undefined,
          isScheduleActive: input.isScheduleActive ?? false,
          isActive: input.isActive ?? false,
          visibility: input.visibility || 'PRIVATE',
          tags: input.tags || [],
          status: input.status || 'DRAFT',
          metadata: { memory: { ...DEFAULT_MEMORY_METADATA } },
          updatedAt: new Date(),
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
      avatar: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      color: z.string().optional().nullable(),
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
      permissionLevel: permissionLevelEnum.optional(),
      triggerType: triggerTypeEnum.optional().nullable(),
      triggerConfig: z.any().optional().nullable(),
      schedule: z.string().optional().nullable(),
      isScheduleActive: z.boolean().optional(),
      isActive: z.boolean().optional(),
      visibility: visibilityEnum.optional(),
      tags: z.array(z.string()).optional(),
      status: statusEnum.optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, ...updateData } = input;

      const existing = await prisma.aiAgent.findFirst({
        where: {
          id,
          ownerId: userId,
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

      // Prefer Prisma relation connect/disconnect for modelId
      if ('modelId' in updateData) {
        delete data.modelId;
        if (updateData.modelId === null) {
          data.aiModel = { disconnect: true };
        } else if (typeof updateData.modelId === 'string') {
          data.aiModel = { connect: { id: updateData.modelId } };
        }
      }

      return prisma.aiAgent.update({
        where: { id },
        data,
        include: { aiModel: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
      });

      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      await deleteAgentMemoryNotebook(input.id).catch((err) => {
        console.error("Failed to cleanup agent memory notebook", err);
      });

      return prisma.aiAgent.delete({
        where: { id: input.id },
      });
    }),

  clone: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const source = await prisma.aiAgent.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
            { visibility: 'PUBLIC' },
          ],
        },
        include: {
          tools: true,
          skills: true,
          triggers: true,
        },
      });

      if (!source) {
        throw new Error("Agent not found or permission denied");
      }

      const clonedName = input.name?.trim() || `${source.name} (copy)`;

      const cloned = await prisma.aiAgent.create({
        data: {
          id: randomUUID(),
          ...(source.workspaceId && { workspaceId: source.workspaceId }),
          ...(source.spaceId && { spaceId: source.spaceId }),
          ...(source.projectId && { projectId: source.projectId }),
          ...(source.teamId && { teamId: source.teamId }),
          owner: { connect: { id: userId } },
          ...(source.modelId && {
            aiModel: { connect: { id: source.modelId } },
          }),
          name: clonedName,
          description: source.description,
          avatar: source.avatar,
          agentType: source.agentType,
          systemPrompt: source.systemPrompt || '',
          personality: source.personality ?? undefined,
          capabilities: source.capabilities || [],
          constraints: source.constraints || [],
          temperature: source.temperature,
          maxTokens: source.maxTokens,
          topP: source.topP,
          frequencyPenalty: source.frequencyPenalty,
          presencePenalty: source.presencePenalty,
          maxIterations: source.maxIterations,
          maxExecutionTime: source.maxExecutionTime,
          autoRetry: source.autoRetry,
          maxRetries: source.maxRetries,
          retryDelay: source.retryDelay,
          memoryType: source.memoryType,
          contextWindow: source.contextWindow,
          useVectorMemory: source.useVectorMemory,
          memoryRetention: source.memoryRetention ?? undefined,
          autonomyLevel: source.autonomyLevel,
          requiresApproval: source.requiresApproval,
          approvalThreshold: source.approvalThreshold,
          permissionLevel: source.permissionLevel,
          schedule: source.schedule ?? undefined,
          isScheduleActive: false,
          isActive: false,
          visibility: 'PRIVATE',
          tags: source.tags || [],
          status: 'DRAFT',
          metadata: source.metadata ?? undefined,
          updatedAt: new Date(),
          tools: {
            create: source.tools.map((tool) => ({
              id: randomUUID(),
              name: tool.name,
              description: tool.description,
              toolType: tool.toolType,
              category: tool.category,
              endpoint: tool.endpoint,
              method: tool.method,
              headers: tool.headers ?? undefined,
              authentication: tool.authentication ?? undefined,
              functionSchema: tool.functionSchema as any,
              parameters: tool.parameters as any,
              returns: tool.returns as any,
              isEnabled: tool.isEnabled,
              requiresAuth: tool.requiresAuth,
              rateLimit: tool.rateLimit,
              timeout: tool.timeout,
              retryOnError: tool.retryOnError,
              costPerCall: tool.costPerCall,
              monthlyQuota: tool.monthlyQuota,
              examples: tool.examples as any,
              documentation: tool.documentation,
              isActive: tool.isActive,
              metadata: tool.metadata ?? undefined,
              tags: tool.tags || [],
              updatedAt: new Date(),
            })),
          },
          triggers: {
            create: (source.triggers.length > 0
              ? source.triggers
              : DEFAULT_TRIGGERS.map((t) => ({
                  ...t,
                  id: '',
                  triggerConfig: t.triggerConfig as any,
                }))
            ).map((trigger: any) => ({
              id: randomUUID(),
              triggerType: trigger.triggerType,
              triggerConfig: trigger.triggerConfig ?? { scope: 'all' },
              name: trigger.name,
              description: trigger.description,
              isActive: trigger.isActive ?? true,
              priority: trigger.priority ?? 0,
              tags: trigger.tags || [],
              updatedAt: new Date(),
            })),
          },
          skills: {
            create: source.skills.map((skill) => ({
              id: randomUUID(),
              skillId: skill.skillId,
              isEnabled: skill.isEnabled,
            })),
          },
        } as any,
        include: {
          tools: true,
          triggers: true,
        },
      });

      return cloned;
    }),

  getExecutions: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const agent = await prisma.aiAgent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { ownerId: userId },
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

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.agentExecution.count({ where: { agentId: input.agentId } }),
        prisma.agentExecution.findMany({
          where: { agentId: input.agentId },
          orderBy: { startedAt: "desc" },
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
              { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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

      return { success: true };
    }),

  /** Upsert manual trigger (mention / DM / assign) instructions + active flag. */
  updateTrigger: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        triggerType: z.enum(["MENTION", "DIRECT_MESSAGE", "ASSIGN_TASK"]),
        instructions: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const agent = await prisma.aiAgent.findFirst({
        where: { id: input.agentId, ownerId: userId },
        select: { id: true },
      });
      if (!agent) {
        throw new Error("Agent not found or permission denied");
      }

      const defaults: Record<
        "MENTION" | "DIRECT_MESSAGE" | "ASSIGN_TASK",
        { name: string; description: string; priority: number; tags: string[] }
      > = {
        ASSIGN_TASK: {
          name: "Task Assignment",
          description: "Triggers when a task is assigned to a user or agent",
          priority: 0,
          tags: ["task", "assignment"],
        },
        DIRECT_MESSAGE: {
          name: "Direct Message",
          description: "Triggers when a direct message is sent to the agent",
          priority: 0,
          tags: ["message", "communication"],
        },
        MENTION: {
          name: "Mention",
          description: "Triggers when the agent is mentioned in a comment or message",
          priority: 0,
          tags: ["mention", "notification"],
        },
      };

      const existing = await prisma.agentTrigger.findFirst({
        where: {
          agentId: input.agentId,
          triggerType: input.triggerType,
        },
      });

      const prevConfig =
        existing?.triggerConfig &&
        typeof existing.triggerConfig === "object" &&
        !Array.isArray(existing.triggerConfig)
          ? { ...(existing.triggerConfig as Record<string, unknown>) }
          : { scope: "all" };

      const nextConfig = {
        ...prevConfig,
        ...(input.instructions !== undefined
          ? { instructions: input.instructions }
          : {}),
      };

      if (existing) {
        return prisma.agentTrigger.update({
          where: { id: existing.id },
          data: {
            ...(input.isActive !== undefined
              ? {
                  isActive: input.isActive,
                  ...(input.isActive
                    ? { activatedAt: new Date(), deactivatedAt: null }
                    : { deactivatedAt: new Date() }),
                }
              : {}),
            triggerConfig: nextConfig as any,
          },
        });
      }

      const meta = defaults[input.triggerType];
      return prisma.agentTrigger.create({
        data: {
          id: randomUUID(),
          agentId: input.agentId,
          triggerType: input.triggerType,
          triggerConfig: nextConfig as any,
          name: meta.name,
          description: meta.description,
          isActive: input.isActive ?? true,
          priority: meta.priority,
          tags: meta.tags,
          activatedAt: (input.isActive ?? true) ? new Date() : null,
        },
      });
    }),

  ensureMemoryDoc: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return ensureAgentMemoryDoc(input.agentId, { ownerId: userId });
    }),

  clearMemories: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const agent = await prisma.aiAgent.findFirst({
        where: { id: input.agentId, ownerId: userId },
      });
      if (!agent) {
        throw new Error('Agent not found or permission denied');
      }
      return clearAgentMemoryStores(input.agentId);
    }),

  /** Merge memory settings into metadata.memory; sets legacyMigrated on first save. */
  updateMemorySettings: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        enabled: z.boolean().optional(),
        shortTermEnabled: z.boolean().optional(),
        memoryType: memoryTypeEnum.optional(),
        contextWindow: z.number().int().min(1).max(50).optional(),
        useVectorMemory: z.boolean().optional(),
        memoryRetention: z.number().int().min(1).max(365).nullable().optional(),
        prefs: z
          .object({
            rememberPreferences: z.boolean().optional(),
            rememberPeopleOrg: z.boolean().optional(),
            rememberGoals: z.boolean().optional(),
            rememberTranscripts: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const agent = await prisma.aiAgent.findFirst({
        where: { id: input.agentId, ownerId: userId },
      });
      if (!agent) {
        throw new Error('Agent not found or permission denied');
      }

      const metadata = buildDefaultAgentMetadata(agent.metadata, {
        legacyMigrated: true,
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.shortTermEnabled !== undefined
          ? { shortTermEnabled: input.shortTermEnabled }
          : {}),
        ...(input.prefs ? { prefs: input.prefs } : {}),
      });

      const data: Record<string, unknown> = { metadata };
      if (input.memoryType !== undefined) data.memoryType = input.memoryType;
      if (input.contextWindow !== undefined) data.contextWindow = input.contextWindow;
      if (input.useVectorMemory !== undefined) data.useVectorMemory = input.useVectorMemory;
      if (input.memoryRetention !== undefined) data.memoryRetention = input.memoryRetention;

      // Ensure notebook when enabling long-term
      const enablingLongTerm =
        (input.enabled !== false) &&
        (input.memoryType === 'LONG_TERM' ||
          (input.memoryType === undefined && agent.memoryType === 'LONG_TERM') ||
          input.enabled === true);

      const updated = await prisma.aiAgent.update({
        where: { id: input.agentId },
        data: data as any,
      });

      if (enablingLongTerm && input.enabled !== false && isAgentMemoryDocEnabled()) {
        try {
          const ensured = await ensureAgentMemoryDoc(input.agentId, { ownerId: userId });
          if ((updated as any).memoryViewId !== ensured.viewId) {
            return prisma.aiAgent.update({
              where: { id: input.agentId },
              data: { memoryViewId: ensured.viewId },
            });
          }
        } catch (err) {
          console.error('ensureAgentMemoryDoc on settings save failed', err);
        }
      }

      return updated;
    }),

});
