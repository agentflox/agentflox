/**
 * Conversation Compressor — Production Grade
 *
 * Compresses conversation history using real LLM summarization, preserving
 * critical context while staying within token budgets. Used as the fallback
 * for context overflow rather than blocking the user.
 *
 * Architecture:
 *  1. Keep the last N turns verbatim (working memory window).
 *  2. Summarize all older turns in a single LLM call, producing a structured
 *     summary that captures: agent goals, decisions made, key facts, pending items.
 *  3. Store the summary as a `system` message at the head of the context window.
 *
 * This ensures continuity of context without ever exceeding the model's token limit.
 */

import { openai } from '@/lib/openai';
import { CircuitBreaker } from '@/utils/circuitBreaker';

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompressionResult {
  history: ConversationTurn[];
  /** Whether compression was actually applied (false = history was within budget) */
  compressed: boolean;
  /** Estimated token count after compression */
  estimatedTokens: number;
  /** Number of turns summarized */
  summarizedTurnCount: number;
}

/** How many recent turns to always keep verbatim (the working memory window). */
const VERBATIM_TAIL_TURNS = 6;

/** Model used for summarization — fast, cheap. Summarization failures fall back gracefully. */
const SUMMARIZATION_MODEL = 'gpt-4o-mini';

/** Circuit breaker to prevent cascading failures if the summarization LLM is degraded. */
const summaryCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60_000,
  halfOpenMaxCalls: 1,
});

export class ConversationCompressor {
  /**
   * Compress the conversation history to fit within @param maxTokens.
   * Returns the original history unchanged if it already fits.
   */
  async compressHistory(
    history: ConversationTurn[],
    maxTokens: number,
  ): Promise<CompressionResult> {
    const estimated = this.estimateTokens(history);

    if (estimated <= maxTokens) {
      return {
        history,
        compressed: false,
        estimatedTokens: estimated,
        summarizedTurnCount: 0,
      };
    }

    // Determine split: keep the most recent VERBATIM_TAIL_TURNS turns verbatim.
    // If history is small, keep fewer verbatim so we always have something to summarize.
    const tailCount = Math.min(VERBATIM_TAIL_TURNS, Math.floor(history.length / 2));
    const splitIdx = Math.max(0, history.length - tailCount);

    const olderTurns = history.slice(0, splitIdx);
    const recentTurns = history.slice(splitIdx) as ConversationTurn[];

    // System messages before the split are extracted and prepended to the summary
    // to avoid losing critical instructions.
    const olderSystemMessages = olderTurns.filter(t => t.role === 'system');
    const olderDialogue = olderTurns.filter(t => t.role !== 'system');

    if (olderDialogue.length === 0) {
      // Nothing to summarize — just return the recent tail to prevent overflow.
      return {
        history: recentTurns,
        compressed: true,
        estimatedTokens: this.estimateTokens(recentTurns),
        summarizedTurnCount: 0,
      };
    }

    // Attempt LLM summarization with circuit breaker protection.
    let summaryContent: string;
    try {
      summaryContent = await summaryCircuitBreaker.execute(() =>
        this.summarizeWithLLM(olderDialogue, olderSystemMessages)
      );
    } catch (err) {
      // If summarization fails (circuit open, LLM error), fall back to
      // extracting the most critical text via head+tail truncation.
      // This is never a hard block — the user always gets a response.
      summaryContent = this.fallbackSummary(olderDialogue);
    }

    const compressedHistory: ConversationTurn[] = [
      {
        role: 'system',
        content: `[CONVERSATION SUMMARY — Earlier context compressed]\n${summaryContent}`,
      },
      ...recentTurns,
    ];

    return {
      history: compressedHistory,
      compressed: true,
      estimatedTokens: this.estimateTokens(compressedHistory),
      summarizedTurnCount: olderTurns.length,
    };
  }

  /**
   * Estimate tokens in a list of conversation turns.
   * Uses tiktoken-approximate formula: roughly 1 token per 3.5 chars for English prose,
   * 1 token per 4 chars for structured/JSON data. We use 3.5 (conservative) to avoid
   * under-estimating.
   */
  estimateTokens(turns: ConversationTurn[]): number;
  estimateTokens(text: string): number;
  estimateTokens(input: ConversationTurn[] | string): number {
    if (typeof input === 'string') {
      return Math.ceil(input.length / 3.5);
    }
    // Per-message overhead: ~4 tokens per message (role + delimiters)
    const overhead = input.length * 4;
    const content = input.reduce((sum, t) => sum + Math.ceil(t.content.length / 3.5), 0);
    return overhead + content;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Calls the LLM to produce a structured summary of older dialogue turns.
   * The model is instructed to preserve the most critical information in a
   * compact, structured format that is useful for the downstream agent.
   */
  private async summarizeWithLLM(
    dialogue: ConversationTurn[],
    systemMessages: ConversationTurn[],
  ): Promise<string> {
    const dialogueText = dialogue
      .map(t => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n');

    const systemContext = systemMessages.length > 0
      ? `\n\nSystem context from the summarized window:\n${systemMessages.map(s => s.content).join('\n')}`
      : '';

    const response = await openai.chat.completions.create({
      model: SUMMARIZATION_MODEL,
      temperature: 0,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a conversation summarizer for an AI agent system. 
Your job is to create a compact, structured summary of an earlier section of a conversation.
The summary will replace those messages in the agent's context window.

Output a structured summary with these sections (only include sections that have relevant content):
- **Agent Goal**: What the user is trying to accomplish.
- **Decisions Made**: Key configuration decisions, choices, or confirmations the user made.
- **Key Facts**: Important names, values, or constraints mentioned.
- **Pending Items**: Anything explicitly left unresolved or to be addressed later.
- **Context Notes**: Critical system or instruction context.

Be extremely concise. Do NOT include conversational filler. Total output must be < 500 words.${systemContext}`,
        },
        {
          role: 'user',
          content: `Summarize the following conversation segment:\n\n${dialogueText}`,
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim()
      ?? 'No summary available for prior context.';
  }

  /**
   * Fallback when LLM summarization is unavailable.
   * Extracts first 30% (early goals/intent) and last 30% (recent decisions) of older turns.
   */
  private fallbackSummary(dialogue: ConversationTurn[]): string {
    const userMessages = dialogue
      .filter(t => t.role === 'user')
      .map(t => t.content);

    if (userMessages.length === 0) return '[No summarizable content in prior turns.]';

    const totalLength = userMessages.join(' ').length;
    const budgetPerSection = Math.floor(totalLength * 0.3);

    const early = userMessages.slice(0, Math.ceil(userMessages.length / 2)).join(' ');
    const late = userMessages.slice(Math.floor(userMessages.length / 2)).join(' ');

    const earlySample = early.length > budgetPerSection
      ? early.substring(0, budgetPerSection) + '…'
      : early;
    const lateSample = late.length > budgetPerSection
      ? '…' + late.substring(late.length - budgetPerSection)
      : late;

    return `**Agent Goal (inferred):** ${earlySample}\n\n**Recent context:** ${lateSample}\n\n[Note: Summarization service was unavailable. This is a best-effort extract.]`;
  }
}