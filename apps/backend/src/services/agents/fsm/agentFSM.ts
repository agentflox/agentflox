/**
 * Agent Builder Finite State Machine
 *
 * Enforces explicit, guarded state transitions for the agent-builder workflow.
 * The LLM determines the *requested* next stage via GraphOrchestrator; this
 * module is the gate that either approves or rejects that transition.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  initialization → configuration → launch                        │
 * │  Any stage may loop back to itself (iterative refinement).      │
 * │  configuration may also jump forward to launch once ready.      │
 * │  launch can revert to configuration if the user wants to edit.  │
 * └──────────────────────────────────────────────────────────────────┘
 */

import { ConversationStage } from '../state/agentBuilderStateService';

// ─── Transition table ────────────────────────────────────────────────────────
// Defined as a map of current stage → allowed next stages.
// A stage always permits staying at itself (self-loop = iterative refinement).
const ALLOWED_TRANSITIONS: Record<ConversationStage, ReadonlySet<ConversationStage>> = {
    initialization: new Set<ConversationStage>(['initialization', 'configuration']),
    configuration: new Set<ConversationStage>(['configuration', 'launch']),
    launch: new Set<ConversationStage>(['launch', 'configuration']), // allow revert for edits
};

// ─── Errors ──────────────────────────────────────────────────────────────────
export class IllegalStateTransitionError extends Error {
    constructor(
        public readonly from: ConversationStage,
        public readonly to: ConversationStage,
    ) {
        super(
            `[AgentFSM] Illegal state transition: ${from} → ${to}. ` +
            `Allowed targets from "${from}": ${[...ALLOWED_TRANSITIONS[from]].join(', ')}.`
        );
        this.name = 'IllegalStateTransitionError';
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate that transitioning from `from` to `to` is permitted.
 * Throws `IllegalStateTransitionError` if the transition is illegal.
 * Returns `to` on success so callers can write: `const next = assertTransition(...)`.
 */
export function assertTransition(
    from: ConversationStage,
    to: ConversationStage,
): ConversationStage {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
        throw new IllegalStateTransitionError(from, to);
    }
    return to;
}

/**
 * Safe variant: if the requested `to` stage is illegal, clamp it to the
 * closest valid stage (current stage) and log a warning instead of throwing.
 * Use this in non-critical paths where a hard error would harm UX.
 */
export function safeTransition(
    from: ConversationStage,
    to: ConversationStage,
    logger = console,
): ConversationStage {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
        logger.warn(
            `[AgentFSM] Illegal transition ${from} → ${to} — clamping to "${from}". ` +
            `Allowed: ${[...ALLOWED_TRANSITIONS[from]].join(', ')}.`
        );
        return from; // stay at current stage
    }
    return to;
}

/**
 * Returns all stages reachable from `from` in a single step.
 */
export function allowedTargets(from: ConversationStage): ConversationStage[] {
    return [...(ALLOWED_TRANSITIONS[from] ?? [])];
}
