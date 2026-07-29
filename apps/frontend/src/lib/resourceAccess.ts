import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import type { ChatContextType } from '@/entities/chats/utils/context';

function forbidden(message = 'Access denied'): never {
  throw new TRPCError({ code: 'FORBIDDEN', message });
}

export async function assertProjectAccess(userId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
        { visibility: 'PUBLIC' },
      ],
    },
    select: { id: true },
  });
  if (!project) forbidden();
}

export async function assertWorkspaceAccess(userId: string, workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  if (!workspace) forbidden();
}

export async function assertTeamAccess(userId: string, teamId: string): Promise<void> {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  if (!team) forbidden();
}

export async function assertSpaceAccess(userId: string, spaceId: string): Promise<void> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { workspaceId: true },
  });
  if (!space) forbidden('Space not found');
  if (!space.workspaceId) forbidden('Space has no workspace');
  await assertWorkspaceAccess(userId, space.workspaceId);
}

export async function assertChannelAccess(userId: string, channelId: string): Promise<void> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true, type: true, members: { where: { userId }, select: { id: true } } },
  });
  if (!channel) forbidden('Channel not found');
  if (channel.type === 'PUBLIC') {
    await assertWorkspaceAccess(userId, channel.workspaceId);
    return;
  }
  if (channel.members.length === 0) forbidden();
}

export async function assertListAccess(userId: string, listId: string): Promise<void> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { projectId: true, workspaceId: true },
  });
  if (!list) forbidden('List not found');
  if (list.projectId) {
    await assertProjectAccess(userId, list.projectId);
    return;
  }
  if (list.workspaceId) {
    await assertWorkspaceAccess(userId, list.workspaceId);
    return;
  }
  forbidden();
}

export async function assertFolderAccess(userId: string, folderId: string): Promise<void> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { projectId: true, workspaceId: true },
  });
  if (!folder) forbidden('Folder not found');
  if (folder.projectId) {
    await assertProjectAccess(userId, folder.projectId);
    return;
  }
  if (folder.workspaceId) {
    await assertWorkspaceAccess(userId, folder.workspaceId);
    return;
  }
  forbidden();
}

export async function assertTaskAccess(userId: string, taskId: string): Promise<void> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { createdBy: userId },
        { assigneeId: userId },
        { assignees: { some: { userId } } },
        { workspace: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } },
        { project: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } },
      ],
    },
    select: { id: true },
  });
  if (!task) forbidden('Task not found');
}

export async function assertWorkforceAccess(userId: string, workforceId: string): Promise<void> {
  const workforce = await prisma.workforce.findFirst({
    where: {
      id: workforceId,
      ownerId: userId,
    },
    select: { id: true },
  });
  if (!workforce) forbidden('Workforce not found or access denied');
}

export async function assertChatEntityAccess(
  userId: string,
  contextType: ChatContextType,
  entityId: string,
): Promise<void> {
  switch (contextType) {
    case 'profile':
      if (entityId !== userId) forbidden();
      return;
    case 'project':
      return assertProjectAccess(userId, entityId);
    case 'workspace':
      return assertWorkspaceAccess(userId, entityId);
    case 'team':
      return assertTeamAccess(userId, entityId);
    case 'space':
      return assertSpaceAccess(userId, entityId);
    case 'channel':
      return assertChannelAccess(userId, entityId);
    case 'task':
      return assertTaskAccess(userId, entityId);
    case 'list':
      return assertListAccess(userId, entityId);
    case 'folder':
      return assertFolderAccess(userId, entityId);
    case 'proposal':
      return;
  }
}
