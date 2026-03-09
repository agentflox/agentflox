/**
 * Task Management Tool Executor
 * Implements CRUD operations for tasks and schedules
 */
import { prisma } from '@/lib/prisma';

export async function executeTaskManagementTool(toolName: string, params: any, userId: string, workspaceId?: string): Promise<any> {
    try {
        switch (toolName) {
            case 'createTask':
                return executeCreateTask(params, userId, workspaceId);
            case 'updateTask':
                return executeUpdateTask(params, userId);
            case 'deleteTask':
                return executeDeleteTask(params, userId);
            case 'listTasks':
            case 'retrieveTaskList':
                return executeListTasks(params, userId);
            case 'getTask':
                return executeGetTask(params, userId);
            case 'assignTask':
                return executeAssignTask(params, userId);
            default:
                throw new Error(`Unknown task management tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Task management tool failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function executeCreateTask(params: any, userId: string, workspaceId?: string) {
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

async function executeUpdateTask(params: any, userId: string) {
    // Verify user has permission
    const existingTask = await prisma.task.findFirst({
        where: {
            id: params.taskId,
            OR: [{ createdBy: userId }, { assignees: { some: { userId } } }],
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

async function executeDeleteTask(params: any, userId: string) {
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

async function executeListTasks(params: any, userId: string) {
    const where: any = {};

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.teamId) where.teamId = params.teamId;
    if (params.assigneeId) where.assigneeId = params.assigneeId;
    if (params.status) where.statusId = { in: params.status };

    where.OR = [
        { createdBy: userId },
        { assignees: { some: { userId } } },
    ];

    const limit = params.limit || params.pageSize || 50;
    const skip = ((params.page || 1) - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.task.findMany({
            where,
            take: limit,
            skip,
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.task.count({ where }),
    ]);

    return { items, total };
}

async function executeGetTask(params: any, userId: string) {
    const task = await prisma.task.findFirst({
        where: {
            id: params.taskId,
            OR: [{ createdBy: userId }, { assignees: { some: { userId } } }],
        },
    });

    if (!task) {
        throw new Error('Task not found or permission denied');
    }

    return task;
}

async function executeAssignTask(params: any, userId: string) {
    const existingTask = await prisma.task.findFirst({
        where: {
            id: params.taskId,
            OR: [{ createdBy: userId }, { assignees: { some: { userId } } }],
        },
    });

    if (!existingTask) {
        throw new Error('Task not found or permission denied');
    }

    const task = await prisma.task.update({
        where: { id: params.taskId },
        data: { assigneeId: params.assigneeId },
    });

    return task;
}
