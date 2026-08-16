import { createHash, timingSafeEqual } from 'crypto';
import type { WorkforceData } from '@/services/agents/orchestration/workforceExecutionService';

export type WorkforceTriggerMatch = {
  workforceId: string;
  ownerId: string;
  workspaceId: string | null;
  triggerNodeId: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
};

const INTEGRATION_TRIGGER_TYPES = new Set([
  'github',
  'slack',
  'gmail',
  'calendar',
  'webhook',
  'schedule',
]);

export function extractIntegrationTriggersFromWorkforce(
  workforceId: string,
  ownerId: string,
  workspaceId: string | null,
  data: WorkforceData | null | undefined,
): WorkforceTriggerMatch[] {
  const graph = data?.workforce_graph;
  if (!graph?.nodes?.length) return [];

  const matches: WorkforceTriggerMatch[] = [];

  for (const node of graph.nodes) {
    if (node.type !== 'trigger') continue;
    const config = (node.config ?? {}) as Record<string, unknown>;
    const triggerType = String(config.triggerType ?? '');
    if (!triggerType || triggerType === 'user_message') continue;
    if (!INTEGRATION_TRIGGER_TYPES.has(triggerType)) continue;

    matches.push({
      workforceId,
      ownerId,
      workspaceId,
      triggerNodeId: node.node_id,
      triggerType,
      triggerConfig: config,
    });
  }

  return matches;
}

export function verifyWebhookSecret(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cronMatchesNow(cronExpression: string, date = new Date()): boolean {
  // Minimal cron: "minute hour dom month dow" — supports *, numbers, */n
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [min, hour, dom, month, dow] = parts;
  const checks = [
    [date.getMinutes(), min],
    [date.getHours(), hour],
    [date.getDate(), dom],
    [date.getMonth() + 1, month],
    [date.getDay(), dow],
  ] as const;

  return checks.every(([value, expr]) => matchCronField(value, expr));
}

function matchCronField(value: number, expr: string): boolean {
  if (expr === '*') return true;
  if (expr.startsWith('*/')) {
    const step = Number(expr.slice(2));
    return step > 0 && value % step === 0;
  }
  return Number(expr) === value;
}
