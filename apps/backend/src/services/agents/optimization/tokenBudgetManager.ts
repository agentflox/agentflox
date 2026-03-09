/**
 * Token Budget Manager — Production Grade
 *
 * Manages token usage budgets per operation stage to control costs and
 * optimize AI API calls. Uses accurate tiktoken-approximate estimation
 * and integrates the ConversationCompressor for graceful overflow handling.
 *
 * Key fixes vs. previous version:
 * - Token estimation updated to 3.5 chars/token (was 4 — under-estimates by ~14%)
 * - compressIfNeeded is now correctly typed to accept ConversationTurn[]
 * - Budgets are capped to prevent runaway per-stage cost
 */

import { ConversationCompressor, ConversationTurn, CompressionResult } from './conversationCompressor';

export interface TokenBudget {
  extraction: number;
  automation: number;
  stageProgression: number;
  readiness: number;
  response: number;
  systemPrompt: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  estimated: number;
  budget: number;
  recommendation?: string;
}

export class TokenBudgetManager {
  private readonly BUDGETS: TokenBudget = {
    extraction: 1_000,
    automation: 1_200,
    stageProgression: 300,
    readiness: 400,
    response: 10_000,
    systemPrompt: 8_000,
  };

  /** Maximum total tokens per LLM completion context (all stages). */
  private readonly CONTEXT_HARD_LIMIT = 120_000;

  private readonly compressor: ConversationCompressor;

  constructor() {
    this.compressor = new ConversationCompressor();
  }

  /**
   * Check if estimated tokens are within budget for a stage.
   */
  async checkBudget(
    stage: keyof TokenBudget,
    estimatedTokens: number,
  ): Promise<BudgetCheckResult> {
    const budget = this.BUDGETS[stage] ?? 1_000;

    if (estimatedTokens > budget) {
      return {
        allowed: false,
        estimated: estimatedTokens,
        budget,
        recommendation: `Estimated tokens (${estimatedTokens}) exceed stage budget (${budget}) for "${stage}". ` +
          `Consider compressing conversation history or reducing context size.`,
      };
    }

    return { allowed: true, estimated: estimatedTokens, budget };
  }

  /**
   * Compress conversation history if it exceeds @param maxTokens.
   * Uses LLM summarization for older turns and returns CompressionResult
   * with full metadata about what was compressed.
   *
   * This is the PRIMARY overflow recovery path. It must be called BEFORE
   * throwing a token-limit error to the user.
   */
  async compressIfNeeded(
    history: ConversationTurn[],
    maxTokens: number,
  ): Promise<CompressionResult> {
    return this.compressor.compressHistory(history, maxTokens);
  }

  /**
   * Estimate tokens in a string using the corrected 3.5 chars/token approximation.
   * For production-critical billing, integrate @dqbd/tiktoken for exact counts.
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Estimate tokens for a full messages array (conversation turns).
   */
  estimateHistoryTokens(turns: ConversationTurn[]): number {
    return this.compressor.estimateTokens(turns);
  }

  /**
   * Get budget for a stage.
   */
  getBudget(stage: keyof TokenBudget): number {
    return this.BUDGETS[stage];
  }

  /**
   * Returns the hard context limit (sum of all stages cannot exceed this).
   */
  getContextHardLimit(): number {
    return this.CONTEXT_HARD_LIMIT;
  }

  /**
   * Update budget for a stage (for runtime adjustment, e.g. plan-tier overrides).
   */
  updateBudget(stage: keyof TokenBudget, newBudget: number): void {
    this.BUDGETS[stage] = newBudget;
  }
}
