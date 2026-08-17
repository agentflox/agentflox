import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'MEMBER']);

export async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, ownerId: true, settings: true },
  });
  if (!workspace) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Workspace not found or permission denied' });
  }
  return workspace;
}

export async function assertWorkspaceWriter(workspaceId: string, userId: string) {
  const workspace = await assertWorkspaceMember(workspaceId, userId);
  if (workspace.ownerId === userId) return { ...workspace, role: 'OWNER' as const };
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });
  const role = member?.role ?? 'GUEST';
  if (!WRITE_ROLES.has(role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permission' });
  }
  return { ...workspace, role };
}

export function isAutomationsEnabled(settings: unknown): boolean {
  if (String(process.env.AUTOMATIONS_V1_KILL_SWITCH || '').toLowerCase() === 'off') return false;
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;
  return s.automationsV1 === true || s['automations.v1'] === true;
}
