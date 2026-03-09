import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
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
import { AI_EXECUTOR_FLOW_GUIDE } from '../instructions/aiExecutorFlowGuide';
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

const ExecutorWelcomeResponseSchema = z.object({
  welcomeMessage: z.string(),
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
          const { inngest } = await import('@/lib/inngest');
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

    const truncated = serialized.slice(0, maxLength);

    // Check for prompt injection patterns
    const isInjectionAttempt = AGENT_CONSTANTS.PROMPT_INJECTION_PATTERNS.some(
      (pattern) => pattern.test(truncated)
    );

    if (isInjectionAttempt) {
      console.warn('[AgentExecutor] PROMPT INJECTION detected in tool output. Scrubbing.');
      return '[output sanitized: content blocked for safety]';
    }

    return truncated + (serialized.length > maxLength ? '…' : '');
  }

  /**
   * Bound tool execution time to prevent runaway or hung tools from stalling the ReAct loop.
   * If the timeout elapses, the promise rejects with a descriptive error.
   */
  private async runToolWithTimeout<T>(
    label: string,
    fn: () => Promise<T>,
    timeoutMs = 15_000
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

  private async runCompletion(request: any, context: { operation: string; agentId: string; userId: string }) {
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
          () => openai.chat.completions.create({ ...request, stream: false }),
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
  private async acquireLock(lockKey: string): Promise<boolean> {
    try {
      const result = await redis.set(lockKey, '1', 'EX', this.LOCK_TIMEOUT, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`[AgentExecutor] Redis unavailable — aborting lock acquire for ${lockKey}:`, error);
      // Fail-Closed: cannot guarantee exclusive access — abort.
      return false;
    }
  }

  /**
   * Release a lock for a conversation
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await redis.del(lockKey);
    } catch (error) {
      console.error(`[AgentExecutor] Failed to release lock for ${lockKey}:`, error);
      // Don't throw - lock will expire anyway
    }
  }

  async initializeConversation(
    userId: string,
    agentId: string,
    conversationId?: string,
    skipWelcome?: boolean
  ): Promise<{
    conversationId: string;
    conversationState: ConversationState;
    userContext: UserContext;
    welcomeMessage: string;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
  }> {
    return this.initializeConversationInternal(userId, agentId, conversationId, skipWelcome);
  }

  // Method `inferExecutionIntent` replaced by `intentInferenceService.inferExecutorIntent`

  // FLAW-09 FIX: depth guard prevents unbounded recursion when conversation
  // lookup races cause repeated (re-)delegation with the same ID.
  private async initializeConversationInternal(
    userId: string,
    agentId: string,
    conversationId?: string,
    skipWelcome?: boolean,
    _depth = 0,
  ): Promise<{
    conversationId: string;
    conversationState: ConversationState;
    userContext: UserContext;
    welcomeMessage: string;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
  }> {
    if (_depth > 2) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_INIT_RECURSION',
        `initializeConversation exceeded max recursion depth (depth=${_depth})`,
        'Failed to initialize conversation. Please try again.',
        { userId, agentId, conversationId }
      );
    }
    const agent = await this.assertAgentAccess(agentId, userId);
    let userContext = await agentBuilderContextService.fetchUserContext(userId);

    // Enrich user context with entity scope if available
    try {
      userContext = await this.entityScopeInferrer.inferAndFetchEntityScope(
        '',
        agent.systemPrompt
          ? [{ role: 'system', content: agent.systemPrompt }]
          : [],
        userContext,
        userId
      );
    } catch (error) {
      console.error('[AgentExecutor] Failed to infer entity scope for executor initialization:', error);
    }

    // If conversationId is provided, load existing state
    let conversationState!: ConversationState;
    if (conversationId) {
      // Acquire lock to prevent concurrent initialization
      const lockKey = `${this.LOCK_KEY_PREFIX}init:${conversationId}`;
      const lockAcquired = await this.acquireLock(lockKey);
      if (!lockAcquired) {
        // If lock not acquired, wait a bit and retry up to 2 times
        let retries = 0;
        let retryLock = false;
        while (retries < 2 && !retryLock) {
          await new Promise(resolve => setTimeout(resolve, 200));
          retryLock = await this.acquireLock(lockKey);
          retries++;
        }

        if (!retryLock) {
          // Still locked, load and return existing state.
          // Another request is likely already generating the welcome message.
          console.log(`[AgentExecutor] Conversation ${conversationId} is already being initialized, waiting for other request to finish`);
          // Wait a bit more for the other request to complete its write
          await new Promise(resolve => setTimeout(resolve, 800));

          const existingState = await agentBuilderStateService.getConversationState(conversationId);
          if (existingState) {
            return {
              conversationId: existingState.conversationId,
              conversationState: existingState,
              userContext,
              welcomeMessage: '',
              quickActions: [],
              followups: [],
            };
          }
        }
      }

      try {
        console.log(`[AgentExecutor] Loading existing conversation: ${conversationId}`);
        const existingState = await agentBuilderStateService.getConversationState(conversationId);
        if (!existingState) {
          throw new AgentBuilderError(
            'AGENT_EXECUTOR_CONVERSATION_NOT_FOUND',
            `Conversation ${conversationId} not found`,
            'This conversation could not be found. Please start a new conversation.',
            { conversationId, userId }
          );
        }
        if (existingState.userId !== userId) {
          throw new AgentBuilderError(
            'AGENT_EXECUTOR_UNAUTHORIZED',
            `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
            'You do not have access to this conversation.',
            { conversationId, userId }
          );
        }

        conversationState = existingState;

        // Check if conversation has any messages
        const messageCount = await prisma.aiMessage.count({
          where: { conversationId },
        });

        const hasMessages = messageCount > 0;

        if (!hasMessages && !skipWelcome) {
          console.log(`[AgentExecutor] Conversation ${conversationId} is empty, generating welcome message`);

          // Generate welcome message for empty existing conversation
          const welcomeMessage = await this.generateWelcomeMessage(userContext, agent, userId);

          // Add welcome message to history
          await agentBuilderStateService.addMessageToHistory(
            conversationState.conversationId,
            'assistant',
            welcomeMessage
          );

          // Refresh conversation state to get updated history with welcome message
          const refreshedState = await agentBuilderStateService.getConversationState(conversationId);
          if (!refreshedState) {
            throw new AgentBuilderError(
              'AGENT_EXECUTOR_STATE_REFRESH_FAILED',
              `Failed to refresh conversation state for ${conversationId}`,
              'Failed to load conversation state. Please try again.',
              { conversationId, userId }
            );
          }

          return {
            conversationId: refreshedState.conversationId,
            conversationState: refreshedState,
            userContext,
            welcomeMessage,
            quickActions: [],
            followups: [],
          };
        }

        // Conversation has messages - load existing conversation without new welcome
        console.log(`[AgentExecutor] Successfully loaded existing conversation: ${conversationId}, messages: ${conversationState.conversationHistory.length}`);
        return {
          conversationId: conversationState.conversationId,
          conversationState,
          userContext,
          welcomeMessage: '', // No welcome message for non-empty conversation
          quickActions: [],
          followups: [],
        };
      } finally {
        // Always release lock
        if (lockAcquired) {
          await this.releaseLock(lockKey);
        }
      }
    }

    // If agentId provided but no conversationId, check if current user has an existing conversation for this agent
    if (agentId && !conversationId) {
      let existingConversation = await prisma.aiConversation.findFirst({
        where: {
          agentId,
          userId,
          conversationType: 'AGENT_EXECUTOR'
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingConversation) {
        // FLAW-09 FIX: Use depth-guarded internal call instead of direct recursion.
        // Without this, a lookup race can cause unbounded recursion until stack overflow.
        console.log(`[AgentExecutor] Agent ${agentId} has existing conversation ${existingConversation.id} for user ${userId}, loading it`);
        return this.initializeConversationInternal(userId, agentId, existingConversation.id, skipWelcome, _depth + 1);
      }

      // No existing conversation found. Acquire lock to prevent duplicate creation from concurrent requests (React StrictMode).
      const initAgentLockKey = `${this.LOCK_KEY_PREFIX}init_agent:${userId}:${agentId}`;
      const initAgentLockAcquired = await this.acquireLock(initAgentLockKey);

      try {
        if (!initAgentLockAcquired) {
          // Wait and check again to see if the concurrent request created it.
          await new Promise(resolve => setTimeout(resolve, 800));
          existingConversation = await prisma.aiConversation.findFirst({
            where: {
              agentId,
              userId,
              conversationType: 'AGENT_EXECUTOR'
            },
            orderBy: { createdAt: 'desc' },
          });

          if (existingConversation) {
            console.log(`[AgentExecutor] Agent ${agentId} gained conversation ${existingConversation.id} while waiting, loading it`);
            return this.initializeConversationInternal(userId, agentId, existingConversation.id, skipWelcome, _depth + 1);
          }
        }

        // Still doesn't exist (or we hold the lock), so create it safely.
        console.log(`[AgentExecutor] Creating new conversation for agent ${agentId}`);
        conversationState = await agentBuilderStateService.createConversationState(
          userId,
          agentId,
          'AGENT_EXECUTOR'
        );
      } finally {
        if (initAgentLockAcquired) {
          await this.releaseLock(initAgentLockKey);
        }
      }
    } else if (!conversationId) {
      // Fallback if no agentId and no conversationId provided
      console.log(`[AgentExecutor] Creating new fallback conversation for agent ${agentId}`);
      conversationState = await agentBuilderStateService.createConversationState(
        userId,
        agentId,
        'AGENT_EXECUTOR'
      );
    }

    // Acquire lock for new conversation to prevent duplicate welcome messages
    const newLockKey = `${this.LOCK_KEY_PREFIX}init:${conversationState.conversationId}`;
    let newLockAcquired = await this.acquireLock(newLockKey);

    if (!newLockAcquired) {
      // If we couldn't get the lock for a brand new conversation, it means another 
      // identical request (e.g. React StrictMode) is already initializing it.
      let retries = 0;
      while (retries < 2 && !newLockAcquired) {
        await new Promise(resolve => setTimeout(resolve, 200));
        newLockAcquired = await this.acquireLock(newLockKey);
        retries++;
      }

      if (!newLockAcquired) {
        console.log(`[AgentExecutor] New conversation ${conversationState.conversationId} is already being welcome-initialized, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 800));

        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (refreshedState && (refreshedState.conversationHistory.length > 0)) {
          return {
            conversationId: refreshedState.conversationId,
            conversationState: refreshedState,
            userContext,
            welcomeMessage: '',
            quickActions: [],
            followups: [],
          };
        }
      }
    }

    try {
      // Double-check: verify no messages were added while we were creating the conversation
      const messageCount = await prisma.aiMessage.count({
        where: { conversationId: conversationState.conversationId },
      });

      if (messageCount > 0) {
        // Messages already exist, refresh state and return
        console.log(`[AgentExecutor] Messages already exist for new conversation ${conversationState.conversationId}`);
        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (!refreshedState) {
          throw new AgentBuilderError(
            'AGENT_EXECUTOR_STATE_REFRESH_FAILED',
            `Failed to refresh conversation state for ${conversationState.conversationId}`,
            'Failed to load conversation state. Please try again.',
            { conversationId: conversationState.conversationId, userId }
          );
        }
        return {
          conversationId: refreshedState.conversationId,
          conversationState: refreshedState,
          userContext,
          welcomeMessage: '',
          quickActions: [],
          followups: [],
        };
      }

      if (!skipWelcome) {
        const welcomeMessage = await this.generateWelcomeMessage(userContext, agent, userId);

        await agentBuilderStateService.addMessageToHistory(
          conversationState.conversationId,
          'assistant',
          welcomeMessage
        );

        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (!refreshedState) {
          throw new AgentBuilderError(
            'AGENT_EXECUTOR_STATE_REFRESH_FAILED',
            `Failed to refresh conversation state for ${conversationState.conversationId}`,
            'Failed to load conversation state. Please try again.',
            { conversationId: conversationState.conversationId, userId }
          );
        }

        return {
          conversationId: refreshedState.conversationId,
          conversationState: refreshedState,
          userContext,
          welcomeMessage,
          quickActions: [],
          followups: [],
        };
      }

      return {
        conversationId: conversationState.conversationId,
        conversationState,
        userContext,
        welcomeMessage: '',
        quickActions: [],
        followups: [],
      };
    } finally {
      if (newLockAcquired) {
        await this.releaseLock(newLockKey);
      }
    }
  }

  /**
   * Extract welcome message generation to separate method
   */
  private async generateWelcomeMessage(
    userContext: UserContext,
    agent: any,
    userId: string
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are the Agentflox Agent Executor assistant.

=== AI EXECUTOR FLOW GUIDE (REFERENCE) ===
${AI_EXECUTOR_FLOW_GUIDE}
=== END OF FLOW GUIDE ===

Generate a short, friendly welcome message for the executor panel for this agent.

Requirements:
- Mention the agent by name.
- Follow the pattern: "Have questions or want to know how to work with [AGENT NAME]? Ask me!"
- Make it clear the user can ask questions about how the agent works, how to change it, and how to run it.
- Optionally reference what the agent does based on its configuration, tools, triggers, and recent executions.
- Keep it to 1-3 sentences, conversational and direct.

Return strictly JSON with shape: { "welcomeMessage": string }.`,
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
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
          },
          userContext,
        }),
      },
    ];

    // Fetch model
    const model = await fetchModel();

    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 500;

    // Check token limit
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_INSUFFICIENT_TOKENS',
        `Insufficient tokens: ${tokenCheck.remaining} remaining, need ${estimatedTokens}`,
        `You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase more tokens.`,
        { userId, remaining: tokenCheck.remaining, required: estimatedTokens }
      );
    }

    const completion = await this.runCompletion(
      {
        model: model.name,
        messages,
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      },
      { operation: 'executor_initialize', agentId: agent.id, userId }
    );

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_WELCOME_FAILED',
        'Failed to generate executor welcome message',
        'I could not prepare the executor view. Please try again.',
        { agentId: agent.id, userId }
      );
    }

    let parsed;
    try {
      parsed = ExecutorWelcomeResponseSchema.safeParse(extractJson(content));
    } catch (error) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_WELCOME_PARSE_FAILED',
        'Failed to parse executor welcome response',
        'I could not prepare the executor view. Please try again.',
        { agentId: agent.id, userId, error: error instanceof Error ? error.message : String(error) }
      );
    }

    if (!parsed.success) {
      throw new AgentBuilderError(
        'AGENT_EXECUTOR_WELCOME_INVALID',
        'Executor welcome response did not match schema',
        'I could not prepare the executor view. Please try again.',
        { agentId: agent.id, userId, issues: parsed.error.issues }
      );
    }

    // Count actual tokens and update usage — fire-and-forget
    this.runInBackground('token-usage-tracking-welcome', async () => {
      const tokenCount = await countAgentTokens(
        messages as Array<{ role: string; content: string }>,
        content,
        model.name,
        completion.usage as any
      );
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      await updateAgentUsage(
        userId,
        user?.name || user?.email || 'User',
        tokenCount.inputTokens,
        tokenCount.outputTokens,
        user?.email || undefined
      );
    });

    return parsed.data.welcomeMessage;
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
    onProgress?: (step: string, node?: string) => void,
    onToken?: (text: string) => void,
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
      idempotencyKey
    }: {
      runId: string;
      conversationId: string;
      agentId: string;
      message: string;
      userId: string;
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
  }> {
    const runKey = `agent_run:${runId}`;
    const onProgress = (stepDesc: string, node?: string) => {
      console.log(`[AgentExecutor ReAct] Progress: ${stepDesc}`);
      redis.setex(runKey, 3600, JSON.stringify({ status: 'running', step: stepDesc })).catch(() => { });
    };
    const onToken = (text: string) => { };
    // CRIT-14: Idempotency check — return cached result for retried requests.
    if (idempotencyKey) {
      const idempKey = `agent_executor:idempotency:${idempotencyKey}`;
      try {
        const cached = await redis.get(idempKey);
        if (cached) {
          console.log(`[AgentExecutor] Idempotency hit for key=${idempotencyKey} — returning cached result.`);
          const parsed = JSON.parse(cached);
          await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: parsed }));
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

        onProgress?.('Understanding your request...');

        // Acquire lock to prevent concurrent processing
        const lockAcquired = await this.acquireLock(conversationId);
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
              const state = await agentBuilderStateService.getConversationState(
                conversationId
              );

              if (!state) {
                throw new AgentBuilderError(
                  'AGENT_EXECUTOR_CONVERSATION_NOT_FOUND',
                  `Conversation ${conversationId} not found`,
                  'This conversation could not be found. Please start a new conversation.',
                  { conversationId, userId }
                );
              }

              if (state.userId !== userId) {
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
          onProgress?.(`Loading workspace context... (turn ${turnCount + 1})`);

          // ── Step 2: Prepare user context, history, and executions ──────────────
          const {
            userContext,
            refreshedState,
            executionsSummary,
          }: {
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
          } = await step.run(
            'executor-prepare-context-and-executions',
            async () => {
              let ctx = await agentBuilderContextService.fetchUserContext(userId);

              try {
                ctx = await this.entityScopeInferrer.inferAndFetchEntityScope(
                  message,
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
                message
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

              return { userContext: ctx, refreshedState: latestState, executionsSummary };
            }
          );

          onProgress?.('Inferring intent...');
          const { intent } = await intentInferenceService.inferExecutorIntent(
            message,
            refreshedState.conversationHistory
          );

          const executorIntentLabel: Record<string, string> = {
            [AGENT_CONSTANTS.INTENT.EXECUTOR.CLARIFICATION]: 'question / info',
            [AGENT_CONSTANTS.INTENT.EXECUTOR.EXECUTE]: 'execution request',
            [AGENT_CONSTANTS.INTENT.EXECUTOR.IRRELEVANT]: 'irrelevant / route to builder',
          };
          onProgress?.(`Intent · ${executorIntentLabel[intent] ?? intent}`);

          // Handle WRONG CONTEXT (Config Request in Executor)
          if (intent === AGENT_CONSTANTS.INTENT.EXECUTOR.IRRELEVANT) {
            const wrongContextResponse = AGENT_CONSTANTS.PROMPTS.WRONG_CONTEXT_EXECUTION
              .replace('{ROLE}', 'Executor')
              .replace('{VIEW_NAME}', 'Executor')
              .replace('{PURPOSE}', 'running and monitoring agents')
              .replace('{MESSAGE}', message)
              .replace('{ALLOWED_ACTIONS}', 'executing tasks or checking status');

            await agentBuilderStateService.addMessageToHistory(conversationId, 'assistant', wrongContextResponse);

            const refreshedState = await agentBuilderStateService.getConversationState(conversationId);
            return {
              response: wrongContextResponse,
              conversationState: refreshedState!,
              agentDraft: refreshedState!.agentDraft,
              quickActions: [],
              suggestedActions: [
                { type: 'info', label: 'Go to Operator (Builder)' }
              ]
            };
          }

          const automationInference = await this.automationInferrer.infer(
            refreshedState.conversationHistory.map((h) => ({
              role: h.role,
              content: h.content,
            })),
            message,
            refreshedState.agentDraft,
            userContext,
            userId
          );

          // --- SKILL INFERENCE ---
          const skillInference = await this.skillInferenceService.inferSkills(
            message,
            `Current capabilities: ${agent.capabilities?.join(', ') || 'None'}. Description: ${agent.description || ''}`,
            BUILT_IN_SKILLS
          );

          const currentSkillIds = (agent as any).agentSkills?.map((as: any) => as.skill?.name || as.skillId) || [];
          const missingSkills = skillInference.suggestedSkills.filter(s => !currentSkillIds.includes(s) && skillInference.confidence > 0.7);

          onProgress?.('Preparing executor response...');
          const model = await fetchModel();
          const guardrails = AGENT_CONSTANTS.PROMPTS.QUALITY_GUARDRAILS;

          // ── Semantic memory recall (L2 & L3) ──────────────────────────────────
          let semanticMemoryBlock = '';
          try {
            const memories = await memoryManager.getSemanticContext(
              agentId,
              userId,
              message,
              agent.workspaceId
            );
            if (memories.length > 0) {
              semanticMemoryBlock = `\n\n## Relevant Memory Context\n${memories
                .map((m, i) => `${i + 1}. ${m.content}`)
                .join('\n')}`;
            }
          } catch (memErr) {
            console.warn('[AgentExecutor] Failed to query memory manager:', memErr);
          }

          const cacheKey = `executor:${agentId}:${Buffer.from(message.slice(0, 80)).toString('base64')}`;
          const cachedResponse = await this.responseCache.getCachedResponse(cacheKey).catch(() => null);

          const systemPrompt = `You are an Agent Executor assistant for Agentflox.
          You can: (1) answer questions about usage and results, (2) infer execution inputs, (3) suggest running the agent.
          Use the agent data, workspace context, and recent executions. Do NOT suggest configuration changes.
          Output must be JSON via the function.
          ${guardrails}${semanticMemoryBlock}`;

          const messages = [
            { role: 'system' as const, content: systemPrompt },
            {
              role: 'user' as const,
              content: JSON.stringify({
                message,
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
                  tools: agent.availableTools,
                },
                userContext,
                executions: executionsSummary,
                automationInference,
                missingSkills: missingSkills.length > 0 ? missingSkills : undefined,
              }),
            },
          ];

          const estimatedTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages)) + 800;
          const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
          if (!tokenCheck.allowed) {
            const compressionResult = await this.tokenBudgetManager.compressIfNeeded(
              refreshedState.conversationHistory.map(h => ({ role: h.role, content: h.content })),
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
          if (agent.availableTools && agent.availableTools.length > 0) {
            const selectedToolNames = await this.toolDiscoveryService.selectRelevantTools(
              message,
              agent.availableTools,
              async (name) => {
                const tool = await getToolByName(name);
                if (!tool) return null;
                return {
                  name: tool.functionSchema.name,
                  description: tool.functionSchema.description,
                } as any;
              },
              5
            );

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
          let finalSuggestedActions: any[] = [];
          let loopTokensUsed = 0;
          const loopBudget = AGENT_CONSTANTS.LOOP_TOKEN_BUDGET;
          const toolsInvoked: string[] = []; // track for span + metrics

          while (iterations < AGENT_CONSTANTS.REACT_MAX_ITERATIONS && !isFinalAnswer) {
            iterations++;

            // ── Sliding budget check ──────────────────────────────────────────────
            // Estimate cost of this iteration BEFORE calling the LLM.
            // Uses the current messages array length as a fast proxy.
            const iterEstimate = this.tokenBudgetManager.estimateTokens(
              JSON.stringify(messages)
            ) + AGENT_CONSTANTS.LOOP_TOKEN_COST_PER_ITER;
            loopTokensUsed += iterEstimate;

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
              isFinalAnswer = true;
              break;
            }

            onProgress?.(`Thinking... (Step ${iterations}/${AGENT_CONSTANTS.REACT_MAX_ITERATIONS})`);

            const completionParams = {
              model: model.name,
              messages,
              temperature: 0.4,
              max_tokens: 800,
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'executor_response',
                    description: 'Respond to the user with actions and optional patch',
                    parameters: {
                      type: 'object',
                      properties: {
                        response: { type: 'string' },
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

            const completion = await step.run(`executor-llm-${runId}-${iterations}`, async () => {
              return await this.runCompletion(
                { ...completionParams, stream: false },
                { operation: 'executor_chat', agentId: agent.id, userId }
              );
            });

            const message = completion.choices[0]?.message;
            if (!message) {
              throw new AgentBuilderError(
                'AGENT_EXECUTOR_NO_RESPONSE',
                'Executor did not return a structured response',
                'I was unable to craft an answer. Please try again.',
                { agentId: agent.id, userId }
              );
            }

            messages.push(message as any);

            // FLAW-04 FIX: Checkpoint the accumulated messages array to Redis after every
            // Inngest step. If the worker crashes mid-loop, the next retry can restore
            // the messages context from this snapshot instead of restarting from scratch.
            this.runInBackground('checkpoint-messages', async () => {
              try {
                const checkpointKey = `run:${runId}:iter:${iterations}:messages`;
                await redis.setex(checkpointKey, 3_600, JSON.stringify(messages));
              } catch { /* non-fatal — crash recovery is best-effort */ }
            });

            const toolCalls = message.tool_calls;
            if (!toolCalls || toolCalls.length === 0) {
              isFinalAnswer = true;
              finalResponse = message.content || 'Done.';
              finalSuggestedActions = [];
              break;
            }

            // Check if it's the executor_response (final answer)
            const executorResponseCall = toolCalls.find((tc: any) => tc.function.name === 'executor_response');
            if (executorResponseCall) {
              this.runInBackground('token-usage-tracking-chat', async () => {
                const tokenCount = await countAgentTokens(
                  messages as Array<{ role: string; content: string }>,
                  executorResponseCall.function.arguments,
                  model.name,
                  completion.usage as any
                );
                await updateAgentUsage(
                  userId,
                  'User',
                  tokenCount.inputTokens,
                  tokenCount.outputTokens,
                  undefined
                );
              });

              const parsed = ExecutorResponseSchema.safeParse(JSON.parse(executorResponseCall.function.arguments));
              if (parsed.success) {
                finalResponse = parsed.data.response;
                finalSuggestedActions = parsed.data.suggestedActions.slice(0, 3);
              } else {
                finalResponse = 'Failed to parse final response.';
              }
              isFinalAnswer = true;
              break;
            }

            // Otherwise, we have other tools to execute
            for (const tc of toolCalls) {
              onProgress?.(`Executing tool: ${tc.function.name}...`);
              toolsInvoked.push(tc.function.name); // Phase 5: track for observability
              const toolResultStr = await step.run(`executor-tool-${runId}-${iterations}-${tc.id}`, async () => {
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
                    15_000
                  );
                  return this.sanitizeToolOutput(result);
                } catch (e: any) {
                  return JSON.stringify({ error: e.message || 'Tool execution failed' });
                }
              });

              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: toolResultStr,
              } as any);

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
          }

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

          await agentBuilderStateService.addMessageToHistory(
            conversationId,
            'assistant',
            finalResponse,
            { suggestedActions: finalSuggestedActions, automationInference }
          );

          // ── Semantic memory write-back (fire-and-forget) ──────────────────────
          // Store a compact Q&A memory so future turns can recall prior interactions.
          setImmediate(async () => {
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
            agentDraft: refreshedState.agentDraft,
          });

          const partialResult = {
            response: finalResponse,
            conversationState: updatedState,
            agentDraft: updatedState.agentDraft,
            quickActions: [],
            followups: [],
            suggestedActions: finalSuggestedActions,
          };

          // Cache logic omitted for brevity here
          return partialResult;
        } finally {
          await this.releaseLock(conversationId);
        }
      });

      await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: result }));
      // FLAW-07 FIX: Emit durable RUN_COMPLETED event (fire-and-forget).
      this.runInBackground('emit-run-completed', () => emitRunCompleted(runId, userId));
      return result;
    } catch (e: any) {
      await redis.setex(runKey, 3600, JSON.stringify({ status: 'error', message: e.message || 'Error occurred' }));
      // FLAW-07 FIX: Emit durable RUN_FAILED event (fire-and-forget).
      this.runInBackground('emit-run-failed', () => emitRunFailed(runId, userId, { error: e.message }));
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

    try {
      await inngest.send({
        name: 'agent/execute',
        data: { executionId: execution.id, agentId, userId, inputData, executionContext },
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
