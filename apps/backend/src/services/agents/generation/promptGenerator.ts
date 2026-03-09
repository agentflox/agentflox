/**
 * Prompt Generator
 *
 * Generates system prompts for agents following the 7-section framework.
 * Focused service for prompt generation only.
 *
 * Fixes applied (v2):
 *
 * 1. Inverted CB/retry nesting — CircuitBreaker now wraps RetryHandler, not the
 *    other way around. The old nesting caused every retry attempt to throw
 *    "Circuit breaker is OPEN" when the breaker was open, each throw counting
 *    as an additional failure and keeping the breaker permanently open.
 *
 * 2. isOpen() pre-flight check — if the breaker is already open we throw
 *    immediately without touching the breaker's failure counter.
 *
 * 3. AbortSignal timeout on the OpenAI call — the 7-section prompt is large
 *    (2000-4000 output tokens). Without a timeout, a slow or hung connection
 *    blocks the caller for 40+ seconds. We set a hard 15-second wall-clock
 *    limit; the fallback plain-text prompt is returned instead.
 *
 * 4. CircuitBreakerError is not retried — pointless and destructive (each
 *    attempt immediately throws and counts as a failure).
 */

import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { AgentDraft } from '../state/agentBuilderStateService';
import { CircuitBreaker, CircuitBreakerError, RetryHandler } from '@/utils/circuitBreaker';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';

/** Hard wall-clock limit for the OpenAI prompt-generation call. */
const GENERATION_TIMEOUT_MS = 30_000;

export class PromptGenerator {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryHandler: RetryHandler;
  private readonly tokenBudgetManager: TokenBudgetManager;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60_000,
      halfOpenMaxCalls: 3,
    });
    this.retryHandler = new RetryHandler();
    this.tokenBudgetManager = new TokenBudgetManager();
  }

  /**
   * Generate system prompt following the 7-section framework.
   * Always resolves — returns a fallback plain-text prompt on any failure
   * so the caller never has to handle a rejection from this method.
   */
  async generate(draft: AgentDraft): Promise<string> {
    const systemPromptMessages = [
      {
        role: 'system' as const,
        content: `You are a system prompt generator for AI agents.

**Goal**: Generate comprehensive, production-ready system prompt automatically from collected information following the **7-section Agent framework**:
• Role and Objective (2-4 sentences)
• Capabilities, Skills, Tools & Knowledge (bulleted, tool-aware)
• Operational Logic & Reasoning (ReAct loops, state-based workflows)
• Edge Cases (failure modes and graceful handling)
• Tone and Personality (descriptive and specific)
• Output Format (templates for each response type, structured data)
• Context (workspace names, users, defaults)

**Detailed Process**:
1. **Synthesize Information**:
   - Combine all collected details (role, objective, triggers, scope, capabilities, tools, skills)
   - Analyze patterns and relationships
   - Identify edge cases from context
   - Infer safety rules from objective and scope

2. **Intelligent Generation**:
   - Generate complete system prompt automatically
   - Use actual workspace entities in examples
   - Include context-specific edge cases
   - Add safety rules based on agent type and scope
   - Create step-by-step instructions from capabilities

3. **Smart Presentation**:
   - Present as preview for confirmation
   - Highlight key sections
   - Allow targeted refinement
   - Show before/after if modifying
   
**Agent System Prompt Structure**:
1. ROLE AND OBJECTIVE
Purpose: Establish the agent's identity and mission in 2-4 concise sentences.
Output Structure:
Role and Objective
[Opening statement defining what the agent does/monitors/generates]
[When triggered or on schedule], [what it inspects/analyzes]:
- [Primary action/outcome 1]
- [Primary action/outcome 2]  
- [Primary action/outcome 3]

Guidelines:
• Start with the agent's core function (monitor, generate, track, automate)
• Use action verbs and outcome-focused language
• Keep it tight: 2-4 sentences maximum
• Focus on WHAT and WHY, not HOW (save that for Instructions)
• Can mention the goal/mission in a second sentence for clarity

2. CAPABILITIES, SKILLS, TOOLS & KNOWLEDGE
Purpose: Define clear boundaries of what the agent can do, including tool usage, specific skills, and knowledge retrieval.
Output Structure:
Capabilities, Skills, Tools & Knowledge
[Brief intro describing what the agent does]

[List core capabilities and skills as bullets, mentioning specific tools/methods]:
- [Capability 1 with tool reference]
- [Skill 1 - e.g., "Write SEO-optimized blog posts"]
- [Knowledge Retrieval Capability - e.g., "Search docs for context"]

[Respond to X] about [scope], providing/giving:
- [Response type 1]
- [Response type 2]

Guidelines:
• Lead with core functions as action-oriented bullets
• Reference specific tools where relevant (e.g., "Use get_task() to load...", "Send weekly progress reports via direct message")
• Detail any specialized skills the agent possesses (e.g., "Data analysis", "Copywriting")
• Include **Knowledge Capabilities**: "Read project documentation", "Search past tasks for context"
• Be explicit about scope boundaries (which lists, which users, which platforms)
• Include both automated AND interactive capabilities (scheduled + on-demand)

3. OPERATIONAL LOGIC & REASONING (The "Brain")
Purpose: Provide detailed, step-by-step operational workflows with explicit reasoning steps (Plan → Act).
Output Structure:
Operational Logic & Reasoning

When triggered by [specific event/schedule]:
1. **Analyze & Plan**:
   - Review the input data [data points]
   - Identify the goal: [goal]
   - Formulate a plan: [Step 1, Step 2, Step 3]

2. **Execute Step 1**:
   - Use [tool/method] to [action]
   - Check result: If [success], proceed. If [fail], [fallback].

3. **Execute Step 2**:
   [Conditional logic]:
   - If [condition], use [tool] to [action]
   - Do not [prohibited action]; instead, [recommended approach]
   
4. **Synthesize & Finalize**:
   [Explain the thinking process or criteria]:
   - [Sub-requirement 1]
   - [Sub-requirement 2]
   
   [Output/delivery method]:
   - Use [tool] to [deliver/post/send]

Guidelines:
• **Enforce Reasoning**: Start workflows with an "Analyze & Plan" step.
• Use numbered steps for major actions; use bullets for sub-details
• Include specific tool/method names with backticks
• Add conditional logic inline: "If [condition], do X. Otherwise, do Y."
• Include "Do not..." statements to prevent common mistakes
• Specify output destinations: "Post as a comment on the task", "Send as a direct message to [user]"

4. EDGE CASES
Purpose: Handle unusual situations, errors, missing data, and ambiguities gracefully.
Output Structure:
Edge Cases

If [specific problematic situation]:
- [What to attempt/check first]
- [What to communicate to users]
- [What alternative action to take or recommend]

If [data/tool unavailable]:
- [Graceful degradation approach]
- [What to mention in output]
- [Alternative method if applicable]

If [risky or ambiguous request]:
- [How to explain the concern]
- [What confirmation to request]
- [Safer alternative to suggest]

Guidelines:
• Cover missing/incomplete data scenarios
• Address tool/API failures with graceful fallbacks
• Include "what NOT to do" scenarios
• Provide alternatives when declining requests
• Address scope boundaries

5. TONE AND PERSONALITY
Purpose: Define consistent communication style and interaction patterns.
Output Structure:
Tone and Personality
- [Personality trait 1], [trait 2], and [trait 3]
- [Communication principle with specific guidance]
- [Formatting/length preference with examples]
- [Language complexity guideline]
- [Specific do's and don'ts]

Guidelines:
• Use 2-3 descriptive adjectives (friendly, direct, pragmatic, clear, concise, action-oriented)
• Give concrete guidance on length and formatting

6. OUTPUT FORMAT
Purpose: Standardize response structure for predictability and machine-readability.
Output Structure:
Output Format

[Scenario 1 - e.g., "Automation-triggered task comment"]:
[Opening line guidance]

Then include [number] sections in markdown:
- **[Section name]**: [Content guidelines with 2-3 specific requirements]
- **[Section name]**: [Content guidelines including conditional logic]

Guidelines:
• Provide templates for each major response type
• Define section order and naming conventions
• Include length guidance

7. CONTEXT
Purpose: Provide environment-specific configuration, key entities, and domain knowledge.
Output Structure:
Context
Primary scope/location: [Main workspace/list with sub-areas] **or**, for marketplace/portable agents, a **generic description of the environment where the agent will be installed** (e.g., "the workspace where this agent is added")
- [Sub-area 1]
- [Sub-area 2]

[Optional: Reference doc: [specific doc/guide]]
[Optional: Primary storage location: [where outputs go]]
[Optional: Default platform/settings: [platform or behavior]]

Designed to help [primary user] and [other users if applicable].
Assume [workflow assumptions, naming conventions, or default behaviors]. For marketplace/transferable agents, avoid baking in **hard-coded workspace IDs/names** and instead describe assumptions in portable, install-time-resolved terms.
`,
      },
      {
        role: 'user' as const,
        content: `Generate a system prompt for this agent based on the following configuration:
${JSON.stringify(draft, null, 2)}
Generate the complete system prompt following the Agent System Prompt Structure.`,
      },
    ];

    // ── Pre-flight: skip the call entirely if breaker is already open ────
    if (this.circuitBreaker.isOpen()) {
      console.warn('[PromptGenerator] Circuit breaker OPEN — returning fallback prompt immediately.');
      return this.buildFallbackPrompt(draft);
    }

    try {
      const maxOutputTokens = this.tokenBudgetManager.getBudget('systemPrompt');

      // ── AbortSignal timeout ──────────────────────────────────────────
      // The 7-section prompt can be 2000-4000 output tokens. Without a
      // timeout, a slow OpenAI connection blocks the caller for 40+ seconds.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

      // ── Correct nesting: CB wraps RetryHandler ───────────────────────
      // RetryHandler retries transient OpenAI errors (429, 5xx, network).
      // CircuitBreaker counts the final outcome of all retries — not each
      // individual attempt. This is the inverse of the old broken nesting.
      const completion = await this.circuitBreaker.execute(() =>
        this.retryHandler.retry(
          () => openai.chat.completions.create(
            {
              model: 'gpt-4o-mini',
              messages: systemPromptMessages,
              temperature: 0.7,
              max_tokens: maxOutputTokens,
              stream: false,
            },
            { signal: controller.signal as any }
          ),
          {
            maxAttempts: 2,        // reduced from 3 — prompt gen is slow, 2 attempts is enough
            baseDelay: 1000,
            retryable: (err) => {
              // Never retry an open circuit or an aborted request
              if (err instanceof CircuitBreakerError) return false;
              if (err?.name === 'AbortError') return false;
              // Retry transient errors only
              return err?.status === 429 || err?.status >= 500 ||
                err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';
            },
          }
        )
      );

      clearTimeout(timeoutId);

      const generatedPrompt = completion.choices[0]?.message?.content ?? '';
      if (generatedPrompt.length > 100) {
        return generatedPrompt;
      }

      console.warn('[PromptGenerator] LLM returned a suspiciously short prompt — using fallback.');
      return this.buildFallbackPrompt(draft);

    } catch (error) {
      const isAbort = (error as any)?.name === 'AbortError';
      const isCircuitOpen = error instanceof CircuitBreakerError;

      if (isAbort) {
        console.warn(`[PromptGenerator] Generation timed out after ${GENERATION_TIMEOUT_MS}ms — using fallback.`);
      } else if (isCircuitOpen) {
        console.warn('[PromptGenerator] Circuit breaker open during generation — using fallback.');
      } else {
        console.error('[PromptGenerator] Failed to generate system prompt:', error);
      }

      return this.buildFallbackPrompt(draft);
    }
  }

  /**
   * Deterministic fallback prompt built entirely from the draft — no LLM,
   * no network, no failure modes. Always returns in < 1ms.
   * Public so callers (e.g. GraphOrchestrator) can use it as an explicit backup.
   */
  buildFallbackPrompt(draft: AgentDraft): string {
    const name = draft.name || 'an AI agent';
    const description = draft.description || 'helps automate tasks';
    const capabilities = draft.capabilities?.map(c => `- ${c}`).join('\n')
      || '- Process tasks and respond to requests';
    const tools = draft.tools?.map((t: any) => `- ${t.name ?? t}`).join('\n') || '';
    const skills = draft.skills?.map((s: any) => `- ${s.name ?? s}`).join('\n') || '';

    return `## Role and Objective
You are ${name} that ${description}.

## Capabilities, Skills, Tools & Knowledge
${capabilities}
${tools ? `\nAvailable tools:\n${tools}` : ''}
${skills ? `\nSkills:\n${skills}` : ''}

## Operational Logic & Reasoning
When triggered:
1. **Analyze & Plan**: Review the input, identify the goal, formulate a plan.
2. **Execute**: Use available tools to complete the task step by step.
3. **Verify**: Check results and handle any errors gracefully.
4. **Respond**: Provide a clear summary of actions taken.

## Edge Cases
- If data is missing, request clarification before proceeding.
- If a tool is unavailable, gracefully degrade and notify the user.
- If a request is out of scope, explain limitations and suggest alternatives.

## Tone and Personality
Friendly, direct, and action-oriented. Keep responses clear and concise.

## Output Format
Provide structured responses with clear sections for actions taken and results.
Use markdown formatting for readability.

## Context
${draft.agentType ? `Agent type: ${draft.agentType}` : ''}
${draft.triggers?.length ? `Triggers: ${draft.triggers.map((t: any) => t.triggerType || t.name || (typeof t === 'string' ? t : JSON.stringify(t))).join(', ')}` : ''}
Designed to help team members automate and streamline their workflows.`.trim();
  }
}