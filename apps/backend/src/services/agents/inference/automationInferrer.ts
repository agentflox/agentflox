/**
 * Automation Inferrer
 * 
 * Infers automations from conversation history and user messages.
 * Focused service for automation inference only.
 */

import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { AgentDraft } from '../state/agentBuilderStateService';
import { UserContext } from '../state/agentBuilderContextService';
import { AutomationTriggerType, TriggerType } from '../types/types';
import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { CircuitBreaker, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { AutomationInferenceResponseSchema, InferredAutomationSchema, InferredAutomationTriggerSchema } from '../types/schemas';
import { randomBytes } from 'crypto';
import { extractJson } from '@/utils/ai/jsonParsing';

export interface InferredAutomationTrigger {
  triggerType: AutomationTriggerType;
  name: string;
  description?: string;
  config: Record<string, any>;
  priority: number;
  conditions?: Record<string, any>;
  filters?: Record<string, any>;
  confidence: number;
  reasoning: string;
}

export interface InferredAutomation {
  name: string;
  description?: string;
  conditions?: Record<string, any>;
  triggers: InferredAutomationTrigger[];
  actions: Array<Record<string, any>>;
  isScheduled: boolean;
  cronExpression?: string;
  timezone: string;
  confidence: number;
  reasoning: string;
}

export class AutomationInferrer {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly errorClassifier: ErrorClassifier;
  private readonly tokenBudgetManager: TokenBudgetManager;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3,
    });
    this.retryHandler = new RetryHandler();
    this.errorClassifier = new ErrorClassifier();
    this.tokenBudgetManager = new TokenBudgetManager();
  }

  /**
   * Infer automations from conversation
   */
  async infer(
    conversationHistory: Array<{ role: string; content: string }>,
    userMessage: string,
    draft: AgentDraft,
    userContext: UserContext,
    userId: string
  ): Promise<{
    automations: InferredAutomation[];
    reasoning: string;
  }> {
    // Filter available automation triggers (AUTOMATION type only)
    const availableAutomationTriggers = userContext.availableTriggers
      ?.filter(t => t.type === TriggerType.AUTOMATION)
      .map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        triggerType: t.triggerType as AutomationTriggerType,
        config: t.triggerConfig,
      })) || [];

    // Compress conversation history to reduce token usage
    const compressedHistory = await this.tokenBudgetManager.compressIfNeeded(
      conversationHistory,
      this.tokenBudgetManager.getBudget('automation') * 0.3 // Use 30% of budget for history
    );

    // Build minimal draft and context summaries
    const draftSummary: Record<string, any> = {};
    if (draft.name) draftSummary.name = draft.name;
    if (draft.agentType) draftSummary.agentType = draft.agentType;
    if (draft.capabilities?.length) draftSummary.capabilities = draft.capabilities.slice(0, 5); // Limit to 5

    const contextSummary = {
      availableTriggers: availableAutomationTriggers.slice(0, 15).map(t => ({ id: t.id, name: t.name, triggerType: t.triggerType })), // Limit to 15
    };

    const inferenceMessages = [
      {
        role: 'system' as const,
        content: `Infer automations (separate from agent triggers). Analyze for event-based, scheduled, or condition-based automations.

Available Triggers: ${availableAutomationTriggers.slice(0, 10).map(t => t.name).join(', ')}${availableAutomationTriggers.length > 10 ? '...' : ''}

Draft: ${JSON.stringify(draftSummary)}
Context: ${JSON.stringify(contextSummary)}

Rules:
- Event keywords: "when", "watch", "track", "monitor", "detect", "notify when", "if task"
- Scheduled keywords: "daily", "weekly", "schedule", "recurring", "periodically"
- Condition keywords: "if", "when", "condition", "rule"
- Only infer if explicitly mentioned or strongly implied
- Return empty array if no automations needed
- Provide confidence scores (0-100)`,
      },
      {
        role: 'user' as const,
        content: `Message: "${userMessage}"

Recent context:
${compressedHistory.history.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')}

Infer automations.`,
      },
    ];

    const model = await fetchModel();

    // Use token budget manager for more accurate estimation
    const maxOutputTokens = this.tokenBudgetManager.getBudget('automation');
    const estimatedInputTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(inferenceMessages));
    const estimatedTotalTokens = estimatedInputTokens + maxOutputTokens;
    const budgetCheck = await this.tokenBudgetManager.checkBudget('automation', maxOutputTokens);

    // Check token limit and budget
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTotalTokens);
    if (!tokenCheck.allowed || !budgetCheck.allowed) {
      console.warn('Insufficient tokens or budget exceeded for automation inference, skipping', {
        tokenCheck: tokenCheck.allowed,
        budgetCheck: budgetCheck.allowed,
        recommendation: budgetCheck.recommendation,
      });
      return {
        automations: [],
        reasoning: 'Insufficient tokens or budget exceeded - skipping automation inference',
      };
    }

    try {
      const completion = await this.retryHandler.retry(
        () => this.circuitBreaker.execute(() =>
          openai.chat.completions.create({
            model: model.name,
            messages: inferenceMessages,
            temperature: 0.3,
            max_tokens: maxOutputTokens,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'infer_automations',
                  description: 'Infer automations for the agent from conversation',
                  parameters: {
                    type: 'object',
                    properties: {
                      automations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            triggers: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  triggerType: {
                                    type: 'string',
                                    'enum': Object.values(AutomationTriggerType),
                                    description: 'Event-based automation trigger type'
                                  },
                                  name: { type: 'string' },
                                  description: { type: 'string' },
                                  config: { type: 'object' },
                                  priority: { type: 'number', default: 0 },
                                  conditions: { type: 'object' },
                                  filters: { type: 'object' },
                                  confidence: { type: 'number', minimum: 0, maximum: 100 },
                                  reasoning: { type: 'string' },
                                },
                                required: ['triggerType', 'name', 'config', 'confidence', 'reasoning'],
                              },
                            },
                            conditions: { type: 'object' },
                            actions: {
                              type: 'array',
                              items: { type: 'object' },
                            },
                            isScheduled: { type: 'boolean', default: false },
                            cronExpression: { type: 'string' },
                            timezone: { type: 'string', default: 'UTC' },
                            confidence: { type: 'number', minimum: 0, maximum: 100 },
                            reasoning: { type: 'string' },
                          },
                          required: ['name', 'triggers', 'actions', 'confidence', 'reasoning'],
                        },
                      },
                      reasoning: {
                        type: 'string',
                        description: 'Overall reasoning for automation decisions',
                      },
                    },
                    required: ['automations', 'reasoning'],
                  },
                },
              },
            ],
            tool_choice: { type: 'function', function: { name: 'infer_automations' } },
          })
        ),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryable: (error) => this.errorClassifier.classify(error).recoverable,
        }
      );

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'infer_automations') {
        try {
          const rawParsed = extractJson(toolCall.function.arguments);
          const validated = AutomationInferenceResponseSchema.parse(rawParsed);

          console.log('[AutomationInferrer] Inferred automations:', {
            userId,
            automationsCount: validated.automations.length,
            reasoning: validated.reasoning,
          });

          // Track usage
          countAgentTokens(
            inferenceMessages as Array<{ role: string; content: string }>,
            toolCall.function.arguments,
            model.name
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
              console.error('Failed to update usage for automation inference:', error);
            }
          }).catch(() => { });

          return {
            automations: validated.automations as InferredAutomation[],
            reasoning: validated.reasoning,
          };
        } catch (error) {
          console.error('[AutomationInferrer] Failed to parse automation inference:', error);
        }
      }
    } catch (error) {
      const errorId = randomBytes(8).toString('hex');
      const errorClass = this.errorClassifier.classify(error as Error);

      console.error(`[${errorId}] AutomationInferrer failed:`, error);

      // Don't throw - automation inference is optional
      return {
        automations: [],
        reasoning: `Automation inference failed (${errorClass.type}). Error ID: ${errorId}`,
      };
    }

    // Fallback: no automations
    return {
      automations: [],
      reasoning: 'No automations inferred from conversation',
    };
  }
}

