import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { CircuitBreaker, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { PermissionService } from '../safety/permissionService';
import { PromptSandbox } from '../safety/promptSandbox';
import { auditLogger } from '../audit/auditLogger';
import { AgentUpdateService, type AgentUpdateRequest } from '../core/agentUpdateService';
import { AgentBuilderError } from './agentBuilderService';
import { checkAgentTokenLimit, updateAgentUsage, estimateTokens, countAgentTokens } from '@/utils/ai/agentUsageTracking';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { intentInferenceService } from '../inference/intentInferenceService';
import { ToolInvocationGate } from '../core/toolInvocationGate';
import { GuardrailService } from '../safety/guardrailService';
import { PermissionService as CorePermissionService } from '@/services/permissions/permission.service';
import { extractJson } from '@/utils/ai/jsonParsing';
import { AGENT_CONSTANTS } from '../constants/agentConstants';
import { agentBuilderContextService, UserContext } from '../state/agentBuilderContextService';
import { AI_OPERATOR_FLOW_GUIDE } from '../instructions/aiOperatorFlowGuide';
import { EntityScopeInferrer } from '../context/entityScopeInferrer';
import { ConfigurationExtractor } from '../extraction/configurationExtractor';
import { ConfigurationMerger } from '../extraction/configurationMerger';
import { AutomationInferrer } from '../inference/automationInferrer';
import { InputSanitizer } from '../safety/inputSanitizer';
import { ResponseCache } from '../cache/responseCache';
import { SkillInferenceService, skillInferenceService } from '../inference/skillInferenceService';
import { BUILT_IN_SKILLS } from '../registry/skillRegistry';
import { redis } from '@/lib/redis';
import { ToolDiscoveryService } from '../registry/toolDiscoveryService';
import {
  agentBuilderStateService,
  ConversationState,
  AgentDraft,
} from '../state/agentBuilderStateService';
import { QuickAction } from '../generation/agentBuilderQuickActions';
import { memoryManager } from '../core/memoryManager';
import { sharedMemoryService } from '../core/sharedMemory';
import { tracingService } from '@/services/agents/monitoring/tracing';
import { agentMetricsService } from '../monitoring/agentMetricsService';
import { validatePatchLenient, validatePatchStrict, PatchSecurityError } from '../safety/patchWhitelist';
import {
  emitRunInit,
  emitStepExecuted,
  emitRunCompleted,
  emitRunFailed,
  emitBudgetCancelled,
} from '../execution/agentEventStore';

interface SuggestedAction {
  type: 'execute' | 'update' | 'info';
  label: string;
  payload?: Record<string, unknown>;
}

interface OperatorResponse {
  response: string;
  suggestedActions: SuggestedAction[];
  patch?: Record<string, unknown>;
}

const OperatorResponseSchema = z.object({
  response: z.string(),
  suggestedActions: z
    .array(
      z.object({
        type: z.enum(['execute', 'update', 'info']),
        label: z.string().max(120),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  patch: z.record(z.unknown()).optional(),
});

const OperatorWelcomeResponseSchema = z.object({
  welcomeMessage: z.string(),
});

export interface AgentOperatorDependencies {
  permissionService: PermissionService;
  promptSandbox: PromptSandbox;
  tokenBudgetManager: TokenBudgetManager;
  agentUpdateService: AgentUpdateService;
  entityScopeInferrer: EntityScopeInferrer;
  configurationExtractor: ConfigurationExtractor;
  configurationMerger: ConfigurationMerger;
  automationInferrer: AutomationInferrer;
  inputSanitizer: InputSanitizer;
  responseCache: ResponseCache;
  skillInferenceService: SkillInferenceService;
  toolInvocationGate: ToolInvocationGate;
  toolDiscoveryService: ToolDiscoveryService;
}

export class AgentOperatorService {
  // Lock timeout in seconds (centralised with other agents)
  private readonly LOCK_TIMEOUT = AGENT_CONSTANTS.LOCK_TIMEOUT;
  private readonly LOCK_KEY_PREFIX = 'agent_operator:lock:';

  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenMaxCalls: 3
  });
  private readonly retryHandler = new RetryHandler();
  private readonly errorClassifier = new ErrorClassifier();

  private readonly permissionService: PermissionService;
  private readonly promptSandbox: PromptSandbox;
  private readonly tokenBudgetManager: TokenBudgetManager;
  private readonly agentUpdateService: AgentUpdateService;
  private readonly entityScopeInferrer: EntityScopeInferrer;
  private readonly configurationExtractor: ConfigurationExtractor;
  private readonly configurationMerger: ConfigurationMerger;
  private readonly automationInferrer: AutomationInferrer;
  private readonly inputSanitizer: InputSanitizer;
  private readonly responseCache: ResponseCache;
  private readonly skillInferenceService: SkillInferenceService;
  private readonly toolInvocationGate: ToolInvocationGate;
  private readonly toolDiscoveryService: ToolDiscoveryService;

  constructor(dependencies: AgentOperatorDependencies) {
    this.permissionService = dependencies.permissionService;
    this.promptSandbox = dependencies.promptSandbox;
    this.tokenBudgetManager = dependencies.tokenBudgetManager;
    this.agentUpdateService = dependencies.agentUpdateService;
    this.entityScopeInferrer = dependencies.entityScopeInferrer;
    this.configurationExtractor = dependencies.configurationExtractor;
    this.configurationMerger = dependencies.configurationMerger;
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
   * such as tracing, metrics, and audit logging.
   */
  private runInBackground(label: string, fn: () => Promise<void>): void {
    (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[AgentOperator] Background task "${label}" failed:`, err);
        // P2-12: Dead Letter Queue via Inngest for operator background work.
        try {
          const { inngest } = await import('@/lib/inngest');
          await inngest.send({
            name: 'agent/background.failed',
            data: {
              label,
              error: err instanceof Error ? err.message : String(err),
              service: 'operator',
              occurredAt: new Date().toISOString(),
            },
          });
        } catch (dlqErr) {
          console.error('[AgentOperator] Failed to enqueue background DLQ task:', dlqErr);
        }
      }
    })();
  }

  /**
   * FLAW-08 FIX: Sanitize untrusted tool output before injecting into LLM context.
   * Mirrors agentExecutorService.sanitizeToolOutput.
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
    const isInjectionAttempt = AGENT_CONSTANTS.PROMPT_INJECTION_PATTERNS.some(
      (pattern) => pattern.test(truncated)
    );
    if (isInjectionAttempt) {
      console.warn('[AgentOperator] PROMPT INJECTION detected in tool output. Scrubbing.');
      return '[output sanitized: content blocked for safety]';
    }
    return truncated + (serialized.length > maxLength ? '…' : '');
  }

  /**
   * Bound tool execution time to prevent runaway or hung tools from stalling the operator loop.
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
          `[AgentOperator] Tool "${label}" timed out after ${timeoutMs}ms`
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

  private async runCompletion(request: any, context: { operation: string; agentId: string; userId: string }) {
    try {
      return await this.retryHandler.retry(
        () => this.circuitBreaker.execute(() => openai.chat.completions.create(request)),
        { maxAttempts: 3, baseDelay: 800 }
      );
    } catch (error) {
      const classification = this.errorClassifier.classify(error as Error);
      const errorId = randomUUID();
      console.error('[AgentOperator] LLM failed', { errorId, context, classification, error });
      throw new AgentBuilderError(
        'AGENT_OPERATOR_COMPLETION_FAILED',
        `LLM call failed: ${classification.type}`,
        'I could not process that request. Please try again shortly.',
        { errorId, classification }
      );
    }
  }

  /**
   * Acquire a lock for a conversation to prevent concurrent processing
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    try {
      const result = await redis.set(lockKey, '1', 'EX', this.LOCK_TIMEOUT, 'NX');
      return result === 'OK';
    } catch (error) {
      // FLAW-02 FIX: Fail-CLOSED — mirrors AgentExecutor and AgentBuilder behaviour.
      // If Redis is unavailable we cannot guarantee exclusive access; allowing
      // concurrent writes risks silent config corruption, which is far worse than
      // a temporary refusal. The lock will expire naturally when Redis recovers.
      console.error(
        `[AgentOperator] Redis unavailable — aborting lock acquire for ${lockKey}:`,
        error
      );
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
      console.error(`[AgentOperator] Failed to release lock for ${lockKey}:`, error);
      // Don't throw - lock will expire anyway
    }
  }

  // FLAW-09 FIX: recursion depth guard — prevents stack overflow when the
  // conversation lookup and re-delegation recurse more than once.
  // The public initializeConversation delegates here at depth=0.
  // Recursive calls inside the body pass depth+1 and throw at depth>2.
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
        'AGENT_OPERATOR_INIT_RECURSION',
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
      console.error('[AgentOperator] Failed to infer entity scope for operator initialization:', error);
    }

    // If conversationId is provided, load existing state
    let conversationState: ConversationState;
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
          console.log(`[AgentOperator] Conversation ${conversationId} is already being initialized, waiting for other request to finish`);
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
        console.log(`[AgentOperator] Loading existing conversation: ${conversationId}`);
        const existingState = await agentBuilderStateService.getConversationState(conversationId);
        if (!existingState) {
          throw new AgentBuilderError(
            'AGENT_OPERATOR_CONVERSATION_NOT_FOUND',
            `Conversation ${conversationId} not found`,
            'This conversation could not be found. Please start a new conversation.',
            { conversationId, userId }
          );
        }
        if (existingState.userId !== userId) {
          throw new AgentBuilderError(
            'AGENT_OPERATOR_UNAUTHORIZED',
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
          console.log(`[AgentOperator] Conversation ${conversationId} is empty, generating welcome message`);

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
              'AGENT_OPERATOR_STATE_REFRESH_FAILED',
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
        console.log(`[AgentOperator] Successfully loaded existing conversation: ${conversationId}, messages: ${conversationState.conversationHistory.length}`);
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
      const existingConversation = await prisma.aiConversation.findFirst({
        where: {
          agentId,
          userId,
          conversationType: 'AGENT_OPERATOR'
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingConversation) {
        // Agent has existing conversation - recursively call with depth guard
        console.log(`[AgentOperator] Agent ${agentId} has existing conversation ${existingConversation.id} for user ${userId}, loading it`);
        return this.initializeConversationInternal(userId, agentId, existingConversation.id, skipWelcome, _depth + 1);
      }
    }

    // Create new conversation state
    console.log(`[AgentOperator] Creating new conversation for agent ${agentId}`);
    conversationState = await agentBuilderStateService.createConversationState(
      userId,
      agentId,
      'AGENT_OPERATOR'
    );

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
        console.log(`[AgentOperator] New conversation ${conversationState.conversationId} is already being welcome-initialized, waiting...`);
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
        console.log(`[AgentOperator] Messages already exist for new conversation ${conversationState.conversationId}`);
        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (!refreshedState) {
          throw new AgentBuilderError(
            'AGENT_OPERATOR_STATE_REFRESH_FAILED',
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
            'AGENT_OPERATOR_STATE_REFRESH_FAILED',
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

  /** Public entry-point — delegates to the guarded internal method at depth=0. */
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
    return this.initializeConversationInternal(userId, agentId, conversationId, skipWelcome, 0);
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
        content: `You are the Agentflox Agent Operator assistant.

=== AI OPERATOR FLOW GUIDE (REFERENCE) ===
${AI_OPERATOR_FLOW_GUIDE}
=== END OF FLOW GUIDE ===

Generate a short, friendly welcome message for the operator panel for this agent.

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
        'AGENT_OPERATOR_INSUFFICIENT_TOKENS',
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
      { operation: 'operator_initialize', agentId: agent.id, userId }
    );

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_WELCOME_FAILED',
        'Failed to generate operator welcome message',
        'I could not prepare the operator view. Please try again.',
        { agentId: agent.id, userId }
      );
    }

    let parsed;
    try {
      parsed = OperatorWelcomeResponseSchema.safeParse(extractJson(content));
    } catch (error) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_WELCOME_PARSE_FAILED',
        'Failed to parse operator welcome response',
        'I could not prepare the operator view. Please try again.',
        { agentId: agent.id, userId, error: error instanceof Error ? error.message : String(error) }
      );
    }

    if (!parsed.success) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_WELCOME_INVALID',
        'Operator welcome response did not match schema',
        'I could not prepare the operator view. Please try again.',
        { agentId: agent.id, userId, issues: parsed.error.issues }
      );
    }

    // Count actual tokens and update usage — prefer model usage numbers when present.
    countAgentTokens(
      messages as Array<{ role: string; content: string }>,
      content,
      model.name,
      completion.usage as any
    ).then(async (tokenCount) => {
      try {
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
      } catch (error) {
        console.error('Failed to update agent usage for operator initialization:', error);
      }
    }).catch(() => { });

    return parsed.data.welcomeMessage;
  }

  /**
   * Process operator message - initiates async workflow
   */
  async processMessage(
    conversationId: string,
    agentId: string,
    message: string,
    userId: string,
    idempotencyKey?: string
  ): Promise<{ runId: string }> {
    const runId = randomUUID();

    await inngest.send({
      name: 'agent/operator.requested',
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
      console.log(`[AgentOperator ReAct] Progress: ${stepDesc}`);
      redis.setex(runKey, 3600, JSON.stringify({ status: 'running', step: stepDesc })).catch(() => { });
    };

    // CRIT-14: Idempotency check 
    if (idempotencyKey) {
      const idempKey = `agent_operator:idempotency:${idempotencyKey}`;
      try {
        const cached = await redis.get(idempKey);
        if (cached) {
          console.log(`[AgentOperator] Idempotency hit for key=${idempotencyKey} — returning cached result.`);
          const parsed = JSON.parse(cached);
          await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: parsed }));
          return parsed;
        }
      } catch { /* non-fatal */ }
    }

    // Sanitize user input to prevent prompt injection
    const sanitizedMessage = this.inputSanitizer.sanitize(message);
    const turnStartMs = Date.now(); // Phase 5: wall-clock timer for metrics

    onProgress?.('Understanding your request...');

    // Acquire lock to prevent concurrent processing (fail-closed, namespaced key)
    const processingLockKey = `${this.LOCK_KEY_PREFIX}${conversationId}`;
    const lockAcquired = await this.acquireLock(processingLockKey);
    if (!lockAcquired) {
      const lockErr = new AgentBuilderError(
        'AGENT_OPERATOR_CONVERSATION_LOCKED',
        `Conversation ${conversationId} is being processed by another request`,
        'This conversation is currently being processed. Please wait a moment and try again.',
        { conversationId, userId }
      );
      await redis.setex(runKey, 3600, JSON.stringify({ status: 'error', message: lockErr.message }));
      throw lockErr;
    }

    try {
      // ── Step 1: Load conversation + agent in a durable step ────────────────
      const { conversationState, agent } = await step.run(
        'operator-load-conversation-and-agent',
        async () => {
          const state = await agentBuilderStateService.getConversationState(
            conversationId
          );

          if (!state) {
            throw new AgentBuilderError(
              'AGENT_OPERATOR_CONVERSATION_NOT_FOUND',
              `Conversation ${conversationId} not found`,
              'This conversation could not be found. Please start a new conversation.',
              { conversationId, userId }
            );
          }

          if (state.userId !== userId) {
            throw new AgentBuilderError(
              'AGENT_OPERATOR_UNAUTHORIZED',
              `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
              'You do not have access to this conversation.',
              { conversationId, userId }
            );
          }

          const agentRecord = await this.assertAgentAccess(agentId, userId);

          return { conversationState: state, agent: agentRecord };
        }
      );

      // ── Step 2: Prepare user context and refreshed state ───────────────────
      const {
        userContext,
        refreshedState,
      }: {
        userContext: UserContext;
        refreshedState: ConversationState;
      } = await step.run('operator-prepare-context', async () => {
        let ctx = await agentBuilderContextService.fetchUserContext(userId);

        try {
          ctx = await this.entityScopeInferrer.inferAndFetchEntityScope(
            sanitizedMessage,
            conversationState.conversationHistory.map((h: { role: string; content: string }) => ({
              role: h.role,
              content: h.content,
            })),
            ctx,
            userId
          );
        } catch (error) {
          console.error(
            '[AgentOperator] Failed to infer entity scope for operator chat:',
            error
          );
        }

        await agentBuilderStateService.addMessageToHistory(
          conversationId,
          'user',
          sanitizedMessage
        );

        const latestState =
          await agentBuilderStateService.getConversationState(conversationId);

        if (!latestState) {
          throw new AgentBuilderError(
            'AGENT_OPERATOR_STATE_REFRESH_FAILED',
            `Failed to refresh conversation state for ${conversationId}`,
            'Failed to load conversation state. Please try again.',
            { conversationId, userId }
          );
        }

        return { userContext: ctx, refreshedState: latestState };
      });

      // --- NEW: INTELLIGENT INTENT INFERENCE (Injected Service) ---
      const intentResult = await intentInferenceService.inferOperatorIntent(sanitizedMessage, refreshedState.conversationHistory);

      // Handle EXECUTE_REQUEST - "Wrong Context" Guardrail
      // Operators configure; Executors execute.
      if (intentResult.intent === AGENT_CONSTANTS.INTENT.OPERATOR.EXECUTE_REQUEST) {
        // Check if it's a "test run" request (allowable) vs "production run"
        // For now, we strictly guide to Executor for clarity, unless explicit "test" keyword?
        // The prompt says "EXECUTE_REQUEST: User wants to RUN the agent... - Operator can trigger dry runs, but primary execution is Executor."
        // If confidence is high, suggeset Executor.
        if (intentResult.confidence > 0.8 && !sanitizedMessage.toLowerCase().includes('test')) {
          return {
            response: "To run this agent for a production task, please switch to the **Executor** view. The Operator view is for configuring, training, and running test simulations.",
            conversationState: refreshedState,
            agentDraft: refreshedState.agentDraft,
            quickActions: [],
            followups: [],
            suggestedActions: [{ type: 'info', label: 'Go to Executor', payload: { link: `/agent/${agentId}/execute` } }]
          };
        }
      }

      // Get recent executions
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
      }));

      // Try to extract configuration if user is requesting changes
      let extractedConfig: any = null;
      const lowerMessage = sanitizedMessage.toLowerCase();
      const isConfigChange = lowerMessage.includes('change') ||
        lowerMessage.includes('update') ||
        lowerMessage.includes('modify') ||
        lowerMessage.includes('add') ||
        lowerMessage.includes('remove');

      if (isConfigChange) {
        try {
          extractedConfig = await this.configurationExtractor.extract(
            sanitizedMessage,
            refreshedState,
            userContext,
            userId,
            conversationId
          );
        } catch (error) {
          console.error('[AgentOperator] Configuration extraction failed:', error);
        }
      }

      // Merge extracted configuration with current agent state (similar to agentBuilderService)
      let mergedUpdates: Partial<AgentUpdateRequest['updates']> = {};
      if (extractedConfig && extractedConfig.confidenceScore !== undefined && extractedConfig.confidenceScore > 0) {
        try {
          // Create a draft from current agent state
          const currentDraft: AgentDraft = {
            name: agent.name,
            description: agent.description || undefined,
            agentType: agent.agentType,
            systemPrompt: agent.systemPrompt || undefined,
            capabilities: agent.capabilities || [],
            constraints: agent.constraints || [],
            status: agent.status === 'ACTIVE' ? 'ready' : 'draft',
            modelConfig: agent.modelId ? {
              modelId: agent.modelId,
              temperature: agent.temperature,
              maxTokens: agent.maxTokens,
            } : undefined,
          };

          // Merge extracted configuration into draft
          const mergedDraft = this.configurationMerger.mergeConfiguration(currentDraft, extractedConfig);

          // Convert merged draft to update format for agentUpdateService
          mergedUpdates = {
            name: mergedDraft.name !== agent.name ? mergedDraft.name : undefined,
            description: mergedDraft.description !== agent.description ? mergedDraft.description : undefined,
            avatar: mergedDraft.avatar !== agent.avatar ? mergedDraft.avatar : undefined,
            systemPrompt: mergedDraft.systemPrompt !== agent.systemPrompt ? mergedDraft.systemPrompt : undefined,
            personality: mergedDraft.personality || undefined,
            capabilities: mergedDraft.capabilities?.length ? mergedDraft.capabilities : undefined,
            constraints: mergedDraft.constraints?.length ? mergedDraft.constraints : undefined,
            modelConfig: mergedDraft.modelConfig ? {
              modelId: mergedDraft.modelConfig.modelId || '',
              temperature: mergedDraft.modelConfig.temperature || 0.7,
              maxTokens: mergedDraft.modelConfig.maxTokens || 4000,
            } : undefined,
            tools: mergedDraft.tools?.map((t: any) => ({
              id: t.id || t.name,
              config: t.config || {},
              isActive: t.isActive !== false,
            })),
            triggers: mergedDraft.triggers?.map(t => ({
              type: t.triggerType,
              config: t.config || {},
            })),
            rules: mergedDraft.rules,
          };

          // Remove undefined values
          Object.keys(mergedUpdates).forEach(key => {
            if (mergedUpdates[key as keyof typeof mergedUpdates] === undefined) {
              delete mergedUpdates[key as keyof typeof mergedUpdates];
            }
          });
        } catch (error) {
          console.error('[AgentOperator] Failed to merge configuration:', error);
        }
      }

      // Try to infer automations if relevant
      let automationInference: any = null;
      const isAutomationRelated = lowerMessage.includes('automat') ||
        lowerMessage.includes('trigger') ||
        lowerMessage.includes('when') ||
        lowerMessage.includes('schedule');

      if (isAutomationRelated) {
        try {
          // Create a draft from current agent state
          const currentDraft: AgentDraft = {
            name: agent.name,
            description: agent.description || undefined,
            agentType: agent.agentType,
            systemPrompt: agent.systemPrompt || undefined,
            capabilities: agent.capabilities || [],
            constraints: agent.constraints || [],
            status: agent.status === 'ACTIVE' ? 'ready' : 'draft',
          };

          automationInference = await this.automationInferrer.infer(
            refreshedState.conversationHistory.map(h => ({
              role: h.role,
              content: h.content,
            })),
            sanitizedMessage,
            currentDraft,
            userContext,
            userId
          );
        } catch (error) {
          console.error('[AgentOperator] Automation inference failed:', error);
        }
      }

      // Infer skills based on message and context
      let inferredSkills: { suggestedSkills: string[], confidence: number, reasoning: string } | null = null;
      if (isConfigChange || isAutomationRelated) {
        inferredSkills = await this.skillInferenceService.inferSkills(
          sanitizedMessage,
          `Current capabilities: ${agent.capabilities?.join(', ') || 'None'}. Description: ${agent.description || ''}`,
          BUILT_IN_SKILLS
        );
      }

      // If we have a merged update (config change), mix in skills
      if (Object.keys(mergedUpdates).length > 0 && inferredSkills && inferredSkills.confidence > 0.7 && inferredSkills.suggestedSkills.length > 0) {
        // Get current skills
        const currentSkillIds = (agent as any).agentSkills?.map((as: any) => as.skill?.name || as.skillId) || [];
        const newSkills = new Set(currentSkillIds);
        let skillsAdded = false;

        for (const skill of inferredSkills.suggestedSkills) {
          if (!newSkills.has(skill)) {
            newSkills.add(skill);
            skillsAdded = true;
          }
        }

        if (skillsAdded) {
          mergedUpdates.skills = Array.from(newSkills) as string[];
          console.log(`[AgentOperator] Adding inferred skills to update: ${inferredSkills.suggestedSkills.join(', ')}`);
        }
      }

      // Build operator response
      const model = await fetchModel();
      const guardrails = `QUALITY
- Be concise, factual, and accurate to this agent's stored configuration.
- Never invent tools, triggers, or capabilities that the agent does not have.
- When suggesting updates, provide a minimal JSON patch (partial object) under patch.
- When suggesting an execution, include a suggested input payload under payload.
- Keep at most 3 suggestedActions; labels < 80 chars.`;

      // ── Semantic memory recall (L2 & L3) ──────────────────────────────────
      let semanticMemoryBlock = '';
      try {
        const memories = await memoryManager.getSemanticContext(
          agentId,
          userId,
          sanitizedMessage,
          agent.workspaceId
        );
        if (memories.length > 0) {
          semanticMemoryBlock = `\n\n## Relevant Memory Context\n${memories
            .map((m, i) => `${i + 1}. ${m.content}`)
            .join('\n')}`;
        }
      } catch (memErr) {
        console.warn('[AgentOperator] Failed to query memory manager:', memErr);
      }

      const systemPrompt = `You are an Agent Operator assistant for Agentflox.
You can: (1) answer questions about the agent, (2) infer and propose safe configuration updates as a minimal JSON patch, (3) suggest running the agent with an input.
Use the agent data, workspace context, and recent executions exactly as given. When inferring configuration, keep changes minimal and aligned with the existing intent of the agent.
For executions, suggest clear input payloads that this agent can handle based on its tools and triggers.
Output must be JSON via the function.
${guardrails}${semanticMemoryBlock}`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        {
          role: 'user' as const,
          content: JSON.stringify({
            message: sanitizedMessage,
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
              stats: {
                totalExecutions: agent.totalExecutions,
                successfulRuns: agent.successfulRuns,
                failedRuns: agent.failedRuns,
                lastExecutedAt: agent.lastExecutedAt,
              },
            },
            userContext,
            executions: executionsSummary,
            extractedConfig,
            automationInference,
          }),
        },
      ];

      const estimatedTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages)) + 800;
      const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
      if (!tokenCheck.allowed) {
        throw new AgentBuilderError(
          'AGENT_OPERATOR_TOKEN_LIMIT',
          'Token limit exceeded for operator chat',
          'You are over the current token budget. Please wait or upgrade your plan.',
          { remaining: tokenCheck.remaining, estimatedTokens }
        );
      }

      const { getToolByName } = await import('../registry/toolRegistry');
      const agentTools: any[] = [];
      if (agent.availableTools && agent.availableTools.length > 0) {
        const selectedToolNames = await this.toolDiscoveryService.selectRelevantTools(
          sanitizedMessage,
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
      let finalPatch: any = undefined;
      let loopTokensUsed = 0; // Sliding token budget tracker
      const loopBudget = AGENT_CONSTANTS.LOOP_TOKEN_BUDGET;
      const toolsInvoked: string[] = []; // Phase 5: track for span + metrics

      while (iterations < AGENT_CONSTANTS.REACT_MAX_ITERATIONS && !isFinalAnswer) {
        iterations++;

        // ── Sliding budget check ───────────────────────────────────────────
        const iterEstimate = this.tokenBudgetManager.estimateTokens(
          JSON.stringify(messages)
        ) + AGENT_CONSTANTS.LOOP_TOKEN_COST_PER_ITER;
        loopTokensUsed += iterEstimate;

        if (loopTokensUsed > loopBudget) {
          console.warn(
            `[AgentOperator] Loop token budget exhausted at iteration ${iterations}. ` +
            `Used: ${loopTokensUsed} / Budget: ${loopBudget}. Terminating early.`
          );
          finalResponse =
            "I've reached the analysis limit for this turn — the request is too complex to resolve in one step. " +
            "Please simplify your request or break it into smaller parts.";
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
                name: 'operator_response',
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
                          type: { type: 'string', enum: ['execute', 'update', 'info'] },
                          label: { type: 'string' },
                          payload: { type: 'object' },
                        },
                        required: ['type', 'label'],
                      },
                    },
                    patch: { type: 'object' },
                  },
                  required: ['response'],
                },
              },
            },
            ...agentTools
          ],
          tool_choice: 'auto' as const,
        };

        const completion = await step.run(`operator-llm-${runId}-${iterations}`, async () => {
          return await this.runCompletion(
            { ...completionParams, stream: false },
            { operation: 'operator_chat', agentId: agent.id, userId }
          );
        });

        const message = completion.choices[0]?.message;
        if (!message) {
          throw new AgentBuilderError(
            'AGENT_OPERATOR_NO_RESPONSE',
            'Operator did not return a structured response',
            'I was unable to craft an answer. Please try again.',
            { agentId: agent.id, userId }
          );
        }

        messages.push(message as any);

        // P1-07: Checkpoint the accumulated messages array to Redis after every
        // LLM iteration. If the worker crashes mid-loop, a retried run can
        // restore the conversational context from this snapshot.
        this.runInBackground('operator-checkpoint-messages', async () => {
          try {
            const checkpointKey = `run:${runId}:iter:${iterations}:messages`;
            await redis.setex(checkpointKey, 3_600, JSON.stringify(messages));
          } catch {
            // non-fatal — crash recovery is best-effort
          }
        });

        const toolCalls = message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          isFinalAnswer = true;
          finalResponse = message.content || 'Done.';
          finalSuggestedActions = [];
          finalPatch = undefined;
          break;
        }

        // Check if it's the operator_response (final answer)
        const operatorResponseCall = toolCalls.find((tc: any) => tc.function.name === 'operator_response');
        if (operatorResponseCall) {
          Promise.resolve().then(async () => {
            try {
              const tokenCount = await countAgentTokens(
                messages as Array<{ role: string; content: string }>,
                operatorResponseCall.function.arguments,
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
            } catch (err) {
              // non-fatal
            }
          });

          const parsed = OperatorResponseSchema.safeParse(JSON.parse(operatorResponseCall.function.arguments));
          if (parsed.success) {
            finalResponse = parsed.data.response;
            finalSuggestedActions = parsed.data.suggestedActions.slice(0, 3);
            finalPatch = parsed.data.patch;
          } else {
            finalResponse = 'Failed to parse final response.';
          }
          isFinalAnswer = true;
          break;
        }

        // Otherwise, we have other tools to execute
        for (const tc of toolCalls) {
          onProgress?.(`Executing tool: ${tc.function.name}...`);
          toolsInvoked.push(tc.function.name); // Phase 5: observability tracking
          const toolResultStr = await step.run(`operator-tool-${runId}-${iterations}-${tc.id}`, async () => {
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
              // FLAW-08 FIX: Sanitize operator tool output the same way as the
              // Executor. Tool results come from untrusted external sources and
              // must be scrubbed for prompt-injection before entering LLM context.
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
        }
      }

      if (!isFinalAnswer) {
        finalResponse = 'Max iterations reached. Could not complete the task within the loop limit.';
      }

      // ── Phase 5: Span enrichment + metrics ───────────────────────────────
      // Emit a rich trace span so execution can be correlated in LangSmith /
      // Langfuse / Datadog / Jaeger. Fire-and-forget — never blocks response.
      const turnDurationMs = Date.now() - turnStartMs;
      this.runInBackground('operator-trace-and-metrics', async () => {
        await tracingService.traceOperation(
          'operator.executeWorkflow',
          async (span) => {
            span.setAttributes({
              'agent.id': agentId,
              'conversation.id': conversationId,
              'user.id': userId,
              'message.char_count': sanitizedMessage.length,
              'llm.iterations': iterations,
              'llm.loop_tokens_used': loopTokensUsed,
              'llm.loop_budget': loopBudget,
              'llm.budget_exhausted': loopTokensUsed > loopBudget,
              'tools.invoked': toolsInvoked.join(','),
              'tools.count': toolsInvoked.length,
              'response.char_count': finalResponse.length,
              'execution.status': isFinalAnswer ? 'converged' : 'budget_cut',
              'execution.duration_ms': turnDurationMs,
            });
          },
          { 'run.id': runId }
        );

        await agentMetricsService.recordExecution({
          agentId,
          agentType: String((agent as any).agentType || 'UNKNOWN'),
          status: isFinalAnswer ? 'SUCCESS' : 'BUDGET_CUT',
          duration: turnDurationMs,
          tokenUsage: loopTokensUsed,
          userId,
          timestamp: new Date(),
        });
      });

      const sandboxed = await this.promptSandbox.validatePrompt(finalResponse);
      let response: string;

      if (!sandboxed.valid) {
        if (sandboxed.sanitized && sandboxed.sanitized.trim().length > 0) {
          console.warn('[AgentOperator] Response had safety violations but sanitized version is usable:', sandboxed.errors);
          response = sandboxed.sanitized;
        } else {
          console.warn('[AgentOperator] Response failed safety validation, returning user-facing guidance:', sandboxed.errors);
          response = `⚠️ I wasn't able to generate a safe response for that request.\n\n**What needs to be adjusted:**\n${sandboxed.errors.map(e => `- ${e}`).join('\n')}\n\nPlease review the agent's system prompt and capabilities to ensure they don't include restricted instructions, then try again.`;
        }
      } else {
        response = sandboxed.sanitized || finalResponse;
      }
      const suggestedActions = finalSuggestedActions;
      const patch = finalPatch;

      // FLAW-03 FIX + FLAW-05 FIX + FLAW-13 FIX:
      // Wrap both config mutations in a single atomic transaction.
      // Validate the LLM patch through the field whitelist before touching the DB.
      // This prevents partial writes and LLM-injected field corruption.
      const hasMergedUpdates = Object.keys(mergedUpdates).length > 0;
      const hasPatch = patch && suggestedActions.some((action) => action.type === 'update');

      if (hasMergedUpdates || hasPatch) {
        try {
          await prisma.$transaction(async () => {
            // 1. Apply extracted config updates (already field-mapped by ConfigurationMerger)
            if (hasMergedUpdates) {
              console.log(
                '[AgentOperator] Applying merged configuration updates (atomic):',
                Object.keys(mergedUpdates)
              );
              await this.agentUpdateService.updateAgent({
                agentId,
                updates: mergedUpdates,
                userId,
              });
            }

            // 2. Apply LLM patch — STRICT whitelist: reject protected/unknown fields entirely.
            // This path is fully automatic (no HITL), so we fail hard if the LLM
            // attempts to touch identity, ownership, or activation fields.
            if (hasPatch) {
              const { sanitizedPatch } = validatePatchStrict(
                patch as Record<string, unknown>
              );

              if (Object.keys(sanitizedPatch).length > 0) {
                await this.agentUpdateService.updateAgent({
                  agentId,
                  updates: sanitizedPatch as any,
                  userId,
                });
                await auditLogger.logUpdate(agentId, {}, sanitizedPatch, { userId });
              }
            }
          });
        } catch (error) {
          // Transaction rolled back — log but do not block the chat response
          console.error(
            '[AgentOperator] Atomic config update failed (transaction rolled back):',
            error
          );
        }
      }

      // Execute agent with updated configurations (similar to agentBuilderService)
      const executeActions = suggestedActions.filter((action) => action.type === 'execute');
      if (executeActions.length > 0) {
        for (const action of executeActions) {
          try {
            await this.triggerExecution(
              agentId,
              userId,
              action.payload || {},
              {
                source: 'operator',
                conversationId,
                message: sanitizedMessage,
                label: action.label,
                appliedUpdates: Object.keys(mergedUpdates).length > 0 ? mergedUpdates : undefined,
              }
            );
          } catch (error) {
            console.error('[AgentOperator] Failed to trigger execution from operator chat:', error);
          }
        }
      }

      // Add assistant message to history
      await agentBuilderStateService.addMessageToHistory(
        conversationId,
        'assistant',
        response,
        {
          suggestedActions,
          patch,
          extractedConfig,
          automationInference,
        }
      );

      // ── Semantic memory write-back (fire-and-forget) ──────────────────────
      setImmediate(async () => {
        try {
          await sharedMemoryService.share(
            agentId,
            'experience',
            `User asked: ${sanitizedMessage.slice(0, 200)}\nAgent responded: ${response.slice(0, 400)}`,
            // P1-10: Use user-scoped shared memory key to avoid sharing
            // one user's operator transcripts with others on the same agent.
            `user:${userId}`
          );
        } catch {
          /* non-fatal */
        }
      });

      // Update conversation state
      const updatedState = await agentBuilderStateService.updateConversationState(conversationId, {
        agentDraft: refreshedState.agentDraft,
      });

      const result = {
        response,
        conversationState: updatedState,
        agentDraft: updatedState.agentDraft,
        quickActions: [],
        followups: [],
        patch,
        suggestedActions,
      };

      // CRIT-14: Cache success for idempotency
      if (idempotencyKey) {
        const idempKey = `agent_operator:idempotency:${idempotencyKey}`;
        Promise.resolve().then(async () => {
          await redis.setex(idempKey, 300, JSON.stringify(result));
        }).catch((e) => console.error(e));
      }

      await redis.setex(runKey, 3600, JSON.stringify({ status: 'completed', payload: result }));
      return result;

    } catch (e: any) {
      await redis.setex(runKey, 3600, JSON.stringify({ status: 'error', message: e.message || 'Error occurred' }));
      throw e;
    } finally {
      await this.releaseLock(processingLockKey);
    }
  }

  /**
   * Launch agent (Promote to Active)
   * Moves agent from DRAFT/BUILDING/RECONFIGURING to ACTIVE
   */
  async launchAgent(
    conversationId: string,
    userId: string
  ): Promise<{ agentId: string; agent: any }> {
    const conversationState = await agentBuilderStateService.getConversationState(conversationId);

    if (!conversationState) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_CONVERSATION_NOT_FOUND',
        `Conversation ${conversationId} not found`,
        'Conversation not found.',
        { conversationId, userId }
      );
    }

    if (conversationState.userId !== userId) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_UNAUTHORIZED',
        'Unauthorized launch request',
        'You do not have permission to launch this agent.',
        { conversationId, userId }
      );
    }

    const draft = conversationState.agentDraft;

    // Validate Readiness
    const requiredFields = ['name', 'systemPrompt'];
    const missing = requiredFields.filter(field => !draft[field as keyof AgentDraft]);

    if (missing.length > 0) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_INCOMPLETE_CONFIG',
        'Incomplete configuration',
        `Cannot launch agent. Missing required fields: ${missing.join(', ')}`,
        { conversationId, missing }
      );
    }

    // Update draft status
    draft.status = 'ready';

    // Find the agent linked to conversation
    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { aiAgent: true }
    });

    if (!conversation?.aiAgent) {
      throw new Error('Agent not found for this conversation');
    }

    // Use AgentUpdateService to apply the final draft
    // Reconstruct update request from draft
    const updateRequest: AgentUpdateRequest = {
      agentId: conversation.aiAgent.id,
      userId,
      updates: {
        name: draft.name,
        description: draft.description || undefined,
        systemPrompt: draft.systemPrompt || undefined,
        status: 'ACTIVE', // FORCE ACTIVE
        capabilities: draft.capabilities || undefined,
        constraints: draft.constraints || undefined,
      }
    };

    await this.agentUpdateService.updateAgent(updateRequest);

    return { agentId: conversation.aiAgent.id, agent: conversation.aiAgent };
  }

  async applySuggestedChanges(
    agentId: string,
    userId: string,
    patch: Record<string, any>
  ) {
    await this.assertAgentAccess(agentId, userId, true);
    // FLAW-05 + FLAW-13 FIX: Strict whitelist for HITL endpoint as well.
    // Even with human-in-the-loop, we never allow LLM-suggested patches to
    // modify identity or activation fields (systemPrompt, id, userId, status, etc.).
    const { sanitizedPatch } = validatePatchStrict(patch);

    if (Object.keys(sanitizedPatch).length === 0) {
      console.warn(
        '[AgentOperator] applySuggestedChanges: patch had no allowed fields after whitelist — skipping DB write.',
        { agentId, userId }
      );
      return null;
    }

    const updateResult = await this.agentUpdateService.updateAgent({
      agentId,
      updates: sanitizedPatch as any,
      userId,
    });
    await auditLogger.logUpdate(agentId, {}, sanitizedPatch, { userId });
    return updateResult;
  }

  /** Trigger an execution for the agent */
  async triggerExecution(agentId: string, userId: string, inputData: any = {}, executionContext: any = {}) {
    const agent = await this.assertAgentAccess(agentId, userId, true);
    if (!agent.isActive) {
      throw new AgentBuilderError(
        'AGENT_OPERATOR_INACTIVE',
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
      console.error('[AgentOperator] Failed to send event to Inngest:', inngestError);

      // Provide more helpful logs in development
      if (process.env.NODE_ENV === 'development') {
        if (inngestError.message?.includes('401') || inngestError.message?.includes('key unknown')) {
          console.warn('[AgentOperator] 💡 TIP: Inngest 401/403 errors are usually caused by a missing or invalid INNGEST_EVENT_KEY in .env. For local development, set INNGEST_EVENT_KEY=local and run the Inngest Dev Server (npx inngest-cli dev).');
        } else if (inngestError.code === 'ECONNREFUSED') {
          console.warn('[AgentOperator] 💡 TIP: Connection refused to Inngest. Is the Inngest Dev Server running? Start it with: npx inngest-cli dev');
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

export const agentOperatorService = new AgentOperatorService({
  permissionService: new PermissionService(),
  promptSandbox: new PromptSandbox(),
  tokenBudgetManager: new TokenBudgetManager(),
  agentUpdateService: new AgentUpdateService(),
  entityScopeInferrer: new EntityScopeInferrer(),
  configurationExtractor: new ConfigurationExtractor(),
  configurationMerger: new ConfigurationMerger(),
  automationInferrer: new AutomationInferrer(),
  inputSanitizer: new InputSanitizer(),
  responseCache: new ResponseCache(),
  skillInferenceService: skillInferenceService,
  toolInvocationGate: new ToolInvocationGate(new GuardrailService(new CorePermissionService())),
  toolDiscoveryService: new ToolDiscoveryService(),
});
