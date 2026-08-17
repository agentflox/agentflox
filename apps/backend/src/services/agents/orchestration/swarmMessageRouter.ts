/**
 * SwarmMessageRouter — Enterprise-grade intent routing for swarm chat messages.
 *
 * Architecture:
 *  1. IntentClassifier  → LLM with strict JSON schema → structured SwarmIntent
 *  2. EntityExtractor   → Resolves @mentions to validated DB records (agent / task)
 *  3. IntentRouter      → Dispatches intent to correct ActionHandler or QueryHandler
 *  4. Handlers          → Each handler is a pure async function: (ctx) => HandlerResult
 *  5. ResponseBuilder   → Streams LLM answer + executes any side-effects
 *
 * Intent taxonomy (never changes — add NEW intents, never mutate):
 *   ACTION intents (side effects):
 *     TASK_CREATE       – Create a brand-new task in the backlog
 *     TASK_CANCEL       – Cancel/stop a specific task (marks CANCELLED, emits event)
 *     TASK_RETRY        – Retry a FAILED/CANCELLED task (resets to PENDING, re-triggers)
 *     TASK_REPRIORITIZE – Change a task's priority (HIGH / NORMAL / LOW / CRITICAL)
 *     TASK_REASSIGN     – Move a task from one agent to another (cancels old executor)
 *     TASK_PAUSE        – Pause a running task without cancelling it
 *     TASK_RESUME       – Resume a paused task
 *     AGENT_INSTRUCT    – Give an in-character instruction to a specific agent
 *     SWARM_STOP        – Stop the entire swarm session + cancel all in-flight tasks
 *   QUERY intents (read-only, no side effects):
 *     QUERY_TASK        – Status / details of a specific task
 *     QUERY_AGENT       – What an agent is doing, its progress, capabilities
 *     QUERY_SWARM       – Full swarm status overview
 *     GENERAL_CHAT      – Anything that doesn't map to the above
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { TaskPriority } from '@agentflox/database';
import { swarmOrchestrationService } from './swarmOrchestrationService';
import { BuilderProgressEmitter } from '@/services/agents/arch/builderProgressEmitter';
import { inngest } from '@/lib/inngest';
import { createChatCompletion, resolveModel, recordUsage, fromOpenAIUsage } from '@/services/models';

// ─── Model config ─────────────────────────────────────────────────────────────

async function resolveSwarmLlm(userId: string, workforceModelId?: string | null) {
  return resolveModel({
    modelId: workforceModelId || null,
    userId,
  });
}

/** Retry wrapper for transient OpenAI errors (429 / 5xx). */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.status === 429 || (err?.status ?? 0) >= 500;
      if (i === retries || !isRetryable) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Retry exhausted');
}

// ─── In-flight concurrency guard (per session) ────────────────────────────────
// For multi-instance deployments, replace with Redis SET NX EX.
const inFlightSessions = new Set<string>();

// ─── Intent taxonomy ─────────────────────────────────────────────────────────

export type SwarmIntentType =
  // Actions (produce side-effects)
  | 'TASK_CREATE'
  | 'TASK_CANCEL'
  | 'TASK_RETRY'
  | 'TASK_REPRIORITIZE'
  | 'TASK_REASSIGN'
  | 'TASK_PAUSE'
  | 'TASK_RESUME'
  | 'AGENT_INSTRUCT'
  | 'SWARM_STOP'
  // Queries (read-only)
  | 'QUERY_TASK'
  | 'QUERY_AGENT'
  | 'QUERY_SWARM'
  | 'GENERAL_CHAT';

/** Fully-resolved intent with all entities pre-fetched. */
export interface SwarmIntent {
  type: SwarmIntentType;
  /** 0–1 confidence score from the classifier */
  confidence: number;
  /** Short human-readable reason for classification */
  reason: string;
  /** Target agent id (if any) */
  agentId?: string;
  /** Target task id (if any) */
  taskId?: string;
  /** For TASK_REPRIORITIZE: new priority */
  newPriority?: TaskPriority;
  /** For TASK_REASSIGN: target agent id to re-assign to */
  reassignToAgentId?: string;
}

/** Runtime context passed to every handler */
export interface SwarmMessageContext {
  sessionId: string;
  workspaceId: string;
  userId: string;
  message: string;
  intent: SwarmIntent;
  /** Already validated against this session's agent/task scope */
  mentions: { id: string; name: string; type: 'agent' | 'task' }[];
  agents: AgentRecord[];
  tasks: TaskRecord[];
  emitter: BuilderProgressEmitter;
}

/** Minimal shape returned from prisma */
export interface AgentRecord {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  systemPrompt: string | null;
  capabilities: string[];
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  agentId: string | null;
  result: any;
  error: string | null;
  createdAt: Date;
  metadata: any;
}

/** What a handler returns — the LLM call config + optional side effects */
interface HandlerResult {
  /** Name shown in the chat feed as responder */
  responderName: string;
  /** System prompt for the LLM */
  systemPrompt: string;
  /** Side effect to execute BEFORE streaming (optional) */
  sideEffect?: () => Promise<void>;
  /** Side effect to execute AFTER streaming (optional) */
  postSideEffect?: (streamedContent: string) => Promise<void>;
}

// ─── Classifier ──────────────────────────────────────────────────────────────

const INTENT_SCHEMA = `{
  "type": <one of: TASK_CREATE|TASK_CANCEL|TASK_RETRY|TASK_REPRIORITIZE|TASK_REASSIGN|TASK_PAUSE|TASK_RESUME|AGENT_INSTRUCT|SWARM_STOP|QUERY_TASK|QUERY_AGENT|QUERY_SWARM|GENERAL_CHAT>,
  "confidence": <0.0–1.0>,
  "reason": "<1-sentence explanation>",
  "targetAgentName": "<name if mentioned, else null>",
  "targetTaskTitle": "<task title fragment if mentioned, else null>",
  "newPriority": "<CRITICAL|HIGH|NORMAL|LOW if reprioritize intent, else null>",
  "reassignToAgentName": "<agent name to reassign to, else null>"
}`;

const INTENT_DEFINITIONS = `
Intent definitions (pick EXACTLY ONE):
- TASK_CREATE    : User explicitly wants to create/add/schedule NEW work that doesn't exist yet.
- TASK_CANCEL    : User wants to stop, cancel, kill, abort a specific task or all tasks by an agent.
- TASK_RETRY     : User wants to retry/restart a FAILED or CANCELLED task.
- TASK_REPRIORITIZE : User wants to change the priority of a task (higher/lower/urgent/critical/normal).
- TASK_REASSIGN  : User wants to move/reassign a task from one agent to another.
- TASK_PAUSE     : User wants to pause a running task without fully cancelling it.
- TASK_RESUME    : User wants to resume a paused task.
- AGENT_INSTRUCT : User is addressing a specific agent with a direct instruction or request.
- SWARM_STOP     : User wants to stop/shutdown/halt the entire swarm session.
- QUERY_TASK     : User is asking about the status, progress, result of a specific task.
- QUERY_AGENT    : User is asking what a specific agent is doing, its capabilities, or progress.
- QUERY_SWARM    : User wants a general overview/status of the entire swarm.
- GENERAL_CHAT   : Anything that doesn't clearly fit above — casual chat, unclear requests.

IMPORTANT classification rules:
- "stop working on X", "cancel task X", "abort X" → TASK_CANCEL
- "stop the swarm", "shut everything down", "halt all agents" → SWARM_STOP
- "retry X", "try X again", "restart X" → TASK_RETRY
- "pause X", "hold X", "put X on hold" → TASK_PAUSE
- "resume X", "continue X", "unpause X" → TASK_RESUME
- "move X to agent Y", "reassign X to Y" → TASK_REASSIGN
- "make X urgent/critical/high priority" → TASK_REPRIORITIZE
- "create/add/start new task X", "build X", "generate X" (no existing task) → TASK_CREATE
- "@AgentName, please do X" (addressing agent directly) → AGENT_INSTRUCT
- "what is @AgentName doing?", "show me agent X progress" → QUERY_AGENT
- "status of X task", "what happened to X" → QUERY_TASK
- "what's the swarm doing?", "show me all tasks" → QUERY_SWARM
`;

export async function classifyIntent(
  message: string,
  mentions: { id: string; name: string; type: 'agent' | 'task' }[],
  agents: AgentRecord[],
  tasks: TaskRecord[],
  userId: string,
  workforceModelId?: string | null,
): Promise<SwarmIntent> {
  const agentMentions = mentions.filter(m => m.type === 'agent');
  const taskMentions = mentions.filter(m => m.type === 'task');

  const classifierPrompt = `You are an intent classifier for a multi-agent swarm chat system.

User message: "${message}"
Tagged agents: [${agentMentions.map(m => m.name).join(', ') || 'none'}]
Tagged tasks: [${taskMentions.map(m => m.name).join(', ') || 'none'}]

Available agents in swarm: [${agents.map(a => a.name).join(', ')}]
Active tasks in swarm: [${tasks.map(t => `"${t.title}" (${t.status})`).join(', ') || 'none'}]

${INTENT_DEFINITIONS}

Respond with ONLY valid JSON matching this schema (no markdown, no explanation):
${INTENT_SCHEMA}`;

  try {
    const resolved = await resolveSwarmLlm(userId, workforceModelId);
    const started = Date.now();
    const response = await withRetry(() =>
      createChatCompletion(resolved, {
        messages: [{ role: 'user', content: classifierPrompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 512,
        stream: false,
      })
    );
    await recordUsage({
      resolved,
      usage: fromOpenAIUsage(response?.usage),
      userId,
      context: {
        action: 'ANALYZE',
        requestDurationMs: Date.now() - started,
        success: true,
        metadata: { source: 'swarmMessageRouter.classify' },
      },
    });

    // ── #5: Safe parse — handle partial/malformed JSON gracefully ──
    const raw = (() => {
      try {
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
      } catch {
        console.warn('[SwarmRouter] Partial classifier JSON, falling back to GENERAL_CHAT');
        return {};
      }
    })();

    const intentType: SwarmIntentType = raw.type || 'GENERAL_CHAT';

    // Resolve target entities — prefer explicit @mention, then classifier name match
    let agentId: string | undefined;
    let taskId: string | undefined;
    let reassignToAgentId: string | undefined;
    let newPriority: TaskPriority | undefined;

    if (agentMentions.length > 0) {
      agentId = agentMentions[0].id;
    } else if (raw.targetAgentName) {
      const match = agents.find(a => a.name.toLowerCase() === raw.targetAgentName?.toLowerCase());
      if (match) agentId = match.id;
    }

    if (taskMentions.length > 0) {
      taskId = taskMentions[0].id;
    } else if (raw.targetTaskTitle) {
      const match = tasks.find(t => t.title.toLowerCase().includes(raw.targetTaskTitle?.toLowerCase() ?? ''));
      if (match) taskId = match.id;
    }

    if (raw.reassignToAgentName) {
      const match = agents.find(a => a.name.toLowerCase() === raw.reassignToAgentName?.toLowerCase());
      if (match) reassignToAgentId = match.id;
    }

    if (raw.newPriority && Object.values(TaskPriority).includes(raw.newPriority)) {
      newPriority = raw.newPriority as TaskPriority;
    }

    return {
      type: intentType,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      reason: raw.reason || '',
      agentId,
      taskId,
      newPriority,
      reassignToAgentId,
    };
  } catch (err) {
    console.error('[SwarmMessageRouter] Intent classification failed:', err);
    return { type: 'GENERAL_CHAT', confidence: 0.5, reason: 'Classification failed, defaulting to general chat' };
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleTaskCreate(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const newTaskId = randomUUID();
  const taskTitle = ctx.message.slice(0, 120);

  return {
    responderName: 'Coordinator',
    systemPrompt: `You are the Coordinator of this multi-agent swarm.
The user has explicitly requested to create a new task.
Task registered: "${taskTitle}" (ID: ${newTaskId}) — Status: PENDING.
Coordinator cycle woken up to route it to the best agent.

Available Agents:
${ctx.agents.map(a => `- ${a.name}: ${a.description || a.agentType} | Capabilities: ${a.capabilities?.join(', ') || 'General'}`).join('\n')}

Confirm the task is created, briefly explain which agent you plan to route it to and why. Be concise.`,
    sideEffect: async () => {
      // ── #6: Duplicate detection — suppress identical task within 60s ──
      const existing = await (prisma.agentTask as any).findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          title: taskTitle,
          metadata: { path: ['sessionId'], equals: ctx.sessionId },
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (existing) {
        console.warn('[SwarmRouter] Duplicate task creation suppressed:', taskTitle);
        return;
      }

      await (prisma.agentTask as any).create({
        data: {
          id: newTaskId,
          title: taskTitle,
          description: ctx.message,
          taskType: 'GENERAL',
          status: 'PENDING',
          priority: 'HIGH',
          assignedBy: ctx.userId,
          workspaceId: ctx.workspaceId,
          metadata: { sessionId: ctx.sessionId, source: 'user_chat' },
          requirements: [],
          dependsOn: [],
          blockedBy: [],
        },
      });
      await swarmOrchestrationService.wakeupSessionForWorkspace(ctx.workspaceId).catch(() => null);
    },
  };
}

async function handleTaskCancel(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);
  const targetAgent = targetTask?.agentId ? ctx.agents.find(a => a.id === targetTask.agentId) : null;

  // If no specific task resolved, cancel all active tasks by the mentioned agent
  const agentTasksToCancel: TaskRecord[] = [];
  if (!targetTask && ctx.intent.agentId) {
    const agentActiveTasks = ctx.tasks.filter(
      t => t.agentId === ctx.intent.agentId && ['RUNNING', 'QUEUED', 'PENDING'].includes(t.status)
    );
    agentTasksToCancel.push(...agentActiveTasks);
  }

  return {
    responderName: 'Coordinator',
    systemPrompt: targetTask
      ? `You are the Coordinator of this multi-agent swarm.
You have just CANCELLED the task: "${targetTask.title}" (was: ${targetTask.status}).
${targetAgent ? `Agent ${targetAgent.name} has been notified to stop work on this task.` : ''}
Confirm the cancellation to the user and explain what happens next.
Remaining session tasks:
${ctx.tasks.filter(t => t.id !== targetTask.id).map(t => `  * [${t.status}] "${t.title}"`).join('\n') || '  (No other tasks)'}`
      : agentTasksToCancel.length > 0
        ? `You are the Coordinator of this multi-agent swarm.
You have CANCELLED ${agentTasksToCancel.length} active task(s) assigned to ${ctx.agents.find(a => a.id === ctx.intent.agentId)?.name || 'the agent'}:
${agentTasksToCancel.map(t => `  - "${t.title}"`).join('\n')}
Confirm what was cancelled and any impact on the rest of the swarm.`
        : `You are the Coordinator of this multi-agent swarm.
The user requested a task cancellation but no matching active task was found.
Current tasks:
${ctx.tasks.map(t => `  * [${t.status}] "${t.title}"`).join('\n') || '  (No tasks)'}
Ask the user to clarify which task they want to cancel.`,
    sideEffect: async () => {
      if (targetTask) {
        await (prisma.agentTask as any).update({
          where: { id: targetTask.id },
          data: { status: 'CANCELLED', updatedAt: new Date() },
        });
        await inngest.send({
          name: 'agent/executor.cancel',
          data: { conversationId: `swarm-task-conv-${targetTask.id}`, sessionId: ctx.sessionId },
        }).catch(() => null);
      }
      for (const t of agentTasksToCancel) {
        await (prisma.agentTask as any).update({
          where: { id: t.id },
          data: { status: 'CANCELLED', updatedAt: new Date() },
        });
        await inngest.send({
          name: 'agent/executor.cancel',
          data: { conversationId: `swarm-task-conv-${t.id}`, sessionId: ctx.sessionId },
        }).catch(() => null);
      }
    },
  };
}

async function handleTaskRetry(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);

  // ── #14: Only retry tasks in a retryable state ──
  const isRetryable = targetTask && ['FAILED', 'CANCELLED'].includes(targetTask.status);

  return {
    responderName: 'Coordinator',
    systemPrompt: isRetryable
      ? `You are the Coordinator of this multi-agent swarm.
You have reset task "${targetTask!.title}" from ${targetTask!.status} back to PENDING for retry.
The coordinator cycle has been triggered to pick it up and re-assign it.
Previous error (if any): ${targetTask!.error || 'None'}
Confirm the retry to the user, mention which agent will likely pick it up.`
      : targetTask
        ? `You are the Coordinator of this multi-agent swarm.
The user requested a retry for task "${targetTask.title}" but it is currently in state "${targetTask.status}" which cannot be retried.
Only FAILED or CANCELLED tasks can be retried. Explain this to the user.`
        : `You are the Coordinator of this multi-agent swarm.
No matching failed task was found. Failed/Cancelled tasks available:
${ctx.tasks.filter(t => ['FAILED', 'CANCELLED'].includes(t.status)).map(t => `  * "${t.title}" (${t.status})`).join('\n') || '  (None)'}
Ask the user to clarify which task they want to retry.`,
    sideEffect: async () => {
      if (isRetryable) {
        await (prisma.agentTask as any).update({
          where: { id: targetTask!.id },
          data: { status: 'PENDING', error: null, result: null, agentId: null, updatedAt: new Date() },
        });
        await swarmOrchestrationService.wakeupSessionForWorkspace(ctx.workspaceId).catch(() => null);
      } else if (targetTask) {
        console.warn(`[SwarmRouter] Retry blocked: task ${targetTask.id} is in non-retryable state ${targetTask.status}`);
      }
    },
  };
}

async function handleTaskReprioritize(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);

  // ── #11: Ask for clarification if no priority was extracted ──
  if (targetTask && !ctx.intent.newPriority) {
    return {
      responderName: 'Coordinator',
      systemPrompt: `You are the Coordinator of this multi-agent swarm.
The user wants to change the priority of task "${targetTask.title}" but didn't specify the new level.
Current priority: ${targetTask.priority}.
Ask them to clarify: should it be CRITICAL, HIGH, NORMAL, or LOW?`,
    };
  }

  const newPriority = ctx.intent.newPriority!;

  return {
    responderName: 'Coordinator',
    systemPrompt: targetTask
      ? `You are the Coordinator of this multi-agent swarm.
You have updated the priority of task "${targetTask.title}" from ${targetTask.priority} → ${newPriority}.
This will affect assignment order in the next coordinator cycle.
Confirm the priority change and explain how it affects task scheduling.`
      : `You are the Coordinator of this multi-agent swarm.
No matching task was found.
Available tasks:
${ctx.tasks.map(t => `  * [${t.priority}] "${t.title}" (${t.status})`).join('\n') || '  (None)'}
Ask the user to clarify which task to reprioritize.`,
    sideEffect: async () => {
      if (targetTask && newPriority) {
        await (prisma.agentTask as any).update({
          where: { id: targetTask.id },
          data: { priority: newPriority, updatedAt: new Date() },
        });
      }
    },
  };
}

async function handleTaskReassign(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);
  const fromAgent = targetTask?.agentId ? ctx.agents.find(a => a.id === targetTask.agentId) : null;
  const toAgent = ctx.agents.find(a => a.id === ctx.intent.reassignToAgentId);

  return {
    responderName: 'Coordinator',
    systemPrompt: targetTask && toAgent
      ? `You are the Coordinator of this multi-agent swarm.
You have reassigned task "${targetTask.title}" from ${fromAgent?.name || 'Unassigned'} → ${toAgent.name}.
The old executor has been cancelled. The task is reset to PENDING for ${toAgent.name} to pick up in the next cycle.
Explain why this is a good fit based on ${toAgent.name}'s capabilities: ${toAgent.capabilities?.join(', ') || 'General'}.`
      : `You are the Coordinator of this multi-agent swarm.
Could not complete the reassignment:
${!targetTask ? '- Task not found.' : ''}
${!toAgent ? '- Target agent not found or not specified.' : ''}
Available tasks: ${ctx.tasks.map(t => `"${t.title}"`).join(', ') || 'none'}
Available agents: ${ctx.agents.map(a => a.name).join(', ')}
Ask the user to clarify.`,
    sideEffect: async () => {
      if (targetTask && toAgent) {
        // ── #4: Cancel old agent's in-flight executor BEFORE reassigning ──
        if (targetTask.agentId) {
          await inngest.send({
            name: 'agent/executor.cancel',
            data: { conversationId: `swarm-task-conv-${targetTask.id}`, sessionId: ctx.sessionId },
          }).catch(() => null);
        }
        await (prisma.agentTask as any).update({
          where: { id: targetTask.id },
          data: { agentId: toAgent.id, status: 'PENDING', updatedAt: new Date() },
        });
        await swarmOrchestrationService.wakeupSessionForWorkspace(ctx.workspaceId).catch(() => null);
      }
    },
  };
}

async function handleTaskPause(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);
  const isPausable = targetTask && ['RUNNING', 'QUEUED'].includes(targetTask.status);

  return {
    responderName: 'Coordinator',
    systemPrompt: isPausable
      ? `You are the Coordinator of this multi-agent swarm.
You have PAUSED task "${targetTask!.title}". The agent working on it has been instructed to hold.
The task can be resumed at any time with a resume command.
Remaining active tasks:
${ctx.tasks.filter(t => t.id !== targetTask!.id && ['RUNNING', 'QUEUED'].includes(t.status)).map(t => `  * "${t.title}"`).join('\n') || '  (None)'}`
      : targetTask
        ? `You are the Coordinator. Task "${targetTask.title}" is in state "${targetTask.status}" and cannot be paused.`
        : `You are the Coordinator. No matching active task was found to pause.
Active tasks: ${ctx.tasks.filter(t => ['RUNNING', 'QUEUED'].includes(t.status)).map(t => `"${t.title}"`).join(', ') || 'None'}`,
    sideEffect: async () => {
      if (isPausable) {
        await (prisma.agentTask as any).update({
          where: { id: targetTask!.id },
          data: { status: 'PAUSED', updatedAt: new Date() },
        });
        await inngest.send({
          name: 'agent/executor.cancel',
          data: { conversationId: `swarm-task-conv-${targetTask!.id}`, sessionId: ctx.sessionId },
        }).catch(() => null);
      }
    },
  };
}

async function handleTaskResume(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);
  const isResumable = targetTask && targetTask.status === 'PAUSED';

  return {
    responderName: 'Coordinator',
    systemPrompt: isResumable
      ? `You are the Coordinator of this multi-agent swarm.
You have RESUMED task "${targetTask!.title}". It has been reset to PENDING and its previously assigned agent will resume working on it in the next coordinator cycle.
Confirm the resumption and let the user know that the previously assigned agent will resume.`
      : targetTask
        ? `You are the Coordinator. Task "${targetTask.title}" is in state "${targetTask.status}" — only PAUSED tasks can be resumed.`
        : `You are the Coordinator. No matching paused task found.
Paused tasks: ${ctx.tasks.filter(t => t.status === 'PAUSED').map(t => `"${t.title}"`).join(', ') || 'None'}`,
    sideEffect: async () => {
      if (isResumable) {
        await (prisma.agentTask as any).update({
          where: { id: targetTask!.id },
          data: { status: 'PENDING', updatedAt: new Date() },
          // agentId intentionally retained — agent resumes its own task
        });
        await swarmOrchestrationService.wakeupSessionForWorkspace(ctx.workspaceId).catch(() => null);
      }
    },
  };
}

async function handleAgentInstruct(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetAgent = ctx.agents.find(a => a.id === ctx.intent.agentId);
  if (!targetAgent) {
    return await handleGeneralChat(ctx);
  }

  const agentTasks = ctx.tasks.filter(t => t.agentId === targetAgent.id);
  const activeTasks = agentTasks.filter(t => ['RUNNING', 'QUEUED'].includes(t.status));
  const completedTasks = agentTasks.filter(t => t.status === 'COMPLETED');

  return {
    responderName: targetAgent.name,
    systemPrompt: `You are ${targetAgent.name}, a specialist agent in a multi-agent swarm.
Description: ${targetAgent.description || 'No description'}
Capabilities: ${targetAgent.capabilities?.join(', ') || 'None listed'}
Instructions: ${targetAgent.systemPrompt || 'None'}

The user has addressed you directly with an instruction: "${ctx.message}"

Your current workload:
- Active (${activeTasks.length}): ${activeTasks.map(t => `"${t.title}" [${t.status}]`).join(', ') || 'Nothing active'}
- Completed (${completedTasks.length}): ${completedTasks.map(t => `"${t.title}"`).join(', ') || 'None'}

Peers: ${ctx.agents.filter(a => a.id !== targetAgent.id).map(a => a.name).join(', ')}

Acknowledge the instruction, confirm your understanding, note if your current workload allows for it, and describe your next steps. Stay fully in character.`,
  };
}

async function handleSwarmStop(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const activeTasks = ctx.tasks.filter(t => ['RUNNING', 'QUEUED', 'PENDING'].includes(t.status));

  return {
    responderName: 'Coordinator',
    systemPrompt: `You are the Coordinator of this multi-agent swarm.
The user has requested to STOP the entire swarm session.
All in-flight agent workflows have been cancelled and active task rows marked CANCELLED.
Active tasks halted (${activeTasks.length}):
${activeTasks.map(t => `  - "${t.title}" (was: ${t.status})`).join('\n') || '  (None)'}
Confirm the shutdown and explain how to restart a new session if needed.`,
    sideEffect: async () => {
      // ── #8: Mark all in-flight task rows CANCELLED in DB first ──
      if (activeTasks.length > 0) {
        await (prisma.agentTask as any).updateMany({
          where: {
            workspaceId: ctx.workspaceId,
            metadata: { path: ['sessionId'], equals: ctx.sessionId },
            status: { in: ['RUNNING', 'QUEUED', 'PENDING'] },
          },
          data: { status: 'CANCELLED', updatedAt: new Date() },
        });
      }
      await swarmOrchestrationService.stopSwarm(ctx.sessionId).catch(() => null);
    },
  };
}

// ─── Query Handlers ───────────────────────────────────────────────────────────

async function handleQueryTask(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetTask = ctx.tasks.find(t => t.id === ctx.intent.taskId);
  const assignedAgent = targetTask?.agentId ? ctx.agents.find(a => a.id === targetTask.agentId) : null;

  return {
    responderName: 'Coordinator',
    systemPrompt: `You are the Coordinator of this multi-agent swarm.
The user is asking about a specific task.

${targetTask ? `Task Details:
- Title: "${targetTask.title}"
- Status: ${targetTask.status}
- Priority: ${targetTask.priority}
- Assigned to: ${assignedAgent?.name || 'Unassigned'}
- Description: ${targetTask.description || 'None'}
- Result: ${typeof targetTask.result === 'string' ? targetTask.result : targetTask.result ? JSON.stringify(targetTask.result).slice(0, 400) : 'No output yet'}
- Error: ${targetTask.error || 'None'}
- Created: ${targetTask.createdAt?.toLocaleString?.() || 'Unknown'}` : `No matching task found.`}

All session tasks:
${ctx.tasks.map(t => `  * [${t.status}] "${t.title}" → ${ctx.agents.find(a => a.id === t.agentId)?.name || 'Unassigned'}`).join('\n') || '  (None)'}

Answer the user's question about this task clearly and completely.`,
  };
}

async function handleQueryAgent(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const targetAgent = ctx.agents.find(a => a.id === ctx.intent.agentId);

  if (!targetAgent) {
    return await handleQuerySwarm(ctx);
  }

  const agentTasks = ctx.tasks.filter(t => t.agentId === targetAgent.id);
  const activeTasks = agentTasks.filter(t => ['RUNNING', 'QUEUED'].includes(t.status));
  const completedTasks = agentTasks.filter(t => t.status === 'COMPLETED');
  const pendingTasks = agentTasks.filter(t => t.status === 'PENDING');
  const failedTasks = agentTasks.filter(t => t.status.includes('FAIL') || t.status === 'CANCELLED');

  return {
    responderName: targetAgent.name,
    systemPrompt: `You are ${targetAgent.name}, a specialist agent in this multi-agent swarm.
Description: ${targetAgent.description || 'No description'}
Capabilities: ${targetAgent.capabilities?.join(', ') || 'None listed'}
Instructions: ${targetAgent.systemPrompt || 'None'}

The user asked about you: "${ctx.message}"

Your current work status:
- Active tasks (${activeTasks.length}): ${activeTasks.map(t => `"${t.title}" [${t.status}]`).join(', ') || 'Nothing active right now'}
- Pending tasks (${pendingTasks.length}): ${pendingTasks.map(t => `"${t.title}"`).join(', ') || 'None'}
- Completed tasks (${completedTasks.length}): ${completedTasks.map(t => `"${t.title}"`).join(', ') || 'None yet'}
- Failed/Cancelled (${failedTasks.length}): ${failedTasks.map(t => `"${t.title}" (${t.status})`).join(', ') || 'None'}

Respond directly and proactively. Share your current work status, capabilities, and any relevant progress. Stay fully in character.`,
  };
}

async function handleQuerySwarm(ctx: SwarmMessageContext): Promise<HandlerResult> {
  const running = ctx.tasks.filter(t => ['RUNNING', 'QUEUED'].includes(t.status));
  const completed = ctx.tasks.filter(t => t.status === 'COMPLETED');
  const failed = ctx.tasks.filter(t => t.status.includes('FAIL'));
  const cancelled = ctx.tasks.filter(t => t.status === 'CANCELLED');
  const paused = ctx.tasks.filter(t => t.status === 'PAUSED');
  const pending = ctx.tasks.filter(t => t.status === 'PENDING');

  return {
    responderName: 'Coordinator',
    systemPrompt: `You are the Coordinator of this multi-agent swarm.
The user wants a status overview of the swarm.

Agents & their current work:
${ctx.agents.map(a => {
    const active = ctx.tasks.filter(t => t.agentId === a.id && ['RUNNING', 'QUEUED'].includes(t.status));
    return `  • ${a.name} (${a.description || a.agentType}): ${active.length > 0 ? `Working on — ${active.map(t => `"${t.title}"`).join(', ')}` : 'Idle'}`;
  }).join('\n')}

Task Breakdown:
- ▶ Running/Queued (${running.length}): ${running.map(t => `"${t.title}"`).join(', ') || 'None'}
- ✅ Completed (${completed.length}): ${completed.map(t => `"${t.title}"`).join(', ') || 'None'}
- ❌ Failed (${failed.length}): ${failed.map(t => `"${t.title}"`).join(', ') || 'None'}
- 🚫 Cancelled (${cancelled.length}): ${cancelled.map(t => `"${t.title}"`).join(', ') || 'None'}
- ⏸ Paused (${paused.length}): ${paused.map(t => `"${t.title}"`).join(', ') || 'None'}
- ⏳ Pending (${pending.length}): ${pending.map(t => `"${t.title}"`).join(', ') || 'None'}

Give a clear, structured swarm status report. Answer the user's question fully.`,
  };
}

async function handleGeneralChat(ctx: SwarmMessageContext): Promise<HandlerResult> {
  return {
    responderName: 'Coordinator',
    systemPrompt: `You are the Coordinator of this multi-agent swarm. You manage all agents and tasks.

The user sent a message: "${ctx.message}"

Swarm state:
- Agents: ${ctx.agents.map(a => a.name).join(', ')}
- Tasks: ${ctx.tasks.map(t => `"${t.title}" [${t.status}]`).join(', ') || 'None'}

Respond helpfully. If the message is unclear, ask for clarification.`,
  };
}

// ─── Router dispatch table ────────────────────────────────────────────────────

const HANDLER_MAP: Record<SwarmIntentType, (ctx: SwarmMessageContext) => Promise<HandlerResult>> = {
  TASK_CREATE: handleTaskCreate,
  TASK_CANCEL: handleTaskCancel,
  TASK_RETRY: handleTaskRetry,
  TASK_REPRIORITIZE: handleTaskReprioritize,
  TASK_REASSIGN: handleTaskReassign,
  TASK_PAUSE: handleTaskPause,
  TASK_RESUME: handleTaskResume,
  AGENT_INSTRUCT: handleAgentInstruct,
  SWARM_STOP: handleSwarmStop,
  QUERY_TASK: handleQueryTask,
  QUERY_AGENT: handleQueryAgent,
  QUERY_SWARM: handleQuerySwarm,
  GENERAL_CHAT: handleGeneralChat,
};

// ─── Thinking labels per intent ───────────────────────────────────────────────

const THINKING_LABELS: Record<SwarmIntentType, string> = {
  TASK_CREATE: 'Registering new task...',
  TASK_CANCEL: 'Processing cancellation...',
  TASK_RETRY: 'Preparing task for retry...',
  TASK_REPRIORITIZE: 'Updating task priority...',
  TASK_REASSIGN: 'Reassigning task...',
  TASK_PAUSE: 'Pausing task...',
  TASK_RESUME: 'Resuming task...',
  AGENT_INSTRUCT: 'Routing instruction to agent...',
  SWARM_STOP: 'Stopping swarm session...',
  QUERY_TASK: 'Fetching task details...',
  QUERY_AGENT: 'Retrieving agent status...',
  QUERY_SWARM: 'Gathering swarm overview...',
  GENERAL_CHAT: 'Processing your message...',
};

// ─── Authorization helper ─────────────────────────────────────────────────────

/** Verify userId has access to workspaceId (owner or member). */
export async function assertWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const [isOwner, isMember] = await Promise.all([
    prisma.workspace.findFirst({ where: { id: workspaceId, ownerId: userId }, select: { id: true } }),
    prisma.workspaceMember.findFirst({ where: { workspaceId, userId }, select: { id: true } }),
  ]);
  if (!isOwner && !isMember) {
    throw new Error('Unauthorized: user does not have access to this workspace');
  }
}

// ─── Main router entry point ──────────────────────────────────────────────────

/**
 * Route and handle a swarm message from start to finish.
 * Returns the full streamed response string and the resolved responder name.
 *
 * PRECONDITION: caller must have already persisted the user message to DB
 *               and authorized the request. This function handles routing only.
 */
export async function routeSwarmMessage(params: {
  sessionId: string;
  workspaceId: string;
  userId: string;
  message: string;
  mentions: { id: string; name: string; type: 'agent' | 'task' }[];
  emitter: BuilderProgressEmitter;
  excludeMessageId?: string;
  /** Dropdown override → session/conversation → platform default */
  modelId?: string | null;
}): Promise<{ responderName: string; responseContent: string; intent: SwarmIntent }> {
  const { sessionId, workspaceId, userId, message, mentions, emitter, excludeMessageId, modelId: overrideModelId } = params;
  const routeStart = Date.now();

  // ── #3: Defense-in-depth authorization inside the router ──
  await assertWorkspaceAccess(workspaceId, userId);

  // ── #7: Per-session concurrency guard ──
  if (inFlightSessions.has(sessionId)) {
    throw Object.assign(
      new Error('A message is already being processed for this session. Please wait.'),
      { code: 'CONCURRENT_REQUEST' }
    );
  }
  inFlightSessions.add(sessionId);

  try {
    // 1. Fetch workspace agents & tasks (parallel)
    const session = await swarmOrchestrationService.getSession(sessionId);

    let agentIds: string[] = [];
    if (session?.config?.agentIds) {
      agentIds = session.config.agentIds;
    } else {
      const workspaceAgents = await (prisma as any).workspaceAgent.findMany({
        where: { workspaceId },
        select: { agentId: true },
      });
      agentIds = workspaceAgents.map((wa: any) => wa.agentId);
    }

    const [agents, tasks] = await Promise.all([
      prisma.aiAgent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, description: true, agentType: true, systemPrompt: true, capabilities: true },
      }) as Promise<AgentRecord[]>,
      (prisma.agentTask as any).findMany({
        where: {
          workspaceId,
          metadata: { path: ['sessionId'], equals: sessionId },
        },
        orderBy: { createdAt: 'asc' },
      }) as Promise<TaskRecord[]>,
    ]);

    // ── #19: Validate @mentions against this session's scope ──
    const validAgentIds = new Set(agents.map(a => a.id));
    const validTaskIds = new Set(tasks.map(t => t.id));
    const safeMentions = mentions.filter(m =>
      (m.type === 'agent' && validAgentIds.has(m.id)) ||
      (m.type === 'task' && validTaskIds.has(m.id))
    );

    // Resolve: request override → session config → conversation → platform default
    let selectedModelId =
      overrideModelId ||
      (session as any)?.config?.modelId ||
      null;
    if (!selectedModelId) {
      const conv = await prisma.aiConversation.findUnique({
        where: { id: sessionId },
        select: { modelId: true },
      });
      selectedModelId = conv?.modelId ?? null;
    }
    if (overrideModelId && session) {
      (session as any).config = { ...((session as any).config || {}), modelId: overrideModelId };
    }

    // 2. Classify intent
    const intent = await classifyIntent(
      message,
      safeMentions,
      agents,
      tasks,
      userId,
      selectedModelId,
    );
    console.log(`[SwarmRouter] Intent: ${intent.type} (${(intent.confidence * 100).toFixed(0)}%) — ${intent.reason}`);

    // 3. Show thinking indicator
    const thinkingLabel = THINKING_LABELS[intent.type];
    // ── #13: Simplified and explicit thinkingNode logic ──
    const agentTargetIntents: SwarmIntentType[] = ['QUERY_AGENT', 'AGENT_INSTRUCT'];
    const thinkingNode = agentTargetIntents.includes(intent.type)
      ? agents.find(a => a.id === intent.agentId)?.name || 'Coordinator'
      : 'Coordinator';
    emitter.thinking(thinkingLabel, thinkingNode);

    // 4. Build context and dispatch to handler
    const ctx: SwarmMessageContext = {
      sessionId,
      workspaceId,
      userId,
      message,
      intent,
      mentions: safeMentions,
      agents,
      tasks,
      emitter,
    };

    const handler = HANDLER_MAP[intent.type] ?? handleGeneralChat;
    const handlerResult = await handler(ctx);

    // 5. Execute pre-stream side effect
    if (handlerResult.sideEffect) {
      try {
        await handlerResult.sideEffect();
      } catch (err) {
        console.error(`[SwarmRouter] Side effect failed for intent ${intent.type}:`, err);
      }
    }

    // ── #1: Fix duplicate user message in LLM history ──
    // The caller already persisted the user message before calling us, so we
    // exclude it explicitly using excludeMessageId.
    const history = await prisma.aiMessage.findMany({
      where: {
        conversationId: sessionId,
        ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 19,
    });

    // ── #12: Include responder persona in history context ──
    const messagesForLlm = [
      { role: 'system' as const, content: handlerResult.systemPrompt },
      ...history.map(m => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.role === 'ASSISTANT' && (m.metadata as any)?.responder
          ? `[${(m.metadata as any).responder}]: ${m.content}`
          : m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 7. Stream LLM response via Shared Model Manager
    let responseContent = '';
    const responseModel = await resolveSwarmLlm(
      userId,
      selectedModelId,
    );
    const started = Date.now();
    const stream = await withRetry(() =>
      createChatCompletion(responseModel, {
        messages: messagesForLlm,
        temperature: 0.4,
        stream: true,
        stream_options: { include_usage: true },
      })
    );

    let streamUsage: any;
    for await (const chunk of stream) {
      if ((chunk as any).usage) streamUsage = (chunk as any).usage;
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        responseContent += text;
        emitter.token(text);
      }
    }

    await recordUsage({
      resolved: responseModel,
      usage: streamUsage
        ? fromOpenAIUsage(streamUsage)
        : {
            inputTokens: 0,
            outputTokens: Math.ceil(responseContent.length / 4),
            totalTokens: Math.ceil(responseContent.length / 4),
            usageEstimated: true,
          },
      userId,
      context: {
        action: 'CHAT',
        requestDurationMs: Date.now() - started,
        success: true,
        metadata: { source: 'swarmMessageRouter.respond' },
      },
    });

    // 8. Execute post-stream side effect
    if (handlerResult.postSideEffect) {
      try {
        await handlerResult.postSideEffect(responseContent);
      } catch (err) {
        console.error(`[SwarmRouter] Post side effect failed for intent ${intent.type}:`, err);
      }
    }

    // ── #17: Structured observability log ──
    console.log(JSON.stringify({
      event: 'swarm.message.routed',
      sessionId,
      userId,
      intent: intent.type,
      confidence: intent.confidence,
      responder: handlerResult.responderName,
      latencyMs: Date.now() - routeStart,
      tokenCount: responseContent.length,
    }));

    return {
      responderName: handlerResult.responderName,
      responseContent,
      intent,
    };
  } finally {
    inFlightSessions.delete(sessionId);
  }
}
