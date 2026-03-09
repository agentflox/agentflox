/**
 * Configuration Extractor
 *
 * Extracts agent configuration AND infers skills from user messages using a
 * single AI call. Skills are returned as part of the `extract_agent_configuration`
 * tool response alongside all other config fields — no separate LLM round-trip.
 */

import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { ConversationState } from '../state/agentBuilderStateService';
import { UserContext } from '../state/agentBuilderContextService';
import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { ExtractedConfiguration } from '../validation/configurationValidator';
import { CircuitBreaker, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { ResponseCache } from '../cache/responseCache';
import { ConfigurationValidator } from '../validation/configurationValidator';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { AgentTriggerType, AgentType } from '../types/types';
import { ExtractedConfigurationSchema } from '../types/schemas';
import { BUILT_IN_SKILLS } from '../registry/skillRegistry';
import { randomBytes } from 'crypto';
import { extractJson } from '@/utils/ai/jsonParsing';

export class ConfigurationExtractor {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly errorClassifier: ErrorClassifier;
  private readonly responseCache: ResponseCache;
  private readonly validator: ConfigurationValidator;
  private readonly tokenBudgetManager: TokenBudgetManager;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3,
    });
    this.retryHandler = new RetryHandler();
    this.errorClassifier = new ErrorClassifier();
    this.responseCache = new ResponseCache();
    this.validator = new ConfigurationValidator();
    this.tokenBudgetManager = new TokenBudgetManager();
  }

  /**
   * Extract configuration and infer skills from the user message in a **single**
   * LLM call. The `extract_agent_configuration` tool schema includes skill fields
   * so the model returns everything together — no second round-trip needed.
   */
  async extract(
    message: string,
    state: ConversationState,
    userContext: UserContext,
    userId: string,
    conversationId: string
  ): Promise<ExtractedConfiguration> {
    // Check cache first
    const cacheKey = this.responseCache.generateCacheKey(message, userContext);
    const cached = await this.responseCache.getCachedResponse<ExtractedConfiguration>(cacheKey);
    if (cached) {
      return cached;
    }

    // Pre-validation
    const preValidation = this.validator.preValidate(message);
    if (!preValidation.valid) {
      throw new Error(`Pre-validation failed: ${preValidation.errors.join(', ')}`);
    }

    // Filter available agent triggers (MANUAL and SCHEDULED only)
    const availableAgentTriggers = userContext.availableTriggers
      ?.filter(t => t.type === 'MANUAL' || t.type === 'SCHEDULED')
      .map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        triggerType: t.triggerType,
        config: t.triggerConfig,
      })) || [];

    // Format skills and tools for AI awareness
    const availableSkillsInfo = userContext.availableSkills
      ?.map(s => `- ${s.name}: ${s.description}\n  Tools: ${s.tools.join(', ')}`)
      .join('\n') || 'None loaded';

    const availableToolsInfo = userContext.availableTools
      ?.map(t => `- ${t.name} (${t.category}): ${t.description}`)
      .join('\n') || 'None loaded';

    const extractionMessages = [
      {
        role: 'system' as const,
        content: `You are a configuration extraction AI. Extract agent configuration details AND infer required skills from the conversation in a single pass.

CURRENT CONTEXT:
- Stage: ${state.stage}
- Current Draft: ${JSON.stringify(state.agentDraft, null, 2)}
- Context: ${JSON.stringify(userContext, null, 2)}

**AVAILABLE AGENT TRIGGERS** (MANUAL & SCHEDULED only):
${JSON.stringify(availableAgentTriggers, null, 2)}

**AVAILABLE SKILLS**:
${availableSkillsInfo}

**AVAILABLE TOOLS**:
${availableToolsInfo}

Extract all relevant configuration details from the message. Be intelligent about inferring:
- Agent name (even if not explicitly stated, infer from purpose)
- Description (what it does)
- Agent type (TASK_EXECUTOR, SCHEDULER, NOTIFIER, ANALYST, etc.)
- Capabilities (what it can do)
- Constraints (what it cannot or should not do)
- System prompt (core behavior instructions)
- Tools (**ONLY** from the AVAILABLE TOOLS list above — do not invent tool names)
- **Skills** (**ONLY** from the AVAILABLE SKILLS list above — do not invent skill names):
  * Only include skills strongly indicated by the user's request
- **Agent Triggers** (ONLY MANUAL or SCHEDULED types):
  * Default: ASSIGN_TASK for task-based agents
  * Default: DIRECT_MESSAGE and MENTION (always included unless user explicitly says otherwise)
  * SCHEDULED: If user mentions timing like "daily", "every Monday", "at 9am"
  * Use triggers from availableAgentTriggers list above
- **Scope Type**: 
  * 'workspace', 'space', 'project', 'team' (if user refers to a specific entity)
  * 'portable' (if user wants to build a marketplace agent or template that is not bound to a specific entity)
- **isPortable**: Set to true if scopeType is 'portable'.
- Rules (business logic)
- Knowledge bases (data sources)
- Stage progression (should we move to next stage?)
- Confidence score (0-100: how complete is the configuration?)

**IMPORTANT**:
- Agent triggers are ONLY MANUAL (ASSIGN_TASK, DIRECT_MESSAGE, MENTION) or SCHEDULED
- Do NOT extract automation-related triggers (like TASK_CREATED, TASK_UPDATED, etc.) - those are handled separately
- ASSIGN_TASK is default for task-based agents
- DIRECT_MESSAGE and MENTION are defaults unless user explicitly excludes them
- Only add SCHEDULED trigger if user mentions timing/scheduling
- **Portable Agents**: If the user wants a template or marketplace agent, set scopeType to 'portable' and isPortable to true. DO NOT force them into a specific workspace if they express this intent.

Return ONLY changed/new fields. If nothing relevant, return empty object with low confidence.`,
      },
      {
        role: 'user' as const,
        content: `User message: "${message}"

Previous messages context:
${state.conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Extract configuration, agent triggers, and required skills.`,
      },
    ];

    // Fetch model
    const model = await fetchModel();
    const estimatedTokens = estimateTokens(JSON.stringify(extractionMessages)) + 1200;

    // Check token limit
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      console.warn('Insufficient tokens for configuration extraction, skipping');
      return { confidenceScore: 0 };
    }

    try {
      const extractionCompletion = await this.retryHandler.retry(
        () => this.circuitBreaker.execute(() =>
          openai.chat.completions.create({
            model: model.name,
            messages: extractionMessages,
            temperature: 0.3,
            max_tokens: 1200,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'extract_agent_configuration',
                  description: 'Extract agent configuration, triggers, and required skills from user message',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Agent name' },
                      description: { type: 'string', description: 'What the agent does' },
                      avatar: { type: 'string', description: 'Emoji or avatar' },
                      agentType: {
                        type: 'string',
                        enum: Object.values(AgentType),
                        description: 'Type of agent',
                      },
                      systemPrompt: { type: 'string', description: 'Core behavior instructions' },
                      capabilities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What it can do',
                      },
                      constraints: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'What it cannot do',
                      },
                      tools: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            config: { type: 'object' },
                          },
                        },
                        description: 'Tools the agent needs',
                      },
                      // ── Skill inference (returned inline with config) ───────
                      suggestedSkills: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Skill names from the AVAILABLE SKILLS list that this agent needs. Only include skills strongly implied by the request.',
                      },
                      skillInferenceConfidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Confidence 0-1 that the suggested skills are correct',
                      },
                      skillInferenceReasoning: {
                        type: 'string',
                        description: 'Brief explanation of why these skills were chosen',
                      },
                      // ─────────────────────────────────────────────────────────
                      triggers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            triggerType: {
                              type: 'string',
                              enum: Object.values(AgentTriggerType),
                              description: 'ONLY MANUAL (ASSIGN_TASK, DIRECT_MESSAGE, MENTION) or SCHEDULED',
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
                        description: 'Agent triggers (MANUAL or SCHEDULED only). Defaults: ASSIGN_TASK for tasks, DIRECT_MESSAGE, MENTION always included',
                      },
                      rules: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            condition: { type: 'string' },
                            action: { type: 'string' },
                          },
                        },
                        description: 'Business rules',
                      },
                      modelConfig: {
                        type: 'object',
                        properties: {
                          modelId: { type: 'string' },
                          temperature: { type: 'number' },
                          maxTokens: { type: 'number' },
                        },
                        description: 'AI model configuration',
                      },
                      confidenceScore: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'How complete/confident is this extraction (0-100)',
                      },
                      scopeType: {
                        type: 'string',
                        enum: ['workspace', 'space', 'project', 'team', 'portable'],
                        description: 'The operational scope of the agent',
                      },
                      isPortable: {
                        type: 'boolean',
                        description: 'Whether this is a portable template/marketplace agent',
                      },
                    },
                    required: ['confidenceScore'],
                  },
                },
              },
            ],
            tool_choice: { type: 'function', function: { name: 'extract_agent_configuration' } },
          })
        ),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryable: (error) => this.errorClassifier.classify(error).recoverable,
        }
      );

      const toolCall = extractionCompletion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'extract_agent_configuration') {
        let extracted: ExtractedConfiguration;
        try {
          const rawParsed = extractJson(toolCall.function.arguments);

          // Filter suggestedSkills to only valid names before schema parse
          if (Array.isArray(rawParsed.suggestedSkills)) {
            const validSkillNames = new Set(BUILT_IN_SKILLS.map(s => s.name));
            rawParsed.suggestedSkills = rawParsed.suggestedSkills.filter(
              (s: string) => validSkillNames.has(s)
            );
          }

          extracted = ExtractedConfigurationSchema.parse(rawParsed) as ExtractedConfiguration;

          // Validate extracted config
          const validationResult = this.validator.validateExtractedConfig(extracted);
          if (!validationResult.valid) {
            console.warn('[ConfigurationExtractor] Validation errors:', validationResult.errors);
          }

          // Detect hallucinations
          const hallucinations = this.validator.detectHallucinations(extracted, message);
          if (hallucinations.length > 0) {
            console.warn('[ConfigurationExtractor] Hallucination warnings:', hallucinations);
          }

          console.log('[ConfigurationExtractor] Extracted configuration:', {
            conversationId,
            userId,
            confidenceScore: extracted.confidenceScore,
            fields: Object.keys(extracted).filter(k => extracted[k as keyof ExtractedConfiguration] !== undefined),
            triggersCount: extracted.triggers?.length || 0,
            suggestedSkills: extracted.suggestedSkills,
            skillConfidence: extracted.skillInferenceConfidence,
          });

          // Track usage — fire and forget
          countAgentTokens(
            extractionMessages as Array<{ role: string; content: string }>,
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
              console.error('Failed to update usage for extraction:', error);
            }
          }).catch(() => { });

          // Cache result
          await this.responseCache.cacheExtractedConfiguration(cacheKey, extracted);

          return extracted;
        } catch (parseError) {
          console.error('[ConfigurationExtractor] Failed to parse/validate extracted configuration:', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            conversationId,
            userId,
            rawArgs: toolCall.function.arguments?.substring(0, 200),
          });
          return { confidenceScore: 0 };
        }
      }
    } catch (error) {
      const errorId = randomBytes(8).toString('hex');
      const errorClass = this.errorClassifier.classify(error as Error);

      console.error(`[${errorId}] ConfigurationExtractor failed:`, error);

      if (!errorClass.recoverable) {
        throw new Error(`Configuration extraction failed: ${errorClass.type}. Error ID: ${errorId}`);
      }

      return { confidenceScore: 0 };
    }

    return { confidenceScore: 0 };
  }
}
