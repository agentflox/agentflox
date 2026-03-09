/**
 * Graph Orchestrator — v4 (Deterministic Stage Progression)
 *
 * Architecture:
 *   LLM job  = extract structured data (done in agentBuilderService)
 *   SM job   = decide transitions (done here, zero LLM calls for forward moves)
 *
 * Key changes vs v3:
 * - CRIT-01: LLM is no longer the primary arbiter. `evaluateNodeCompletion()` runs
 *   a pure 4-tier deterministic check (Hard Gate → Signal → Stability → Timeout).
 *   LLM is only called for backward JUMP disambiguation.
 * - CRIT-02: Draft stability window per node. Redis snapshot tracks watched fields;
 *   optional nodes only advance when the draft has been unchanged for ≥1 turn.
 * - CRIT-03: confirmationSignals are RegExp accelerators (Tier-2), not gates.
 *   The 3rd tier (stability) provides a silent advance path for any phrasing.
 * - CRIT-04: inferNodeFromDraft now walks ROLE→SCOPE→SYSTEM_PROMPT correctly.
 * - CRIT-05: LAUNCH fast-path routes to APPROVAL, never skips it.
 * - CRIT-06: Full VERIFICATION/REFLECTION routing matrix (name→SCOPE, type→ROLE …).
 * - CRIT-07: circuitBreakers uses LRUMap<500> — no more memory leak.
 * - CRIT-08: nodeHistory writes removed (was pure overhead — never read).
 * - CRIT-09: enterApprovalNode sets systemPromptPending flag on timeout/failure;
 *   APPROVAL confirms before launching to prevent placeholder-prompt launches.
 * - CRIT-10: APPROVAL confirmation uses regex + negation check; "do it" no longer
 *   matches ambiguous phrases.
 */

import { ConversationStage, AgentDraft } from '../state/agentBuilderStateService';
import { ExtractedConfiguration } from '../validation/configurationValidator';
import { openai } from '@/lib/openai';
import { GraphNodeId } from './builderGraph';
import { IStageOrchestrator } from '../di/interfaces';
import { StageReadinessAssessment } from './stageOrchestrator';
import { PromptGenerator } from '../generation/promptGenerator';
import { CircuitBreaker, CircuitBreakerError, RetryHandler } from '@/utils/circuitBreaker';
import { redis } from '@/lib/redis';
import { BUILT_IN_SKILLS } from '../registry/skillRegistry';
import { countAgentTokens, updateAgentUsage } from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_NODE_TTL_SECONDS = 24 * 60 * 60; // 24 h
const GRAPH_NODE_KEY_PREFIX = 'agent_builder:graph_node:';
const DRAFT_SNAPSHOT_KEY_PREFIX = 'agent_builder:draft_snapshot:';
const NODE_VISITS_KEY_PREFIX = 'agent_builder:node_visits:';

/**
 * THE canonical node order. Every conversation passes through every node in
 * this sequence. The LLM can only JUMP backward — never skip forward.
 * SYSTEM_PROMPT is non-interactive: it auto-generates the system prompt from
 * all collected config in one pass then immediately advances to VERIFICATION.
 */
const MANDATORY_SEQUENCE: GraphNodeId[] = [
    'INTENT',
    'ROLE',
    'SCOPE',
    'SKILLS',
    'TOOLS',
    'CAPABILITIES',
    'TRIGGERS',
    'SYSTEM_PROMPT', // auto-generation node — no user turn
    'VERIFICATION',
    'REFLECTION',
    'APPROVAL',
    'LAUNCH',
];

/** Nodes that participate in the 4-tier evaluation. Others are always deterministic. */
const LLM_TRAVERSAL_NODES = new Set<GraphNodeId>([
    'INTENT', 'ROLE', 'SCOPE', 'SKILLS', 'TOOLS', 'CAPABILITIES', 'TRIGGERS',
]);

// ─── Completion Contracts ─────────────────────────────────────────────────────

type CompletionContract = {
    /** ALL must be present — node will never advance without them (Tier-1 hard gate). */
    requiredFields: (keyof AgentDraft)[];
    /** Additional quality validators on required fields. */
    validators?: Array<(draft: AgentDraft) => boolean>;
    /** RegExp patterns that immediately advance (Tier-2 accelerators). */
    confirmationSignals?: RegExp[];
    /** Minimum turns before any advance is considered. */
    minTurns?: number;
    /** Turns of unchanged draft before implicit advance (Tier-3). */
    stableTurnsRequired?: number;
    /** Hard escape — advance unconditionally after this many turns (Tier-4). */
    maxTurnsBeforeAdvance?: number;
    /** Fields watched for the stability window. */
    watchFields?: (keyof AgentDraft)[];
};

const NODE_CONTRACTS: Record<string, CompletionContract> = {
    INTENT: {
        requiredFields: [],
        minTurns: 1,
        maxTurnsBeforeAdvance: 1,  // always advances after the first turn
    },
    ROLE: {
        requiredFields: ['agentType'],
        minTurns: 1,
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 5,
        watchFields: ['agentType'],
    },
    SCOPE: {
        requiredFields: ['name', 'scopeType'],
        validators: [
            (d) => (d.name?.length ?? 0) >= 2,
            (d) => d.scopeType === 'portable' || !!d.entityId, // entityId required for non-portable scopes
        ],
        minTurns: 1,
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 5,
        watchFields: ['name', 'scopeType'],
    },
    SKILLS: {
        requiredFields: [],
        confirmationSignals: [
            /\b(skip|done|next|looks?\s+good|no\s+skills?|that['s]*\s+(all|it)|continue|move\s+on|proceed)\b/i,
            /^\d[\d,\s]+$/,  // numeric list responses like "1, 2, 3"
        ],
        minTurns: 1,  // user's first reply is already an answer — don't force a second turn
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 3,
        watchFields: ['skills'],
    },
    TOOLS: {
        requiredFields: [],
        confirmationSignals: [/\b(skip|done|next|looks?\s+good|no\s+tools?|that['s]*\s+(all|it)|continue|move\s+on)\b/i],
        minTurns: 1,
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 3,
        watchFields: ['tools'],
    },
    CAPABILITIES: {
        requiredFields: [],
        confirmationSignals: [
            /\b(skip|done|next|looks?\s+good|that['s]*\s+(all|it)|continue|move\s+on)\b/i,
            /^\d[\d,\s]+$/,  // numeric list responses like "1, 2, 3"
        ],
        minTurns: 1,
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 3,
        watchFields: ['capabilities'],
    },
    TRIGGERS: {
        requiredFields: [],
        confirmationSignals: [
            /\b(skip|default|done|next|looks?\s+good|use\s+defaults?|that['s]*\s+(all|it)|continue)\b/i,
            /^\d[\d,\s]+$/,              // "1, 2, 3" — user picks from the numbered list the LLM presents
            /^\d(\s*,\s*\d)+\s*$/,      // comma-separated digits with optional spaces: "1,3,5"
        ],
        minTurns: 1,  // user's first reply is already an answer — don't force a second turn
        stableTurnsRequired: 1,
        maxTurnsBeforeAdvance: 4,
        watchFields: ['triggers'],
    },

    VERIFICATION: { requiredFields: [] },
    REFLECTION: { requiredFields: [] },
    APPROVAL: { requiredFields: [] },
    LAUNCH: { requiredFields: [] },
};

// ─── APPROVAL confirmation patterns (CRIT-10) ────────────────────────────────

const CONFIRM_PATTERNS = [
    /^\s*(yes|yeah|yep|yup)[,.]?\s*$/i,
    /\b(confirm|confirmed)\b/i,
    /\b(launch|deploy|publish|activate|go\s+live)\b/i,
    /\blooks?\s+good\s*,?\s*(go|launch|deploy|publish)?\b/i,
    /\bapproved?\b/i,
    /\b(proceed|let'?s\s+(do\s+it|go|launch))\b/i,
];

const NEGATE_PATTERNS = [
    /\b(don['t]+|do\s+not|not\s+yet|not\s+now|wait|hold)\b/i,
    /\b(but|however|except|unless)\b/i,
    /\b(change|edit|update|fix|different|instead)\b/i,
];

function isConfirmation(msg: string): boolean {
    const hasConfirm = CONFIRM_PATTERNS.some(p => p.test(msg));
    const hasNegate = NEGATE_PATTERNS.some(p => p.test(msg));
    return hasConfirm && !hasNegate;
}

// ─── LRU Map (CRIT-07) ───────────────────────────────────────────────────────

class LRUMap<K, V> {
    private readonly map = new Map<K, V>();
    constructor(private readonly maxSize: number) { }

    get(key: K): V | undefined {
        const val = this.map.get(key);
        if (val !== undefined) {
            this.map.delete(key);
            this.map.set(key, val); // refresh to end
        }
        return val;
    }

    set(key: K, val: V): void {
        if (this.map.has(key)) {
            this.map.delete(key);
        } else if (this.map.size >= this.maxSize) {
            // evict LRU entry
            this.map.delete(this.map.keys().next().value!);
        }
        this.map.set(key, val);
    }

    has(key: K): boolean { return this.map.has(key); }
}

// ─── Draft snapshot type ──────────────────────────────────────────────────────

type DraftSnapshot = {
    fieldValues: Record<string, string>;
    stableTurns: number;
    lastChangedAt: number;
    lastChangedTime: string;
};

/** Structured verification issue — field key enables exact-match routing. */
type VerificationIssue = { field: string; message: string };


// ─── Class ────────────────────────────────────────────────────────────────────

export class GraphOrchestrator implements IStageOrchestrator {

    private readonly promptGenerator: PromptGenerator;
    private readonly retryHandler: RetryHandler;

    /**
     * Per-conversation circuit breakers with LRU eviction (max 500 entries).
     * Replaces the unbounded Map that caused heap growth under sustained load.
     */
    private readonly circuitBreakers = new LRUMap<string, CircuitBreaker>(500);

    constructor() {
        this.promptGenerator = new PromptGenerator();
        this.retryHandler = new RetryHandler();
    }

    // ─── Circuit breaker ──────────────────────────────────────────────────────

    private getCircuitBreaker(conversationId: string): CircuitBreaker {
        let cb = this.circuitBreakers.get(conversationId);
        if (!cb) {
            cb = new CircuitBreaker({
                failureThreshold: 10,
                resetTimeout: 30_000,
                halfOpenMaxCalls: 2,
            });
            this.circuitBreakers.set(conversationId, cb);
        }
        return cb;
    }

    // ─── Redis persistence ────────────────────────────────────────────────────

    /**
     * Validate that a transition from `from` to `to` is legal.
     *
     * Rules:
     *  - null  → any node: legal (first node in a new conversation)
     *  - A → B where B comes AFTER A by at most 1 step: legal (normal forward progression)
     *  - A → B where B comes BEFORE A: legal (backward jumps for revision are always allowed)
     *  - A → B where B is >1 step AHEAD of A: ILLEGAL (skips required nodes)
     *
     * This prevents any caller from bypassing node completion contracts by
     * writing an arbitrary node directly to Redis.
     */
    private isLegalTransition(from: GraphNodeId | null, to: GraphNodeId): boolean {
        if (from === null) return true; // initialization
        if (!MANDATORY_SEQUENCE.includes(to)) return false;

        const fromIdx = MANDATORY_SEQUENCE.indexOf(from);
        const toIdx = MANDATORY_SEQUENCE.indexOf(to);

        // Backward jumps (revision) are always allowed.
        // Forward jumps are capped at +1 step (the next node only).
        return toIdx <= fromIdx + 1;
    }

    /**
     * Persist the current graph node to Redis, enforcing FSM transition rules.
     * Throws if the requested transition is illegal.
     */
    async setGraphNode(conversationId: string, node: GraphNodeId, userId?: string): Promise<void> {
        // Read current node to validate transition
        const current = await this.getCurrentNode(conversationId, userId);

        if (!this.isLegalTransition(current, node)) {
            const err = `[GraphOrchestrator] ILLEGAL FSM TRANSITION: ${current} → ${node}. ` +
                `Forward jumps of more than 1 step are forbidden. ` +
                `Sequence: [${MANDATORY_SEQUENCE.join(' → ')}]`;
            console.error(err);
            throw new Error(err);
        }

        try {
            const key = userId
                ? `${GRAPH_NODE_KEY_PREFIX}${userId}:${conversationId}`
                : `${GRAPH_NODE_KEY_PREFIX}${conversationId}`;
            await redis.set(key, node, 'EX', GRAPH_NODE_TTL_SECONDS);
        } catch (err) {
            console.warn('[GraphOrchestrator] Failed to persist graph node:', err);
        }
    }

    /**
     * Fast-forward the FSM state to `targetNode`, stepping through every
     * intermediate node in MANDATORY_SEQUENCE without requiring user interaction.
     *
     * This is the correct way for internal fast-paths (e.g. launch intent shortcut,
     * SYSTEM_PROMPT inline generation) to reach APPROVAL/LAUNCH without triggering
     * the ILLEGAL TRANSITION check inside `setGraphNode`.
     */
    private async fastForwardToNode(
        conversationId: string,
        fromNode: GraphNodeId | null,
        targetNode: GraphNodeId,
    ): Promise<void> {
        const fromIdx = fromNode ? MANDATORY_SEQUENCE.indexOf(fromNode) : -1;
        const toIdx = MANDATORY_SEQUENCE.indexOf(targetNode);

        if (toIdx <= fromIdx) {
            // Backward or same-node: just set directly (backward jumps are always legal).
            await this.persistNode(conversationId, targetNode);
            return;
        }

        // Walk forward one step at a time, satisfying the +1 rule at each hop.
        // We write directly to Redis to avoid re-reading current on every step.
        try {
            for (let i = fromIdx + 1; i <= toIdx; i++) {
                const node = MANDATORY_SEQUENCE[i];
                const key = `${GRAPH_NODE_KEY_PREFIX}${conversationId}`;
                await redis.set(key, node, 'EX', GRAPH_NODE_TTL_SECONDS);
            }
            console.log(`[GraphOrchestrator] Fast-forwarded ${fromNode ?? 'null'} → ${targetNode} (${toIdx - fromIdx} steps).`);
        } catch (err) {
            console.warn('[GraphOrchestrator] fast-forward redis error:', err);
        }
    }

    async getCurrentNode(conversationId: string, userId?: string): Promise<GraphNodeId | null> {
        try {
            const key = userId
                ? `${GRAPH_NODE_KEY_PREFIX}${userId}:${conversationId}`
                : `${GRAPH_NODE_KEY_PREFIX}${conversationId}`;
            const value = await redis.get(key);
            if (value && MANDATORY_SEQUENCE.includes(value as GraphNodeId)) {
                return value as GraphNodeId;
            }
        } catch (err) {
            console.warn('[GraphOrchestrator] Failed to read graph node from Redis:', err);
        }
        return null;
    }

    // ─── Draft stability tracking (CRIT-02) ───────────────────────────────────

    /**
     * Updates the per-node draft snapshot and returns stability information.
     * Returns `{ stable: true }` when watched fields have been unchanged for
     * ≥ stableTurnsRequired turns AND the node has content worth keeping.
     */
    private async updateDraftSnapshot(
        conversationId: string,
        node: GraphNodeId,
        currentDraft: AgentDraft,
        absoluteTurn: number,
    ): Promise<{ stable: boolean; stableTurns: number; hasContent: boolean }> {
        const contract = NODE_CONTRACTS[node];
        const watchFields = (contract?.watchFields ?? []) as (keyof AgentDraft)[];

        if (watchFields.length === 0) {
            return { stable: true, stableTurns: 99, hasContent: true };
        }

        const key = `${DRAFT_SNAPSHOT_KEY_PREFIX}${conversationId}:${node}`;
        let existing: DraftSnapshot | null = null;
        try {
            const raw = await redis.get(key);
            if (raw) existing = JSON.parse(raw);
        } catch { /* treat as no snapshot */ }

        const currentValues: Record<string, string> = {};
        for (const f of watchFields) {
            currentValues[f as string] = JSON.stringify(currentDraft[f] ?? null);
        }

        const hasContent = watchFields.some(f => {
            const val = currentDraft[f];
            return Array.isArray(val) ? val.length > 0 : !!val;
        });

        const changed = !existing || watchFields.some(
            f => currentValues[f as string] !== existing!.fieldValues[f as string]
        );

        if (changed) {
            const snapshot: DraftSnapshot = {
                fieldValues: currentValues,
                stableTurns: 0,
                lastChangedAt: absoluteTurn,
                lastChangedTime: new Date().toISOString(),
            };
            try {
                await redis.set(key, JSON.stringify(snapshot), 'EX', GRAPH_NODE_TTL_SECONDS);
            } catch { /* non-fatal */ }
            return { stable: false, stableTurns: 0, hasContent };
        }

        const stableTurns = (existing!.stableTurns ?? 0) + 1;
        try {
            await redis.set(
                key,
                JSON.stringify({ ...existing, stableTurns }),
                'EX',
                GRAPH_NODE_TTL_SECONDS
            );
        } catch { /* non-fatal */ }

        const required = contract?.stableTurnsRequired ?? 1;
        return { stable: stableTurns >= required, stableTurns, hasContent };
    }

    // ─── Visit counter ────────────────────────────────────────────────────────

    async getAndIncrementVisitCount(conversationId: string, node: GraphNodeId): Promise<number> {
        const key = `${NODE_VISITS_KEY_PREFIX}${conversationId}:${node}`;
        try {
            const count = await redis.incr(key);
            await redis.expire(key, GRAPH_NODE_TTL_SECONDS);
            return count;
        } catch {
            return 1; // fallback — don't break the flow
        }
    }

    // ─── Sequence helpers ─────────────────────────────────────────────────────

    private nextInSequence(node: GraphNodeId): GraphNodeId {
        const idx = MANDATORY_SEQUENCE.indexOf(node);
        if (idx === -1 || idx === MANDATORY_SEQUENCE.length - 1) return node;
        return MANDATORY_SEQUENCE[idx + 1];
    }

    private isForwardInSequence(current: GraphNodeId, candidate: GraphNodeId): boolean {
        const currentIdx = MANDATORY_SEQUENCE.indexOf(current);
        const candidateIdx = MANDATORY_SEQUENCE.indexOf(candidate);
        return candidateIdx > currentIdx;
    }

    // ─── Stage ↔ Node mapping ─────────────────────────────────────────────────

    private mapNodeToStage(node: GraphNodeId): ConversationStage {
        if (node === 'APPROVAL' || node === 'LAUNCH') return 'launch';
        return 'configuration';
    }

    /**
     * Infer starting node from draft state on Redis miss.
     * Walks ROLE → SCOPE → SYSTEM_PROMPT on Redis miss.
     */
    private inferNodeFromDraft(stage: ConversationStage, draft: AgentDraft): GraphNodeId {
        if (stage === 'initialization') return 'INTENT';

        // Walk the mandatory sequence — stop at first unsatisfied prerequisite.
        // If these are missing, we MUST route to them.
        if (!draft.agentType) return 'ROLE';
        if (!draft.name || draft.name.length < 2) return 'SCOPE';

        // If we've reached the launch stage, respect it
        if (stage === 'launch') return 'APPROVAL';

        // If the system prompt was generated but the orchestrator flagged it as pending or placeholder,
        // force a generation pass.
        if (
            draft.systemPromptPending ||
            (draft.systemPrompt && draft.systemPrompt.includes('Agent instructions will be generated'))
        ) {
            return 'SYSTEM_PROMPT';
        }

        // Default: If name and role are present but prompt is not generated, 
        // resume the conversational flow at SKILLS.
        return 'SKILLS';
    }

    // ─── 4-Tier Node Evaluation ───────────────────────────────────────────────

    /**
     * Pure deterministic transition evaluator — zero LLM calls, always returns a
     * concrete decision. This is the ONLY forward-advance decision function.
     *
     * Tier 0: minTurns guard — too early, STAY.
     * Tier 1: Hard Gate     — required field missing or validator fails, STAY.
     * Tier 2: Signal        — user message matches a confirmationSignal regex, ADVANCE.
     * Tier 3: Stability     — watched draft fields unchanged for ≥stableTurnsRequired turns
     *                         AND the node has content, ADVANCE.
     * Tier 4: Timeout       — visitCount ≥ maxTurnsBeforeAdvance, ADVANCE unconditionally.
     * Default:              — STAY (never routes to LLM).
     */
    private async evaluateNodeCompletion(
        node: GraphNodeId,
        draft: AgentDraft,
        userMessage: string,
        conversationId: string,
        visitCount: number,
        absoluteTurn: number,
    ): Promise<{ shouldAdvance: boolean; tier: number; reason: string }> {
        const contract = NODE_CONTRACTS[node];
        if (!contract) {
            return { shouldAdvance: false, tier: 0, reason: '[T0] No contract defined — STAY.' };
        }

        // ── Tier 0: minTurns guard ───────────────────────────────────────────
        if (contract.minTurns && visitCount < contract.minTurns) {
            return { shouldAdvance: false, tier: 0, reason: `[T0] minTurns=${contract.minTurns} not reached (visitCount=${visitCount}).` };
        }

        // ── Tier 1: Hard gate — required fields + validators ─────────────────
        for (const field of contract.requiredFields) {
            const val = draft[field];
            const missing = val === undefined || val === null || val === '' ||
                (Array.isArray(val) && val.length === 0);
            if (missing) {
                return { shouldAdvance: false, tier: 1, reason: `[T1] Required field '${String(field)}' missing.` };
            }
        }
        if (contract.validators) {
            for (const v of contract.validators) {
                if (!v(draft)) {
                    return { shouldAdvance: false, tier: 1, reason: '[T1] Quality validator failed — STAY.' };
                }
            }
        }

        // ── Cross-node invariant: SYSTEM_PROMPT node owns prompt generation ──
        // Prevent advancing past SYSTEM_PROMPT when prompt is still pending.
        // All other nodes are unaffected.
        const SYSTEM_PROMPT_IDX = MANDATORY_SEQUENCE.indexOf('SYSTEM_PROMPT');
        const NODE_IDX = MANDATORY_SEQUENCE.indexOf(node);
        if (NODE_IDX > SYSTEM_PROMPT_IDX && draft.systemPromptPending) {
            return { shouldAdvance: false, tier: 1, reason: '[T1] systemPromptPending — cannot advance past SYSTEM_PROMPT until prompt is confirmed.' };
        }

        // ── Tier 2: Explicit confirmation signal (accelerator) ───────────────
        if (contract.confirmationSignals?.length) {
            if (contract.confirmationSignals.some(re => re.test(userMessage))) {
                return { shouldAdvance: true, tier: 2, reason: '[T2] Confirmation signal matched — skipping stability window.' };
            }
        }

        // ── Tier 3: Draft stability window ───────────────────────────────────
        // Only checked when the node defines watchFields AND stableTurnsRequired.
        // Advancing only when draft has been quiet for N turns prevents advancing
        // while the user is still actively adding data (e.g. adding skills one by one).
        if (contract.watchFields?.length && contract.stableTurnsRequired) {
            const { stable, hasContent } = await this.updateDraftSnapshot(
                conversationId, node, draft, absoluteTurn
            );
            if (stable && hasContent) {
                return { shouldAdvance: true, tier: 3, reason: `[T3] Draft stable for ≥${contract.stableTurnsRequired} turn(s) with content.` };
            }
            // #3: Optional node, stable, but empty (user hasn't added anything yet).
            // Only allow implicit skip AFTER minTurns to prevent all optional nodes
            // auto-advancing on the second message of a fresh conversation.
            if (stable && contract.requiredFields.length === 0) {
                const minTurnsForSkip = contract.minTurns ?? 1;
                if (visitCount < minTurnsForSkip) {
                    return { shouldAdvance: false, tier: -1, reason: `[T3/SKIP] Stable+empty but minTurns=${minTurnsForSkip} not reached (visitCount=${visitCount}).` };
                }
                return { shouldAdvance: true, tier: 3, reason: '[T3] Draft stable with no content — implicit skip.' };
            }
        }

        // ── Tier 4: Hard timeout escape ──────────────────────────────────────
        // Guarantees forward progress regardless of content or confirmation.
        if (contract.maxTurnsBeforeAdvance && visitCount >= contract.maxTurnsBeforeAdvance) {
            return { shouldAdvance: true, tier: 4, reason: `[T4] Timeout escape: visitCount=${visitCount} ≥ maxTurns=${contract.maxTurnsBeforeAdvance}.` };
        }

        // Default: STAY — draft is still changing or user hasn't confirmed yet.
        return { shouldAdvance: false, tier: -1, reason: '[DEFAULT] Awaiting input or stable draft.' };
    }

    // ─── VERIFICATION routing (CRIT-06, fix #5) ─────────────────────────────

    private async runVerification(draft: AgentDraft): Promise<{ passed: boolean; issues: VerificationIssue[] }> {
        const issues: Array<{ field: string; message: string }> = [];

        if (!draft.name || draft.name.trim().length < 2) {
            issues.push({ field: 'name', message: 'Agent name is missing or too short (min 2 chars).' });
        }
        if (!draft.agentType) {
            issues.push({ field: 'agentType', message: 'Agent type must be specified.' });
        }
        if (!draft.systemPrompt || draft.systemPrompt.length < 50) {
            issues.push({ field: 'systemPrompt', message: 'System prompt is missing or too short (min 50 chars).' });
        }
        if (draft.systemPromptPending) {
            issues.push({ field: 'systemPrompt', message: 'System prompt is still being generated.' });
        }
        if (draft.tools?.length) {
            const systemTools = await prisma.systemTool.findMany({ select: { id: true, name: true } });

            // Skip validation if the table hasn't been seeded yet — don't block launch
            if (systemTools.length > 0) {
                const knownById = new Set(systemTools.map(t => t.id));
                const knownByName = new Set(systemTools.map(t => t.name));

                for (const tool of draft.tools) {
                    // Match by name first (the stable identifier from the extractor),
                    // then fall back to id (which may be a DB UUID on pre-existing tools).
                    const knownByToolName = knownByName.has((tool as any).name);
                    const knownByToolId = knownById.has((tool as any).id) || knownByName.has((tool as any).id);
                    if (!knownByToolName && !knownByToolId) {
                        issues.push({ field: 'tool', message: `Tool "${(tool as any).name || (tool as any).id}" is not in the allowed registry.` });
                    }
                }
            }
        }

        return { passed: issues.length === 0, issues };
    }

    private routeVerificationFailure(issues: VerificationIssue[]): GraphNodeId {
        // Walk MANDATORY_SEQUENCE order — route to earliest unsatisfied node.
        const fields = issues.map(i => i.field);
        if (fields.includes('agentType')) return 'ROLE';
        if (fields.includes('name')) return 'SCOPE';
        if (fields.includes('systemPrompt')) return 'SYSTEM_PROMPT'; // regenerate, not re-edit
        if (fields.includes('skill')) return 'SKILLS';
        if (fields.includes('tool')) return 'TOOLS';
        if (fields.includes('trigger')) return 'TRIGGERS';
        return 'SYSTEM_PROMPT'; // safe default: regenerate
    }

    // ─── REFLECTION routing (CRIT-06) ────────────────────────────────────────
    private runReflection(draft: AgentDraft): { solid: boolean; suggestions: string[] } {
        const suggestions: string[] = [];

        const lowConfidenceTriggers = (draft.triggers ?? []).filter(
            (t) => (t.confidence ?? 100) < 60
        );
        if (lowConfidenceTriggers.length > 0) {
            suggestions.push(
                `trigger: ${lowConfidenceTriggers.length} trigger(s) have confidence below 60% — review or remove them.`
            );
        }

        // #8: Only flag missing skills when the prompt references a specific skill BY NAME
        // from the built-in registry. Generic phrases like "use tools" no longer trigger this,
        // preventing REFLECTION from always failing on ordinary agent prompts.
        if (draft.systemPrompt && (!draft.skills || draft.skills.length === 0)) {
            const builtInSkillNames: string[] = (BUILT_IN_SKILLS as any[])
                .map((s: any) => (s.name ?? s.id ?? '').toLowerCase())
                .filter(Boolean);
            const promptLower = draft.systemPrompt.toLowerCase();
            const mentionsNamedSkill = builtInSkillNames.some(name => promptLower.includes(name));
            if (mentionsNamedSkill) {
                suggestions.push('skill: System prompt references a specific skill by name but no skills are configured.');
            }
        }

        return { solid: suggestions.length === 0, suggestions };
    }

    private routeReflectionFailure(suggestions: string[]): GraphNodeId {
        const lower = suggestions.map(s => s.toLowerCase());
        if (lower.some(s => s.startsWith('trigger'))) return 'TRIGGERS';
        if (lower.some(s => s.startsWith('skill'))) return 'SKILLS';
        if (lower.some(s => s.includes('capabilit'))) return 'CAPABILITIES';
        return 'SYSTEM_PROMPT'; // regenerate prompt when there’s a quality concern
    }


    // ─── Backward-jump detection (the ONLY remaining LLM use case) ───────────

    /**
     * Pattern that detects explicit "go back and change X" intent.
     * Tested BEFORE the 4-tier evaluator in determineNextNode.
     * Having this here avoids entering the evaluator on change requests at all.
     */
    private static readonly BACKWARD_JUMP_PATTERN =
        /\b(change|edit|go\s+back|fix|redo|revise|modify|update)\b.*\b(name|type|skill|tool|capability|trigger|role|scope)/i;

    /**
     * Classify where the user wants to jump back to.
     * Single-purpose LLM call: max_tokens=60, temperature=0.
     * ~150ms, only triggered when the user message matches BACKWARD_JUMP_PATTERN.
     */
    private async classifyBackwardJump(
        userMessage: string,
        currentNode: GraphNodeId,
        conversationId?: string,
    ): Promise<{ nextNode: GraphNodeId; reasoning: string }> {
        // Only backward targets are valid (can't jump forward via this path)
        const allowedTargets: GraphNodeId[] = [
            'INTENT', 'ROLE', 'SCOPE', 'SKILLS', 'TOOLS', 'CAPABILITIES', 'TRIGGERS',
        ].filter(n => !this.isForwardInSequence(currentNode, n as GraphNodeId)) as GraphNodeId[];

        // #7: Sanitise before injecting into LLM prompt — prevent prompt-injection.
        // Truncate to 200 chars and strip backticks/double-quotes so the message
        // cannot escape the quoted context or inject instructions.
        const safeMessage = userMessage.slice(0, 200).replace(/[`"\\]/g, "'");

        const prompt = `Which section does the user want to revisit?
Message: ${safeMessage}
Options: ${allowedTargets.join(', ')}
Return JSON only: { "target": "<NODE>", "reason": "..." }`;

        const cb = conversationId
            ? this.getCircuitBreaker(conversationId)
            : new CircuitBreaker({ failureThreshold: 10, resetTimeout: 30_000, halfOpenMaxCalls: 2 });

        try {
            const completion = await cb.execute(() =>
                this.retryHandler.retry(
                    () => openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: 'json_object' },
                        temperature: 0,
                        max_tokens: 60,
                        stream: false,
                    }),
                    {
                        maxAttempts: 2,
                        baseDelay: 300,
                        retryable: (err) => {
                            if (err instanceof CircuitBreakerError) return false;
                            return err?.status === 429 || err?.status >= 500 || err?.code === 'ECONNRESET';
                        },
                    }
                )
            );

            const raw = completion.choices[0]?.message?.content ?? '{}';
            const parsed = JSON.parse(raw) as { target?: string; reason?: string };
            const target = parsed.target as GraphNodeId | undefined;

            // Track LLM usage for the backward-jump classification call — fire-and-forget.
            const jumpPrompt = [{ role: 'user', content: prompt }];
            const jumpOutput = raw;
            setImmediate(async () => {
                try {
                    const tokenCount = await countAgentTokens(
                        jumpPrompt as Array<{ role: string; content: string }>,
                        jumpOutput,
                        'gpt-4o-mini'
                    );
                    // No userId available here — use a sentinel so usage is still aggregated.
                    // The caller (agentBuilderService) owns the userId; we use the conversationId
                    // as a lookup key if needed by the tracking system.
                    if (conversationId) {
                        const conv = await prisma.aiConversation.findUnique({
                            where: { id: conversationId },
                            select: { userId: true, user: { select: { name: true, email: true } } },
                        });
                        if (conv?.userId) {
                            await updateAgentUsage(
                                conv.userId,
                                (conv.user as any)?.name || (conv.user as any)?.email || 'User',
                                tokenCount.inputTokens,
                                tokenCount.outputTokens,
                                (conv.user as any)?.email || undefined
                            );
                        }
                    }
                } catch { /* non-fatal */ }
            });

            if (target && allowedTargets.includes(target)) {
                return { nextNode: target, reasoning: `[BACKWARD JUMP → ${target}] ${parsed.reason ?? ''}` };
            }
        } catch (err) {
            const isOpen = err instanceof CircuitBreakerError ||
                (err instanceof Error && err.message.includes('Circuit breaker is OPEN'));
            if (!isOpen) {
                console.warn('[GraphOrchestrator] classifyBackwardJump LLM failed — stepping back:', err);
            }
        }

        // Safe fallback: #9 stay at current node (stepping back one was wrong — e.g.
        // "fix the name" at SCOPE would incorrectly land at ROLE).
        return {
            nextNode: currentNode,
            reasoning: `[BACKWARD JUMP FALLBACK] LLM unavailable — staying at ${currentNode}.`,
        };
    }

    /**
     * Governing traversal function — decides STAY vs ADVANCE vs JUMP.
     *
     * Decision tree (in order):
     *   1. Backward-jump keywords detected → classifyBackwardJump (single LLM call)
     *   2. evaluateNodeCompletion (4-tier, pure function, always returns a value)
     *   3. Done. No other LLM call for transitions.
     */
    async determineNextNode(
        currentNode: GraphNodeId,
        draft: AgentDraft,
        history: Array<{ role: string; content: string }>,
        lastUserMessage: string,
        conversationId?: string,
        visitCount: number = 1,
    ): Promise<{ nextNode: GraphNodeId; reasoning: string }> {

        // ── Step 1: Backward-jump intent detection ───────────────────────────
        // Pattern guards the LLM call to change/edit/fix messages only.
        // #4: After classification, if the LLM returns the CURRENT node, the user is
        // editing in-place (e.g. "update my skills" at SKILLS) — fall through to
        // the 4-tier evaluator instead of returning early.
        if (
            LLM_TRAVERSAL_NODES.has(currentNode) &&
            GraphOrchestrator.BACKWARD_JUMP_PATTERN.test(lastUserMessage)
        ) {
            const jump = await this.classifyBackwardJump(lastUserMessage, currentNode, conversationId);
            if (jump.nextNode !== currentNode) {
                // Genuine backward jump — return it
                console.log(`[GraphOrchestrator] Backward-jump: ${currentNode} → ${jump.nextNode}`);
                return jump;
            }
            // LLM says stay here → user is editing the current node in-place;
            // fall through to normal 4-tier evaluation below.
            console.log(`[GraphOrchestrator] Backward-jump pattern matched but target=currentNode=${currentNode} — treating as in-place edit.`);
        }

        // ── Step 2: 4-tier deterministic evaluation ──────────────────────────
        // evaluateNodeCompletion always returns a concrete { shouldAdvance, tier, reason }.
        // No null path — no LLM call here.
        const absoluteTurn = history.length;
        const snapshotId = conversationId ?? `local:${currentNode}`;
        const eval4 = await this.evaluateNodeCompletion(
            currentNode, draft, lastUserMessage, snapshotId, visitCount, absoluteTurn
        );

        const nextNode = eval4.shouldAdvance ? this.nextInSequence(currentNode) : currentNode;
        return { nextNode, reasoning: eval4.reason };
    }

    // ─── IStageOrchestrator implementation ───────────────────────────────────

    /**
     * Core entry point, called by agentBuilderService on every processMessage.
     *
     * Context object carries previousDraft and visitCount from agentBuilderService
     * to enable drift detection and per-node visit counting.
     */
    async determineStageProgression(
        currentStage: ConversationStage,
        draft: AgentDraft,
        conversationHistory: Array<{ role: string; content: string }>,
        userMessage: string,
        extractedConfig: ExtractedConfiguration,
        userId: string,
        conversationId?: string,
        context?: { previousDraft?: AgentDraft; visitCount?: number }
    ): Promise<{ nextStage: ConversationStage; reasoning: string; updatedDraft?: AgentDraft; currentNode?: string }> {

        // ── 0. Resolve current node ──────────────────────────────────────────
        let currentNode: GraphNodeId;
        if (conversationId) {
            const persisted = await this.getCurrentNode(conversationId);
            if (persisted) {
                currentNode = persisted;
            } else {
                currentNode = this.inferNodeFromDraft(currentStage, draft);
                // Emit telemetry on Redis miss so ops can track expiry/flush events
                console.warn(`[GraphOrchestrator] Redis miss — inferred node from draft: ${currentNode} (conversation=${conversationId})`);
            }
        } else {
            currentNode = this.inferNodeFromDraft(currentStage, draft);
        }

        // visitCount is owned exclusively by agentBuilderService (which calls
        // getAndIncrementVisitCount before invoking determineStageProgression).
        // We never self-fetch here to avoid double-incrementing the Redis counter.
        // If context is missing (unit tests / legacy callers), default to 1.
        const visitCount = context?.visitCount ?? 1;

        console.log(`[GraphOrchestrator] currentNode=${currentNode} stage=${currentStage} visitCount=${visitCount} conversation=${conversationId ?? 'unknown'}`);

        // ── 1. SYSTEM_PROMPT — generate prompt and advance to APPROVAL ─────────────
        //
        // SINGLE SOURCE OF TRUTH: The system prompt is ALWAYS generated here by
        // PromptGenerator — never by the conversational LLM in its response.
        //
        // PromptGenerator.generate() ALWAYS resolves — it has its own internal
        // timeout + deterministic fallback (buildFallbackPrompt). We do NOT wrap
        // it in another Promise.race — that would race against the internal timeout,
        // cause false rejections, and loop back to SYSTEM_PROMPT on every generation.
        //
        // After generation this turn immediately runs VERIFICATION → REFLECTION
        // and lands at APPROVAL — the user never sees a "generating…" pause turn.
        if (currentNode === 'SYSTEM_PROMPT') {
            console.log('[GraphOrchestrator] SYSTEM_PROMPT node — generating system prompt via PromptGenerator.');
            const mutableDraft: AgentDraft = { ...draft };

            // generate() always resolves — no try/catch needed, no outer timeout.
            let generated = await this.promptGenerator.generate(mutableDraft);

            // Explicit fallback: if LLM returned something suspiciously short,
            // use the deterministic template which is guaranteed to be > 100 chars.
            if (!generated || generated.length < 100) {
                console.warn(`[GraphOrchestrator] PromptGenerator returned short result (${generated?.length ?? 0} chars) — using deterministic fallback.`);
                generated = this.promptGenerator.buildFallbackPrompt(mutableDraft);
            }

            mutableDraft.systemPrompt = generated;
            mutableDraft.systemPromptPending = false;
            console.log(`[GraphOrchestrator] System prompt ready (${generated.length} chars) — running inline pipeline.`);

            // Inline pipeline: VERIFICATION
            const verification = await this.runVerification(mutableDraft);
            if (!verification.passed) {
                const remediationNode = this.routeVerificationFailure(verification.issues);
                const reasoning = `[SYSTEM_PROMPT→VERIFICATION FAILED] ${verification.issues.map(i => i.message).join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            // Inline pipeline: REFLECTION
            const reflection = this.runReflection(mutableDraft);
            if (!reflection.solid) {
                const remediationNode = this.routeReflectionFailure(reflection.suggestions);
                const reasoning = `[SYSTEM_PROMPT→REFLECTION] ${reflection.suggestions.join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            // All gates passed → APPROVAL (fast-forward through VERIFICATION + REFLECTION nodes)
            console.log('[GraphOrchestrator] SYSTEM_PROMPT pipeline complete → APPROVAL.');
            await this.fastForwardToNode(conversationId, 'SYSTEM_PROMPT', 'APPROVAL');
            return {
                nextStage: this.mapNodeToStage('APPROVAL'),
                reasoning: '[SYSTEM_PROMPT→VERIFICATION→REFLECTION PASSED] Prompt generated — awaiting user confirmation.',
                updatedDraft: mutableDraft,
                currentNode: 'APPROVAL',
            };
        }

        // ── 2. VERIFICATION — always deterministic ───────────────────────────
        if (currentNode === 'VERIFICATION') {
            const { passed, issues } = await this.runVerification(draft);
            if (!passed) {
                const remediationNode = this.routeVerificationFailure(issues);
                const reasoning = `[VERIFICATION FAILED] ${issues.map(i => i.message).join(' | ')} → routing to ${remediationNode}`;
                console.log(`[GraphOrchestrator] ${reasoning}`);
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, currentNode: remediationNode };
            }
            console.log('[GraphOrchestrator] VERIFICATION passed → REFLECTION');
            await this.persistNode(conversationId, 'REFLECTION');
            return { nextStage: this.mapNodeToStage('REFLECTION'), reasoning: '[VERIFICATION PASSED]', currentNode: 'REFLECTION' };
        }

        // ── 2. REFLECTION — always deterministic ────────────────────────────
        if (currentNode === 'REFLECTION') {
            const { solid, suggestions } = this.runReflection(draft);
            if (!solid) {
                const remediationNode = this.routeReflectionFailure(suggestions);
                const reasoning = `[REFLECTION] ${suggestions.join(' | ')} → routing to ${remediationNode}`;
                console.log(`[GraphOrchestrator] ${reasoning}`);
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, currentNode: remediationNode };
            }
            console.log('[GraphOrchestrator] REFLECTION passed → APPROVAL');
            await this.persistNode(conversationId, 'APPROVAL');
            return { nextStage: this.mapNodeToStage('APPROVAL'), reasoning: '[REFLECTION PASSED] Draft is solid.', currentNode: 'APPROVAL' };
        }

        // ── 3. APPROVAL — deterministic confirmation gate (CRIT-10) ─────────
        // System prompt is guaranteed to be present by the time we reach APPROVAL
        // (the SYSTEM_PROMPT node generates it and VERIFICATION validates it).
        // This node only needs to await explicit user confirmation before advancing to LAUNCH.
        if (currentNode === 'APPROVAL') {
            const changePattern = /\b(change|edit|update|modify|go\s+back|fix|wrong|incorrect|redo|revise|adjust)\b/i;
            if (changePattern.test(userMessage)) {
                const lower = userMessage.toLowerCase();
                const targetNode = (() => {
                    if (/\b(tool)\b/.test(lower)) return 'TOOLS' as GraphNodeId;
                    if (/\b(trigger)\b/.test(lower)) return 'TRIGGERS' as GraphNodeId;
                    if (/\b(skill)\b/.test(lower)) return 'SKILLS' as GraphNodeId;
                    if (/\b(capabilit)\b/.test(lower)) return 'CAPABILITIES' as GraphNodeId;
                    if (/\b(name|title)\b/.test(lower)) return 'SCOPE' as GraphNodeId;
                    if (/\b(agent\s*type|agenttype)\b/.test(lower)) return 'ROLE' as GraphNodeId;
                    if (/\b(prompt|instruction|behavior)\b/.test(lower)) return 'SYSTEM_PROMPT' as GraphNodeId; // regenerate
                    return 'SYSTEM_PROMPT' as GraphNodeId; // safe default: regenerate prompt
                })();

                console.log(`[GraphOrchestrator] APPROVAL: change request detected — routing to ${targetNode}`);
                await this.persistNode(conversationId, targetNode);
                return {
                    nextStage: this.mapNodeToStage(targetNode),
                    reasoning: `[APPROVAL] Change requested — routing back to ${targetNode}.`,
                    currentNode: targetNode,
                };
            }

            if (isConfirmation(userMessage)) {
                console.log('[GraphOrchestrator] APPROVAL: confirmed → LAUNCH');
                await this.persistNode(conversationId, 'LAUNCH');
                return {
                    nextStage: this.mapNodeToStage('LAUNCH'),
                    reasoning: '[APPROVAL CONFIRMED] User confirmed — advancing to LAUNCH.',
                    currentNode: 'LAUNCH',
                };
            }

            console.log('[GraphOrchestrator] APPROVAL: awaiting explicit confirmation.');
            return {
                nextStage: this.mapNodeToStage('APPROVAL'),
                reasoning: '[APPROVAL] Awaiting explicit confirmation.',
                currentNode: 'APPROVAL',
            };
        }

        // ── 4. LAUNCH — terminal ─────────────────────────────────────────────
        if (currentNode === 'LAUNCH') {
            return {
                nextStage: this.mapNodeToStage('LAUNCH'),
                reasoning: '[LAUNCH] Agent is active.',
                currentNode: 'LAUNCH',
            };
        }

        // ── 5. Launch-intent fast-path → APPROVAL (CRIT-05) ─────────────────
        // #7: use word-boundary regex to avoid matching 'launcher', 'relaunching', etc.
        const LAUNCH_INTENT_PATTERN = /\b(launch|activate|publish|go\s+live|deploy|launch\s+now|launch\s+agent)\b|\b(finalize|finish)\s+(the\s+)?(configuration|config|agent|setup)\b/i;
        const hasLaunchIntent = LAUNCH_INTENT_PATTERN.test(userMessage);
        const hasMandatoryFields = !!draft.agentType && !!(draft.name && draft.name.length >= 2);
        // Note: we don't require systemPrompt here because SYSTEM_PROMPT node generates it automatically.

        if (hasLaunchIntent && hasMandatoryFields && LLM_TRAVERSAL_NODES.has(currentNode)) {
            console.log('[GraphOrchestrator] Launch intent — running inline VERIFICATION → REFLECTION → APPROVAL.');

            const mutableDraft: AgentDraft = { ...draft };

            // ── Generate system prompt inline if missing ───────────────────────
            // If the only verification failure is a missing/short system prompt,
            // generate it here instead of routing back (which previously caused
            // the agent to get stuck because SYSTEM_PROMPT is not in LLM_TRAVERSAL_NODES
            // and the fast-path would never fire again on the next turn).
            const preCheck = await this.runVerification(mutableDraft);
            const hasOnlyPromptIssue = !preCheck.passed &&
                preCheck.issues.every(i => i.field === 'systemPrompt');

            if (!mutableDraft.systemPrompt || mutableDraft.systemPrompt.length < 50) {
                console.log('[GraphOrchestrator] Launch intent — system prompt missing, generating inline.');
                let generated = await this.promptGenerator.generate(mutableDraft);
                if (!generated || generated.length < 100) {
                    console.warn(`[GraphOrchestrator] PromptGenerator returned short result (${generated?.length ?? 0} chars) — using deterministic fallback.`);
                    generated = this.promptGenerator.buildFallbackPrompt(mutableDraft);
                }
                mutableDraft.systemPrompt = generated;
                mutableDraft.systemPromptPending = false;
                console.log(`[GraphOrchestrator] System prompt generated (${generated.length} chars) — re-running gates.`);
            }

            const verification = await this.runVerification(mutableDraft);
            if (!verification.passed) {
                const remediationNode = this.routeVerificationFailure(verification.issues);
                const reasoning = `[LAUNCH INTENT / VERIFICATION FAILED] ${verification.issues.map(i => i.message).join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            const reflection = this.runReflection(mutableDraft);
            if (!reflection.solid) {
                const remediationNode = this.routeReflectionFailure(reflection.suggestions);
                const reasoning = `[LAUNCH INTENT / REFLECTION] ${reflection.suggestions.join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            // Both gates passed — route to APPROVAL for user confirmation.
            console.log('[GraphOrchestrator] Inline gates passed — entering APPROVAL for confirmation.');
            await this.fastForwardToNode(conversationId, currentNode, 'APPROVAL');
            return { nextStage: this.mapNodeToStage('APPROVAL'), reasoning: '[LAUNCH INTENT] Gates passed — awaiting user confirmation.', updatedDraft: mutableDraft, currentNode: 'APPROVAL' };
        }


        // ── 6. 4-tier deterministic evaluation + LLM JUMP fallback ──────────
        const decision = await this.determineNextNode(
            currentNode, draft, conversationHistory, userMessage, conversationId, visitCount
        );

        // ── 7. Mandatory field guard ─────────────────────────────────────────
        let finalDecision = decision;
        const isMovingForward = this.isForwardInSequence(currentNode, decision.nextNode);
        if (isMovingForward) {
            if (!draft.agentType) {
                finalDecision = { nextNode: 'ROLE', reasoning: '[GUARD] agentType missing — forcing ROLE.' };
            } else if (!draft.name || draft.name.length < 2) {
                finalDecision = { nextNode: 'SCOPE', reasoning: '[GUARD] name missing or too short — forcing SCOPE.' };
            }
        }

        console.log(`[GraphOrchestrator] ${currentNode} → ${finalDecision.nextNode} | ${finalDecision.reasoning}`);

        // ── 8. Advance to SYSTEM_PROMPT (fast-forward path) ──────────────────
        // Same as step 1 but triggered when the 4-tier evaluator advances from
        // another traversal node (e.g. TRIGGERS → SYSTEM_PROMPT). Generate
        // the prompt in this same turn, run the inline pipeline, land at APPROVAL.
        if (finalDecision.nextNode === 'SYSTEM_PROMPT') {
            console.log('[GraphOrchestrator] Fast-forward to SYSTEM_PROMPT — generating prompt immediately.');
            const mutableDraft: AgentDraft = { ...draft };

            // generate() always resolves — explicit fallback if result is too short.
            let generated = await this.promptGenerator.generate(mutableDraft);
            if (!generated || generated.length < 100) {
                console.warn(`[GraphOrchestrator] PromptGenerator returned short result (${generated?.length ?? 0} chars) — using deterministic fallback.`);
                generated = this.promptGenerator.buildFallbackPrompt(mutableDraft);
            }
            mutableDraft.systemPrompt = generated;
            mutableDraft.systemPromptPending = false;
            console.log(`[GraphOrchestrator] System prompt ready (${generated.length} chars) — running inline pipeline.`);

            const verification = await this.runVerification(mutableDraft);
            if (!verification.passed) {
                const remediationNode = this.routeVerificationFailure(verification.issues);
                const reasoning = `[SYSTEM_PROMPT→VERIFICATION FAILED] ${verification.issues.map(i => i.message).join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            const reflection = this.runReflection(mutableDraft);
            if (!reflection.solid) {
                const remediationNode = this.routeReflectionFailure(reflection.suggestions);
                const reasoning = `[SYSTEM_PROMPT→REFLECTION] ${reflection.suggestions.join(' | ')} → ${remediationNode}`;
                await this.persistNode(conversationId, remediationNode);
                return { nextStage: this.mapNodeToStage(remediationNode), reasoning, updatedDraft: mutableDraft, currentNode: remediationNode };
            }

            console.log('[GraphOrchestrator] Inline pipeline complete → APPROVAL.');
            await this.fastForwardToNode(conversationId, currentNode, 'APPROVAL');
            return {
                nextStage: this.mapNodeToStage('APPROVAL'),
                reasoning: '[SYSTEM_PROMPT→VERIFICATION→REFLECTION PASSED] Prompt generated — awaiting confirmation.',
                updatedDraft: mutableDraft,
                currentNode: 'APPROVAL',
            };
        }

        // ── 9. Enter APPROVAL ─────────────────────────────────────────────────
        if (finalDecision.nextNode === 'APPROVAL') {
            await this.persistNode(conversationId, 'APPROVAL');
            return { nextStage: this.mapNodeToStage('APPROVAL'), reasoning: finalDecision.reasoning, currentNode: 'APPROVAL' };
        }

        // ── 10. Persist and return ───────────────────────────────────────────
        await this.persistNode(conversationId, finalDecision.nextNode);
        return {
            nextStage: this.mapNodeToStage(finalDecision.nextNode),
            reasoning: `[Graph: ${currentNode}→${finalDecision.nextNode}] ${finalDecision.reasoning}`,
            currentNode: finalDecision.nextNode,
        };
    }

    // ─── Readiness assessment ─────────────────────────────────────────────────

    async assessStageReadiness(
        targetStage: ConversationStage,
        draft: AgentDraft,
        userId: string
    ): Promise<StageReadinessAssessment> {
        const weights: Array<{ field: keyof AgentDraft; weight: number; label: string }> = [
            { field: 'name', weight: 25, label: 'Agent name' },
            { field: 'systemPrompt', weight: 40, label: 'System prompt' },
            { field: 'description', weight: 15, label: 'Description' },
            { field: 'agentType', weight: 10, label: 'Agent type' },
            { field: 'capabilities', weight: 10, label: 'Capabilities' },
        ];

        const missingFields: string[] = [];
        const criticalIssues: string[] = [];
        let score = 0;

        for (const { field, weight, label } of weights) {
            const val = draft[field];
            const present = val && (!Array.isArray(val) || (val as unknown[]).length > 0);
            if (present) {
                score += weight;
            } else {
                missingFields.push(label);
                if (field === 'name' || field === 'systemPrompt') {
                    criticalIssues.push(`Missing critical field: ${label}`);
                }
            }
        }

        // #8: systemPromptPending is now typed — no cast needed
        if (draft.systemPromptPending) {
            criticalIssues.push('System prompt is still being generated — please wait.');
            score = Math.min(score, 85); // can't be "ready"
        }

        const isReady = score >= 90 && criticalIssues.length === 0;
        const canProceed = criticalIssues.length === 0;

        const userFriendlyMessage = isReady
            ? 'Your agent configuration is complete and ready to launch.'
            : canProceed
                ? `Agent is ${score}% complete. You can proceed, but adding ${missingFields.slice(0, 2).join(', ')} would make it stronger.`
                : `To launch, you still need: ${criticalIssues.join(', ')}.`;

        return {
            isReady,
            missingFields,
            completionPercentage: score,
            criticalIssues,
            recommendations: missingFields
                .filter((f) => !criticalIssues.some((c) => c.includes(f)))
                .map((f) => `💡 Adding ${f} will improve your agent's effectiveness.`),
            canProceed,
            userFriendlyMessage,
        };
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async persistNode(conversationId: string | undefined, node: GraphNodeId): Promise<void> {
        if (!conversationId) return;
        // CRIT-08: nodeHistory removed — it was persisted but never read (pure Redis overhead).
        await this.setGraphNode(conversationId, node);
    }
}