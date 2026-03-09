import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { agentBuilderContextService, UserContext } from '../state/agentBuilderContextService';
import {
  agentBuilderStateService,
  ConversationState,
  AgentDraft,
  ConversationStage,
} from '../state/agentBuilderStateService';
import { agentBuilderPromptService } from '../prompts/agentBuilderPromptService';
import { agentBuilderEntityService } from '../context/agentBuilderEntityService';
import { quickActionGenerator, QuickAction } from '../generation/agentBuilderQuickActions';
import { AI_BUILDER_FLOW_GUIDE } from '../instructions/aiBuilderFlowGuide';
import { type Tool, AgentTriggerType, AutomationTriggerType, TriggerType, AgentType } from '../types/types';
import { AGENT_CONSTANTS } from '../constants/agentConstants';
import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { SemanticSafetyEvaluator } from '../safety/semanticSafetyEvaluator';
import { GraphOrchestrator } from '../orchestration/graphOrchestrator';
import { SimulationService, SimulationResult } from '../simulation/simulationService';
import { z } from 'zod';
import { redis } from '@/lib/redis';
import { randomBytes } from 'crypto';
import { ConfigurationValidator } from '../validation/configurationValidator';
import { extractJson } from '@/utils/ai/jsonParsing';
import {
  SafetyEvaluator,
  PolicyEngine,
  CapabilityWhitelist,
  ToolAccessController,
} from '../safety/safetyEvaluator';
import { PromptSandbox } from '../safety/promptSandbox';
import { CircuitBreaker, CircuitBreakerError, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { AgentVersionControl, ConflictResolver, OptimisticLockManager } from '../versioning/agentVersionControl';
import { AuditLogger } from '../audit/auditLogger';
import { ResponseCache } from '../cache/responseCache';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { ConfigurationExtractor } from '../extraction/configurationExtractor';
import { extractFollowupsFromText } from '../extraction/followupExtractor';
import { AutomationInferrer } from '../inference/automationInferrer';
import { IntentInferenceService, intentInferenceService } from '../inference/intentInferenceService';
import { PromptGenerator } from '../generation/promptGenerator';
import { ConfigurationMerger } from '../extraction/configurationMerger';
import { StageOrchestrator, type StageReadinessAssessment } from '../orchestration/stageOrchestrator';
import { InputSanitizer } from '../safety/inputSanitizer';
import { PermissionService } from '../safety/permissionService';
// FLAW-01 FIX: FSM — prevents LLM from jumping to illegal stage transitions
import { safeTransition, assertTransition, IllegalStateTransitionError } from '../fsm/agentFSM';
// FLAW-07 FIX: Event store — wires up existing AgentEvent schema to persistent storage
import {
  emitRunInit,
  emitStepExecuted,
  emitRunCompleted,
  emitRunFailed,
} from '../execution/agentEventStore';
import { EntityScopeInferrer } from '../context/entityScopeInferrer';
import { ISafetyEvaluator, IStageOrchestrator } from '../di/interfaces';
import {
  InferredEntityScopeSchema,
  ExtractedConfigurationSchema,
  FollowupResponseSchema,
  StageReadinessSchema,
  type InferredAutomation,
  type ExtractedConfiguration,
} from '../types/schemas';
import { prisma } from '@/lib/prisma';
import { tracingService } from '@/services/agents/monitoring/tracing';
import { eventBus, AGENT_EVENTS } from '@/services/agents/core/eventBus';

export class AgentBuilderError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AgentBuilderError';
  }
}

export interface AgentBuilderDependencies {
  validator: ConfigurationValidator;
  safetyEvaluator: ISafetyEvaluator;
  policyEngine: PolicyEngine;
  capabilityWhitelist: CapabilityWhitelist;
  toolAccessController: ToolAccessController;
  promptSandbox: PromptSandbox;
  versionControl: AgentVersionControl;
  conflictResolver: ConflictResolver;
  lockManager: OptimisticLockManager;
  auditLogger: AuditLogger;
  responseCache: ResponseCache;
  tokenBudgetManager: TokenBudgetManager;
  configurationExtractor: ConfigurationExtractor;
  automationInferrer: AutomationInferrer;
  promptGenerator: PromptGenerator;
  configurationMerger: ConfigurationMerger;
  inputSanitizer: InputSanitizer;
  permissionService: PermissionService;
  entityScopeInferrer: EntityScopeInferrer;
  stageOrchestrator: IStageOrchestrator;
  simulationService: SimulationService;
  intentInferenceService: IntentInferenceService;
}

export class AgentBuilderService {
  // Lock timeout in seconds (1 minute - reduced from 5 for better responsiveness)
  private readonly LOCK_TIMEOUT = AGENT_CONSTANTS.LOCK_TIMEOUT;
  private readonly LOCK_KEY_PREFIX = 'agent_builder:lock:';

  // Service instances
  private readonly validator: ConfigurationValidator;
  private readonly safetyEvaluator: ISafetyEvaluator;
  private readonly policyEngine: PolicyEngine;
  private readonly capabilityWhitelist: CapabilityWhitelist;
  private readonly toolAccessController: ToolAccessController;
  private readonly promptSandbox: PromptSandbox;

  // Quality guardrails are centralised in AGENT_CONSTANTS to avoid duplication.
  private get QUALITY_GUARDRAILS(): string {
    return AGENT_CONSTANTS.PROMPTS.QUALITY_GUARDRAILS;
  }
  private readonly retryHandler = new RetryHandler();
  private readonly errorClassifier = new ErrorClassifier();
  private readonly versionControl: AgentVersionControl;
  private readonly conflictResolver: ConflictResolver;
  private readonly lockManager: OptimisticLockManager;
  private readonly auditLogger: AuditLogger;
  private readonly responseCache: ResponseCache;
  private readonly tokenBudgetManager: TokenBudgetManager;
  private readonly configurationExtractor: ConfigurationExtractor;
  private readonly automationInferrer: AutomationInferrer;
  private readonly promptGenerator: PromptGenerator;
  private readonly configurationMerger: ConfigurationMerger;
  private readonly inputSanitizer: InputSanitizer;
  private readonly permissionService: PermissionService;
  private readonly entityScopeInferrer: EntityScopeInferrer;
  private readonly stageOrchestrator: IStageOrchestrator;
  private readonly simulationService: SimulationService;
  private readonly intentInferenceService: IntentInferenceService;

  /**
   * Infer the user's intent from their message relative to the Builder context
   */
  // Method `inferUserIntent` replaced by `intentInferenceService.inferBuilderIntent`

  // ** Stage requirements with detailed criteria**
  /**
   * Run a simulation of the current draft
   */
  async simulateAgent(draft: any, userMessage: string): Promise<SimulationResult> {
    return this.simulationService.simulateExecution(draft, userMessage);
  }

  // Stage requirements with detailed criteria
  private readonly STAGE_REQUIREMENTS: Record<ConversationStage, {
    required: string[];
    recommended: string[];
    critical: string[];
  }> = {
      initialization: {
        required: [],
        recommended: [],
        critical: [],
      },
      configuration: {
        required: [],
        recommended: [],
        critical: [],
      },
      launch: {
        required: ['name', 'systemPrompt'],
        recommended: ['description', 'capabilities'],
        critical: ['name', 'systemPrompt'],
      },
    };

  /**
   * Run a background task without blocking the caller.
   * Errors are logged but never propagated, making it safe for fire-and-forget use cases
   * such as DB persistence, metrics, audit logging, and event publishing.
   */
  private runInBackground(label: string, fn: () => Promise<void>): void {
    (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[AgentBuilder] Background task "${label}" failed:`, err);
        // P2-12: Dead Letter Queue via Inngest for builder background work.
        try {
          const { inngest } = await import('@/lib/inngest');
          await inngest.send({
            name: 'agent/background.failed',
            data: {
              label,
              error: err instanceof Error ? err.message : String(err),
              service: 'builder',
              occurredAt: new Date().toISOString(),
            },
          });
        } catch (dlqErr) {
          console.error('[AgentBuilder] Failed to enqueue background DLQ task:', dlqErr);
        }
      }
    })();
  }

  constructor(deps: AgentBuilderDependencies) {
    this.validator = deps.validator;
    this.safetyEvaluator = deps.safetyEvaluator;
    this.policyEngine = deps.policyEngine;
    this.capabilityWhitelist = deps.capabilityWhitelist;
    this.toolAccessController = deps.toolAccessController;
    this.promptSandbox = deps.promptSandbox;
    this.versionControl = deps.versionControl;
    this.conflictResolver = deps.conflictResolver;
    this.lockManager = deps.lockManager;
    this.auditLogger = deps.auditLogger;
    this.responseCache = deps.responseCache;
    this.tokenBudgetManager = deps.tokenBudgetManager;
    this.configurationExtractor = deps.configurationExtractor;
    this.automationInferrer = deps.automationInferrer;
    this.promptGenerator = deps.promptGenerator;
    this.configurationMerger = deps.configurationMerger;
    this.inputSanitizer = deps.inputSanitizer;
    this.permissionService = deps.permissionService;
    this.entityScopeInferrer = deps.entityScopeInferrer;
    this.stageOrchestrator = deps.stageOrchestrator;
    this.simulationService = deps.simulationService;
    this.intentInferenceService = deps.intentInferenceService;
  }

  /**
   * Generate a unique ID (simple implementation)
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Async entrypoint for Builder messages (Inngest-style).
   * Mirrors Executor/Operator: enqueue an Inngest event and return a runId.
   */
  async processMessageAsync(
    conversationId: string,
    message: string,
    userId: string,
    idempotencyKey?: string
  ): Promise<{ runId: string }> {
    const runId = this.generateId();

    // Fire-and-forget durable workflow via Inngest. The Inngest handler is
    // responsible for writing run status to Redis under agent_run:{runId}.
    const { inngest } = await import('@/lib/inngest');
    await inngest.send({
      name: 'agent/builder.requested',
      data: {
        runId,
        conversationId,
        message,
        userId,
        idempotencyKey,
      },
    });

    return { runId };
  }

  /**
   * Run an OpenAI chat completion with circuit breaker, retry, and classified error handling.
   *
   * FIXES applied:
   * 1. Per-operation CircuitBreakers — the old single `this.circuitBreaker` was shared
   *    across ALL operations (welcome, response, verification, metrics). One failing
   *    operation tripped the breaker for everything. Now each operation has its own
   *    breaker instance stored in a Map, so failures are isolated.
   *
   * 2. Inverted CB/retry nesting — CircuitBreaker now wraps RetryHandler.
   *    The old nesting (RetryHandler → CB.execute) caused every retry attempt to
   *    throw "Circuit breaker is OPEN" when the breaker was open, each throw
   *    incrementing the failure counter and keeping the breaker permanently open.
   *
   * 3. stream: false — added to every create() call so TypeScript resolves the
   *    return type to ChatCompletion (not the union with Stream<ChatCompletionChunk>),
   *    eliminating the "Property 'choices' does not exist" TS2339 error.
   *
   * 4. CircuitBreakerError is never retried — retrying against an open breaker is
   *    pointless and destructive (each attempt immediately throws and counts as
   *    another failure).
   */
  // CRIT-07 (service-level): LRU eviction for operationCircuitBreakers — prevents
  // unbounded Map growth when many distinct operation keys accumulate over time.
  private readonly operationCircuitBreakers = (() => {
    const MAX = 20;
    const map = new Map<string, CircuitBreaker>();
    return {
      has: (k: string) => map.has(k),
      get: (k: string): CircuitBreaker | undefined => {
        const v = map.get(k);
        if (v) { map.delete(k); map.set(k, v); }
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

  private async runCompletionWithResilience(
    request: any,
    context: { operation: string; conversationId?: string; userId?: string }
  ): Promise<any> {
    const cb = this.getOperationCircuitBreaker(context.operation);

    // Pre-flight: skip entirely if breaker is already open — avoids retry storm
    if (cb.isOpen()) {
      const errorId = this.generateId();
      throw new AgentBuilderError(
        'AGENT_BUILDER_COMPLETION_FAILED',
        `Circuit breaker OPEN for operation ${context.operation}`,
        'Service is temporarily unavailable. Please try again in a moment.',
        { ...context, errorId }
      );
    }

    try {
      // Correct nesting: CB wraps RetryHandler.
      // RetryHandler retries transient errors (429, 5xx, network).
      // CB counts only the final outcome — not each individual retry attempt.
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
      const errorId = this.generateId();

      if (!isCircuitOpen) {
        console.error('[AgentBuilder] LLM call failed', {
          errorId,
          operation: context.operation,
          conversationId: context.conversationId,
          userId: context.userId,
          classification,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        console.warn('[AgentBuilder] Circuit breaker opened during call', {
          operation: context.operation,
          conversationId: context.conversationId,
        });
      }

      throw new AgentBuilderError(
        'AGENT_BUILDER_COMPLETION_FAILED',
        `LLM call failed for operation ${context.operation}: ${classification.type}`,
        'I had trouble processing this step. Please try again in a moment.',
        { ...context, errorId, classification }
      );
    }
  }

  /**
   * Verify and, if necessary, repair the user-facing response for clarity, safety, and consistency.
   * Uses a lightweight LLM pass (gpt-4o-mini, temp=0); non-blocking fallback to original on any failure.
   *
   * Circuit breaker: if the verification model is degraded (3+ consecutive failures within 30s),
   * the CB opens and ALL subsequent calls fall through immediately without any LLM call.
   * This prevents a QA-pass failure from cascading into degraded primary response quality.
   */
  private async verifyBuilderOutput(
    response: string,
    followups: Array<{ id: string; label: string }>,
    context: {
      stage: ConversationStage;
      readiness?: StageReadinessAssessment | null;
      extractedConfig?: ExtractedConfiguration;
    }
  ): Promise<{ response: string; followups: Array<{ id: string; label: string }> }> {
    // Dedicated CB for this operation — isolated from primary builder CB.
    const cb = this.getOperationCircuitBreaker('builder_response_verification');

    if (cb.isOpen()) {
      // CB is open: verifier model is degraded. Skip quietly, return original.
      console.warn('[AgentBuilder] verifyBuilderOutput circuit breaker OPEN — skipping verification pass.');
      return { response, followups };
    }

    try {
      const verifyMessages = [
        {
          role: 'system' as const,
          content:
            'You are a QA guardrail. Validate the assistant response for clarity, factuality, safety, and conciseness. Fix minor issues. If acceptable, return pass.',
        },
        {
          role: 'user' as const,
          content: JSON.stringify({
            response,
            followups,
            stage: context.stage,
            readiness: context.readiness,
            extractedConfig: context.extractedConfig,
          }),
        },
      ];

      const verification = await cb.execute(() =>
        this.runCompletionWithResilience(
          {
            model: 'gpt-4o-mini',
            messages: verifyMessages,
            temperature: 0,
            max_tokens: 300,
          },
          { operation: 'builder_response_verification' }
        )
      );

      const content = verification.choices?.[0]?.message?.content;
      if (!content) return { response, followups };

      // Expected minimal JSON: { status: "pass"|"fail", fixedResponse?: string, fixedFollowups?: [{id,label}], issues?: string[] }
      try {
        const parsed = extractJson(content);
        if (parsed.status === 'pass') {
          return { response, followups };
        }
        const fixedResponse = typeof parsed.fixedResponse === 'string' && parsed.fixedResponse.trim().length > 0
          ? parsed.fixedResponse
          : response;
        const fixedFollowups = Array.isArray(parsed.fixedFollowups)
          ? parsed.fixedFollowups
            .filter((f: any) => f && typeof f.id === 'string' && typeof f.label === 'string')
            .slice(0, 4)
          : followups;
        return { response: fixedResponse, followups: fixedFollowups };
      } catch {
        // Parsing failed — keep original
        return { response, followups };
      }
    } catch (error) {
      // CB will record this failure; after threshold, CB opens and future calls skip.
      console.error('[AgentBuilder] Response verification failed:', error);
      return { response, followups };
    }
  }

  async initializeConversation(
    userId: string,
    conversationId?: string,
    agentId?: string,
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
    // FLAW-09 FIX: recursion depth guard — prevents stack overflow when the
    // conversation lookup and re-delegation recurse more than once.
    if (_depth > 2) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_INIT_RECURSION',
        `initializeConversation exceeded max recursion depth (depth=${_depth})`,
        'Failed to initialize conversation. Please try again.',
        { userId, agentId, conversationId }
      );
    }
    // Fetch user context
    const userContext = await agentBuilderContextService.fetchUserContext(userId);

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
          console.log(`[AgentBuilder] Conversation ${conversationId} is already being initialized, waiting for other request to finish`);
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
        console.log(`[AgentBuilder] Loading existing conversation: ${conversationId}`);
        const existingState = await agentBuilderStateService.getConversationState(conversationId);
        if (!existingState) {
          throw new AgentBuilderError(
            'AGENT_BUILDER_CONVERSATION_NOT_FOUND',
            `Conversation ${conversationId} not found`,
            'This conversation could not be found. Please start a new conversation.',
            { conversationId, userId }
          );
        }
        if (existingState.userId !== userId) {
          throw new AgentBuilderError(
            'AGENT_BUILDER_UNAUTHORIZED',
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

        if (!hasMessages && !skipWelcome) {  // Only add welcome if not skipping
          console.log(`[AgentBuilder] Conversation ${conversationId} is empty, generating welcome message`);

          // Generate welcome message for empty existing conversation
          const { welcomeMessage, followups } = await this.generateWelcomeMessage(userContext, userId);

          // Add welcome message to history with follow-ups in metadata
          await agentBuilderStateService.addMessageToHistory(
            conversationState.conversationId,
            'assistant',
            welcomeMessage,
            followups.length > 0 ? { followups } : undefined
          );

          // Update stage to configuration
          await agentBuilderStateService.updateStage(conversationId, 'configuration');

          // Refresh conversation state to get updated history with welcome message and stage
          const refreshedState = await agentBuilderStateService.getConversationState(conversationId);
          if (!refreshedState) {
            throw new AgentBuilderError(
              'AGENT_BUILDER_STATE_REFRESH_FAILED',
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
            followups,
          };
        }

        // Conversation has messages - load existing conversation without new welcome
        console.log(`[AgentBuilder] Successfully loaded existing conversation: ${conversationId}, stage: ${conversationState.stage}, messages: ${conversationState.conversationHistory.length}`);

        // Only re-seed to LAUNCH if the agent was explicitly activated.
        // Conversations can reach stage='launch' during the approval flow without the
        // agent being fully launched — don't trap the user in LAUNCH on reload.
        const conv = await prisma.aiConversation.findUnique({
          where: { id: conversationId },
          select: { aiAgent: { select: { status: true } } },
        });
        const agentIsActive = conv?.aiAgent?.status === 'ACTIVE';

        if (agentIsActive && this.stageOrchestrator.setGraphNode) {
          try {
            await this.stageOrchestrator.setGraphNode(conversationId, 'LAUNCH');
            console.log(`[AgentBuilder] Re-seeded graph node to LAUNCH for active agent ${conversationId}`);
          } catch { /* non-fatal */ }
        } else if (conversationState.stage === 'launch' && !agentIsActive) {
          // Agent reached approval flow but wasn't launched — reset to APPROVAL so
          // the user sees the confirmation screen again instead of jumping to LAUNCH.
          if (this.stageOrchestrator.setGraphNode) {
            await this.stageOrchestrator.setGraphNode(conversationId, 'APPROVAL').catch(() => { });
          }
          await agentBuilderStateService.updateStage(conversationId, 'launch'); // keep UI stage
        }

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

    // If agentId provided but no conversationId, check if agent has conversations
    if (agentId && !conversationId) {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        include: { conversations: { where: { conversationType: 'AGENT_BUILDER' }, orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (agent?.conversations?.[0]) {
        // Agent has existing conversation - recursively call with depth guard
        console.log(
          `[AgentBuilder] Agent ${agentId} has existing conversation ${agent.conversations[0].id}, loading it`
        );
        return this.initializeConversation(
          userId,
          agent.conversations[0].id,
          agentId,
          skipWelcome,
          _depth + 1
        );
      }
    }

    // Create new conversation state
    console.log(`[AgentBuilder] Creating new conversation${agentId ? ` for agent ${agentId}` : ''}`);
    conversationState = await agentBuilderStateService.createConversationState(
      userId,
      agentId,
      'AGENT_BUILDER'
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
        console.log(`[AgentBuilder] New conversation ${conversationState.conversationId} is already being welcome-initialized, waiting...`);
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
        console.log(`[AgentBuilder] Messages already exist for new conversation ${conversationState.conversationId}`);
        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (!refreshedState) {
          throw new AgentBuilderError(
            'AGENT_BUILDER_STATE_REFRESH_FAILED',
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
        const { welcomeMessage, followups } = await this.generateWelcomeMessage(userContext, userId);

        await agentBuilderStateService.addMessageToHistory(
          conversationState.conversationId,
          'assistant',
          welcomeMessage,
          followups.length > 0 ? { followups } : undefined
        );

        // Update stage to configuration
        await agentBuilderStateService.updateStage(conversationState.conversationId, 'configuration');

        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);
        if (!refreshedState) {
          throw new AgentBuilderError(
            'AGENT_BUILDER_STATE_REFRESH_FAILED',
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
          followups,
        };
      } else {
        // Update stage to configuration even if skipping welcome
        await agentBuilderStateService.updateStage(conversationState.conversationId, 'configuration');

        const refreshedState = await agentBuilderStateService.getConversationState(conversationState.conversationId);

        // Skip welcome - return empty conversation state
        return {
          conversationId: conversationState.conversationId,
          conversationState: refreshedState || conversationState,
          userContext,
          welcomeMessage: '',
          quickActions: [],
          followups: [],
        };
      }
    } finally {
      if (newLockAcquired) {
        await this.releaseLock(newLockKey);
      }
    }
  }

  // Extract welcome message generation to separate method
  private async generateWelcomeMessage(
    userContext: UserContext,
    userId: string
  ): Promise<{ welcomeMessage: string; followups: Array<{ id: string; label: string }> }> {
    const welcomePrompt = agentBuilderPromptService.buildWelcomePrompt(userContext);

    // Single shared messages array used for both token estimation AND the actual API call
    const systemContent = `You are the Agentflox Agent Builder AI. Generate a personalized welcome message based on the user's workspace context. Include numbered options (1, 2, 3, etc.) for automation types. Be conversational and friendly.

=== AI BUILDER FLOW GUIDE (REFERENCE) ===
${AI_BUILDER_FLOW_GUIDE}
=== END OF FLOW GUIDE ===

Follow the flow guide principles: AI-generated messages, numbered options, dynamic follow-ups, context-aware.`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemContent },
      { role: 'user', content: welcomePrompt },
    ];

    // Fetch model for token tracking
    const model = await fetchModel();

    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 500; // Add buffer for response

    // Check token limit
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_INSUFFICIENT_TOKENS',
        `Insufficient tokens: ${tokenCheck.remaining} remaining, need ${estimatedTokens}`,
        `You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase more tokens.`,
        { userId, remaining: tokenCheck.remaining, required: estimatedTokens }
      );
    }

    // Re-use the shared messages array (no duplication)
    const welcomeCompletion = await this.runCompletionWithResilience(
      {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 5000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_response_with_followups',
              description: 'Generate welcome message and follow-up options',
              parameters: {
                type: 'object',
                properties: {
                  response: { type: 'string', description: 'The welcome message' },
                  followups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                      },
                      required: ['id', 'label'],
                    },
                  },
                },
                required: ['response', 'followups'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_response_with_followups' } },
      },
      { operation: 'generate_welcome_message', userId }
    );

    let welcomeMessage = agentBuilderPromptService.buildWelcomeMessage(userContext); // Fallback
    let followups: Array<{ id: string; label: string }> = [];

    const toolCall = welcomeCompletion.choices[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function.name === 'generate_response_with_followups') {
      try {
        const rawParsed = extractJson(toolCall.function.arguments);
        const validated = FollowupResponseSchema.parse(rawParsed);
        welcomeMessage = validated.response || welcomeMessage;
        followups = validated.followups || [];
      } catch (error) {
        console.error('[AgentBuilder] Failed to parse/validate welcome follow-ups:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          rawArgs: toolCall?.function?.arguments?.substring(0, 200),
        });
        // Fallback: extract from text response
        followups = extractFollowupsFromText(welcomeMessage);
      }
    } else {
      // No tool call or wrong function - use text response
      const textResponse = welcomeCompletion.choices[0]?.message?.content;
      if (textResponse) {
        welcomeMessage = textResponse;
      }
      followups = extractFollowupsFromText(welcomeMessage);
    }

    // Count actual tokens and update usage — run in background, non-blocking
    const welcomeResponseContent = welcomeCompletion.choices[0]?.message?.content || welcomeMessage;
    this.runInBackground('token-usage-tracking-welcome', async () => {
      const tokenCount = await countAgentTokens(
        messages as Array<{ role: string; content: string }>,
        welcomeResponseContent,
        model.name,
        welcomeCompletion.usage as any
      );

      // Get user info for usage tracking
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

    return { welcomeMessage, followups };
  }

  /**
   * Check if agent is ready to launch
   * Note: Triggers are always set to defaults automatically, so we don't check for them
   */
  private isAgentReady(draft: AgentDraft): boolean {
    const requiredFields = this.STAGE_REQUIREMENTS.launch.required;

    console.log('[AgentBuilder] isAgentReady check:', {
      name: !!draft.name,
      systemPrompt: !!draft.systemPrompt,
      tools: draft.tools?.length,
      skills: draft.skills?.length,
      description: !!draft.description,
      capabilities: draft.capabilities?.length,
      requiredFields: this.STAGE_REQUIREMENTS.launch.required,
    });

    for (const field of requiredFields) {
      const val = draft[field as keyof AgentDraft];
      if (!val) return false;
      if (Array.isArray(val) && val.length === 0) return false;
    }
    return true;
  }

  /**
   * Acquire a lock for a conversation to prevent concurrent processing
   */
  private async acquireLock(conversationId: string): Promise<boolean> {
    const lockKey = `${this.LOCK_KEY_PREFIX}${conversationId}`;
    try {
      const result = await redis.set(lockKey, '1', 'EX', this.LOCK_TIMEOUT, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`[AgentBuilder] Failed to acquire lock for ${conversationId}:`, error);
      // Hardening: Fail-Closed execution if Redis is down (critical for consistency)
      // We cannot guarantee exclusive access, so we must abort.
      return false;
    }
  }

  /**
   * Release a lock for a conversation
   */
  private async releaseLock(conversationId: string): Promise<void> {
    const lockKey = `${this.LOCK_KEY_PREFIX}${conversationId}`;
    try {
      await redis.del(lockKey);
    } catch (error) {
      console.error(`[AgentBuilder] Failed to release lock for ${conversationId}:`, error);
      // Don't throw - lock will expire anyway
    }
  }

  /**
   * Process message with intelligent trigger inference.
   *
   * @param onProgress    - Optional callback receiving thinking step labels + graph node.
   * @param onToken       - Optional callback receiving each streamed LLM response token.
   * @param idempotencyKey - Optional client-generated key (UUID/hash). When provided, a
   *                         successful response is cached in Redis for 5 minutes. Retried
   *                         requests with the same key return the cached response immediately,
   *                         preventing duplicate messages, DB records, and double token billing.
   */
  async processMessage(
    conversationId: string,
    message: string,
    userId: string,
    onProgress?: (step: string, node?: string) => void,
    onToken?: (text: string) => void,
    idempotencyKey?: string
  ): Promise<{
    response: string;
    conversationState: ConversationState;
    agentDraft: AgentDraft;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
    actions?: Array<{ id: string; label: string; variant: string }>;
  }> {
    // CRIT-14: Idempotency check — return cached result for retried requests.
    if (idempotencyKey) {
      const idempKey = `agent_builder:idempotency:${idempotencyKey}`;
      try {
        const cached = await redis.get(idempKey);
        if (cached) {
          console.log(`[AgentBuilder] Idempotency hit for key=${idempotencyKey} — returning cached result.`);
          return JSON.parse(cached);
        }
      } catch { /* non-fatal cache miss */ }
    }

    const startTime = Date.now();
    return await tracingService.traceOperation(
      'processMessage',
      async (span) => {
        span.setAttributes({
          'conversation.id': conversationId,
          'user.id': userId,
          'message.length': message.length,
        });
        const result = await this.processMessageInternal(conversationId, message, userId, startTime, span, onProgress, onToken);

        // Cache the result under the idempotency key so retries return it immediately.
        if (idempotencyKey) {
          const idempKey = `agent_builder:idempotency:${idempotencyKey}`;
          // Fire-and-forget — a cache failure should never break the response.
          this.runInBackground('idempotency-cache', async () => {
            await redis.setex(idempKey, 300, JSON.stringify(result));
          });
        }

        return result;
      }
    );
  }

  /**
   * Internal implementation of processMessage (wrapped by tracing)
   */
  private async processMessageInternal(
    conversationId: string,
    message: string,
    userId: string,
    startTime: number,
    span: any,
    onProgress?: (step: string, node?: string) => void,
    onToken?: (text: string) => void
  ): Promise<{
    response: string;
    conversationState: ConversationState;
    agentDraft: AgentDraft;
    quickActions: QuickAction[];
    followups?: Array<{ id: string; label: string }>;
    actions?: Array<{ id: string; label: string; variant: string }>;
  }> {
    const emit = (step: string, node?: string) => onProgress?.(step, node);
    // Pre-validation (deterministic, before AI processing)
    const preValidation = this.validator.preValidate(message);
    if (!preValidation.valid) {
      throw new AgentBuilderError(
        'INVALID_INPUT',
        preValidation.errors.join(', '),
        'Please check your input and try again.',
        { conversationId, userId, errors: preValidation.errors, warnings: preValidation.warnings }
      );
    }

    // Rate limiting — atomic pipeline (INCR + EXPIRE in one round-trip).
    // Using a pipeline prevents the race condition where two concurrent requests
    // both read count=19, both increment to 20, and both slip through the limit.
    try {
      const rateLimitKey = `agent_builder:rate_limit:${userId}`;

      // Atomically increment and (re-)set the expiry in a single pipeline flush.
      const pipe = redis.pipeline();
      pipe.incr(rateLimitKey);
      pipe.expire(rateLimitKey, AGENT_CONSTANTS.RATE_LIMIT_WINDOW, 'NX'); // NX: only set if key is new
      const pipeResults = await pipe.exec();
      if (!pipeResults) throw new Error('Redis rate limit pipeline failed');
      const [incrErr, newCount] = pipeResults[0] as [Error | null, number];

      if (incrErr) throw incrErr;

      if ((newCount as number) > AGENT_CONSTANTS.RATE_LIMIT_MAX_REQUESTS) {
        const ttl = await redis.ttl(rateLimitKey);
        throw new AgentBuilderError(
          AGENT_CONSTANTS.ERRORS.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          `Too many requests. Please wait ${ttl > 0 ? ttl : AGENT_CONSTANTS.RATE_LIMIT_WINDOW} seconds.`,
          { conversationId, userId, limit: AGENT_CONSTANTS.RATE_LIMIT_MAX_REQUESTS, remaining: 0 }
        );
      }
    } catch (error) {
      if (error instanceof AgentBuilderError) throw error;
      // Fail-Closed: if Redis is down we cannot enforce rate limits — abort.
      console.error('[AgentBuilder] Rate limit pipeline failed (Redis error):', error);
      throw new AgentBuilderError(
        'SYSTEM_UNAVAILABLE',
        'Rate limit check failed — system unavailable',
        'Our system is currently experiencing high load. Please try again in a moment.',
        { conversationId, userId }
      );
    }

    // Sanitize user input to prevent prompt injection
    const sanitizedMessage = this.inputSanitizer.sanitize(message);

    // Acquire lock to prevent concurrent processing
    const lockAcquired = await this.acquireLock(conversationId);
    if (!lockAcquired) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_CONVERSATION_LOCKED',
        `Conversation ${conversationId} is being processed by another request (or system lock unavailable)`,
        'This conversation is currently being processed. Please wait a moment and try again.',
        { conversationId, userId }
      );
    }

    try {
      // Get conversation state
      const conversationState =
        await agentBuilderStateService.getConversationState(conversationId);

      if (!conversationState) {
        throw new AgentBuilderError(
          'AGENT_BUILDER_CONVERSATION_NOT_FOUND',
          `Conversation ${conversationId} not found`,
          'This conversation could not be found. Please start a new conversation.',
          { conversationId, userId }
        );
      }

      // Verify user owns this conversation
      if (conversationState.userId !== userId) {
        throw new AgentBuilderError(
          'AGENT_BUILDER_UNAUTHORIZED',
          `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
          'You do not have access to this conversation.',
          { conversationId, userId }
        );
      }

      // ─── Step 1: context load ──────────────────────────────────────────────────
      // Emit before the async work so the UI shows the step immediately.
      const turnCount = conversationState.conversationHistory.length;
      emit(`Loading workspace context… (turn ${turnCount + 1})`, undefined);
      const userContext = await agentBuilderContextService.fetchUserContext(userId);


      // ─── Step 2: intent inference ─────────────────────────────────────────────
      emit('Analysing your intent…', undefined);
      const { intent } = await this.intentInferenceService.inferBuilderIntent(sanitizedMessage, conversationState.conversationHistory);
      // Emit again now that we know the intent so the label is specific
      const intentLabel: Record<string, string> = {
        [AGENT_CONSTANTS.INTENT.BUILDER.BUILD_OR_MODIFY]: 'build / modify',
        [AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT]: 'launch agent',
        [AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION]: 'execute action',
        [AGENT_CONSTANTS.INTENT.BUILDER.INFO_OR_QA]: 'question / info',
      };
      emit(`Intent · ${intentLabel[intent] ?? intent}`, undefined);

      // Handle EXECUTE_ACTION - "Wrong Context" Guardrail
      if (intent === AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION) {
        const wrongContextResponse = AGENT_CONSTANTS.PROMPTS.WRONG_CONTEXT_EXECUTION
          .replace('{ROLE}', 'Builder')
          .replace('{VIEW_NAME}', 'Builder')
          .replace('{PURPOSE}', 'creating and configuring agents')
          .replace('{MESSAGE}', sanitizedMessage)
          .replace('{ALLOWED_ACTIONS}', 'configuring capabilities, defining triggers, or setting up tools');

        // Add to history so it flows naturally
        await agentBuilderStateService.addMessageToHistory(conversationId, 'user', sanitizedMessage);
        await agentBuilderStateService.addMessageToHistory(conversationId, 'assistant', wrongContextResponse);

        const refreshedState = await agentBuilderStateService.getConversationState(conversationId);

        return {
          response: wrongContextResponse,
          conversationState: refreshedState!,
          agentDraft: refreshedState!.agentDraft,
          quickActions: [],
          followups: [
            { id: 'goto-executor', label: 'Go to Executor' },
            { id: 'continue-build', label: 'Continue Building' }
          ]
        };
      }

      // Mark all previous assistant messages' follow-ups as consumed — non-blocking background task
      this.runInBackground('mark-followups-consumed', async () => {
        const previousMessages = await prisma.aiMessage.findMany({
          where: { conversationId, role: 'ASSISTANT' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const msg of previousMessages) {
          const metadata = (msg.metadata as any) || {};
          if (metadata.followups && !metadata.followupsConsumed) {
            await prisma.aiMessage.update({
              where: { id: msg.id },
              data: {
                metadata: {
                  ...metadata,
                  followupsConsumed: true,
                  followupsConsumedAt: new Date().toISOString(),
                },
              },
            });
          }
        }
      });

      // Add user message to history (use sanitized version)
      await agentBuilderStateService.addMessageToHistory(
        conversationId,
        'user',
        sanitizedMessage
      );

      // Refresh conversation state
      const refreshedState =
        await agentBuilderStateService.getConversationState(conversationId);

      if (!refreshedState) {
        throw new AgentBuilderError(
          'AGENT_BUILDER_STATE_REFRESH_FAILED',
          `Failed to refresh conversation state for ${conversationId}`,
          'Failed to load conversation state. Please try again.',
          { conversationId, userId }
        );
      }

      // Try to get cached user context
      let scopedUserContext = await this.responseCache.getCachedUserContext(userId);
      if (!scopedUserContext) {
        scopedUserContext = await this.entityScopeInferrer.inferAndFetchEntityScope(
          message,
          refreshedState.conversationHistory.map(h => ({
            role: h.role,
            content: h.content,
          })),
          userContext,
          userId
        );
        // Cache user context — CRIT-15: 5-min TTL prevents stale context (was no TTL = indefinite)
        await this.responseCache.cacheUserContext(userId, scopedUserContext, 300);
      }

      const enrichedState = await agentBuilderEntityService.enrichMessageWithContext(
        message,
        refreshedState,
        scopedUserContext
      );

      // STEP 1 & 2: Extract configuration and infer automations in parallel
      // OPTIMIZATION: Skip expensive inference steps when config is mature (launch stage + ready)
      const isMatureConfig = enrichedState.stage === 'launch';
      const shouldSkipInference = isMatureConfig && intent === AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT;

      const cacheKey = this.responseCache.generateCacheKey(sanitizedMessage, scopedUserContext);
      let extractedConfig: ExtractedConfiguration | null = null;
      let automationInferencePromise: Promise<any>;

      if (shouldSkipInference) {
        // Fast path: Skip extraction/inference for explicit launch requests when config is mature
        console.log('[AgentBuilder] Skipping config extraction/inference (mature config + launch intent)');
        extractedConfig = { confidenceScore: 0 };
        automationInferencePromise = Promise.resolve({ automations: [], reasoning: [] });
      } else if (intent === AGENT_CONSTANTS.INTENT.BUILDER.BUILD_OR_MODIFY || intent === AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT) {
        // A) Config Extraction
        // Build a specific extraction label from the draft fields we expect to update.
        const extractionHint = enrichedState.agentDraft.name
          ? `Extracting config for "${enrichedState.agentDraft.name}"…`
          : 'Extracting agent configuration…';
        emit(extractionHint, undefined);
        extractedConfig = await this.responseCache.getCachedResponse<ExtractedConfiguration>(cacheKey);
        if (!extractedConfig) {
          try {
            extractedConfig = await this.configurationExtractor.extract(
              sanitizedMessage,
              enrichedState,
              scopedUserContext,
              userId,
              conversationId
            );
            if (extractedConfig && extractedConfig.confidenceScore !== undefined) {
              await this.responseCache.cacheExtractedConfiguration(cacheKey, extractedConfig);
            }
          } catch (error) {
            console.error('[AgentBuilder] Configuration extraction failed:', error);
            extractedConfig = { confidenceScore: 0 };
          }
        }

        // B) Automation Inference
        automationInferencePromise = this.automationInferrer.infer(
          enrichedState.conversationHistory.map(h => ({ role: h.role, content: h.content })),
          sanitizedMessage,
          enrichedState.agentDraft,
          scopedUserContext,
          userId
        );
      } else {
        // For INFO/QA, skip extraction
        extractedConfig = { confidenceScore: 0 };
        automationInferencePromise = Promise.resolve({ automations: [], reasoning: [] });
      }

      // Ensure we have a valid config (fallback to empty if needed)
      if (!extractedConfig) {
        extractedConfig = { confidenceScore: 0 };
      }

      // Wait for automation inference (running in parallel)
      const automationInference = await automationInferencePromise;

      // CRIT-04: inferNodeFromDraft now walks ROLE→SCOPE→SYSTEM_PROMPT correctly.
      // Snapshot draft BEFORE merge so the orchestrator can detect changes.
      const previousDraft = structuredClone(enrichedState.agentDraft);

      // Merge extracted configuration into draft
      const updatedDraft = this.configurationMerger.mergeConfiguration(
        enrichedState.agentDraft,
        extractedConfig
      );

      updatedDraft.metadata = {
        ...(updatedDraft.metadata || {}),
        inferredAutomations: automationInference.automations,
        automationInferenceReasoning: automationInference.reasoning,
      };

      // Apply inferred skills from extractor (confidence threshold > 0.7)
      const skillSuggestions = extractedConfig.suggestedSkills ?? [];
      const skillConfidence = extractedConfig.skillInferenceConfidence ?? 0;
      if (skillSuggestions.length > 0 && skillConfidence > 0.7) {
        const currentSkills = new Set(updatedDraft.skills || []);
        let skillsAdded = false;

        for (const skill of skillSuggestions) {
          if (!currentSkills.has(skill)) {
            currentSkills.add(skill);
            skillsAdded = true;
          }
        }

        if (skillsAdded) {
          updatedDraft.skills = Array.from(currentSkills);
          updatedDraft.metadata = {
            ...updatedDraft.metadata,
            lastSkillInference: {
              suggestedSkills: skillSuggestions,
              confidence: skillConfidence,
              reasoning: extractedConfig.skillInferenceReasoning,
            },
          };
          console.log(`[AgentBuilder] Auto-assigned skills: ${skillSuggestions.join(', ')}`);
        }
      }

      // STEP 3: Determine stage progression
      let nextStage: ConversationStage;
      let reasoning: string;

      // ─── Step 3: graph traversal ──────────────────────────────────────────────
      // Emit BEFORE reading currentGraphNode so the UI shows the step right away.
      const nodeHumanLabels: Record<string, string> = {
        INTENT: 'Classifying agent intent',
        ROLE: 'Determining agent role & type',
        SCOPE: 'Defining agent name & scope',
        SKILLS: 'Evaluating agent skills',
        TOOLS: 'Selecting agent tools',
        CAPABILITIES: 'Configuring capabilities',
        TRIGGERS: 'Setting up triggers',
        SYSTEM_PROMPT: 'Generating system prompt',
        VERIFICATION: 'Verifying configuration quality',
        REFLECTION: 'Reflecting on completeness',
        APPROVAL: 'Preparing launch summary',
        LAUNCH: 'Activating agent',
      };
      const preGraphNode = this.stageOrchestrator.getCurrentNode
        ? await this.stageOrchestrator.getCurrentNode(conversationId)
        : null;
      // Fetch readiness % for the current node to surface in the emit label.
      // Non-blocking fallback to empty string on error.
      const readinessPctStr = (preGraphNode && this.stageOrchestrator.assessStageReadiness)
        ? await this.stageOrchestrator.assessStageReadiness(enrichedState.stage, updatedDraft, userId)
          .then((r: any) => (r?.completionPercentage != null ? ` (${r.completionPercentage}%)` : ''))
          .catch(() => '')
        : '';
      const graphStepLabel = preGraphNode
        ? `${nodeHumanLabels[preGraphNode] ?? `Processing ${preGraphNode} node`}${readinessPctStr}`
        : (enrichedState.stage === 'launch' ? 'Finalising launch sequence' : 'Navigating agent workflow');
      emit(graphStepLabel, preGraphNode ?? enrichedState.stage);


      // CRIT-12: Track per-node visit count in Redis for the 4-tier evaluator.
      // We read the current node first so we increment the right counter.
      // Re-use the node we already read for the emit above — avoids a second Redis round-trip.
      const currentGraphNode = preGraphNode;
      let visitCount = 1;
      if (currentGraphNode && conversationId) {
        const visitKey = `agent_builder:node_visits:${conversationId}:${currentGraphNode}`;
        try {
          visitCount = await redis.incr(visitKey);
          await redis.expire(visitKey, 86400);
        } catch { /* non-fatal */ }
      }

      // Normal path: let the Graph Orchestrator decide — passes conversationId so
      // it can persist the current graph node in Redis across HTTP requests.
      // CRIT-04: inferNodeFromDraft now walks ROLE → SCOPE → SYSTEM_PROMPT node to resume correctly on Redis miss.
      const progression = await this.stageOrchestrator.determineStageProgression(
        enrichedState.stage,
        updatedDraft,
        enrichedState.conversationHistory.map(h => ({
          role: h.role,
          content: h.content,
        })),
        sanitizedMessage,   // always use sanitized — prevents prompt injection into backward-jump classifier
        extractedConfig,
        userId,
        conversationId,
        { previousDraft, visitCount }  // CRIT-11 + CRIT-12
      );
      nextStage = progression.nextStage;
      reasoning = progression.reasoning;

      // FLAW-01 FIX: Guard the LLM-proposed stage transition through the FSM.
      // If the LLM hallucinates an illegal jump (e.g., initialization → launch),
      // safeTransition clamps it to the current stage and logs a warning.
      // This ensures no stage write ever bypasses the transition table.
      nextStage = safeTransition(enrichedState.stage, nextStage);

      // If the orchestrator generated a system prompt during traversal, apply it now
      if (progression.updatedDraft) {
        Object.assign(updatedDraft, progression.updatedDraft);
      }
      console.log(`[AgentBuilder] determineStageProgression returned nextStage: ${nextStage} | reasoning: ${reasoning}`);

      console.log(
        `[AgentBuilder] Stage progression: ${enrichedState.stage} -> ${nextStage} (${reasoning})`
      );

      enrichedState.stage = nextStage;
      enrichedState.stageReasoning = reasoning;
      enrichedState.agentDraft = updatedDraft;

      let readinessAssessment: StageReadinessAssessment | null = null;
      if (nextStage === 'launch') {
        // Reuse the already-computed readiness % from the pre-graph emit above if available;
        // otherwise run a fresh assessment. Either way, only ONE assessment per turn.
        emit('Validating agent readiness…', progression.currentNode);
        readinessAssessment = await this.stageOrchestrator.assessStageReadiness(
          nextStage,
          updatedDraft,
          userId
        );
      }

      const enrichedPrompt = agentBuilderPromptService.buildBuilderPrompt(
        enrichedState,
        scopedUserContext,
        sanitizedMessage
      );

      const agentTriggerContext =
        (updatedDraft.triggers?.length || 0) > 0
          ? `**AGENT TRIGGERS CONFIGURED**:\n${(updatedDraft.triggers || [])
            .map(
              t =>
                `- ${t.name || 'Unnamed'} (${t.triggerType}): ${t.reasoning || 'No reasoning'} [Confidence: ${t.confidence || 0}%]`
            )
            .join('\n')}`
          : 'AGENT TRIGGERS: Using defaults (ASSIGN_TASK, DIRECT_MESSAGE, MENTION)';

      const automationContext =
        automationInference.automations.length > 0
          ? `**INFERRED AUTOMATIONS**:\n${automationInference.automations
            .map(
              (a: import('../types/schemas').InferredAutomation) =>
                `- ${a.name}: ${a.reasoning} [Confidence: ${a.confidence}%]`
            )
            .join('\n')}\nAUTOMATION REASONING: ${automationInference.reasoning}`
          : 'AUTOMATIONS: None inferred yet';

      // Build a specific composing label based on where we landed.
      const nextNode = progression.currentNode;
      const composingLabel = nextNode
        ? `Composing response · ${nodeHumanLabels[nextNode] ?? nextNode}${readinessPctStr}…`
        : `Composing response${readinessPctStr}…`;
      emit(composingLabel, nextNode);

      const historyForResponse = enrichedState.conversationHistory.map(h => ({
        role: h.role,
        content: h.content,
      }));
      const compressionResult = await this.tokenBudgetManager.compressIfNeeded(
        historyForResponse,
        this.tokenBudgetManager.getBudget('response') * 0.3
      );
      const compressedHistoryForResponse = compressionResult.history;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
        [
          {
            role: 'system',
            content: `Agentflox Agent Builder AI.

Stage: ${nextStage.toUpperCase().replace(/_/g, ' ')}
Decision: ${reasoning}
Readiness: ${readinessAssessment
                ? `${readinessAssessment.completionPercentage}% (ready: ${readinessAssessment.isReady ? 'yes' : 'no'})`
                : 'Not evaluated'
              }

${agentTriggerContext}
${automationContext}

${this.QUALITY_GUARDRAILS}
${enrichedPrompt}`,
          },
        ];

      // Add compressed history (only user and assistant messages)
      for (const msg of compressedHistoryForResponse) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }

      const model = await fetchModel();

      // Use token budget manager for more accurate estimation
      const maxOutputTokens = this.tokenBudgetManager.getBudget('response');
      const estimatedInputTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(messages));
      const estimatedTotalTokens = estimatedInputTokens + maxOutputTokens;
      const budgetCheck = await this.tokenBudgetManager.checkBudget('response', maxOutputTokens);
      const tokenCheck = await checkAgentTokenLimit(userId, estimatedTotalTokens);

      if (!tokenCheck.allowed || !budgetCheck.allowed) {
        throw new AgentBuilderError(
          'AGENT_BUILDER_INSUFFICIENT_TOKENS',
          `Insufficient tokens or budget exceeded: ${tokenCheck.remaining} remaining, need ${estimatedTotalTokens}`,
          `You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTotalTokens}. ${budgetCheck.recommendation || ''}`,
          { userId, budgetCheck: budgetCheck.recommendation }
        );
      }
      // ─── LLM response generation (streaming when onToken is provided) ─────────
      const completionParams = {
        model: 'gpt-4o-mini' as const,
        messages,
        temperature: 0.7,
        max_tokens: maxOutputTokens,
        tools: [
          {
            type: 'function' as const,
            function: {
              name: 'generate_response_with_followups',
              description: 'Generate response message and follow-up options',
              parameters: {
                type: 'object',
                properties: {
                  response: { type: 'string' },
                  followups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                      },
                      required: ['id', 'label'],
                    },
                  },
                },
                required: ['response'],
              },
            },
          },
        ],
        tool_choice: { type: 'function' as const, function: { name: 'generate_response_with_followups' } },
      };

      let response = 'I apologize, but I encountered an error processing your message.';
      let followups: Array<{ id: string; label: string }> = [];

      if (onToken) {
        // ─── STREAMING PATH ─────────────────────────────────────────────────────
        // Use stream:true so we can emit tokens as they arrive.
        // The tool call JSON arrives as incremental `delta.tool_calls[0].function.arguments`
        // chunks. We extract the value of the `response` key character-by-character
        // using a tiny state machine and forward each character via onToken.
        //
        // State machine:
        //   'before' → scanning for `"response":`
        //   'in_value' → inside the JSON string value, emitting chars
        //   'done' → response key fully consumed
        //
        let accumulatedArgs = '';
        let parseState: 'before' | 'in_value' | 'done' = 'before';
        let responseValueBuf = ''; // accumulates the raw value (including escape sequences)
        let responseContentBuf = ''; // the decoded text emitted so far
        let inEscape = false;
        // How many chars of `"response":` have we matched so far
        const RESPONSE_KEY = '"response":';
        let keyMatchIdx = 0;

        const cb = this.getOperationCircuitBreaker('builder_response_stream');

        if (cb.isOpen()) {
          throw new AgentBuilderError(
            'AGENT_BUILDER_COMPLETION_FAILED',
            'Circuit breaker OPEN for builder_response_stream',
            'Service is temporarily unavailable. Please try again in a moment.',
            { conversationId, userId }
          );
        }

        const stream = await cb.execute(() =>
          this.retryHandler.retry(
            () => openai.chat.completions.create({ ...completionParams, stream: true }),
            {
              maxAttempts: 2,
              baseDelay: 500,
              retryable: (err: any) => !(err instanceof CircuitBreakerError) &&
                (err?.status === 429 || err?.status >= 500 || err?.code === 'ECONNRESET'),
            }
          )
        );

        for await (const chunk of stream as any) {
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          const argsDelta: string = delta.tool_calls?.[0]?.function?.arguments ?? '';
          if (!argsDelta) continue;

          accumulatedArgs += argsDelta;

          // Walk through the new characters and update state machine
          if (parseState === 'done') continue;

          for (const ch of argsDelta) {
            if (parseState === 'before') {
              // Match `"response":` character by character
              if (ch === RESPONSE_KEY[keyMatchIdx]) {
                keyMatchIdx++;
                if (keyMatchIdx === RESPONSE_KEY.length) {
                  // Next non-whitespace char should be the opening quote
                  parseState = 'in_value';
                  inEscape = false;
                  // skip: the opening `"` will be consumed as first char of in_value
                }
              } else {
                keyMatchIdx = 0;
              }
              continue;
            }

            if (parseState === 'in_value') {
              if (responseValueBuf.length === 0 && ch === '"') {
                // opening quote — skip it
                continue;
              }

              if (inEscape) {
                // Unescape common sequences
                let decoded = ch;
                if (ch === 'n') decoded = '\n';
                else if (ch === 't') decoded = '\t';
                else if (ch === 'r') decoded = '\r';
                if (onToken) onToken(decoded);
                responseContentBuf += decoded;
                responseValueBuf += ch;
                inEscape = false;
                continue;
              }

              if (ch === '\\') {
                inEscape = true;
                responseValueBuf += ch;
                continue;
              }

              if (ch === '"') {
                // Closing quote — response value is complete
                parseState = 'done';
                continue;
              }

              // Normal character
              if (onToken) onToken(ch);
              responseContentBuf += ch;
              responseValueBuf += ch;
            }
          }
        }

        // Parse the full accumulated JSON for followups and the complete response text
        try {
          const rawParsed = JSON.parse(accumulatedArgs);
          const validated = FollowupResponseSchema.parse(rawParsed);
          // Prefer state-machine result (avoids double-JSON parsing for response text)
          response = responseContentBuf || validated.response || response;
          followups = validated.followups || [];
        } catch {
          // Fall back to state-machine captured text
          response = responseContentBuf || response;
          followups = extractFollowupsFromText(response);
        }
      } else {
        // ─── NON-STREAMING PATH (TRPC / existing callers) ───────────────────────
        const completion = await this.runCompletionWithResilience(
          { ...completionParams, stream: false },
          { operation: 'builder_response', conversationId, userId }
        );

        const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.name === 'generate_response_with_followups') {
          try {
            const rawParsed = extractJson(toolCall.function.arguments);
            const validated = FollowupResponseSchema.parse(rawParsed);
            response = validated.response || response;
            followups = validated.followups || [];
          } catch (error) {
            console.error('[AgentBuilder] Failed to parse/validate response follow-ups:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              conversationId,
              userId,
              rawArgs: toolCall.function.arguments?.substring(0, 200),
            });
            const textResponse = completion.choices[0]?.message?.content;
            if (textResponse) response = textResponse;
            followups = extractFollowupsFromText(response);
          }
        } else {
          const textResponse = completion.choices[0]?.message?.content;
          if (textResponse) response = textResponse;
          followups = extractFollowupsFromText(response);
        }
      }

      // ── Token usage tracking ──────────────────────────────────────────────────
      // Count actual tokens used by the main response LLM call — fire-and-forget.
      // Both streaming and non-streaming paths have populated `response` by this point.
      this.runInBackground('token-usage-tracking-chat', async () => {
        const tokenCount = await countAgentTokens(
          messages as Array<{ role: string; content: string }>,
          response,
          model.name,
          undefined
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
      // ─────────────────────────────────────────────────────────────────────────

      // Persist assistant reply and update in-memory conversation state — these are

      // lightweight Redis/cache writes and must complete before we return so the
      // caller receives an accurate ConversationState snapshot.
      await agentBuilderStateService.addMessageToHistory(
        conversationId,
        'assistant',
        response,
        {
          followups,
          stage: nextStage,
          stageReasoning: reasoning,
          extractedConfig,
          automationInference,
          readinessAssessment,
        }
      );

      const updatedState = await agentBuilderStateService.updateConversationState(conversationId, {
        agentDraft: updatedDraft,
        stage: nextStage,
        focusedList: enrichedState.focusedList,
        mentionedUsers: enrichedState.mentionedUsers,
        suggestions: enrichedState.suggestions,
      });

      // ─── Background persistence ──────────────────────────────────────────────
      // Everything below is non-critical to returning the response. Run it all
      // as fire-and-forget so the chat reply is delivered without extra latency.
      const capturedDraft = updatedDraft;
      const capturedStage = nextStage;
      const capturedInference = automationInference;
      const capturedConfig = extractedConfig;
      const responseStartTime = startTime;

      // CRIT-13: Sync when draft materially changed OR stage advanced.
      // Old logic used `progression.currentNode` which can be undefined, silently
      // skipping DB writes and letting the DB fall behind Redis.
      const draftChanged = previousDraft &&
        JSON.stringify(previousDraft) !== JSON.stringify(updatedDraft);
      const stageAdvanced = enrichedState.stage !== nextStage;
      // Also always sync on late-stage nodes that are worth persisting.
      const isLateStageNode = ['SKILLS', 'TOOLS', 'CAPABILITIES', 'TRIGGERS', 'SYSTEM_PROMPT', 'APPROVAL', 'LAUNCH']
        .includes(progression.currentNode ?? '');
      const shouldSync = draftChanged || stageAdvanced || isLateStageNode;

      if (shouldSync) {
        this.runInBackground('sync-agent-to-database', () =>
          this.syncAgentToDatabase(
            conversationId,
            capturedDraft,
            capturedStage,
            userId,
            capturedInference
          )
        );
      }

      this.runInBackground('publish-agent-updated-event', async () => {
        // Resolve agentId from DB — ConversationState does not carry it
        const conv = await prisma.aiConversation.findUnique({
          where: { id: conversationId },
          select: { agentId: true },
        });
        await eventBus.publish(AGENT_EVENTS.BUILDER.AGENT_UPDATED, {
          conversationId,
          agentId: conv?.agentId ?? undefined,
          draft: capturedDraft,
          stage: capturedStage,
          timestamp: new Date(),
        });
      });

      this.runInBackground('record-builder-metrics', async () => {
        const duration = Date.now() - responseStartTime;
        const { agentMetricsService } = await import('../monitoring/agentMetricsService');
        await agentMetricsService.recordBuilderInteraction(
          conversationId,
          userId,
          capturedStage,
          duration,
          Object.keys(capturedConfig || {}).length
        );
      });
      // ─────────────────────────────────────────────────────────────────────────

      const duration = Date.now() - startTime;

      // Emit graph node to tracing — allows observing traversal in production dashboards
      const currentNode = this.stageOrchestrator.getCurrentNode
        ? await this.stageOrchestrator.getCurrentNode(conversationId)
        : null;

      span.setAttributes({
        'stage': nextStage,
        'graph.node': currentNode ?? 'unknown',
        'duration.ms': duration,
      });

      // Bug fix (double-launch): When the orchestrator advances to the LAUNCH node, the agent
      // configuration is complete. Set draft.status = 'ready' and return a direct action button
      // so the frontend calls launchMutation immediately — no second LLM confirmation round-trip.
      const isAtLaunchNode = progression.currentNode === 'LAUNCH';
      if (isAtLaunchNode) {
        updatedDraft.status = 'ready';
      }

      return {
        response,
        conversationState: updatedState,
        agentDraft: updatedDraft,
        quickActions: [],
        followups: isAtLaunchNode ? [] : followups,
        actions: isAtLaunchNode
          ? [{ id: 'launch-agent', label: 'Yes, activate the agent.', variant: 'primary' }]
          : undefined,
      };
    } finally {
      await this.releaseLock(conversationId);
    }
  }

  /**
   * Sync agent configuration to database
   * Updates existing agent or creates new one
   */
  private async syncAgentToDatabase(
    conversationId: string,
    draft: AgentDraft,
    stage: ConversationStage,
    userId: string,
    automationInference?: {
      automations: InferredAutomation[];
      reasoning: string;
    }
  ): Promise<void> {
    try {
      // Fetch conversation and agent
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        include: {
          aiAgent: {
            include: {
              triggers: true,
              automations: true,
            },
          },
        },
      });

      if (conversation?.aiAgent) {
        const agent = conversation.aiAgent;

        // Check permissions
        const hasPermission = await this.permissionService.checkAgentPermission(agent.id, userId, 'write');
        if (!hasPermission) {
          throw new AgentBuilderError(
            'PERMISSION_DENIED',
            'You do not have permission to modify this agent',
            'Please contact the agent owner for access.',
            { agentId: agent.id, userId }
          );
        }

        let validationIssues: string[] = [];

        const shouldActivate = stage === 'launch' || draft.status === 'ready';

        // Store before state for audit
        const beforeState = {
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          capabilities: agent.capabilities,
          constraints: agent.constraints,
        };

        let newStatus = agent.status;
        if (agent.status === 'ACTIVE' && stage !== 'launch') newStatus = 'RECONFIGURING';
        else if (agent.status === 'DRAFT') newStatus = 'BUILDING';
        else if (shouldActivate) newStatus = 'ACTIVE';

        let availableTools = agent.availableTools;

        if (draft.tools?.length) {
          const systemTools = await prisma.systemTool.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
          });

          if (systemTools.length > 0) {
            const knownByName = new Map(systemTools.map(t => [t.name, t.name]));
            const knownById = new Map(systemTools.map(t => [t.id, t.name]));

            const validToolNames = draft.tools
              .map(t => {
                // Prefer matching by name (the stable key from the extractor).
                // Fall back to matching by id in case the draft was seeded with a UUID.
                return knownByName.get(t.name) ?? knownById.get(t.id) ?? knownByName.get(t.id) ?? null;
              })
              .filter(Boolean) as string[];

            if (validToolNames.length > 0) {
              availableTools = validToolNames;
            }
            // If none resolved (hallucinated names), leave availableTools unchanged
          }
          // If systemTool table is empty (not yet seeded), leave availableTools unchanged
          // rather than wiping whatever the agent already had configured.
        } else {
          const defaultTools = await prisma.systemTool.findMany({
            where: { isActive: true, isDefault: true },
          });
          availableTools = defaultTools.map(t => t.name);
        }

        let systemPrompt = draft.systemPrompt || agent.systemPrompt;
        // Create a version snapshot before applying updates
        try {
          await this.versionControl.createVersion(agent.id, draft as AgentDraft, userId);
        } catch (versionError) {
          console.error('[AgentBuilder] Failed to create agent version snapshot:', versionError);
          // Versioning failures should not block core operation, but are logged for investigation
        }

        await prisma.aiAgent.update({
          where: { id: agent.id },
          data: {
            name: draft.name || agent.name,
            description: draft.description || agent.description,
            avatar: draft.avatar || agent.avatar,
            systemPrompt,
            personality: draft.personality || agent.personality,
            capabilities: draft.capabilities || agent.capabilities,
            constraints: draft.constraints || agent.constraints,
            modelId: draft.modelConfig?.modelId || agent.modelId,
            temperature: draft.modelConfig?.temperature ?? agent.temperature,
            maxTokens: draft.modelConfig?.maxTokens ?? agent.maxTokens,
            availableTools,
            status: newStatus,
            isActive: shouldActivate || agent.isActive,
            metadata: {
              ...(agent.metadata as any),
              rules: draft.rules,
              agentTriggers: draft.triggers,
              tools: draft.tools,
              knowledgeBases: draft.knowledgeBases,
              stage,
              agentDraft: draft,
              automationInference,
              lastUpdated: new Date().toISOString(),
            },
          },
        });

        // Update triggers in transaction to ensure atomicity
        if (draft.triggers?.length) {
          // Validate triggers before deletion
          const validTriggers = draft.triggers
            .filter(t => {
              // Enforce confidence threshold
              if ((t.confidence || 0) < 60) {
                console.warn(`[AgentBuilder] Skipping low-confidence trigger: ${t.name} (${t.confidence}%)`);
                return false;
              }
              // Validate trigger type
              if (!Object.values(AgentTriggerType).includes(t.triggerType as AgentTriggerType)) {
                console.warn(`[AgentBuilder] Skipping invalid trigger type: ${t.triggerType}`);
                return false;
              }
              return true;
            })
            .map(trigger => ({
              id: this.generateId(),
              agentId: agent.id,
              triggerType: trigger.triggerType as AgentTriggerType,
              triggerConfig: trigger.config || {},
              name: trigger.name,
              description: trigger.description || trigger.reasoning,
              isActive: true,
              priority: trigger.priority || 0,
              conditions: trigger.conditions || {},
              filters: trigger.filters || {},
              tags: ['inferred', `confidence-${trigger.confidence}`],
              metadata: {
                confidence: trigger.confidence,
                reasoning: trigger.reasoning,
                inferredAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            }));

          // Use transaction for atomic update
          await prisma.$transaction(async (tx) => {
            await tx.agentTrigger.deleteMany({ where: { agentId: agent.id } });
            if (validTriggers.length > 0) {
              await tx.agentTrigger.createMany({ data: validTriggers });
            }
          });
        }

        // Update automations in transaction
        if (automationInference?.automations?.length) {
          // Build automation records (only fields that exist on the Automation model)
          const validAutomationEntries = automationInference.automations
            .filter(a => {
              if (a.confidence < 60) {
                console.warn(`[AgentBuilder] Skipping low-confidence automation: ${a.name} (${a.confidence}%)`);
                return false;
              }
              if (!a.triggers || a.triggers.length === 0) {
                console.warn(`[AgentBuilder] Skipping automation without triggers: ${a.name}`);
                return false;
              }
              return true;
            })
            .map(a => ({
              automationData: {
                id: this.generateId(),
                createdBy: userId,
                agentId: agent.id,
                name: a.name,
                description: a.description || a.reasoning,
                conditions: a.conditions ?? null,
                actions: a.actions ?? [],
                isActive: true,
                isScheduled: a.isScheduled ?? false,
                cronExpression: a.cronExpression ?? null,
                timezone: a.timezone ?? 'UTC',
              },
              triggers: a.triggers,
              metadata: {
                confidence: a.confidence,
                reasoning: a.reasoning,
                allTriggers: a.triggers,
                inferredAt: new Date().toISOString(),
              },
            }));

          // Use transaction for atomic update
          if (validAutomationEntries.length > 0) {
            await prisma.$transaction(async (tx) => {
              // Delete existing automations for this agent (optional - depends on business logic)
              // await tx.automation.deleteMany({ where: { agentId: agent.id } });

              // Create the Automation records
              await tx.automation.createMany({
                data: validAutomationEntries.map(e => e.automationData) as any,
              });

              // Create the AutomationTrigger records for each automation
              const triggerRecords = validAutomationEntries.flatMap(e =>
                e.triggers.map(t => ({
                  id: this.generateId(),
                  automationId: e.automationData.id,
                  triggerType: t.triggerType as any,
                  triggerConfig: t.config ?? {},
                  name: t.name ?? null,
                  description: t.description ?? null,
                  isActive: true,
                  priority: t.priority ?? 0,
                  conditions: null,
                  filters: null,
                  metadata: {
                    confidence: t.confidence,
                    reasoning: t.reasoning,
                    inferredAt: e.metadata.inferredAt,
                  },
                  tags: ['inferred', `confidence-${t.confidence}`],
                }))
              );

              if (triggerRecords.length > 0) {
                await tx.automationTrigger.createMany({ data: triggerRecords as any });
              }
            });
          }
        }

        await prisma.aiConversation.update({
          where: { id: conversationId },
          data: {
            metadata: {
              ...(conversation.metadata as any),
              stage,
              agentDraft: draft,
              automationInference,
              lastUpdated: new Date().toISOString(),
            },
          },
        });

        console.log(
          `[AgentBuilder] Updated agent ${agent.id} | triggers=${draft.triggers?.length || 0}, automations=${automationInference?.automations?.length || 0}`
        );

        // Audit log for update (best-effort, non-blocking on internal errors)
        try {
          await this.auditLogger.logUpdate(
            agent.id,
            beforeState as any,
            draft,
            { userId }
          );

          if (shouldActivate) {
            await this.auditLogger.logLaunch(agent.id, { userId });
          }
        } catch (auditError) {
          console.error('[AgentBuilder] Failed to write audit log for agent update:', auditError);
        }
      }
    } catch (error) {
      if (error instanceof AgentBuilderError) {
        throw error;
      }

      const errorId = this.generateId();
      console.error('[AgentBuilder] Failed to sync agent to database:', {
        errorId,
        conversationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AgentBuilderError(
        'AGENT_BUILDER_SYNC_FAILED',
        'Failed to sync agent configuration to database',
        'We had trouble saving your agent configuration. Please try again. If the problem persists, contact support with your error ID.',
        { conversationId, userId, errorId }
      );
    }
  }

  async updateDraft(
    conversationId: string,
    draft: Partial<AgentDraft>,
    userId: string
  ): Promise<AgentDraft> {
    const conversationState =
      await agentBuilderStateService.getConversationState(conversationId);
    if (!conversationState) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_CONVERSATION_NOT_FOUND',
        `Conversation ${conversationId} not found`,
        'This conversation could not be found. Please start a new conversation.',
        { conversationId, userId }
      );
    }

    if (conversationState.userId !== userId) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_UNAUTHORIZED',
        `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
        'You do not have access to this conversation.',
        { conversationId, userId }
      );
    }

    const updatedDraft = await agentBuilderStateService.saveAgentDraft(conversationId, draft);

    // Sync to database
    await this.syncAgentToDatabase(conversationId, updatedDraft, conversationState.stage, userId);

    return updatedDraft;
  }

  async launchAgent(
    conversationId: string,
    userId: string
  ): Promise<{ agentId: string; agent: any }> {
    const conversationState =
      await agentBuilderStateService.getConversationState(conversationId);
    if (!conversationState) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_CONVERSATION_NOT_FOUND',
        `Conversation ${conversationId} not found`,
        'This conversation could not be found. Please start a new conversation.',
        { conversationId, userId }
      );
    }

    if (conversationState.userId !== userId) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_UNAUTHORIZED',
        `Unauthorized: Conversation ${conversationId} does not belong to user ${userId}`,
        'You do not have access to this conversation.',
        { conversationId, userId }
      );
    }

    const draft = conversationState.agentDraft;

    if (!this.isAgentReady(draft)) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_INCOMPLETE_CONFIG',
        'Agent configuration is incomplete',
        'Agent configuration is incomplete. Please provide at least: name and system prompt. (Triggers are automatically set to defaults)',
        { conversationId, userId, draft }
      );
    }

    // Update draft status to ready
    draft.status = 'ready';

    // Sync to database with active status
    await this.syncAgentToDatabase(conversationId, draft, 'launch', userId);

    // Find the created/updated agent
    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { aiAgent: true },
    });

    if (!conversation?.aiAgent) {
      throw new AgentBuilderError(
        'AGENT_BUILDER_CREATE_FAILED',
        `Failed to create agent for conversation ${conversationId}`,
        'Failed to create agent. Please try again.',
        { conversationId, userId }
      );
    }

    return { agentId: conversation.aiAgent.id, agent: conversation.aiAgent };
  }
}

export const agentBuilderService = new AgentBuilderService({
  validator: new ConfigurationValidator(),
  safetyEvaluator: new SemanticSafetyEvaluator(),
  policyEngine: new PolicyEngine(),
  capabilityWhitelist: new CapabilityWhitelist(),
  toolAccessController: new ToolAccessController(),
  promptSandbox: new PromptSandbox(),
  versionControl: new AgentVersionControl(),
  conflictResolver: new ConflictResolver(),
  lockManager: new OptimisticLockManager(),
  auditLogger: new AuditLogger(),
  responseCache: new ResponseCache(),
  tokenBudgetManager: new TokenBudgetManager(),
  configurationExtractor: new ConfigurationExtractor(),
  automationInferrer: new AutomationInferrer(),
  promptGenerator: new PromptGenerator(),
  configurationMerger: new ConfigurationMerger(),
  inputSanitizer: new InputSanitizer(),
  permissionService: new PermissionService(),
  entityScopeInferrer: new EntityScopeInferrer(),
  stageOrchestrator: new GraphOrchestrator(),
  simulationService: new SimulationService(),
  intentInferenceService: intentInferenceService,
});

