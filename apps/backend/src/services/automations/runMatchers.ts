import { prisma } from '@/lib/prisma';
import { isKillSwitchOff, isWorkspaceAutomationsEnabled } from './flag';
import { matchesLocation, matchesTriggerConfig, type TaskEventPayload } from './matcher';
import { canRunAutomation, type CascadeContext } from './cascade';
import { evaluateConditionGate } from './conditionGate';
import { executeAutomation } from './executor';

export async function runAutomationMatchers(opts: {
  event: TaskEventPayload;
  cascade: CascadeContext;
}) {
  if (isKillSwitchOff()) return { skipped: true };

  const workspaceId = opts.event.workspaceId;
  if (!workspaceId) return { skipped: true };

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!isWorkspaceAutomationsEnabled(workspace?.settings)) {
    return { skipped: true };
  }

  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      isActive: true,
      status: 'ACTIVE',
      triggers: { some: { isActive: true, triggerType: opts.event.type as any } },
    },
    include: {
      triggers: { where: { isActive: true, triggerType: opts.event.type as any } },
      aiAgent: { select: { id: true, isActive: true, isPaused: true } },
    },
  });

  const results: Array<{ automationId: string; status: string; reason?: string }> = [];
  let cascade = { ...opts.cascade };

  for (const automation of automations) {
    if (!matchesLocation(automation, opts.event)) continue;
    const trigger = automation.triggers[0];
    if (!trigger) continue;
    const config = (trigger.triggerConfig || {}) as Record<string, unknown>;
    if (!matchesTriggerConfig(config, opts.event)) continue;

    const decision = canRunAutomation(cascade, automation.id);
    if (!decision.ok) {
      await prisma.automationLog.create({
        data: {
          automationId: automation.id,
          status: 'FAILED',
          triggerData: { taskId: opts.event.taskId, reason: decision.reason },
          actionsExecuted: [],
          error: decision.reason,
        },
      });
      results.push({ automationId: automation.id, status: 'FAILED', reason: decision.reason });
      if (decision.reason === 'cascade_budget_exceeded' || decision.reason === 'max_depth') break;
      continue;
    }
    cascade = decision.next;

    if (automation.kind === 'AGENT') {
      const conditions = (trigger.conditions || {}) as { prompt?: string };
      if (conditions.prompt?.trim()) {
        const gate = await evaluateConditionGate({
          prompt: conditions.prompt,
          task: { id: opts.event.taskId, ...opts.event },
        });
        if (!gate.pass) {
          await prisma.automationLog.create({
            data: {
              automationId: automation.id,
              status: 'FAILED',
              triggerData: { taskId: opts.event.taskId },
              actionsExecuted: [],
              error: gate.error || 'condition_gate_error',
            },
          });
          results.push({ automationId: automation.id, status: 'FAILED', reason: 'condition_gate' });
          continue;
        }
      }
      if (automation.agentId) {
        const agent = automation.aiAgent;
        if (!agent || !agent.isActive || agent.isPaused) {
          await prisma.automationLog.create({
            data: {
              automationId: automation.id,
              status: 'FAILED',
              triggerData: { taskId: opts.event.taskId },
              actionsExecuted: [],
              error: agent ? 'agent_paused' : 'agent_missing',
            },
          });
          results.push({ automationId: automation.id, status: 'FAILED', reason: 'mismatch' });
          continue;
        }
      }
    }

    const run = await executeAutomation({
      automationId: automation.id,
      taskId: opts.event.taskId,
      cascade,
    });
    results.push({ automationId: automation.id, status: run.status, reason: run.error });
  }

  return { skipped: false, results };
}
