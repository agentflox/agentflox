/**
 * Stage Orchestrator
 * 
 * Orchestrates stage progression logic for agent builder conversations.
 * Handles stage determination and progression decisions.
 */

import { ConversationStage, AgentDraft } from '../state/agentBuilderStateService';
import { ExtractedConfiguration } from '../validation/configurationValidator';
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import {
  checkAgentTokenLimit,
  updateAgentUsage,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { CircuitBreaker, RetryHandler, ErrorClassifier } from '@/utils/circuitBreaker';
import { StageReadinessSchema } from '../types/schemas';
import { randomBytes } from 'crypto';

export interface StageReadinessAssessment {
  isReady: boolean;
  missingFields: string[];
  completionPercentage: number;
  criticalIssues: string[];
  recommendations: string[];
  canProceed: boolean;
  userFriendlyMessage: string;
}

export interface StageRequirements {
  required: string[];
  recommended: string[];
  critical: string[];
}

export class StageOrchestrator {
  private readonly tokenBudgetManager: TokenBudgetManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly errorClassifier: ErrorClassifier;

  constructor(
    private readonly stageRequirements: Record<ConversationStage, StageRequirements>
  ) {
    this.tokenBudgetManager = new TokenBudgetManager();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3,
    });
    this.retryHandler = new RetryHandler();
    this.errorClassifier = new ErrorClassifier();
  }

  /**
   * Determine stage progression based on current state and extracted configuration
   */
  async determineStageProgression(
    currentStage: ConversationStage,
    draft: AgentDraft,
    conversationHistory: Array<{ role: string; content: string }>,
    userMessage: string,
    extractedConfig: ExtractedConfiguration,
    userId: string
  ): Promise<{ nextStage: ConversationStage; reasoning: string }> {
    const stageOrder: ConversationStage[] = [
      'initialization',
      'configuration',
      'launch',
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const possibleNextStages = stageOrder.slice(currentIndex, currentIndex + 3); // Current + next 2 stages

    // Compress conversation history to reduce token usage
    const compressedHistory = await this.tokenBudgetManager.compressIfNeeded(
      conversationHistory,
      this.tokenBudgetManager.getBudget('stageProgression') * 0.3 // Use 30% of budget for history
    );

    // Build minimal draft summary (only fields relevant to stage progression)
    const draftSummary: Record<string, any> = {};
    const requirements = this.stageRequirements[currentStage];
    for (const field of [...requirements.required, ...requirements.recommended]) {
      if (draft[field as keyof AgentDraft]) {
        draftSummary[field] = draft[field as keyof AgentDraft];
      }
    }

    // Build minimal extracted config summary (only confidence and key fields)
    const extractedSummary: Record<string, any> = {
      confidenceScore: extractedConfig.confidenceScore,
    };
    if (extractedConfig.name) extractedSummary.name = extractedConfig.name;
    if (extractedConfig.systemPrompt) extractedSummary.hasSystemPrompt = true;
    if (extractedConfig.agentType) extractedSummary.agentType = extractedConfig.agentType;

    const progressionMessages = [
      {
        role: 'system' as const,
        content: `Determine stage progression. Current: ${currentStage}, Possible: ${possibleNextStages.join(', ')}

Draft: ${JSON.stringify(draftSummary)}
Extracted: ${JSON.stringify(extractedSummary)}
Requirements: ${JSON.stringify(requirements)}

Decision:
- STAY if: clarifying, revising, missing requirements, confusion, or if you need to ask a specific question to get more info.
- MOVE if: requirements met, user confirmed, ready, asking next-stage topics
- SKIP if: multiple stages info provided upfront

Return stage and brief reasoning. If STAYing, explain what specific info is needed.`,
      },
      {
        role: 'user' as const,
        content: `Message: "${userMessage}"

Recent context:
${compressedHistory.history.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 150)}`).join('\n')}

Should we stay in "${currentStage}" or progress?`,
      },
    ];
    const model = await fetchModel();

    // Use token budget manager for more accurate estimation
    const maxOutputTokens = this.tokenBudgetManager.getBudget('stageProgression');
    const estimatedInputTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(progressionMessages));
    const estimatedTotalTokens = estimatedInputTokens + maxOutputTokens;
    const budgetCheck = await this.tokenBudgetManager.checkBudget('stageProgression', maxOutputTokens);

    // Check token limit and budget (silently stay in current stage if not enough)
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTotalTokens);
    if (!tokenCheck.allowed || !budgetCheck.allowed) {
      console.warn('Insufficient tokens or budget exceeded for stage progression analysis, staying in current stage', {
        tokenCheck: tokenCheck.allowed,
        budgetCheck: budgetCheck.allowed,
        recommendation: budgetCheck.recommendation,
      });
      return { nextStage: currentStage, reasoning: 'Insufficient tokens or budget exceeded' };
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: progressionMessages,
        temperature: 0.3,
        max_completion_tokens: maxOutputTokens,
        tools: [
          {
            type: 'function',
            function: {
              name: 'determine_stage',
              description: 'Determine the appropriate conversation stage',
              parameters: {
                type: 'object',
                properties: {
                  stage: {
                    type: 'string',
                    enum: stageOrder,
                    description: 'The stage to move to (or stay in)',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation for the stage decision',
                  },
                  shouldStay: {
                    type: 'boolean',
                    description: 'True if we should stay in current stage, false if we should progress',
                  },
                },
                required: ['stage', 'reasoning', 'shouldStay'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'determine_stage' } },
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'determine_stage') {
        const result = JSON.parse(toolCall.function.arguments);

        // Track usage
        countAgentTokens(
          progressionMessages as Array<{ role: string; content: string }>,
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
            console.error('Failed to update usage for stage progression:', error);
          }
        }).catch(() => { });

        console.log(`[StageOrchestrator] Stage progression decision: ${currentStage} -> ${result.stage} (${result.reasoning})`);

        // ENFORCEMENT: Strictly validate that target stage requirements are met
        if (result.stage !== currentStage) {
          const targetStage = result.stage as ConversationStage;
          const targetRequirements = this.stageRequirements[targetStage];
          if (targetRequirements) {
            const readiness = this.getBasicReadinessAssessment(targetStage, draft, targetRequirements);
            if (!readiness.isReady) {
              console.warn(`[StageOrchestrator] LLM tried to advance to ${targetStage} but draft is missing: ${readiness.missingFields.join(', ')}. Forcing retention in ${currentStage}.`);
              return {
                nextStage: currentStage,
                reasoning: `Configuration incomplete. Still missing: ${readiness.missingFields.join(', ')}. Asking user for details.`,
              };
            }
          }
        }

        return {
          nextStage: result.stage as ConversationStage,
          reasoning: result.reasoning,
        };
      }

      // If no tool call or wrong function, fallback to current stage
      return { nextStage: currentStage, reasoning: 'Fallback: staying in current stage' };
    } catch (error) {
      const errorId = randomBytes(8).toString('hex');
      const errorClass = this.errorClassifier.classify(error as Error);

      console.error(`[${errorId}] Failed to determine stage progression:`, error);

      // For stage progression, fallback is safe - just stay in current stage
      console.warn(`[StageOrchestrator] Stage progression analysis failed, staying in current stage. Error ID: ${errorId}`);

      return {
        nextStage: currentStage,
        reasoning: `Stage progression analysis failed (${errorClass.type}). Staying in current stage. Error ID: ${errorId}`
      };
    }
  }

  /**
   * Assess stage readiness with detailed feedback
   */
  async assessStageReadiness(
    targetStage: ConversationStage,
    draft: AgentDraft,
    userId: string
  ): Promise<StageReadinessAssessment> {
    const requirements = this.stageRequirements[targetStage];

    // Build minimal draft summary (only fields relevant to requirements)
    const draftSummary: Record<string, any> = {};
    const allRelevantFields = [...requirements.required, ...requirements.recommended, ...requirements.critical];
    for (const field of allRelevantFields) {
      const value = draft[field as keyof AgentDraft];
      if (value !== undefined && value !== null) {
        // For arrays, just include length or first few items
        if (Array.isArray(value)) {
          draftSummary[field] = value.length > 0 ? (value.length > 3 ? `${value.slice(0, 3).join(', ')}... (${value.length} total)` : value.join(', ')) : 'empty';
        } else if (typeof value === 'object') {
          // For objects, just include key count or essential keys
          const keys = Object.keys(value);
          draftSummary[field] = keys.length > 0 ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}` : 'empty';
        } else {
          draftSummary[field] = value;
        }
      }
    }

    const assessmentMessages = [
      {
        role: 'system' as const,
        content: `Assess readiness for "${targetStage}" stage.

Requirements:
- Required: ${requirements.required.join(', ') || 'None'}
- Recommended: ${requirements.recommended.join(', ') || 'None'}
- Critical: ${requirements.critical.join(', ') || 'None'}

Draft: ${JSON.stringify(draftSummary)}

Provide: missingFields, completionPercentage, criticalIssues, recommendations, canProceed, userFriendlyMessage.`,
      },
    ];

    const model = await fetchModel();
    // Use token budget manager for more accurate estimation
    const estimatedTokens = this.tokenBudgetManager.estimateTokens(JSON.stringify(assessmentMessages)) + 400;
    const budgetCheck = await this.tokenBudgetManager.checkBudget('readiness', estimatedTokens);

    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed || !budgetCheck.allowed) {
      console.warn('Insufficient tokens or budget exceeded for readiness assessment, using simple check', {
        tokenCheck: tokenCheck.allowed,
        budgetCheck: budgetCheck.allowed,
      });
      return this.getBasicReadinessAssessment(targetStage, draft, requirements);
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: assessmentMessages,
        temperature: 0.3,
        max_completion_tokens: 400,
        tools: [
          {
            type: 'function',
            function: {
              name: 'assess_stage_readiness',
              description: 'Assess if configuration is ready for target stage',
              parameters: {
                type: 'object',
                properties: {
                  isReady: { type: 'boolean', description: 'Is fully ready for stage' },
                  missingFields: { type: 'array', items: { type: 'string' } },
                  completionPercentage: { type: 'number', minimum: 0, maximum: 100 },
                  criticalIssues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  canProceed: { type: 'boolean', description: 'Can proceed despite issues' },
                  userFriendlyMessage: { type: 'string', description: 'Professional message to user' },
                },
                required: ['isReady', 'missingFields', 'completionPercentage', 'criticalIssues', 'recommendations', 'canProceed', 'userFriendlyMessage'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'assess_stage_readiness' } },
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'assess_stage_readiness') {
        const parsed = JSON.parse(toolCall.function.arguments);
        const validated = StageReadinessSchema.parse(parsed);

        // Track usage
        countAgentTokens(
          assessmentMessages as Array<{ role: string; content: string }>,
          toolCall.function.arguments,
          model.name
        ).then(async (tokenCount) => {
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
        }).catch(() => { });

        return validated;
      }
    } catch (error) {
      console.error('Failed to assess stage readiness:', error);
    }

    return this.getBasicReadinessAssessment(targetStage, draft, requirements);
  }

  /**
   * Basic readiness check (fallback when AI assessment fails or tokens insufficient)
   */
  getBasicReadinessAssessment(
    targetStage: ConversationStage,
    draft: AgentDraft,
    requirements: StageRequirements
  ): StageReadinessAssessment {
    const missingFields: string[] = [];
    const criticalIssues: string[] = [];

    // Check required fields
    for (const field of requirements.required) {
      const val = draft[field as keyof AgentDraft];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        missingFields.push(field);
        if (requirements.critical.includes(field)) {
          criticalIssues.push(`Missing critical field: ${field}`);
        }
      }
    }
    const totalFields = requirements.required.length + requirements.recommended.length;
    const completedFields = totalFields - missingFields.length;
    const completionPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

    const isReady = missingFields.length === 0;
    const canProceed = criticalIssues.length === 0;

    let userFriendlyMessage = '';
    if (isReady) {
      userFriendlyMessage = `🎉 Excellent! Your agent configuration is solid. You're all set to move on to the ${targetStage} stage.`;
    } else if (canProceed) {
      userFriendlyMessage = `👍 Good progress! Your agent is ${completionPercentage}% ready. You can move forward now, but adding ${missingFields.slice(0, 3).join(', ')} would make it even better.`;
    } else {
      userFriendlyMessage = `🚧 Almost there! To unlock the ${targetStage} stage, we just need a few key details: ${missingFields.filter(f => requirements.critical.includes(f)).join(', ')}.`;
    }

    const recommendations: string[] = [];
    if (!isReady) {
      for (const field of missingFields) {
        if (requirements.recommended.includes(field)) {
          recommendations.push(`💡 Tip: Adding ${field} will help your agent perform better.`);
        }
      }
    }

    return {
      isReady,
      missingFields,
      completionPercentage,
      criticalIssues,
      recommendations,
      canProceed,
      userFriendlyMessage,
    };
  }
}

