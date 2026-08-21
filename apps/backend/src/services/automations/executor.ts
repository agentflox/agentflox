import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/inngest';
import type { ActionSpec } from './catalog/actions';
import { claimIdempotencyKey, completeIdempotencyKey, failIdempotencyKey, waitForIdempotency } from './idempotency';
import type { CascadeContext } from './cascade';

export type RunStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

function mapRunStatus(succeeded: number, failed: boolean, total: number): RunStatus {
  if (!failed) return 'SUCCESS';
  if (succeeded === 0) return 'FAILED';
  return 'PARTIAL';
}

async function writeCustomField(taskId: string, customFieldId: string, value: string) {
  const field = await prisma.customField.findUnique({ where: { id: customFieldId } });
  if (!field) return { ok: false as const, detail: null, error: 'custom_field_missing' };
  const existing = await prisma.customFieldValue.findFirst({
    where: { customFieldId: field.id, taskId },
  });
  if (existing) {
    await prisma.customFieldValue.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.customFieldValue.create({ data: { customFieldId: field.id, taskId, value } });
  }
  return { ok: true as const, detail: { customFieldId: field.id } };
}

async function loadTask(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}

async function runAction(
  action: ActionSpec,
  ctx: {
    taskId: string;
    ownerId: string;
    workspaceId?: string | null;
    agentId?: string | null;
    cascade: CascadeContext;
  },
): Promise<{ ok: boolean; detail: unknown; error?: string }> {
  const input = action.input || {};
  switch (action.type) {
    case 'UPDATE_STATUS': {
      const status = await prisma.taskStatus.findUnique({ where: { id: input.statusId } });
      if (!status) return { ok: false, detail: null, error: 'status_not_found' };
      await prisma.task.update({ where: { id: ctx.taskId }, data: { statusId: input.statusId } });
      return { ok: true, detail: { statusId: input.statusId } };
    }
    case 'ADD_ASSIGNEE':
    case 'UPDATE_ASSIGNEES': {
      const data: any = { taskId: ctx.taskId, assigned_by: ctx.ownerId };
      if (input.userId) data.userId = input.userId;
      if (input.teamId) data.teamId = input.teamId;
      if (input.agentId) data.agentId = input.agentId;
      if (!data.userId && !data.teamId && !data.agentId) return { ok: false, detail: null, error: 'assignee_missing' };
      await prisma.taskAssignee.createMany({ data: [data], skipDuplicates: true });
      if (data.userId) {
        await prisma.task.update({ where: { id: ctx.taskId }, data: { assigneeId: data.userId } });
      }
      return { ok: true, detail: data };
    }
    case 'ADD_FOLLOWER':
    case 'UPDATE_FOLLOWERS': {
      if (!input.userId) return { ok: false, detail: null, error: 'user_missing' };
      await prisma.taskWatcher.upsert({
        where: { taskId_userId: { taskId: ctx.taskId, userId: input.userId } },
        create: { taskId: ctx.taskId, userId: input.userId },
        update: {},
      });
      return { ok: true, detail: { userId: input.userId } };
    }
    case 'ADD_COMMENT': {
      await prisma.taskComment.create({
        data: { taskId: ctx.taskId, userId: ctx.ownerId, content: input.content || '' },
      });
      return { ok: true, detail: { posted: true } };
    }
    case 'SET_AI_FIELD':
    case 'UPDATE_CUSTOM_FIELD':
    case 'REFRESH_AI_FIELD': {
      if (!input.customFieldId) return { ok: false, detail: null, error: 'custom_field_missing' };
      return writeCustomField(ctx.taskId, input.customFieldId, input.value ?? '');
    }
    case 'DO_ANYTHING_WITH_AI':
    case 'LAUNCH_AI_AGENT': {
      const agentId = input.agentId || ctx.agentId;
      if (!agentId) return { ok: false, detail: null, error: 'agent_missing' };
      const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
      if (!agent || !agent.isActive || agent.isPaused) {
        return { ok: false, detail: null, error: agent ? 'agent_paused' : 'agent_missing' };
      }
      await inngest.send({
        name: 'agent/executor.requested',
        data: {
          runId: `auto_${ctx.cascade.rootEventId}_${ctx.taskId}`,
          conversationId: `automation:${ctx.cascade.rootEventId}`,
          agentId: agent.id,
          message: `${input.prompt || ''}\n\nTask ID: ${ctx.taskId}`,
          userId: ctx.ownerId,
          idempotencyKey: `automation-ai:${ctx.cascade.rootEventId}:${ctx.taskId}`,
        },
      });
      return { ok: true, detail: { agentId: agent.id } };
    }
    case 'CALL_WEBHOOK': {
      const webhookId = typeof input.webhookId === 'string' ? input.webhookId : undefined;
      let url = input.url as string | undefined;
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (webhookId) {
        const hook = await prisma.webhook.findFirst({
          where: { id: webhookId, type: 'automation', isActive: true },
        });
        if (!hook?.url) return { ok: false, detail: null, error: 'webhook_missing' };
        url = hook.url;
        const storedHeaders = Array.isArray(hook.headers) ? hook.headers : [];
        for (const h of storedHeaders as Array<{ key?: string; value?: string }>) {
          if (h?.key) headers[h.key] = String(h.value ?? '');
        }
      }
      if (!url) return { ok: false, detail: null, error: 'url_missing' };
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId: ctx.taskId }),
      });
      if (!res.ok) return { ok: false, detail: { status: res.status }, error: 'webhook_failed' };
      return { ok: true, detail: { status: res.status } };
    }
    case 'MOVE_TO_LIST': {
      if (!input.listId) return { ok: false, detail: null, error: 'list_missing' };
      await prisma.task.update({ where: { id: ctx.taskId }, data: { listId: input.listId } });
      return { ok: true, detail: { listId: input.listId } };
    }
    case 'ADD_TO_LIST': {
      if (!input.listId) return { ok: false, detail: null, error: 'list_missing' };
      await prisma.task.update({
        where: { id: ctx.taskId },
        data: { sharedLists: { connect: { id: input.listId } } },
      });
      return { ok: true, detail: { listId: input.listId } };
    }
    case 'UPDATE_PRIORITY': {
      await prisma.task.update({ where: { id: ctx.taskId }, data: { priority: input.priority || 'NORMAL' } });
      return { ok: true, detail: { priority: input.priority } };
    }
    case 'UPDATE_TAGS': {
      const tags = String(input.tags || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
      await prisma.task.update({ where: { id: ctx.taskId }, data: { tags } });
      return { ok: true, detail: { tags } };
    }
    case 'UPDATE_TASK_NAME': {
      if (!input.name) return { ok: false, detail: null, error: 'name_missing' };
      await prisma.task.update({ where: { id: ctx.taskId }, data: { title: input.name } });
      return { ok: true, detail: { title: input.name } };
    }
    case 'UPDATE_TASK_TYPE': {
      await prisma.task.update({ where: { id: ctx.taskId }, data: { taskTypeId: input.taskTypeId || null } });
      return { ok: true, detail: { taskTypeId: input.taskTypeId } };
    }
    case 'UPDATE_DUE_DATE': {
      await prisma.task.update({
        where: { id: ctx.taskId },
        data: { dueDate: input.dueDate ? new Date(input.dueDate) : null },
      });
      return { ok: true, detail: { dueDate: input.dueDate } };
    }
    case 'UPDATE_START_DATE': {
      await prisma.task.update({
        where: { id: ctx.taskId },
        data: { startDate: input.startDate ? new Date(input.startDate) : null },
      });
      return { ok: true, detail: { startDate: input.startDate } };
    }
    case 'ESTIMATE_TIME': {
      await prisma.task.update({
        where: { id: ctx.taskId },
        data: { timeEstimate: Number(input.timeEstimate) || 0 },
      });
      return { ok: true, detail: { timeEstimate: input.timeEstimate } };
    }
    case 'TRACK_TIME': {
      await prisma.timeEntry.create({
        data: {
          taskId: ctx.taskId,
          userId: ctx.ownerId,
          duration: Number(input.duration) || 0,
          startTime: new Date(),
          isRunning: false,
        },
      });
      return { ok: true, detail: { duration: input.duration } };
    }
    case 'ARCHIVE_TASK':
    case 'DELETE_TASK': {
      await prisma.task.update({
        where: { id: ctx.taskId },
        data: { deletedAt: new Date(), deletedById: ctx.ownerId },
      });
      return { ok: true, detail: { deleted: true } };
    }
    case 'CREATE_TASK':
    case 'CREATE_SUBTASK':
    case 'DUPLICATE_TASK': {
      const source = await loadTask(ctx.taskId);
      if (!source) return { ok: false, detail: null, error: 'task_missing' };
      const created = await prisma.task.create({
        data: {
          title: input.title || `${source.title}${action.type === 'DUPLICATE_TASK' ? ' (copy)' : ''}`,
          createdBy: ctx.ownerId,
          workspaceId: source.workspaceId,
          spaceId: source.spaceId,
          projectId: source.projectId,
          teamId: source.teamId,
          listId: source.listId,
          parentId: action.type === 'CREATE_SUBTASK' ? source.id : source.parentId,
          description: action.type === 'DUPLICATE_TASK' ? source.description : null,
          priority: action.type === 'DUPLICATE_TASK' ? source.priority : undefined,
        },
      });
      return { ok: true, detail: { taskId: created.id } };
    }
    case 'CREATE_LIST': {
      if (!input.listName) return { ok: false, detail: null, error: 'name_missing' };
      const source = await loadTask(ctx.taskId);
      const created = await prisma.list.create({
        data: {
          name: input.listName,
          ownerId: ctx.ownerId,
          workspaceId: source?.workspaceId ?? ctx.workspaceId,
          spaceId: source?.spaceId,
          projectId: source?.projectId,
          teamId: source?.teamId,
        },
      });
      return { ok: true, detail: { listId: created.id } };
    }
    default:
      return { ok: false, detail: null, error: 'unknown_action' };
  }
}

export async function executeAutomation(opts: {
  automationId: string;
  taskId: string;
  cascade: CascadeContext;
  stopOnError?: boolean;
}): Promise<{ status: RunStatus; actionsExecuted: unknown[]; error?: string }> {
  const stopOnError = opts.stopOnError !== false;
  const automation = await prisma.automation.findUnique({
    where: { id: opts.automationId },
    include: { aiAgent: { select: { id: true, isActive: true, isPaused: true } } },
  });
  if (!automation || !automation.isActive) {
    return { status: 'FAILED', actionsExecuted: [], error: 'inactive' };
  }

  const actions = (Array.isArray(automation.actions) ? automation.actions : []) as ActionSpec[];
  const executed: unknown[] = [];
  let succeeded = 0;
  let failed = false;
  let lastError: string | undefined;

  for (let i = 0; i < actions.length; i++) {
    const key = `${opts.cascade.rootEventId}:${opts.automationId}:${i}`;
    const claim = await claimIdempotencyKey(key);
    if (!claim.claimed) {
      if (claim.status === 'COMPLETED') {
        executed.push(claim.result);
        succeeded += 1;
        continue;
      }
      if (claim.status === 'PENDING') {
        const waited = await waitForIdempotency(key);
        if (waited) {
          executed.push(waited);
          succeeded += 1;
          continue;
        }
      }
    }

    try {
      const result = await runAction(actions[i], {
        taskId: opts.taskId,
        ownerId: automation.ownerId,
        workspaceId: automation.workspaceId,
        agentId: automation.agentId,
        cascade: opts.cascade,
      });
      executed.push({ type: actions[i].type, ...result });
      if (result.ok) {
        succeeded += 1;
        await completeIdempotencyKey(key, result);
      } else {
        failed = true;
        lastError = result.error;
        await failIdempotencyKey(key, result);
        if (stopOnError) break;
      }
    } catch (err: any) {
      failed = true;
      lastError = err?.message || 'action_failed';
      executed.push({ type: actions[i].type, ok: false, error: lastError });
      await failIdempotencyKey(key, { error: lastError });
      if (stopOnError) break;
    }
  }

  const status = mapRunStatus(succeeded, failed, actions.length);
  await prisma.automationLog.create({
    data: {
      automationId: automation.id,
      status,
      triggerData: { taskId: opts.taskId, rootEventId: opts.cascade.rootEventId },
      actionsExecuted: executed as object,
      error: lastError,
    },
  });
  await prisma.automation.update({
    where: { id: automation.id },
    data: {
      runCount: { increment: 1 },
      lastRanAt: new Date(),
    },
  });

  return { status, actionsExecuted: executed, error: lastError };
}

export { mapRunStatus };
