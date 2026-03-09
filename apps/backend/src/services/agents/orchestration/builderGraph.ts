/**
 * Agent Builder Orchestration Graph
 *
 * Defines the state machine for the Agent Builder.
 *
 * Enterprise Design Principles (ClickUp SuperAgent / LangGraph):
 * - GraphContext carries currentNode + nodeHistory across HTTP requests (persistent graph position)
 * - Conditional edges are type-safe predicates, not magic strings
 * - VERIFICATION and REFLECTION nodes enforce real policy checks, not no-ops
 */

import { AgentDraft } from '../state/agentBuilderStateService';

export type GraphNodeId =
    | 'INTENT'        // Initial state: What are we building?
    | 'ROLE'          // Define the agent's core role and persona
    | 'SCOPE'         // Define the agent's domain, name, and high-level goal
    | 'SKILLS'        // Specify knowledge bases and reasoning skills
    | 'TOOLS'         // Assign tool access and integrations
    | 'CAPABILITIES'  // Finalize permissions and capability flags
    | 'TRIGGERS'      // Define when and how the agent is activated
    | 'SYSTEM_PROMPT' // Auto-generate system prompt from all collected config (single pass, no user turn)
    | 'VERIFICATION'  // Automated policy and sanity checks
    | 'REFLECTION'    // Self-critique and optimization loop
    | 'APPROVAL'      // User confirmation before deployment
    | 'LAUNCH';       // Persist and activate the agent

export interface GraphContext {
    /** The current node being processed — must be persisted in Redis across HTTP requests. */
    currentNode: GraphNodeId;
    /** Historical traversal path for audit and observability. */
    nodeHistory: GraphNodeId[];
    draft: AgentDraft;
    missingRequirements: string[];
    issues: string[];
    userFeedback: string[];
    /** Arbitrary extension metadata (e.g. LLM reasoning, confidence scores). */
    metadata?: Record<string, unknown>;
}

export interface GraphEdge {
    from: GraphNodeId;
    to: GraphNodeId;
    /** Typed predicate — when omitted the edge is unconditional. */
    condition?: (context: GraphContext) => boolean;
    reason: string;
}

/**
 * Helper: evaluate all outbound edges from a given node and return
 * the set of valid next nodes according to their conditions.
 * Used by GraphOrchestrator to constrain LLM navigation choices.
 */
export function getEligibleTransitions(
    from: GraphNodeId,
    context: GraphContext
): GraphEdge[] {
    return ALLOWED_TRANSITIONS.filter(
        (e) => e.from === from && (e.condition == null || e.condition(context))
    );
}

export const GRAPH_NODES: Record<GraphNodeId, {
    description: string;
    requiredFields: string[];
}> = {
    INTENT: {
        description: "Understand user intent and initialize the draft",
        requiredFields: []
    },
    ROLE: {
        description: "Define the agent's core role, persona, and primary function",
        requiredFields: ['agentType']
    },
    SCOPE: {
        description: "Define agent name, description, and high-level goal",
        requiredFields: ['name'] // description is recommended but not a hard gate (see NODE_CONTRACTS.SCOPE)
    },
    SKILLS: {
        description: "Specify knowledge bases, reasoning strategies, and domain skills",
        requiredFields: [] // Optional
    },
    TOOLS: {
        description: "Assign tool access, API integrations, and external services",
        requiredFields: [] // Optional
    },
    CAPABILITIES: {
        description: "Finalize permission flags and capability constraints",
        requiredFields: [] // Optional
    },
    TRIGGERS: {
        description: "Configure automation triggers and activation conditions",
        requiredFields: [] // Optional
    },
    SYSTEM_PROMPT: {
        description: "Auto-generate the agent's system prompt from all collected configuration in one pass — no user interaction required",
        requiredFields: ['systemPrompt']
    },
    VERIFICATION: {
        description: "Validate the agent draft against policies and best practices",
        requiredFields: []
    },
    REFLECTION: {
        description: "Self-critique the draft for quality and internal consistency",
        requiredFields: []
    },
    APPROVAL: {
        description: "Present the final draft (including generated system prompt) for user sign-off before deployment",
        requiredFields: ['systemPrompt']
    },
    LAUNCH: {
        description: "Persist and activate the agent",
        requiredFields: ['status'] // status -> ready
    }
};

/**
 * Rules for transitions.
 * This can be used by the AI Orchestrator to decide next moves.
 */
export const ALLOWED_TRANSITIONS: GraphEdge[] = [
    // Happy path
    { from: 'INTENT', to: 'ROLE', reason: "Intent clarified, defining agent role" },
    { from: 'ROLE', to: 'SCOPE', reason: "Role defined, scoping the agent" },
    { from: 'SCOPE', to: 'SKILLS', reason: "Scope set, collecting skills" },
    { from: 'SKILLS', to: 'TOOLS', reason: "Skills defined, assigning tools" },
    { from: 'TOOLS', to: 'CAPABILITIES', reason: "Tools assigned, finalizing capabilities" },
    { from: 'CAPABILITIES', to: 'TRIGGERS', reason: "Capabilities set, configuring triggers" },
    { from: 'TRIGGERS', to: 'SYSTEM_PROMPT', reason: "Configuration complete, auto-generating system prompt" },
    { from: 'SYSTEM_PROMPT', to: 'VERIFICATION', reason: "System prompt generated, verifying" },
    { from: 'VERIFICATION', to: 'REFLECTION', reason: "Verification passed, optimizing" },
    { from: 'REFLECTION', to: 'APPROVAL', reason: "Reflection complete, ready for approval" },
    { from: 'APPROVAL', to: 'LAUNCH', reason: "User approved" },

    // Loops / Corrections (VERIFICATION and REFLECTION route back to config nodes, not SYSTEM_PROMPT)
    { from: 'VERIFICATION', to: 'SYSTEM_PROMPT', reason: "Verification failed (system prompt too short or missing)" },
    { from: 'VERIFICATION', to: 'TOOLS', reason: "Verification failed (Tool issues)" },
    { from: 'VERIFICATION', to: 'CAPABILITIES', reason: "Verification failed (Capability issues)" },
    { from: 'REFLECTION', to: 'SYSTEM_PROMPT', reason: "Reflection found prompt weakness — regenerate" },
    { from: 'REFLECTION', to: 'SKILLS', reason: "Reflection found skills gap" },
    { from: 'REFLECTION', to: 'TRIGGERS', reason: "Reflection found trigger gap" },
    { from: 'APPROVAL', to: 'SCOPE', reason: "User rejected draft (Wrong scope)" },
    { from: 'APPROVAL', to: 'SYSTEM_PROMPT', reason: "User rejected draft (Prompt tweak) — regenerate" },
    { from: 'APPROVAL', to: 'TOOLS', reason: "User rejected draft (Tool adjustment)" },

    // Shortcuts
    { from: 'INTENT', to: 'VERIFICATION', reason: "User provided full spec upfront" },
];
