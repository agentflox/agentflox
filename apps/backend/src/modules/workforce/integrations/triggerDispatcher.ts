import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { runWorkforce } from '@/services/agents/orchestration/workforceExecutionService';
import type { WorkforceData } from '@/services/agents/orchestration/workforceExecutionService';
import {
  extractIntegrationTriggersFromWorkforce,
  verifyWebhookSecret,
  cronMatchesNow,
  type WorkforceTriggerMatch,
} from './workforceTriggerResolver';

export async function findWorkforcesByTriggerType(
  triggerType: string,
  workspaceId?: string,
): Promise<WorkforceTriggerMatch[]> {
  const workforces = await prisma.workforce.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      ...(workspaceId ? { workspaceId } : {}),
    },
    select: {
      id: true,
      ownerId: true,
      workspaceId: true,
      data: true,
    },
    take: 500,
  });

  const matches: WorkforceTriggerMatch[] = [];
  for (const wf of workforces) {
    matches.push(
      ...extractIntegrationTriggersFromWorkforce(
        wf.id,
        wf.ownerId,
        wf.workspaceId,
        wf.data as WorkforceData,
      ).filter((m) => m.triggerType === triggerType),
    );
  }
  return matches;
}

export async function dispatchWorkforceTrigger(
  match: WorkforceTriggerMatch,
  payload: Record<string, unknown>,
): Promise<{ executionId: string; workforceId: string }> {
  const executionId = randomUUID();
  const result = await runWorkforce(
    match.workforceId,
    {
      task: `Triggered by ${match.triggerType} integration`,
      triggerType: match.triggerType,
      triggerPayload: payload,
    },
    match.ownerId,
    { executionId },
  );

  return { executionId: result.executionId, workforceId: match.workforceId };
}

export async function handleInboundWebhook(params: {
  sourceId?: string;
  workspaceId?: string;
  secret: string;
  payload: Record<string, unknown>;
}): Promise<{ dispatched: number; workforceIds: string[] }> {
  const scopeId = params.sourceId || params.workspaceId;
  let matches = scopeId
    ? await findWorkforcesByTriggerType('webhook', scopeId)
    : [];
  if (matches.length === 0) {
    matches = await findWorkforcesByTriggerType('webhook');
  }
  const eligible = matches.filter((m) =>
    verifyWebhookSecret(
      params.secret,
      String(m.triggerConfig.webhookSecret ?? m.triggerConfig.secret ?? ''),
    ),
  );

  const workforceIds: string[] = [];
  for (const match of eligible) {
    const result = await dispatchWorkforceTrigger(match, params.payload);
    workforceIds.push(result.workforceId);
  }

  return { dispatched: eligible.length, workforceIds };
}

export async function dispatchDueScheduleTriggers(now = new Date()): Promise<number> {
  const matches = await findWorkforcesByTriggerType('schedule');
  let dispatched = 0;

  for (const match of matches) {
    const cron = String(match.triggerConfig.cronExpression ?? match.triggerConfig.cron ?? '');
    if (!cron) continue;

    if (!cronMatchesNow(cron, now)) continue;

    await dispatchWorkforceTrigger(match, { scheduledAt: now.toISOString() });
    dispatched++;
  }

  return dispatched;
}
