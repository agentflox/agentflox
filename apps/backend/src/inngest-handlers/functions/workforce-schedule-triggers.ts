import { inngest } from '@/lib/inngest';
import { dispatchDueScheduleTriggers } from '@/modules/workforce/integrations/triggerDispatcher';

/** Dispatch workforce schedule triggers every minute. */
export const workforceScheduleTriggers = inngest.createFunction(
  {
    id: 'workforce-schedule-triggers',
    name: 'Workforce Schedule Triggers',
    triggers: [{ cron: '* * * * *' }],
  },
  async ({ step }) => {
    const dispatched = await step.run('dispatch-schedule-triggers', async () => {
      return dispatchDueScheduleTriggers(new Date());
    });
    return { dispatched };
  },
);
