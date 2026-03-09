
export const AGENT_CONSTANTS = {
    // System Limits
    LOCK_TIMEOUT: 60, // seconds
    RATE_LIMIT_MAX_REQUESTS: 20,
    RATE_LIMIT_WINDOW: 60, // seconds
    TOKEN_BUFFER: 500,

    // Error Codes
    ERRORS: {
        INSUFFICIENT_TOKENS: 'AGENT_INSUFFICIENT_TOKENS',
        CONVERSATION_LOCKED: 'AGENT_CONVERSATION_LOCKED',
        CONVERSATION_NOT_FOUND: 'AGENT_CONVERSATION_NOT_FOUND',
        UNAUTHORIZED: 'AGENT_UNAUTHORIZED',
        STATE_REFRESH_FAILED: 'AGENT_STATE_REFRESH_FAILED',
        COMPLETION_FAILED: 'LLM_COMPLETION_FAILED',
        INVALID_INPUT: 'INVALID_INPUT',
        RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    },

    // Intents
    INTENT: {
        BUILDER: {
            BUILD_OR_MODIFY: 'BUILD_OR_MODIFY',
            LAUNCH_AGENT: 'LAUNCH_AGENT',
            EXECUTE_ACTION: 'EXECUTE_ACTION',
            INFO_OR_QA: 'INFO_OR_QA',
        },
        OPERATOR: {
            UPDATE_CONFIG: 'UPDATE_CONFIG',
            EXECUTE_REQUEST: 'EXECUTE_REQUEST',
            GENERAL_QUERY: 'GENERAL_QUERY',
        },
        EXECUTOR: {
            EXECUTE: 'EXECUTE',
            CLARIFICATION: 'CLARIFICATION',
            IRRELEVANT: 'IRRELEVANT',
        },
    },

    // Prompts & Guardrails
    PROMPTS: {
        QUALITY_GUARDRAILS: `
QUALITY GUARDRAILS (MANDATORY)
- Be concise, factual, and action-oriented; avoid fluff.
- Reflect awareness of system state: stage, readiness, triggers, automation inference, token budget.
- Do not invent tools, triggers, automations, or data not present in context.
- Keep follow-up options <= 6, each < 150 chars, distinct and non-overlapping.
- ONLY provide follow-ups if they drive the conversation forward or offer valuable shortcuts.
- If the step is complete or a simple acknowledgement is needed, follow-ups can be empty.
- Ensure safety/policy alignment; refuse out-of-scope asks clearly.
- Provide minimal rationale inline only if helpful; avoid long monologues.
`,
        WRONG_CONTEXT_EXECUTION: `
You are the Agent {ROLE}. The user is asking to EXECUTE an action ("{MESSAGE}"), but this is the {VIEW_NAME} view, meant for {PURPOSE}.
You CANNOT execute actions here.
Instruct the user strictly to:
1. Go to the "Run" tab or "Executor" view.
2. Or mention the agent in a task/DM.
3. Or stick to {ALLOWED_ACTIONS} here.
Be helpful but firm on the boundary.
`,
    },

    // Memory Governance
    /**
     * Maximum number of conversation turns kept in working memory (Redis + LLM context).
     * Older turns are summarized via ConversationCompressor. Enforced on BOTH read and write
     * paths to prevent context overflow stonewalling.
     */
    WORKING_MEMORY_TURN_LIMIT: 20,

    // Model Governance
    /**
     * Hard ceiling on maxTokens in any agent modelConfig. Prevents runaway per-completion cost.
     * Users/LLM cannot set a value above this during agent creation or editing.
     */
    MAX_MODEL_TOKENS: 16384,

    // Tool Governance
    /**
     * Maximum number of tool invocations permitted per single agent execution.
     * Propagated into Inngest execution payload to cap runaway loops.
     */
    MAX_TOOL_INVOCATIONS_PER_EXECUTION: 20,

    // ReAct Loop Governance
    /**
     * Maximum number of Thought→Action→Observation iterations per single user turn.
     * Prevents runaway loops that churn tokens when the LLM cannot converge.
     * Both Executor and Operator share this ceiling.
     */
    REACT_MAX_ITERATIONS: 5,

    /**
     * Soft token budget for the entire ReAct loop within a single turn.
     * Estimated tokens are accumulated per iteration; when the running total
     * exceeds this value the loop is terminated early and a partial answer
     * is returned — preventing runaway cost blowouts mid-loop.
     *
     * Set to ~60% of MAX_MODEL_TOKENS so there is headroom for the final
     * response and conversation context.
     */
    LOOP_TOKEN_BUDGET: 10_000,

    /**
     * Estimated tokens consumed per ReAct iteration for the loop-budget check.
     * Acts as a floor when the real estimate is unavailable (fast path).
     */
    LOOP_TOKEN_COST_PER_ITER: 800,

    // Safety — Prompt Injection Detection
    /**
     * Regex patterns used to detect and scrub prompt injection attempts from
     * untrusted external data (e.g., tool execution outputs) before they are
     * injected into the LLM context. Pattern list should be kept current with
     * known attack vectors.
     */
    PROMPT_INJECTION_PATTERNS: [
        /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)/i,
        /system\s*prompt/i,
        /you\s+are\s+now\s+(an?\s+)?/i,
        /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/i,
        /\[INST\]|\[\/INST\]/i,
        /disregard\s+(your\s+)?(previous|prior|earlier|all)\s+(instructions?|context)/i,
        /forget\s+(everything|all|prior|previous)/i,
        /new\s+instructions?:/i,
        /act\s+as\s+(if\s+)?(you\s+are|an?\s+)/i,
        /your\s+real\s+instructions?\s+(are|is)/i,
        /jailbreak/i,
        /\bdan\b.*mode/i, // "DAN mode" jailbreak variant
    ],
};
