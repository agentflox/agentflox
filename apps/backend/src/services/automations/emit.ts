import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/inngest';
import { isKillSwitchOff, isWorkspaceAutomationsEnabled } from './flag';
import type { TaskEventPayload } from './matcher';
import { createCascadeContext, type CascadeContext } from './cascade';

export async function emitTaskEvent(
  event: TaskEventPayload,
  cascade?: Partial<CascadeContext>,
) {
  if (isKillSwitchOff()) return { skipped: true, reason: 'kill_switch' as const };
  if (!event.workspaceId) return { skipped: true, reason: 'no_workspace' as const };

  const workspace = await prisma.workspace.findUnique({
    where: { id: event.workspaceId },
    select: { settings: true },
  });
  if (!isWorkspaceAutomationsEnabled(workspace?.settings)) {
    return { skipped: true, reason: 'flag_off' as const };
  }

  const ctx = createCascadeContext(cascade);
  await inngest.send({
    name: 'automation/task.event',
    data: { event, cascade: ctx },
  });
  return { skipped: false, rootEventId: ctx.rootEventId };
}
