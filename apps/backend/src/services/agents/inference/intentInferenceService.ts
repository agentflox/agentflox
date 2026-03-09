import { AGENT_CONSTANTS } from '../constants/agentConstants';
import { fetchModel } from '@/utils/ai/fetchModel';
import { openai } from '@/lib/openai';
import { extractJson } from '@/utils/ai/jsonParsing';

export interface IntentInferenceResult {
    intent: string;
    confidence: number;
    reason: string;
}

export class IntentInferenceService {

    // ─── Keyword lists for fast pre-classification ──────────────────────────

    /** Phrases that clearly indicate a launch / go-live / deploy intent */
    private static readonly LAUNCH_KEYWORDS = [
        'launch', 'go live', 'golive', 'activate', 'deploy', 'ship it',
        'make it live', 'turn it on', 'start the agent', 'enable the agent',
        'publish', 'release', 'finalize and launch', 'ready to launch',
        'launch now', 'activate now', 'go ahead and launch', 'let\'s launch',
        'let\'s go live', 'let\'s activate', 'fire it up', 'boot it up',
        'bring it online', 'set it live', 'put it live', 'make it active',
    ];

    /** Phrases that clearly indicate a build/modify configuration intent */
    private static readonly BUILD_KEYWORDS = [
        'add a tool', 'add tool', 'change the name', 'rename', 'update the prompt',
        'modify', 'configure', 'set trigger', 'add trigger', 'change trigger',
        'add capability', 'remove capability', 'update instructions',
        'change personality', 'set scope', 'change scope', 'add knowledge',
        'make it friendlier', 'make it more', 'adjust', 'tweak',
        'refine', 'improve the prompt', 'edit', 'reconfigure',
    ];

    /**
     * Fast keyword pre-check. Returns an intent string if the message
     * clearly matches a known pattern, or null if the LLM should decide.
     */
    private preClassify(message: string): string | null {
        const lower = message.toLowerCase().trim();

        // Check launch keywords first (more specific, higher priority)
        for (const kw of IntentInferenceService.LAUNCH_KEYWORDS) {
            if (lower.includes(kw)) {
                return AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT;
            }
        }

        // Check build/modify keywords
        for (const kw of IntentInferenceService.BUILD_KEYWORDS) {
            if (lower.includes(kw)) {
                return AGENT_CONSTANTS.INTENT.BUILDER.BUILD_OR_MODIFY;
            }
        }

        return null;
    }

    /**
     * Infers the user's intent within the Builder context.
     * Distinguishes between building/modifying, launching, executing actions, and info/QA.
     *
     * Uses a three-layer approach:
     *   1. Fast keyword pre-check (no LLM cost for obvious cases)
     *   2. LLM-based classification with explicit disambiguation rules
     *   3. Post-LLM safety net to catch misclassifications
     */
    async inferBuilderIntent(
        message: string,
        history: any[]
    ): Promise<IntentInferenceResult> {

        // ── Layer 1: Fast keyword pre-check ──────────────────────────────────
        const preClassified = this.preClassify(message);
        if (preClassified) {
            return {
                intent: preClassified,
                confidence: 0.95,
                reason: `Keyword match: message clearly indicates ${preClassified}`,
            };
        }

        // ── Layer 2: LLM-based classification ────────────────────────────────
        const recentHistory = history.slice(-5).map((h: any) => `${h.role}: ${h.content}`).join('\n');
        const model = await fetchModel();

        const systemPrompt = `You are an Intent Classifier for an AI Agent Builder.
The Builder is where users CREATE, CONFIGURE, and LAUNCH agents. Your job is to classify the user's latest message into exactly one of four categories:

1. ${AGENT_CONSTANTS.INTENT.BUILDER.BUILD_OR_MODIFY}: The user wants to change configuration, add capabilities, set triggers, refine the agent, or adjust any setting. (e.g., "Add a Jira tool", "Change the name", "Make it friendlier", "Set the scope to Project X")

2. ${AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT}: The user wants to LAUNCH, DEPLOY, ACTIVATE, or GO LIVE with the agent they have been building. This is a BUILDER action—the final step of the build flow. (e.g., "Launch the agent", "Go live", "Activate it", "Deploy now", "Ship it", "Let's launch", "Make it live", "I'm ready, launch", "Yes, activate", "Turn it on", "Finalize and launch")

3. ${AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION}: The user is trying to RUN or EXECUTE a real-world task that the finished agent would perform against external data or systems. This is NOT about launching the agent itself—it's about asking the agent to do its job right now. (e.g., "Analyze this file for me", "Create a Jira ticket for bug #123", "Run the weekly report", "Send an email to the team", "Summarize yesterday's standup")

4. ${AGENT_CONSTANTS.INTENT.BUILDER.INFO_OR_QA}: The user is asking questions about the agent, the building process, or general information. (e.g., "What triggers are set?", "How does this work?", "Show me the current config", "What capabilities does it have?")

## CRITICAL DISAMBIGUATION RULES:
- "Launch the agent", "activate", "go live", "deploy", "ship it" → ALWAYS ${AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT}, NEVER ${AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION}
- "Run it", "start it" in the context of making the agent operational → ${AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT}
- "Run this report", "execute this task", "do this analysis" (asking the agent to perform its function on real data) → ${AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION}
- "Yes", "confirm", "do it", "go ahead" after compiling the configuration → ${AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT}
- Ambiguous short confirmations ("yes", "ok", "sure", "do it") should be classified based on conversation history context. If the assistant just asked about launching or finalizing, classify as ${AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT}. If the assistant asked about configuration, classify as ${AGENT_CONSTANTS.INTENT.BUILDER.BUILD_OR_MODIFY}.

Output JSON: { "intent": string, "confidence": number (0-1), "reason": string }`;

        const response = await openai.chat.completions.create({
            model: model.name,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Conversation History:\n${recentHistory}\n\nUser's Latest Message: "${message}"` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
        });

        const content = response.choices[0].message.content;
        let result: IntentInferenceResult;
        try {
            result = extractJson(content || '{}');
        } catch (e) {
            return { intent: AGENT_CONSTANTS.INTENT.BUILDER.INFO_OR_QA, confidence: 0, reason: 'Failed to parse intent' };
        }

        // ── Layer 3: Post-LLM safety net ─────────────────────────────────────
        // Guard against the LLM misclassifying launch-related phrases as EXECUTE_ACTION
        if (result.intent === AGENT_CONSTANTS.INTENT.BUILDER.EXECUTE_ACTION) {
            const lower = message.toLowerCase();
            const launchIndicators = [
                'launch', 'go live', 'activate', 'deploy', 'ship',
                'publish', 'release', 'make it live', 'turn it on',
                'bring it online', 'set it live', 'put it live', 'boot',
            ];
            const hasLaunchSignal = launchIndicators.some(kw => lower.includes(kw));

            // Also check if the last assistant message was about launch
            const lastAssistantMsg = history.filter((h: any) => h.role === 'assistant').slice(-1)[0];
            const assistantMentionedLaunch = lastAssistantMsg?.content?.toLowerCase()?.match(
                /launch|go live|activate|ready to launch|finalize|deploy|confirm/
            );

            if (hasLaunchSignal || (assistantMentionedLaunch && lower.match(/^(yes|ok|sure|confirm|do it|go ahead|let'?s? do it|absolutely|yep|yeah)/))) {
                return {
                    intent: AGENT_CONSTANTS.INTENT.BUILDER.LAUNCH_AGENT,
                    confidence: 0.9,
                    reason: `Safety net override: message contains launch-related language but was misclassified as EXECUTE_ACTION. Original reason: ${result.reason}`,
                };
            }
        }

        return result;
    }

    /**
     * Infers the user's intent within the Operator context.
     * Similar to Builder but focused on Operator capabilities.
     */
    async inferOperatorIntent(
        message: string,
        history: any[]
    ): Promise<IntentInferenceResult> {
        const recentHistory = history.slice(-5).map((h: any) => `${h.role}: ${h.content}`).join('\n');
        const model = await fetchModel();

        const systemPrompt = `You are an Intent Classifier for an AI Agent Operator.
Your goal is to classify the user's latest message:

1. ${AGENT_CONSTANTS.INTENT.OPERATOR.UPDATE_CONFIG}: User wants to update/patch the agent's config. (e.g., "Change the prompt", "Add tool")
2. ${AGENT_CONSTANTS.INTENT.OPERATOR.EXECUTE_REQUEST}: User wants to RUN the agent. (e.g., "Run now", "Do the task") - Operator can trigger dry runs, but primary execution is Executor.
3. ${AGENT_CONSTANTS.INTENT.OPERATOR.GENERAL_QUERY}: Questions about the agent.

Output JSON: { "intent": string, "confidence": number, "reason": string }`;

        const response = await openai.chat.completions.create({
            model: model.name,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `History:\n${recentHistory}\n\nUser Message: ${message}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
        });

        const content = response.choices[0].message.content;
        try {
            return extractJson(content || '{}');
        } catch (e) {
            return { intent: AGENT_CONSTANTS.INTENT.OPERATOR.GENERAL_QUERY, confidence: 0, reason: 'Failed to parse intent' };
        }
    }

    /**
     * Infers the user's intent within the Executor context.
     */
    async inferExecutorIntent(
        message: string,
        history: any[]
    ): Promise<IntentInferenceResult> {
        const recentHistory = history.slice(-5).map((h: any) => `${h.role}: ${h.content}`).join('\n');
        const model = await fetchModel();

        const systemPrompt = `You are an Intent Classifier for an AI Agent Executor.
Your goal is to classify the user's latest message:

1. ${AGENT_CONSTANTS.INTENT.EXECUTOR.EXECUTE}: The user wants to run the agent or provide input for execution.
2. ${AGENT_CONSTANTS.INTENT.EXECUTOR.CLARIFICATION}: The user is providing specific details for a run or answering a question.
3. ${AGENT_CONSTANTS.INTENT.EXECUTOR.IRRELEVANT}: The user is asking to MODIFY the agent (e.g., "Change your prompt"), which is NOT allowed here.

Output JSON: { "intent": string, "confidence": number, "reason": string }`;

        const response = await openai.chat.completions.create({
            model: model.name,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `History:\n${recentHistory}\n\nUser Message: ${message}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
        });

        const content = response.choices[0].message.content;
        try {
            return extractJson(content || '{}');
        } catch (e) {
            return { intent: AGENT_CONSTANTS.INTENT.EXECUTOR.CLARIFICATION, confidence: 0, reason: 'Failed to parse intent' };
        }
    }
}

export const intentInferenceService = new IntentInferenceService();
