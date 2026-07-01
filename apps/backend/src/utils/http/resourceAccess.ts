import { prisma } from '@/lib/prisma';
import { assertProjectAccessForUser } from '@/utils/socket/granularAuth';
import { PermissionService } from '@/services/agents/safety/permissionService';

const permissionService = new PermissionService();

export { assertProjectAccessForUser };

export async function assertCompositeToolAccess(toolId: string, userId: string): Promise<void> {
    const tool = await prisma.compositeTool.findFirst({
        where: { id: toolId, ownerId: userId },
        select: { id: true },
    });
    if (!tool) {
        throw new Error('Access denied to tool');
    }
}

export async function assertSimulationAccess(simulationId: string, userId: string): Promise<void> {
    const conversation = await prisma.aiConversation.findFirst({
        where: { id: simulationId, userId },
        select: { id: true },
    });
    if (!conversation) {
        throw new Error('Simulation not found or access denied');
    }
}

export async function registerAgentRunOwner(runId: string, userId: string): Promise<void> {
    const { redis } = await import('@/lib/redis');
    await redis.setex(`agent_run_owner:${runId}`, 3600, userId);
}

export async function assertAgentRunAccess(runId: string, userId: string): Promise<void> {
    const { getRunEvents } = await import('@/services/agents/execution/agentEventStore');
    const events = await getRunEvents(runId);
    if (events.length > 0) {
        if (events[0].tenant_id !== userId) {
            throw new Error('Access denied');
        }
        return;
    }

    const { redis } = await import('@/lib/redis');
    const owner = await redis.get(`agent_run_owner:${runId}`);
    if (!owner || owner !== userId) {
        throw new Error('Run not found or access denied');
    }
}

export async function assertWorkspaceAccessForUser(workspaceId: string, userId: string): Promise<void> {
    const workspace = await prisma.workspace.findFirst({
        where: {
            id: workspaceId,
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: { id: true },
    });
    if (!workspace) {
        throw new Error('Access denied to workspace');
    }
}

export async function assertSwarmSessionAccess(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.aiConversation.findFirst({
        where: { id: sessionId },
        select: { workspaceId: true },
    });
    if (!session?.workspaceId) {
        throw new Error('Session not found');
    }
    await assertWorkspaceAccessForUser(session.workspaceId, userId);
}

export async function assertAgentAccess(
    agentId: string,
    userId: string,
    permission: 'read' | 'write' | 'execute',
): Promise<void> {
    const allowed = await permissionService.checkAgentPermission(agentId, userId, permission);
    if (!allowed) {
        throw new Error('Access denied to agent');
    }
}

export async function assertListAccess(listId: string, userId: string): Promise<void> {
    const list = await prisma.list.findUnique({
        where: { id: listId },
        select: { projectId: true, workspaceId: true },
    });
    if (!list) {
        throw new Error('List not found');
    }
    if (list.projectId) {
        await assertProjectAccessForUser(userId, list.projectId);
        return;
    }
    if (list.workspaceId) {
        await assertWorkspaceAccessForUser(list.workspaceId, userId);
        return;
    }
    throw new Error('Access denied to list');
}

export async function assertSpaceAccess(spaceId: string, userId: string): Promise<void> {
    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        select: { workspaceId: true },
    });
    if (!space) {
        throw new Error('Space not found');
    }
    await assertWorkspaceAccessForUser(space.workspaceId, userId);
}

export async function assertTaskAccess(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true },
    });
    if (!task?.projectId) {
        throw new Error('Task not found');
    }
    await assertProjectAccessForUser(userId, task.projectId);
}

export async function assertTeamAccessForUser(teamId: string, userId: string): Promise<void> {
    const team = await prisma.team.findFirst({
        where: {
            id: teamId,
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: { id: true },
    });
    if (!team) {
        throw new Error('Access denied to team');
    }
}
