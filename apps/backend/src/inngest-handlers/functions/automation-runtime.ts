import { inngest } from '@/lib/inngest';
import { runAutomationMatchers } from '../../services/automations/runMatchers';
import { prisma } from '@/lib/prisma';
import { isKillSwitchOff, isWorkspaceAutomationsEnabled } from '../../services/automations/flag';
import { createCascadeContext } from '../../services/automations/cascade';

export const runAutomationTaskEvent = inngest.createFunction(
  {
    id: 'automation-task-event',
    name: 'Run automation matchers for task event',
    retries: 2,
    triggers: [{ event: 'automation/task.event' }],
  },
  async ({ event, step }) => {
    return step.run('match-and-execute', async () => {
      return runAutomationMatchers({
        event: event.data.event,
        cascade: event.data.cascade,
      });
    });
  },
);

export const automationScheduleTick = inngest.createFunction(
  {
    id: 'automation-schedule-tick',
    name: 'Automation scheduled triggers',
    triggers: [{ cron: '* * * * *' }],
  },
  async ({ step }) => {
    if (isKillSwitchOff()) return { skipped: true };
    return step.run('dispatch-scheduled', async () => {
      const rules = await prisma.automation.findMany({
        where: {
          isActive: true,
          isScheduled: true,
          status: 'ACTIVE',
          triggers: { some: { isActive: true, triggerType: 'EVERY_SCHEDULED_TIME' } },
        },
        include: { workspace: { select: { settings: true } } },
      });
      let dispatched = 0;
      for (const rule of rules) {
        if (!rule.workspaceId || !isWorkspaceAutomationsEnabled(rule.workspace?.settings)) continue;
        await inngest.send({
          name: 'automation/task.event',
          data: {
            event: {
              type: 'EVERY_SCHEDULED_TIME',
              taskId: `schedule:${rule.id}`,
              workspaceId: rule.workspaceId,
              spaceId: rule.spaceId,
              projectId: rule.projectId,
              teamId: rule.teamId,
              listId: rule.listId,
              folderId: rule.folderId,
            },
            cascade: createCascadeContext({ source: 'schedule' }),
          },
        });
        dispatched += 1;
      }
      return { dispatched };
    });
  },
);
