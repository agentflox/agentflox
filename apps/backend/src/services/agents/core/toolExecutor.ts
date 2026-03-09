/**
 * Tool Executor
 * 
 * Executes tools based on LLM selection with parameter validation
 */

import { capabilityProvider } from './capabilityProvider';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

/**
 * Execute a tool call
 */
export async function executeTool(
  toolCall: Omit<ToolCall, 'id' | 'status' | 'startedAt' | 'completedAt' | 'duration'>,
  userId: string,
  workspaceId?: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    // Route execution to the capability provider
    const result = await capabilityProvider.execute(
      toolCall.toolName,
      toolCall.parameters,
      userId,
      workspaceId
    );

    const duration = Date.now() - startTime;

    return {
      success: true,
      result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Validate tool parameters against schema
 */
function validateToolParameters(tool: Tool, parameters: Record<string, any>): void {
  const schema = tool.functionSchema.parameters;
  const required = schema.required || [];

  // Check required parameters
  for (const param of required) {
    if (!(param in parameters)) {
      throw new Error(`Missing required parameter: ${param}`);
    }
  }

  // Validate parameter types (basic validation)
  for (const [key, value] of Object.entries(parameters)) {
    const paramDef = schema.properties?.[key];
    if (paramDef) {
      if (paramDef.type === 'string' && typeof value !== 'string') {
        throw new Error(`Invalid type for parameter ${key}: expected string`);
      }
      if (paramDef.type === 'number' && typeof value !== 'number') {
        throw new Error(`Invalid type for parameter ${key}: expected number`);
      }
      if (paramDef.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Invalid type for parameter ${key}: expected boolean`);
      }
      if (paramDef.type === 'array' && !Array.isArray(value)) {
        throw new Error(`Invalid type for parameter ${key}: expected array`);
      }
      if (paramDef.enum && !paramDef.enum.includes(value)) {
        throw new Error(`Invalid value for parameter ${key}: must be one of ${paramDef.enum.join(', ')}`);
      }
    }
  }
}

/**
 * Execute createTask tool
 */
async function executeCreateTask(params: Record<string, any>, userId: string, workspaceId?: string): Promise<any> {
  const task = await prisma.task.create({
    data: {
      workspace: { connect: { id: workspaceId || params.workspaceId } },
      projectId: params.projectId,
      teamId: params.teamId,
      title: params.title,
      description: params.description,
      assigneeId: params.assigneeId,
      listId: params.listId,
      creator: { connect: { id: userId } },
      visibility: params.visibility || 'PRIVATE',
      isPublic: params.isPublic || false,
    },
  });
  return task;
}

/**
 * Execute updateTask tool
 */
async function executeUpdateTask(params: Record<string, any>, userId: string): Promise<any> {
  // Verify user has permission
  const existingTask = await prisma.task.findFirst({
    where: {
      id: params.taskId,
      OR: [{ createdBy: userId }, { assigneeId: userId }],
    },
  });

  if (!existingTask) {
    throw new Error('Task not found or permission denied');
  }

  const updateData: any = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.assigneeId !== undefined) updateData.assigneeId = params.assigneeId;
  if (params.status !== undefined) updateData.statusId = params.status;
  if (params.priority !== undefined) updateData.priority = params.priority;

  const task = await prisma.task.update({
    where: { id: params.taskId },
    data: updateData,
  });
  return task;
}

/**
 * Execute deleteTask tool
 */
async function executeDeleteTask(params: Record<string, any>, userId: string): Promise<any> {
  // Verify user has permission
  const existingTask = await prisma.task.findFirst({
    where: {
      id: params.taskId,
      createdBy: userId,
    },
  });

  if (!existingTask) {
    throw new Error('Task not found or permission denied');
  }

  await prisma.task.delete({
    where: { id: params.taskId },
  });
  return { success: true, taskId: params.taskId };
}

/**
 * Execute listTasks tool
 */
async function executeListTasks(params: Record<string, any>, userId: string): Promise<any> {
  const where: any = {};

  if (params.workspaceId) where.workspaceId = params.workspaceId;
  if (params.projectId) where.projectId = params.projectId;
  if (params.teamId) where.teamId = params.teamId;
  if (params.assigneeId) where.assigneeId = params.assigneeId;
  if (params.status) where.statusId = { in: params.status };

  // Only show tasks user has access to
  where.OR = [
    { createdBy: userId },
    { assigneeId: userId },
  ];

  const limit = params.limit || 50;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total };
}

/**
 * Execute getTask tool
 */
async function executeGetTask(params: Record<string, any>, userId: string): Promise<any> {
  const task = await prisma.task.findFirst({
    where: {
      id: params.taskId,
      OR: [{ createdBy: userId }, { assigneeId: userId }],
    },
  });

  if (!task) {
    throw new Error('Task not found or permission denied');
  }

  return task;
}

/**
 * Execute assignTask tool
 */
async function executeAssignTask(params: Record<string, any>, userId: string): Promise<any> {
  // Verify user has permission to assign
  const existingTask = await prisma.task.findFirst({
    where: {
      id: params.taskId,
      OR: [{ createdBy: userId }, { assigneeId: userId }],
    },
  });

  if (!existingTask) {
    throw new Error('Task not found or permission denied');
  }

  // Verify assignee exists
  const assignee = await prisma.user.findUnique({
    where: { id: params.assigneeId },
  });

  if (!assignee) {
    throw new Error('Assignee not found');
  }

  const task = await prisma.task.update({
    where: { id: params.taskId },
    data: { assigneeId: params.assigneeId },
  });

  return task;
}

