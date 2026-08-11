import { resolveModel, createOpenAICompletion, recordUsage, fromOpenAIUsage } from '@/services/models';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { CircuitBreaker, CircuitBreakerError, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { PermissionService } from '../safety/permissionService';
import { PromptSandbox } from '../safety/promptSandbox';
import { auditLogger } from '../audit/auditLogger';
import { AgentBuilderError } from './agentBuilderService';
import { checkAgentTokenLimit, updateAgentUsage, estimateTokens, countAgentTokens } from '@/utils/ai/agentUsageTracking';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { agentBuilderContextService, UserContext } from '../state/agentBuilderContextService';
import { ToolInvocationGate } from '../core/toolInvocationGate';
import { GuardrailService } from '../safety/guardrailService';
import { PermissionService as CorePermissionService } from '@/services/permissions/permission.service';
import { EntityScopeInferrer } from '../context/entityScopeInferrer';
import { AutomationInferrer } from '../inference/automationInferrer';
import { InputSanitizer } from '../safety/inputSanitizer';
import { ResponseCache } from '../cache/responseCache';
import { redis } from '@/lib/redis';
import {
  agentBuilderStateService,
  ConversationState,
  AgentDraft,
} from '../state/agentBuilderStateService';
import { QuickAction } from '../generation/agentBuilderQuickActions';
import { AGENT_CONSTANTS } from '../constants/agentConstants';
import { intentInferenceService } from '../inference/intentInferenceService';
import { extractJson } from '@/utils/ai/jsonParsing';
import { SkillInferenceService, skillInferenceService } from '../inference/skillInferenceService';
import { BUILT_IN_SKILLS } from '../registry/skillRegistry';
import { tracingService } from '@/services/agents/monitoring/tracing';
import { ToolDiscoveryService } from '../registry/toolDiscoveryService';
import { memoryManager } from '../core/memoryManager';
import { sharedMemoryService } from '../core/sharedMemory';
import { agentMetricsService } from '../monitoring/agentMetricsService';
import {
  buildArtifactsFromToolResult,
  parseSwarmTaskConversationId,
  pickUpstreamResult,
  type ExecutionArtifact,
} from '../artifacts/executionArtifact';
// FLAW-07 FIX: Event store — emits structured AgentEvents to durable storage
import {
  emitRunInit,
  emitStepExecuted,
  emitRunCompleted,
  emitRunFailed,
  emitBudgetCancelled,
} from '../execution/agentEventStore';
// Per-tenant concurrency quota — prevents a single user from saturating the run pool
import { tenantConcurrencyQuota } from '../governance/tenantConcurrencyQuota';

const ExecutorResponseSchema = z.object({
  response: z.string(),
  suggestedActions: z
    .array(
      z.object({
        type: z.enum(['execute', 'info']),
        label: z.string().max(120),
        payload: z.any().optional(),
      })
    )
    .default([]),
});


export interface AgentExecutorDependencies {
  permissionService: PermissionService;
  promptSandbox: PromptSandbox;
  tokenBudgetManager: TokenBudgetManager;
  entityScopeInferrer: EntityScopeInferrer;
  automationInferrer: AutomationInferrer;
  inputSanitizer: InputSanitizer;
  responseCache: ResponseCache;
  skillInferenceService: SkillInferenceService;
  toolInvocationGate: ToolInvocationGate;
  toolDiscoveryService: ToolDiscoveryService;
}

export class AgentExecutorService {
  // Lock timeout in seconds (1 minute)
  private readonly LOCK_TIMEOUT = AGENT_CONSTANTS.LOCK_TIMEOUT;
  private readonly LOCK_KEY_PREFIX = 'agent_executor:lock:';

  private readonly retryHandler = new RetryHandler();
  private readonly errorClassifier = new ErrorClassifier();

  private readonly permissionService: PermissionService;
  private readonly promptSandbox: PromptSandbox;
  private readonly tokenBudgetManager: TokenBudgetManager;
  private readonly entityScopeInferrer: EntityScopeInferrer;
  private readonly automationInferrer: AutomationInferrer;
  private readonly inputSanitizer: InputSanitizer;
  private readonly responseCache: ResponseCache;
  private readonly skillInferenceService: SkillInferenceService;
  private readonly toolInvocationGate: ToolInvocationGate;
  private readonly toolDiscoveryService: ToolDiscoveryService;

  constructor(dependencies: AgentExecutorDependencies) {
    this.permissionService = dependencies.permissionService;
    this.promptSandbox = dependencies.promptSandbox;
    this.tokenBudgetManager = dependencies.tokenBudgetManager;
    this.entityScopeInferrer = dependencies.entityScopeInferrer;
    this.automationInferrer = dependencies.automationInferrer;
    this.inputSanitizer = dependencies.inputSanitizer;
    this.responseCache = dependencies.responseCache;
    this.skillInferenceService = dependencies.skillInferenceService;
    this.toolInvocationGate = dependencies.toolInvocationGate;
    this.toolDiscoveryService = dependencies.toolDiscoveryService;
  }

  /**
   * Run a background task without blocking the caller.
   * Errors are logged but never propagated — safe for fire-and-forget use cases
   * such as token tracking, metrics, and audit logging.
   */
  private runInBackground(label: string, fn: () => Promise<void>): void {
    (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[AgentExecutor] Background task "${label}" failed:`, err);
        // P2-12: Dead Letter Queue via Inngest — enqueue a retryable task so
        // failed background work (usage tracking, audit logs) is not silently lost.
        try {
          await inngest.send({
            name: 'agent/background.failed',
            data: {
              label,
              error: err instanceof Error ? err.message : String(err),
              service: 'executor',
              occurredAt: new Date().toISOString(),
            },
          });
        } catch (dlqErr) {
          console.error('[AgentExecutor] Failed to enqueue background DLQ task:', dlqErr);
        }
      }
    })();
  }

  /**
   * Sanitize untrusted tool execution output before injecting into the LLM context.
   *
   * Tool outputs come from external systems (webhooks, APIs, user-controlled data).
   * Without sanitization, a malicious server response could contain prompt injection
   * attacks (e.g., "Ignore all instructions...") that escalate privileges or exfiltrate
   * system prompt content.
   *
   * This method:
   * 1. JSON-serializes the output to a safe string representation
   * 2. Truncates to MAX_OUTPUT_LENGTH to prevent context flooding
   * 3. Matches against known prompt injection patterns from AGENT_CONSTANTS
   * 4. Returns a scrubbed placeholder if injection patterns are detected
   */
  private sanitizeToolOutput(output: unknown, maxLength = 300): string {
    if (output === null || output === undefined) return '[no output]';

    let serialized: string;
    try {
      serialized = typeof output === 'string' ? output : JSON.stringify(output);
    } catch {
      serialized = String(output);
    }

    // Check for prompt injection patterns on the full string before truncation
    const isInjectionAttempt = AGENT_CONSTANTS.PROMPT_INJECTION_PATTERNS.some(
      (pattern) => pattern.test(serialized)
    );

    if (isInjectionAttempt) {
      console.warn('[AgentExecutor] PROMPT INJECTION detected in tool output. Scrubbing.');
      return '[output sanitized: content blocked for safety]';
    }

    const truncated = serialized.slice(0, maxLength);
    return truncated + (serialized.length > maxLength ? '…' : '');
  }

  /**
   * Bound tool execution time to prevent runaway or hung tools from stalling the ReAct loop.
   * If the timeout elapses, the promise rejects with a descriptive error.
   */
  private async runToolWithTimeout<T>(
    label: string,
    fn: () => Promise<T>,
    timeoutMs = 60_000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        console.warn(
          `[AgentExecutor] Tool "${label}" timed out after ${timeoutMs}ms`
        );
        reject(new Error(`Tool "${label}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // CRIT-07: LRU-bounded map for operation circuit breakers.
  // Operations are a finite set (<10), but a plain Map accumulates entries indefinitely
  // if new operation strings are ever introduced. Max=20 provides ample headroom.
  private readonly operationCircuitBreakers = (() => {
    const MAX = 20;
    const map = new Map<string, CircuitBreaker>();
    return {
      has: (k: string) => map.has(k),
      get: (k: string): CircuitBreaker | undefined => {
        const v = map.get(k);
        if (v) { map.delete(k); map.set(k, v); }  // LRU: move to tail on access
        return v;
      },
      set: (k: string, v: CircuitBreaker) => {
        if (map.has(k)) map.delete(k);
        else if (map.size >= MAX) map.delete(map.keys().next().value!);
        map.set(k, v);
      },
    };
  })();

  private getOperationCircuitBreaker(operation: string): CircuitBreaker {
    let cb = this.operationCircuitBreakers.get(operation);
    if (!cb) {
      cb = new CircuitBreaker({
        failureThreshold: 10,
        resetTimeout: 30_000,
        halfOpenMaxCalls: 2,
      });
      this.operationCircuitBreakers.set(operation, cb);
    }
    return cb;
  }

  private async runCompletion(
    request: any,
    context: { operation: string; agentId: string; userId: string },
    onChunk?: (text: string, delta: string) => void
  ) {
    const cb = this.getOperationCircuitBreaker(context.operation);

    if (cb.isOpen()) {
      const errorId = randomUUID();
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_COMPLETION_FAILED',
        `Circuit breaker OPEN for operation ${context.operation}`,
        'Service is temporarily unavailable. Please try again in a moment.',
        { ...context, errorId }
      );
    }

    try {
      return await cb.execute(() =>
        this.retryHandler.retry(
          async () => {
            let resolved = (context as any).resolvedModel;
            if (!resolved) {
              resolved = await resolveModel({
                modelId: null,
                userId: context.userId,
                skipEntitlement: true,
              });
            }
            const create = (params: Record<string, unknown>) =>
              createOpenAICompletion(resolved, params);

            if (onChunk) {
              const stream = await create({
                ...request,
                stream: true,
                stream_options: { include_usage: true },
              }) as any;
              let content = '';
              const tool_calls: any[] = [];
              let completionUsage: any = undefined;

              for await (const chunk of stream) {
                if (chunk.usage) completionUsage = chunk.usage;
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                  content += delta.content;
                  onChunk(content, delta.content);
                }

                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!tool_calls[tc.index]) {
                      tool_calls[tc.index] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
                    }
                    if (tc.id) tool_calls[tc.index].id = tc.id;
                    if (tc.type) tool_calls[tc.index].type = tc.type;
                    if (tc.function?.name) tool_calls[tc.index].function.name += tc.function.name;
                    if (tc.function?.arguments) tool_calls[tc.index].function.arguments += tc.function.arguments;
                  }
                }
              }

              const message: any = { role: 'assistant', content: content || null };
              if (tool_calls.length > 0) message.tool_calls = tool_calls;

              return { choices: [{ message }], usage: completionUsage } as any;
            }

            return await create({ ...request, stream: false });
          },
          {
            maxAttempts: 2,
            baseDelay: 500,
            retryable: (err: any) => {
              if (err instanceof CircuitBreakerError) return false;
              if (err?.name === 'AbortError') return false;
              return err?.status === 429 || err?.status >= 500 ||
                err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
            },
          }
        )
      );
    } catch (error) {
      const isCircuitOpen = error instanceof CircuitBreakerError;
      const classification = this.errorClassifier.classify(error as Error);
      const errorId = randomUUID();

      if (!isCircuitOpen) {
        console.error('[AgentExecutor] LLM failed', {
          errorId,
          context,
          classification,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        console.warn('[AgentExecutor] Circuit breaker opened during call', {
          operation: context.operation,
          agentId: context.agentId,
        });
      }

      throw new AgentBuilderError(
        'AGENT_EXECUTOR_COMPLETION_FAILED',
        `LLM call failed for operation ${context.operation}: ${classification.type}`,
        'I could not process that request. Please try again shortly.',
        { ...context, errorId, classification }
      );
    }
  }

  /**
   * Acquire a lock for a conversation to prevent concurrent processing.
   * FAIL-CLOSED: if Redis is unavailable, we abort rather than allow concurrent
   * execution. The executor runs real agent code — races corrupt state.
   */
  private async acquireLock(lockKey: string, runId?: string): Promise<boolean> {
    try {
      const lockValue = runId || '1';
      const result = await redis.set(lockKey, lockValue, 'EX', this.LOCK_TIMEOUT, 'NX');
      if (result === 'OK') return true;

      if (runId) {
        // If we couldn't acquire it, check if we already hold it (Inngest retries with same runId)
        const existing = await redis.get(lockKey);
        if (existing === runId) {
          // Renew the lock
          await redis.expire(lockKey, this.LOCK_TIMEOUT);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`[AgentExecutor] Redis unavailable — aborting lock acquire for ${lockKey}:`, error);
      // Fail-Closed: cannot guarantee exclusive access — abort.
      return false;
    }
  }

  /**
   * Release a lock for a conversation
   */
  private async releaseLock(lockKey: string, runId?: string): Promise<void> {
    try {
      if (runId) {
        // Only release if we still hold it (prevent releasing another request's lock)
        const existing = await redis.get(lockKey);
        if (existing !== runId) return;
      }
      await redis.del(lockKey);
    } catch (error) {
      console.error(`[AgentExecutor] Failed to release lock for ${lockKey}:`, error);
      // Don't throw - lock will expire anyway
    }
  }

  /**
   * Load an executor conversation. Never creates conversations and never
   * generates a welcome message — creation belongs to the chat create API.
   *
   * - With conversationId: load that conversation (or throw if missing/unauthorized).
   * - Without conversationId: load the user's latest AGENT_EXECUTOR chat for this agent,
   *   or throw if none exists so the client can create one explicitly.
   */
  async initializeConversation(
    userId: string,
    agentId: string,
    conversationId?: string,
    _skipWelcome?: boolean
  ): Promise<{
    conversationId: string;
    conversationState: ConversationState;
    userContext: UserContext;
    welcomeMessage: string;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
  }> {
    const rateLimitKey = `init_conv_rate:${userId}`;
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) await redis.expire(rateLimitKey, 60);
    if (attempts > 20) {
      throw new AgentBuilderError(
        'RATE_LIMIT_EXCEEDED',
        'Too many conversations started',
        'Please wait a minute before starting new conversations.',
        { userId }
      );
    }

    await this.assertAgentAccess(agentId, userId);
    let userContext = await agentBuilderContextService.fetchUserContext(userId);

    try {
      const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
      userContext = await this.entityScopeInferrer.inferAndFetchEntityScope(
        '',
        agent?.systemPrompt
          ? [{ role: 'system', content: agent.systemPrompt }]
          : [],
        userContext,
        userId
      );
    } catch (error) {
      console.error('[AgentExecutor] Failed to infer entity scope for executor initialization:', error);
    }

    let resolvedConversationId = conversationId;

    if (!resolvedConversationId) {
      const existingConversation = await prisma.aiConversation.findFirst({
        where: {
          agentId,
          userId,
          conversationType: 'AGENT_EXECUTOR',
          isArchived: false,
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (!existingConversation) {
        throw new AgentBuilderError(
          'AGENT_EXECUTOR_NO_CONVERSATION',
          `No executor conversation found for agent ${agentId}`,
          'No chat exists yet. Create a new conversation first.',
          { agentId, userId }
        );
      }

      resolvedConversationId = existingConversation.id;
    }

    const existingState = await agentBuilderStateService.getConversationState(resolvedConversationId);
    if (!existingState) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_CONVERSATION_NOT_FOUND',
        `Conversation ${resolvedConversationId} not found`,
        'This conversation could not be found. Please start a new conversation.',
        { conversationId: resolvedConversationId, userId }
      );
    }
    if (existingState.userId !== userId) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_UNAUTHORIZED',
        `Unauthorized: Conversation ${resolvedConversationId} does not belong to user ${userId}`,
        'You do not have access to this conversation.',
        { conversationId: resolvedConversationId, userId }
      );
    }

    return {
      conversationId: existingState.conversationId,
      conversationState: existingState,
      userContext,
      welcomeMessage: '',
      quickActions: [],
      followups: [],
    };
  }

  /**
   * Process executor message.
   *
   * @param idempotencyKey - Optional client-generated key. When provided, a successful response
   *   is stored in Redis for 5 minutes. A retried HTTP request with the same key gets the
   *   cached result immediately — no duplicate messages, DB records, or token charges.
   */
  async processMessage(
    conversationId: string,
    agentId: string,
    message: string,
    userId: string,
    options?: { contexts?: any[]; mentions?: any[]; attachments?: any[] },
    idempotencyKey?: string
  ): Promise<{ runId: string }> {
    const runId = randomUUID();

    await inngest.send({
      name: 'agent/executor.requested',
      data: {
        runId,
        conversationId,
        agentId,
        userId,
        message,
        options,
        idempotencyKey,
      }
    });

    return { runId };
  }

  async executeWorkflow(
    step: any,
    {
      runId,
      conversationId,
      agentId,
      message,
      userId,
      options,
      idempotencyKey
    }: {
      runId: string;
      conversationId: string;
      agentId: string;
      message: string;
      userId: string;
      options?: { contexts?: any[]; mentions?: any[]; attachments?: any[] };
      idempotencyKey?: string;
    }
  ): Promise<{
    response: string;
    conversationState: ConversationState;
    agentDraft: AgentDraft;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
    patch?: Record<string, any>;
    suggestedActions?: Array<{ type: string; label: string; payload?: any }>;
    /** Canonical output for handoff / display (additive). */
    result?: string;
    artifacts?: ExecutionArtifact[];
    incomplete?: boolean;
    completionKind?: 'success' | 'budget' | 'max_iterations' | 'error';
  }> {
    const runKey = `agent_run:${runId}`;
    const swarmParsed = parseSwarmTaskConversationId(conversationId);
    const isSwarmTask = !!swarmParsed;
    const swarmTaskId = swarmParsed?.taskId ?? null;
    const isSwarmReview = swarmParsed?.isReview ?? false;

    const onProgress = (stepDesc: string, node?: string) => {
      console.log(`[AgentExecutor ReAct] Progress: ${stepDesc}`);
      redis.setex(runKey, 3600, JSON.stringify({ status: 'running', step: stepDesc })).catch(() => { });
      redis.publish(runKey, JSON.stringify({ type: 'thinking', message: stepDesc, node })).catch(() => { });

      if (isSwarmTask && swarmTaskId) {
        this.runInBackground('emit-live-progress', async () => {
          try {
            // Deduplicate via Redis to prevent Inngest replays from spamming duplicate UI events
            const dedupKey = `swarm_prog:${runId}:${Buffer.from(stepDesc).toString('base64')}`;
            const alreadyEmitted = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
            if (alreadyEmitted !== 'OK') return;

            const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
            swarmOrchestrationService.emitLiveProgressForTask(swarmTaskId, agentId, stepDesc);
          } catch (e) {
            console.error('[AgentExecutor] Failed to emit live swarm progress', e);
          }
        });
      }
    };
    // CRIT-14: Idempotency check — return cached result for retried requests.
    // For swarm: on cache hit, still repair completion if the task never got the broadcast.
    if (idempotencyKey) {
      const idempKey = `agent_executor:idempotency:${idempotencyKey}`;
      try {
        const cached = await redis.get(idempKey);
        if (cached) {
          console.log(`[AgentExecutor] Idempotency hit for key=${idempotencyKey} — returning cached result.`);
          const parsed = JSON.parse(cached);
          await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: parsed }));

          if (isSwarmTask && swarmTaskId && !isSwarmReview) {
            await step.run('swarm-broadcast-idempotency-repair', async () => {
              try {
                const task = await prisma.agentTask.findUnique({
                  where: { id: swarmTaskId },
                  select: { id: true, title: true, status: true },
                });
                if (!task) return true;
                const status = String(task.status || '');
                if (status === 'COMPLETED' || status === 'FAILED' || status === 'FAILED_PERMANENTLY') {
                  return true;
                }
                const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
                if (parsed.incomplete || (parsed.completionKind && parsed.completionKind !== 'success')) {
                  await swarmOrchestrationService.broadcastTaskFailedForTask(
                    swarmTaskId,
                    task.title || 'Task',
                    agentId,
                    parsed.response || parsed.completionKind || 'Incomplete prior run'
                  );
                } else {
                  await swarmOrchestrationService.broadcastTaskCompletedForTask(
                    swarmTaskId,
                    task.title || 'Task',
                    agentId,
                    parsed.result || parsed.response || '',
                    parsed.suggestedActions || [],
                    parsed.artifacts || []
                  );
                }
              } catch (e) {
                console.error('[AgentExecutor] Idempotency swarm repair failed', e);
                throw e;
              }
              return true;
            });
          }

          return parsed;
        }
      } catch { /* non-fatal */ }
    }

    // Per-tenant soft concurrency quota — acquire a slot before doing any work.
    // If the user already has DEFAULT_CONCURRENCY_LIMIT active runs, this throws
    // immediately with a user-friendly error before touching any LLM.
    const releaseQuotaSlot = await tenantConcurrencyQuota.acquire(userId, runId);

    try {
      // FLAW-07 FIX: Emit INIT_RUN event to durable event store (fire-and-forget — must not block the response).
      this.runInBackground('emit-run-init', () => emitRunInit(runId, userId, { agentId, conversationId }));

      const result = await tracingService.traceOperation('executor.processMessage', async (span) => {
        span.setAttributes({
          'agent.id': agentId,
          'conversation.id': conversationId,
          'user.id': userId,
          'message.length': message.length,
          'message.char_count': message.length,
        });
        const turnStartMs = Date.now();
        // Strip newlines, carriage returns, and ansi escape codes
        const sanitizedMsg = message.replace(/[\n\r]/g, ' ').replace(/\x1b\[[0-9;]*m/g, '');
        const shortMsg = sanitizedMsg.length > 70 ? sanitizedMsg.substring(0, 70) + '...' : sanitizedMsg;
        onProgress?.(`Processing request: "${shortMsg}"`);

        // Acquire lock to prevent concurrent processing. Lock on conversationId, value is runId.
        const lockKey = `${this.LOCK_KEY_PREFIX}exec:${conversationId}`;
        let lockAcquired = await this.acquireLock(lockKey, runId);
        if (!lockAcquired) {
          let retries = 0;
          while (retries < 5 && !lockAcquired) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            lockAcquired = await this.acquireLock(lockKey, runId);
            retries++;
          }
        }

        if (!lockAcquired) {
          throw new AgentBuilderError(
            'AGENT_EXECUTOR_CONVERSATION_LOCKED',
            `Conversation ${conversationId} is being processed by another request`,
            'This conversation is currently being processed. Please wait a moment and try again.',
            { conversationId, userId }
          );
        }

        try {
          // ── Step 1: Load conversation + agent in a durable step ────────────────
          const { conversationState, agent } = await step.run(
            'executor-load-conversation-and-agent',
            async () => {
              let state = await agentBuilderStateService.getConversationState(
                conversationId
              );

              // Swarm tasks use a task-scoped conversationId (swarm-task-conv-<taskId>)
              // that has no pre-existing DB record. Create it directly with the correct
              // ID so future steps (and retries) find it via getConversationState.
              if (!state && conversationId.startsWith('swarm-task-conv-')) {
                console.log(`[AgentExecutor] Auto-creating swarm task conversation: ${conversationId}`);
                try {
                  await prisma.aiConversation.create({
                    data: {
                      id: conversationId,
                      userId,
                      conversationType: 'AGENT_EXECUTOR' as any,
                      title: `Swarm Task Execution`,
                      isActive: true,
                      agentId,
                    },
                  });
                } catch (createErr: any) {
                  // P2002 = unique constraint violation — conversation already exists (race/retry)
                  if (createErr?.code !== 'P2002') throw createErr;
                }
                // Re-load to populate state from the newly created record
                state = await agentBuilderStateService.getConversationState(conversationId);
              }

              if (!state) {
                throw new AgentBuilderError(
                  'AGENT_EXECUTOR_CONVERSATION_NOT_FOUND',
                  `Conversation ${conversationId} not found`,
                  'This conversation could not be found. Please start a new conversation.',
                  { conversationId, userId }
                );
              }

              // Skip ownership check for swarm-owned conversations — they are
              // created by the system on behalf of the swarm coordinator and the
              // userId here is the swarm config userId, not the conversation owner.
              if (!conversationId.startsWith('swarm-task-conv-') && state.userId !== userId) {
                throw new AgentBuilderError(
                  'AGENT_EXECUTOR_UNAUTHORIZED',
                  `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
                  'You do not have access to this conversation.',
                  { conversationId, userId }
                );
              }

              const agentRecord = await this.assertAgentAccess(agentId, userId);

              return { conversationState: state, agent: agentRecord };
            }
          );

          const turnCount = conversationState.conversationHistory.length;
          onProgress?.(`Loading workspace context for ${agent.name}... (turn ${turnCount + 1})`);

          // ── Step 2: Prepare user context, history, and executions ──────────────
          const ctxResult: {
            userContext: UserContext;
            refreshedState: ConversationState;
            executionsSummary: Array<{
              id: string;
              status: string;
              startedAt: Date;
              completedAt: Date | null;
              trigger: string;
              outputSummary: string;
            }>;
            fullMessageWithContext: string;
          } = await step.run(
            'executor-resolve-context-and-history',
            async () => {
              const { explicitContextResolver } = await import('@/utils/utilities/explicitContextResolver');
              const resolvedExplicitContext = await explicitContextResolver.resolve(userId, options);
              const fullMessageWithContext = resolvedExplicitContext ? `${message}\n${resolvedExplicitContext}` : message;

              let ctx = await agentBuilderContextService.fetchUserContext(userId);

              try {
                ctx = await this.entityScopeInferrer.inferAndFetchEntityScope(
                  fullMessageWithContext,
                  conversationState.conversationHistory.map((h: { role: string; content: string }) => ({
                    role: h.role,
                    content: h.content,
                  })),
                  ctx,
                  userId
                );
              } catch (error) {
                console.error(
                  '[AgentExecutor] Failed to infer entity scope for executor chat:',
                  error
                );
              }

              await agentBuilderStateService.addMessageToHistory(
                conversationId,
                'user',
                message,
                {
                  contexts: options?.contexts,
                  mentions: options?.mentions,
                  attachments: options?.attachments,
                }
              );

              const latestState =
                await agentBuilderStateService.getConversationState(conversationId);

              if (!latestState) {
                throw new AgentBuilderError(
                  'AGENT_EXECUTOR_STATE_REFRESH_FAILED',
                  `Failed to refresh conversation state for ${conversationId}`,
                  'Failed to load conversation state. Please try again.',
                  { conversationId, userId }
                );
              }

              const recentExecutions = await prisma.agentExecution.findMany({
                where: { agentId },
                orderBy: { startedAt: 'desc' },
                take: 5,
              });

              const executionsSummary = recentExecutions.map((exec) => ({
                id: exec.id,
                status: exec.status,
                startedAt: exec.startedAt,
                completedAt: exec.completedAt,
                trigger: exec.triggeredBy,
                outputSummary: this.sanitizeToolOutput((exec as any).outputData),
              }));

              return { userContext: ctx, refreshedState: latestState, executionsSummary, fullMessageWithContext };
            }
          );

          // ── Step 3: Run Inferences (wrapped to ensure determinism across Inngest resumes) ──────────────
          const prepResult = await step.run('executor-prepare-inferences', async () => {
            let intent = AGENT_CONSTANTS.INTENT.EXECUTOR.EXECUTE;
            if (!isSwarmTask) {
              const res = await intentInferenceService.inferExecutorIntent(ctxResult.fullMessageWithContext, ctxResult.refreshedState.conversationHistory, userId);
              intent = res.intent;
            }

            if (!isSwarmTask && intent === AGENT_CONSTANTS.INTENT.EXECUTOR.IRRELEVANT) {
              return { isIrrelevant: true, intent };
            }

            const automationInference = await this.automationInferrer.infer(
              ctxResult.refreshedState.conversationHistory.map((h) => ({ role: h.role, content: h.content })),
              ctxResult.fullMessageWithContext,
              ctxResult.refreshedState.agentDraft,
              ctxResult.userContext,
              userId
            );

            const skillInference = await this.skillInferenceService.inferSkills(
              ctxResult.fullMessageWithContext,
              `Current capabilities: ${agent.capabilities?.join(', ') || 'None'}. Description: ${agent.description || ''}`,
              BUILT_IN_SKILLS,
              userId
            );

            const currentSkillIds = (agent as any).agentSkills?.map((as: any) => as.skill?.name || as.skillId) || [];
            const missingSkills = skillInference.suggestedSkills.filter(s => !currentSkillIds.includes(s) && skillInference.confidence > 0.7);

            let semanticMemoryBlock = '';
            try {
              const memories = await memoryManager.getSemanticContext(agentId, userId, ctxResult.fullMessageWithContext, agent.workspaceId);
              if (memories.length > 0) {
                semanticMemoryBlock = `\n\n## Relevant Memory Context\n${memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`;
              }
            } catch (memErr) {
              console.warn('[AgentExecutor] Failed to query memory manager:', memErr);
            }

            // Fetch peer agent context if running in a swarm task
            let swarmPeerBlock = '';
            if (isSwarmTask && swarmTaskId) {
              try {
                const task = await prisma.agentTask.findUnique({
                  where: { id: swarmTaskId },
                  select: { workspaceId: true }
                });
                if (task?.workspaceId) {
                  const peers = await prisma.aiAgent.findMany({
                    where: {
                      workspaceId: task.workspaceId,
                      isActive: true,
                      id: { not: agentId },
                      workspace: {
                        members: {
                          some: { userId }
                        }
                      }
                    },
                    select: { id: true, name: true, description: true },
                    take: 5
                  });
                  if (peers.length > 0) {
                    swarmPeerBlock = `\n\n## Swarm Peers (other active agents you can collaborate with via sendMessageToAgent)\n${peers.map(p => `- ${p.name} (id: ${p.id}): ${p.description || 'No description'}`).join('\n')}`;
                  }
                }
              } catch { /* non-fatal */ }
            }

            let selectedToolNames: string[] = [];
            const agentToolNames = agent.tools?.map((t: any) => t.name) || [];
            if (agentToolNames.length > 0) {
              selectedToolNames = await this.toolDiscoveryService.selectRelevantTools(
                  ctxResult.fullMessageWithContext,
                agentToolNames,
                async (name) => {
                  const { getToolByName } = await import('../registry/toolRegistry');
                  const tool = await getToolByName(name);
                  if (!tool) return null;
                  return { name: tool.functionSchema.name, description: tool.functionSchema.description } as any;
                },
                5
              );
            }

            return { isIrrelevant: false, intent, automationInference, missingSkills, semanticMemoryBlock, selectedToolNames, swarmPeerBlock };
          });

          const executorIntentLabel: Record<string, string> = {
            [AGENT_CONSTANTS.INTENT.EXECUTOR.CLARIFICATION]: 'question / info',
            [AGENT_CONSTANTS.INTENT.EXECUTOR.EXECUTE]: 'execution request',
            [AGENT_CONSTANTS.INTENT.EXECUTOR.IRRELEVANT]: 'irrelevant / route to builder',
          };
          onProgress?.(`Analysing intent — ${executorIntentLabel[prepResult.intent] ?? prepResult.intent}`);
          if (prepResult.swarmPeerBlock) onProgress?.(`Found ${(prepResult.swarmPeerBlock.match(/^- /gm) || []).length} swarm peer agent(s) for collaboration`);

          if (prepResult.isIrrelevant) {
            const wrongContextResponse = AGENT_CONSTANTS.PROMPTS.WRONG_CONTEXT_EXECUTION
              .replace('{ROLE}', 'Executor')
              .replace('{VIEW_NAME}', 'Executor')
              .replace('{PURPOSE}', 'running and monitoring agents')
              .replace('{MESSAGE}', message)
              .replace('{ALLOWED_ACTIONS}', 'executing tasks or checking status');

            await step.run('executor-wrong-context-save', async () => {
              await agentBuilderStateService.addMessageToHistory(conversationId, 'assistant', wrongContextResponse);
            });

            const refreshedState2 = await agentBuilderStateService.getConversationState(conversationId);
            return {
              response: wrongContextResponse,
              conversationState: refreshedState2!,
              agentDraft: refreshedState2!.agentDraft,
              quickActions: [],
              suggestedActions: [{ type: 'info', label: 'Go to Operator (Builder)' }]
            };
          }

          const { automationInference, missingSkills, semanticMemoryBlock, selectedToolNames } = prepResult as any;
          const missingSkillsArray = missingSkills || [];

          onProgress?.('Building execution plan...');
          const resolved = await resolveModel({
            modelId: agent.modelId,
            userId,
          });
          const model = {
            ...resolved,
            name: resolved.apiModelId,
          };
          const guardrails = AGENT_CONSTANTS.PROMPTS.QUALITY_GUARDRAILS;

          const cacheKey = `executor:${agentId}:${Buffer.from(ctxResult.fullMessageWithContext.slice(0, 80)).toString('base64')}`;
          const cachedResponse = await this.responseCache.getCachedResponse(cacheKey).catch(() => null);

          const { swarmPeerBlock = '' } = prepResult;

          let systemPrompt = '';
          let userMessageContent = '';

          if (isSwarmTask) {
            systemPrompt = `You are an AI agent participating in a multi-agent swarm.
Your identity and instructions: ${agent.systemPrompt || agent.description || 'You are a helpful assistant.'}
Capabilities: ${agent.capabilities?.join(', ') || 'None'}
Constraints: ${agent.constraints?.join(', ') || 'None'}

You are the designated worker for this task. Execute the requested work directly using your available tools or your own knowledge. 

CRITICAL INSTRUCTIONS:
1. DO NOT use tools to delegate this work or create tasks for someone else.
2. If your assignment is to generate text, review content, write code, or perform analysis, you must perform the actual work and return the FULL, final generated text/review/code.
3. Do NOT try to use a "postReply", "sendMessage", or similar tool to deliver your work unless you actually possess such a tool.
4. Do NOT just output a meta-summary like "Task completed" or "I have reviewed it". You MUST output the actual work product (e.g., the full review, the code, the generated article) as the response.
5. If NO tools make sense or are appropriate, just perform the work using your own reasoning.

When you are finished and ready to deliver the final work product, JUST WRITE IT DIRECTLY AS RAW TEXT in your message. DO NOT use the 'executor_response' tool if you have a lot of text or code to return.
${guardrails}${semanticMemoryBlock}${swarmPeerBlock}`;

            userMessageContent = `Task Instructions:\n${ctxResult.fullMessageWithContext}\n\nWorkspace Context:\n${JSON.stringify(ctxResult.userContext)}`;
          } else {

            systemPrompt = `You are an Agent Executor assistant for Agentflox.
          You can: (1) answer questions about usage and results, (2) infer execution inputs, (3) suggest running the agent.
          Use the agent data, workspace context, and recent executions. Do NOT suggest configuration changes.
          Output must be JSON via the function.
          When choosing the tools to be called, ONLY choose tools that make sense for the task. If NO tools make sense or are appropriate, you MUST return "no tool selected/no tool appropriate for this task".
          You can use multiple tools to complete the task if necessary.
          ${guardrails}${semanticMemoryBlock}${swarmPeerBlock}`;

            userMessageContent = JSON.stringify({
              message: ctxResult.fullMessageWithContext,
              agent: {
                id: agent.id,
                name: agent.name,
                type: agent.agentType,
                status: agent.status,
                isActive: agent.isActive,
                description: agent.description,
                capabilities: agent.capabilities,
                constraints: agent.constraints,
                systemPrompt: agent.systemPrompt,
                modelConfig: {
                  modelId: agent.modelId,
                  temperature: agent.temperature,
                  maxTokens: agent.maxTokens,
                },
                tools: agent.tools?.map((t: any) => t.name) || [],
              },
              workspaceId: agent.workspaceId,
              userContext: ctxResult.userContext,
              executions: ctxResult.executionsSummary,
              automationInference,
              missingSkills: missingSkillsArray.length > 0 ? missingSkillsArray : undefined,
            });
          }

          const systemMessage = { role: 'system' as const, content: systemPrompt };
          const userMessageObj = { role: 'user' as const, content: userMessageContent };
          const messages = [
            systemMessage,
            ...ctxResult.refreshedState.conversationHistory.map(h => ({ role: h.role, content: h.content })),
            userMessageObj
          ];

          const estimatedTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages)) + 800;
          const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
          if (!tokenCheck.allowed) {
            const compressionResult = await this.tokenBudgetManager.compressIfNeeded(
              ctxResult.refreshedState.conversationHistory.map(h => ({ role: h.role, content: h.content })),
              6_000
            );

            if (compressionResult.compressed) {
              await agentBuilderStateService.updateConversationState(conversationId, {
                conversationHistory: compressionResult.history.map(h => ({
                  role: h.role as 'user' | 'assistant' | 'system',
                  content: h.content,
                  timestamp: new Date(),
                })),
              });
            } else {
              throw new AgentBuilderError(
                'AGENT_EXECUTOR_TOKEN_LIMIT',
                'Token limit exceeded',
                'You are over the current token budget.',
                { remaining: tokenCheck.remaining, estimatedTokens }
              );
            }
          }

          const { getToolByName } = await import('../registry/toolRegistry');
          const agentTools: any[] = [];
          const agentToolNames = agent.tools?.map((t: any) => t.name) || [];
          if (agentToolNames.length > 0 && selectedToolNames) {
            for (const toolName of selectedToolNames) {
              const tool = await getToolByName(toolName);
              if (tool) {
                agentTools.push({
                  type: 'function',
                  function: {
                    name: tool.functionSchema.name,
                    description: tool.functionSchema.description,
                    parameters: tool.functionSchema.parameters
                  }
                });
              }
            }
          }

          let iterations = 0;
          let isFinalAnswer = false;
          let finalResponse = '';
          let collectedArtifacts: ExecutionArtifact[] = [];
          let completionKind: 'success' | 'budget' | 'max_iterations' | 'error' = 'success';
          let finalSuggestedActions: any[] = [];
          let loopTokensUsed = 0;
          let recordedInputTokens = 0;
          let recordedOutputTokens = 0;
          let hadProviderUsage = false;
          const loopBudget = AGENT_CONSTANTS.LOOP_TOKEN_BUDGET;
          const toolsInvoked: string[] = []; // track for span + metrics
          // Baseline: measure the context size BEFORE the loop so we only track
          // incremental cost per iteration (new output + tool results), not the
          // full ever-growing messages array which would front-load all cost onto
          // iteration 1 and falsely exhaust the budget before any work is done.
          const baseContextTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages)) + this.tokenBudgetManager.estimateTokens(JSON.stringify(agentTools));

          while (iterations < AGENT_CONSTANTS.REACT_MAX_ITERATIONS && !isFinalAnswer) {
            iterations++;

            // ── Sliding budget check ──────────────────────────────────────────────
            // Count only the INCREMENTAL tokens added this iteration (new messages
            // pushed since the last check), not the entire messages array.
            // The base context was already paid once before the loop started.
            const currentContextTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages));
            const incrementalCost = Math.max(0, currentContextTokens - baseContextTokens) + AGENT_CONSTANTS.LOOP_TOKEN_COST_PER_ITER;
            loopTokensUsed += incrementalCost;

            if (loopTokensUsed > loopBudget) {
              console.warn(
                `[AgentExecutor] Loop token budget exhausted at iteration ${iterations}. ` +
                `Used: ${loopTokensUsed} / Budget: ${loopBudget}. Terminating early.`
              );
              // FLAW-07 FIX: Emit durable CANCELLED_BUDGET event so the budget cut is auditable.
              this.runInBackground('emit-budget-cancelled', () =>
                emitBudgetCancelled(runId, userId, { iterations, loopTokensUsed, loopBudget })
              );
              finalResponse =
                "I've reached the analysis limit for this turn — the task is more complex than expected. " +
                "Please break it into smaller steps or clarify what you need most urgently.";
              completionKind = 'budget';
              isFinalAnswer = true;
              break;
            }

            onProgress?.(`Thinking... (Step ${iterations}/${AGENT_CONSTANTS.REACT_MAX_ITERATIONS})`);

            const completionParams = {
              model: model.name,
              messages,
              temperature: 0.4,
              max_tokens: 3000,
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'executor_response',
                    description: 'Respond with the final answer. DO NOT use this tool if you are generating a long blog post, code, or report. Just write raw text instead. ONLY use this tool if you specifically need to return suggested actions or short meta-responses.',
                    parameters: {
                      type: 'object',
                      properties: {
                        response: { type: 'string', description: 'The final answer.' },
                        suggestedActions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['execute', 'info'] },
                              label: { type: 'string' },
                              payload: { type: 'object' },
                            },
                            required: ['type', 'label'],
                          },
                        },
                      },
                      required: ['response'],
                    },
                  },
                },
                ...agentTools
              ],
              tool_choice: 'auto' as const,
            };

            // Note: runId is generated once per processMessage and passed in. It is stable across retries of the SAME run, making this key safely idempotent for Inngest.
            const completion = await step.run(`executor-llm-${runId}-${iterations}`, async () => {
              return await this.runCompletion(
                { ...completionParams, stream: true },
                { operation: 'executor_chat', agentId: agent.id, userId, resolvedModel: resolved } as any,
                (textSoFar, delta) => {
                  if (delta) {
                    redis.publish(runKey, JSON.stringify({ type: 'token', message: delta })).catch(() => { });
                  }
                  if (isSwarmTask && swarmTaskId) {
                    // Fire and forget progress update
                    import('../orchestration/swarmOrchestrationService').then(({ swarmOrchestrationService }) => {
                      swarmOrchestrationService.emitLiveProgressForTask(
                        swarmTaskId,
                        agent.id,
                        textSoFar,
                        'thinking'
                      ).catch(() => { });
                    }).catch(() => { });
                  }
                }
              );
            });

            const assistantMessage = completion.choices[0]?.message;
            if (!assistantMessage) {
              throw new AgentBuilderError(
                'AGENT_EXECUTOR_NO_RESPONSE',
                'Executor did not return a structured response',
                'I was unable to craft an answer. Please try again.',
                { agentId: agent.id, userId }
              );
            }

            // Accumulate provider usage across React iterations for AiUsageLog
            const turnUsage = fromOpenAIUsage(completion.usage);
            if (completion.usage) {
              hadProviderUsage = true;
              recordedInputTokens += turnUsage.inputTokens;
              recordedOutputTokens += turnUsage.outputTokens;
            }

            messages.push(assistantMessage as any);

            // ── Thinking stream is emitted real-time, no need for post-hoc emit ──
            // Inngest step. If the worker crashes mid-loop, the next retry can restore
            // the messages context from this snapshot instead of restarting from scratch.
            this.runInBackground('checkpoint-messages', async () => {
              try {
                const checkpointKey = `run:${runId}:iter:${iterations}:messages`;
                await redis.setex(checkpointKey, 3_600, JSON.stringify(messages));
              } catch { /* non-fatal — crash recovery is best-effort */ }
            });

            const toolCalls = assistantMessage.tool_calls;
            if (!toolCalls || toolCalls.length === 0) {
              isFinalAnswer = true;
              finalResponse = assistantMessage.content || 'Done.';
              finalSuggestedActions = [];
              break;
            }

            // Check if it's the executor_response (final answer)
            const executorResponseCall = toolCalls.find((tc: any) => tc.function.name === 'executor_response');
            if (executorResponseCall) {
              try {
                const raw = JSON.parse(executorResponseCall.function.arguments);
                const parsed = ExecutorResponseSchema.safeParse(raw);
                if (parsed.success) {
                  finalResponse = parsed.data.response;
                  finalSuggestedActions = parsed.data.suggestedActions.slice(0, 3);
                } else {
                  // Fallback: try reading .response directly from raw JSON
                  finalResponse = typeof raw?.response === 'string'
                    ? raw.response
                    : raw?.content || assistantMessage.content || 'Task completed.';
                }
              } catch {
                finalResponse = assistantMessage.content || 'Task completed.';
              }
              isFinalAnswer = true;
              break;
            }

            // Otherwise, we have other tools to execute
            for (const tc of toolCalls) {
              let argSummary = '';
              try {
                const args = JSON.parse(tc.function.arguments);
                const firstKey = Object.keys(args)[0];
                if (firstKey) {
                  const valStr = String(args[firstKey]);
                  argSummary = `${firstKey}: ${valStr.length > 30 ? valStr.slice(0, 30) + '...' : valStr}`;
                }
              } catch { }

              const toolLabel = argSummary ? `${tc.function.name} (${argSummary})` : `${tc.function.name}...`;
              onProgress?.(`Running ${toolLabel}`);

              // Emit rich tool_call event to swarm feed
              if (isSwarmTask && swarmTaskId) {
                await step.run(`emit-tool-call-${runId}-${iterations}-${tc.id}`, async () => {
                  try {
                    const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
                    await swarmOrchestrationService.emitLiveProgressForTask(swarmTaskId, agentId, toolLabel, 'tool_call');
                  } catch { /* non-fatal */ }
                  return true;
                });
              }

              toolsInvoked.push(tc.function.name); // Phase 5: track for observability
              const toolResultStr = await step.run(`executor-tool-${runId}-${iterations}-${tc.id}`, async () => {
                const cacheKey = `tool_res:${runId}:${tc.id}`;
                const lockKey = `tool_lock:${runId}:${tc.id}`;

                // 1. Check if we already have the result (from a previous successfully completed run that timed out in Inngest)
                const cached = await redis.get(cacheKey);
                if (cached) return cached;

                // 2. Try to acquire an execution lock (expires in 180s to cover the 120s timeout + buffer)
                const isLocked = await redis.set(lockKey, '1', 'EX', 180, 'NX');

                if (!isLocked) {
                  // Another invocation is currently running this tool. We wait for it to finish.
                  let retries = 0;
                  while (retries < 65) {
                    await new Promise(r => setTimeout(r, 2000));
                    const latestCache = await redis.get(cacheKey);
                    if (latestCache) return latestCache;
                    retries++;
                  }
                  return JSON.stringify({ error: 'Tool execution timed out concurrently.' });
                }

                try {
                  const args = JSON.parse(tc.function.arguments);
                  const result = await this.runToolWithTimeout(
                    tc.function.name,
                    () =>
                      this.toolInvocationGate.invoke({
                        executionId: runId,
                        agentId: agent.id,
                        userId: userId,
                        toolName: tc.function.name,
                        parameters: args,
                        workspaceId: (agent as any).workspaceId || undefined
                      }),
                    120_000
                  );
                  // Serialize FULLY (no truncation) — truncating here breaks JSON.parse downstream
                  // and starves the LLM of its tool output context.
                  const fullResult = typeof result === 'string' ? result : JSON.stringify(result);
                  await redis.set(cacheKey, fullResult, 'EX', 3600);
                  return fullResult;
                } catch (e: any) {
                  const errRes = JSON.stringify({ error: e.message || 'Tool execution failed' });
                  await redis.set(cacheKey, errRes, 'EX', 3600);
                  return errRes;
                }
              });

              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: toolResultStr,
              } as any);

              if (tc.function.name.startsWith('generate') || tc.function.name.startsWith('write') || tc.function.name.startsWith('create') || toolResultStr.length > 100) {
                const built = buildArtifactsFromToolResult(tc.function.name, toolResultStr, {
                  filenameBase: tc.function.name,
                });
                if (built.length > 0) {
                  collectedArtifacts.push(...built.map((a, i) => ({
                    ...a,
                    id: a.id || `${tc.id}-${i}`,
                  })));
                }
              }

              // Emit tool result summary to swarm activity feed
              if (isSwarmTask && swarmTaskId) {
                await step.run(`emit-tool-result-${runId}-${iterations}-${tc.id}`, async () => {
                  try {
                    const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
                    let resultSummary = toolResultStr;
                    try {
                      const parsed = JSON.parse(toolResultStr);
                      if (parsed.error) resultSummary = `❌ ${parsed.error}`;
                      else if (parsed.output) resultSummary = parsed.output.slice(0, 200);
                      else if (parsed.result) resultSummary = JSON.stringify(parsed.result).slice(0, 200);
                      else resultSummary = JSON.stringify(parsed).slice(0, 200);
                    } catch { resultSummary = toolResultStr.slice(0, 200); }
                    await swarmOrchestrationService.emitLiveProgressForTask(
                      swarmTaskId, agentId,
                      `${tc.function.name} → ${resultSummary}`,
                      'tool_result'
                    );
                  } catch { /* non-fatal */ }
                  return true;
                });
              }

              // FLAW-07 FIX: Emit a STEP_EXECUTED event for each tool invocation.
              // This gives the audit trail a per-tool-call record with the run context.
              this.runInBackground(`emit-step-${tc.function.name}`, () =>
                emitStepExecuted(
                  runId, userId,
                  `iter-${iterations}-tool-${tc.function.name}`,
                  tc.function.name,
                  undefined, undefined, 'success',
                  { args: tc.function.arguments?.slice(0, 200) }
                )
              );
            }
          }

          if (!isFinalAnswer) {
            finalResponse = 'Max iterations reached. Could not complete the task within the loop limit.';
            completionKind = 'max_iterations';
          }

          // Always write AiUsageLog (system + BYOK). Prefer provider usage totals from the loop.
          this.runInBackground('token-usage-tracking-chat', async () => {
            let inputTokens = recordedInputTokens;
            let outputTokens = recordedOutputTokens;
            let usageEstimated = !hadProviderUsage;
            if (!hadProviderUsage) {
              const tokenCount = await countAgentTokens(
                messages as Array<{ role: string; content: string }>,
                finalResponse,
                model.name,
              );
              inputTokens = tokenCount.inputTokens;
              outputTokens = tokenCount.outputTokens;
              usageEstimated = true;
            }
            await recordUsage({
              resolved,
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                usageEstimated,
              },
              userId,
              userName: 'User',
              context: {
                conversationId,
                agentId: agent.id,
                action: 'CHAT',
                success: completionKind === 'success',
                metadata: { source: 'agentExecutorService', completionKind, iterations },
              },
            });
          });

          // ── Phase 5: Span enrichment + metrics ───────────────────────────────
          // Enrich the OTel span with execution details so traces can be
          // correlated in LangSmith / Langfuse / Datadog / Jaeger.
          span.setAttributes({
            'llm.iterations': iterations,
            'llm.loop_tokens_used': loopTokensUsed,
            'llm.loop_budget': loopBudget,
            'llm.budget_exhausted': loopTokensUsed > loopBudget,
            'tools.invoked': toolsInvoked.join(','),
            'tools.count': toolsInvoked.length,
            'response.char_count': finalResponse.length,
            'execution.status': isFinalAnswer ? 'converged' : 'budget_cut',
          });

          const turnDurationMs = Date.now() - turnStartMs;
          this.runInBackground('executor-metrics-record', async () => {
            await agentMetricsService.recordExecution({
              agentId: agent.id,
              agentType: String(agent.agentType),
              status: isFinalAnswer ? 'SUCCESS' : 'BUDGET_CUT',
              duration: turnDurationMs,
              tokenUsage: loopTokensUsed,
              userId,
              timestamp: new Date(),
            });
          });

          const upstreamResult = pickUpstreamResult(collectedArtifacts, finalResponse);
          const incomplete = completionKind !== 'success';

          // If no tool artifacts, still expose the final response as a text artifact when successful
          if (collectedArtifacts.length === 0 && finalResponse && !incomplete) {
            collectedArtifacts.push({
              filename: `response-${(agent.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
              type: 'markdown',
              content: finalResponse,
            });
          }

          await agentBuilderStateService.addMessageToHistory(
            conversationId,
            'assistant',
            finalResponse,
            {
              suggestedActions: finalSuggestedActions,
              automationInference,
              artifacts: collectedArtifacts,
              result: upstreamResult,
              incomplete: incomplete || undefined,
              completionKind,
            }
          );

          // ── Semantic memory write-back (fire-and-forget) ──────────────────────
          // Store a compact Q&A memory so future turns can recall prior interactions.
          this.runInBackground('semantic-memory', async () => {
            try {
              await sharedMemoryService.share(
                agentId,
                'experience',
                `User asked: ${message.slice(0, 200)}\nAgent responded: ${finalResponse.slice(0, 400)}`,
                // FLAW-11 FIX: Scope memory to userId — prevents PII from user A
                // being recalled for user B when they share the same agent.
                `user:${userId}`
              );
            } catch { /* non-fatal — never block the response path */ }
          });

          const updatedState = await agentBuilderStateService.updateConversationState(conversationId, {
            agentDraft: ctxResult.refreshedState.agentDraft,
          });

          const partialResult = {
            response: finalResponse,
            result: upstreamResult,
            artifacts: collectedArtifacts,
            incomplete: incomplete || undefined,
            completionKind,
            conversationState: updatedState,
            agentDraft: updatedState.agentDraft,
            quickActions: [],
            followups: [],
            suggestedActions: finalSuggestedActions,
          };

          // ── Broadcast task result to Swarm UI (durable step — not fire-and-forget) ──
          // Review conversations must not advance/fail the primary pipeline step.
          if (isSwarmTask && swarmTaskId && !isSwarmReview) {
            await step.run('swarm-broadcast-completed', async () => {
              const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
              const task = await prisma.agentTask.findUnique({
                where: { id: swarmTaskId },
                select: { id: true, title: true }
              }).catch(() => null);

              const taskTitleStr = (task as any)?.title || 'Task';

              if (incomplete) {
                await swarmOrchestrationService.broadcastTaskFailedForTask(
                  swarmTaskId,
                  taskTitleStr,
                  agent.id,
                  `${completionKind}: ${finalResponse}`
                );
              } else {
                await swarmOrchestrationService.broadcastTaskCompletedForTask(
                  swarmTaskId,
                  taskTitleStr,
                  agent.id,
                  upstreamResult,
                  finalSuggestedActions,
                  collectedArtifacts
                );
              }
              return true;
            });
          }

          // Idempotency: cache only AFTER successful swarm broadcast (correctness over hit rate).
          if (idempotencyKey) {
            const idempKey = `agent_executor:idempotency:${idempotencyKey}`;
            try {
              await redis.setex(idempKey, 300, JSON.stringify(partialResult));
            } catch { /* non-fatal */ }
          }

          // Cache logic omitted for brevity here
          return partialResult;
        } finally {
          await this.releaseLock(lockKey, runId);
        }
      });

      await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: result }));
      redis.publish(runKey, JSON.stringify({ type: 'complete', payload: result })).catch(() => { });
      // FLAW-07 FIX: Emit durable RUN_COMPLETED event (fire-and-forget).
      this.runInBackground('emit-run-completed', () => emitRunCompleted(runId, userId));
      return result;
    } catch (e: any) {
      await redis.setex(runKey, 3600, JSON.stringify({ status: 'error', message: e.message || 'Error occurred' }));
      redis.publish(runKey, JSON.stringify({ type: 'error', message: e.message || 'Error occurred' })).catch(() => { });
      // FLAW-07 FIX: Emit durable RUN_FAILED event (fire-and-forget).
      this.runInBackground('emit-run-failed', () => emitRunFailed(runId, userId, { error: e.message }));

      // Broadcast failure to swarm UI (durable). Skip lock errors (Inngest retries) and review convos.
      if (isSwarmTask && swarmTaskId && !isSwarmReview && e.code !== 'AGENT_EXECUTOR_CONVERSATION_LOCKED') {
        try {
          await step.run('swarm-broadcast-failed', async () => {
            const { swarmOrchestrationService } = await import('../orchestration/swarmOrchestrationService');
            const task = await prisma.agentTask.findUnique({
              where: { id: swarmTaskId },
              select: { id: true, title: true }
            }).catch(() => null);
            await swarmOrchestrationService.broadcastTaskFailedForTask(
              swarmTaskId,
              (task as any)?.title || 'Task',
              agentId,
              e.message || 'Unknown error'
            );
            return true;
          });
        } catch { /* non-fatal if step unavailable outside inngest */ }
      }

      throw e;
    } finally {
      // Always release tenant concurrency slot — works for success, error, and cancellation.
      await releaseQuotaSlot();
    }
  }

  /** Trigger an execution for the agent */
  async triggerExecution(agentId: string, userId: string, inputData: any = {}, executionContext: any = {}) {
    const agent = await this.assertAgentAccess(agentId, userId, true);
    if (!agent.isActive) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_INACTIVE',
        'Agent is not active',
        'Activate the agent before running executions.',
        { agentId }
      );
    }

    const execution = await prisma.agentExecution.create({
      data: {
        id: randomUUID(),
        agentId,
        triggeredBy: 'MANUAL',
        triggerUserId: userId,
        inputData,
        executionContext,
        status: 'QUEUED',
        startedAt: new Date(),
      },
    });

    auditLogger.log({ agentId, userId, action: 'LAUNCH', metadata: { executionId: execution.id, inputData } });

    try {
      await inngest.send({
        name: 'agent/execute',
        data: {
          executionId: execution.id,
          agentId,
          userId,
          inputData,
          executionContext,
          rootRunId: execution.id,
        },
      });
    } catch (inngestError: any) {
      console.error('[AgentExecutor] Failed to send event to Inngest:', inngestError);

      // Mark execution as FAILED — do not leave it stuck in QUEUED forever
      this.runInBackground('mark-execution-failed', async () => {
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            // Store error info in executionContext since errorMessage is not a schema field
            executionContext: {
              ...(typeof execution.executionContext === 'object' ? execution.executionContext : {}),
              inngestError: String(inngestError),
              failedAt: new Date().toISOString(),
            },
          },
        });
      });

      // Provide more helpful logs in development
      if (process.env.NODE_ENV === 'development') {
        if (inngestError.message?.includes('401') || inngestError.message?.includes('key unknown')) {
          console.warn('[AgentExecutor] 💡 TIP: Inngest 401/403 errors are usually caused by a missing or invalid INNGEST_EVENT_KEY in .env. For local development, set INNGEST_EVENT_KEY=local and run the Inngest Dev Server (npx inngest-cli dev).');
        } else if (inngestError.code === 'ECONNREFUSED') {
          console.warn('[AgentExecutor] 💡 TIP: Connection refused to Inngest. Is the Inngest Dev Server running? Start it with: npx inngest-cli dev');
        }
      }

      throw inngestError;
    }

    return { executionId: execution.id, status: 'QUEUED' };
  }

  private async assertAgentAccess(agentId: string, userId: string, requireWrite = false) {
    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
      include: {
        tools: {
          where: { isActive: true },
        },
        triggers: {
          where: { isActive: true },
        },
        schedules: {
          where: { isActive: true },
        },
        agentSkills: {
          include: { skill: true }
        }
      },
    });
    if (!agent) {
      throw new AgentBuilderError('AGENT_NOT_FOUND', 'Agent not found', 'No agent found with that ID.', { agentId });
    }

    const allowed = await this.permissionService.checkAgentPermission(agentId, userId, requireWrite ? 'write' : 'read');
    if (!allowed) {
      throw new AgentBuilderError('PERMISSION_DENIED', 'Permission denied', 'You do not have access to this agent.', {
        agentId,
        userId,
      });
    }
    return agent;
  }
}

export const agentExecutorService = new AgentExecutorService({
  permissionService: new PermissionService(),
  promptSandbox: new PromptSandbox(),
  tokenBudgetManager: new TokenBudgetManager(),
  entityScopeInferrer: new EntityScopeInferrer(),
  automationInferrer: new AutomationInferrer(),
  inputSanitizer: new InputSanitizer(),
  responseCache: new ResponseCache(),
  skillInferenceService: skillInferenceService,
  toolInvocationGate: new ToolInvocationGate(new GuardrailService(new CorePermissionService())),
  toolDiscoveryService: new ToolDiscoveryService(),
});
