/**
 * Agent Orchestration Graph
 * 
 * Defines the state machine for the Agent Builder.
 * Moves away from linear stages to a graph-based approach.
 */

import { AgentDraft } from '../agentBuilderStateService';

export type GraphNodeId =
    | 'INTENT'        // Initial state: What are we building?
    | 'SCOPE'         // Defining the agent's core purpose and domain
    | 'BEHAVIOR'      // Defining system prompt and personality
    | 'TEAM'          // Defining sub-agents and collaboration
    | 'CAPABILITIES'  // Selecting tools and knowledge
    | 'TRIGGERS'      // Defining when the agent runs
    | 'VERIFICATION'  // Automated checks and dry-ops
    | 'REFLECTION'    // Self-critique and optimization loop
    | 'APPROVAL'      // User confirmation
    | 'LAUNCH';       // Deployment

export interface GraphContext {
    draft: AgentDraft;
    missingRequirements: string[];
    issues: string[];
    userFeedback: string[];
}

export interface GraphEdge {
    from: GraphNodeId;
    to: GraphNodeId;
    condition?: (context: GraphContext) => boolean;
    reason: string;
}

export const GRAPH_NODES: Record<GraphNodeId, {
    description: string;
    requiredFields: string[];
}> = {
    INTENT: {
        description: "Understand user intent and initialize draft",
        requiredFields: []
    },
    SCOPE: {
        description: "Define agent name, description, and high-level goal",
        requiredFields: ['name', 'description']
    },
    BEHAVIOR: {
        description: " crafting the system prompt and rules",
        requiredFields: ['systemPrompt', 'agentType']
    },
    TEAM: {
        description: "Assign sub-agents and roles",
        requiredFields: []
    },
    CAPABILITIES: {
        description: "Select tools and knowledge bases",
        requiredFields: [] // Optional
    },
    TRIGGERS: {
        description: "Configure automation triggers",
        requiredFields: [] // Optional
    },
    VERIFICATION: {
        description: "Validate the agent against policies and best practices",
        requiredFields: []
    },
    REFLECTION: {
        description: "Self-critique the draft for quality and internal consistency",
        requiredFields: []
    },
    APPROVAL: {
        description: "Present final draft for user sign-off",
        requiredFields: []
    },
    LAUNCH: {
        description: "Persist and activate the agent",
        requiredFields: ['status'] // status -> ready
    }
};

/**
 * Rules for transitions
 * This can be used by the AI Orchestrator to decide next moves
 */
export const ALLOWED_TRANSITIONS: GraphEdge[] = [
    // Happy paths
    { from: 'INTENT', to: 'SCOPE', reason: "Intent clarified, moving to scope" },
    { from: 'SCOPE', to: 'BEHAVIOR', reason: "Scope defined, defining behavior" },
    { from: 'BEHAVIOR', to: 'TEAM', reason: "Behavior set, defining team structure" },
    { from: 'TEAM', to: 'CAPABILITIES', reason: "Team defined, adding tools" },
    { from: 'CAPABILITIES', to: 'TRIGGERS', reason: "Capabilities set, setting triggers" },
    { from: 'TRIGGERS', to: 'VERIFICATION', reason: "Configuration complete, verifying" },
    { from: 'VERIFICATION', to: 'REFLECTION', reason: "Verification passed, optimizing" },
    { from: 'REFLECTION', to: 'APPROVAL', reason: "Reflection complete, ready for approval" },
    { from: 'APPROVAL', to: 'LAUNCH', reason: "User approved" },

    // Loops / Corrections
    { from: 'VERIFICATION', to: 'BEHAVIOR', reason: "Verification failed (Prompt issues)" },
    { from: 'VERIFICATION', to: 'TEAM', reason: "Verification failed (Team issues)" },
    { from: 'VERIFICATION', to: 'CAPABILITIES', reason: "Verification failed (Tool issues)" },
    { from: 'REFLECTION', to: 'BEHAVIOR', reason: "Reflection found prompt weakness" },
    { from: 'REFLECTION', to: 'TEAM', reason: "Reflection found team gap" },
    { from: 'REFLECTION', to: 'TRIGGERS', reason: "Reflection found trigger gap" },
    { from: 'APPROVAL', to: 'SCOPE', reason: "User rejected draft (Wrong scope)" },
    { from: 'APPROVAL', to: 'BEHAVIOR', reason: "User rejected draft (Behavior tweak)" },
    { from: 'APPROVAL', to: 'TEAM', reason: "User rejected draft (Team adjustment)" },

    // Shortcuts
    { from: 'INTENT', to: 'VERIFICATION', reason: "User provided full spec upfront" },
];
