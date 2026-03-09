/**
 * ═══════════════════════════════════════════════════════
 * AGENT MODEL ROUTER  (3.6 Model Strategy Layer)
 * ═══════════════════════════════════════════════════════
 *
 * No single model is used for everything. A routing policy
 * engine maps step types to model tiers based on declared
 * rules — not ad-hoc decisions scattered across services.
 *
 * Tiers:
 *   PLAN     → Highest-tier (GPT-4o, Claude Opus)
 *   CRITIQUE → Mid-tier (GPT-4o-mini with strict schema)
 *   FORMAT   → Cheapest capable (GPT-4o-mini, Gemini Flash)
 *   EMBED    → Dedicated embedding model — NEVER a generation model
 *   ROUTING  → Dynamic switch on confidence or budget
 */

import type { ModelTier } from './agentArchitecture';
import { fetchModel } from '@/utils/ai/fetchModel';

// ── Tier → Model Mapping ──────────────────────────────────────────────────────

interface ModelSpec {
    /** OpenAI / Anthropic / Google model identifier */
    id: string;
    /** Max output tokens allocated to this tier */
    maxOutputTokens: number;
    /** Temperature override for this tier */
    temperature: number;
    /** Approximate cost per 1K input tokens (USD) — used for budget forecasting */
    costPerKInputTokens: number;
}

const MODEL_TIER_MAP: Record<ModelTier, ModelSpec> = {
    PLAN: {
        id: 'gpt-4o',
        maxOutputTokens: 2048,
        temperature: 0.2, // Low temp for deterministic, structured plans
        costPerKInputTokens: 0.005,
    },
    CRITIQUE: {
        id: 'gpt-4o-mini',
        maxOutputTokens: 512,
        temperature: 0.0, // Zero temp for strict binary pass/fail judgements
        costPerKInputTokens: 0.00015,
    },
    FORMAT: {
        id: 'gpt-4o-mini',
        maxOutputTokens: 256,
        temperature: 0.0, // Zero temp for deterministic JSON marshalling
        costPerKInputTokens: 0.00015,
    },
    EMBED: {
        id: 'text-embedding-3-small',
        maxOutputTokens: 0, // Embedding models produce vectors, not tokens
        temperature: 0.0,
        costPerKInputTokens: 0.00002,
    },
    ROUTING: {
        id: 'gpt-4o-mini',
        maxOutputTokens: 128,
        temperature: 0.0,
        costPerKInputTokens: 0.00015,
    },
};

// ── Router ────────────────────────────────────────────────────────────────────

export class AgentModelRouter {
    /**
     * Resolve the concrete model spec for a given tier.
     * Falls back to the workspace default model fetched via fetchModel()
     * if the tier's model is unavailable (e.g. during a rollout).
     */
    async resolve(tier: ModelTier): Promise<ModelSpec & { effectiveId: string }> {
        const spec = MODEL_TIER_MAP[tier];

        // For non-EMBED tiers, verify the model is accessible
        if (tier !== 'EMBED') {
            try {
                // fetchModel returns the workspace-configured primary model for validation
                const workspaceModel = await fetchModel();

                // If the workspace is configured to use a specific model, respect it for PLAN tier
                if (tier === 'PLAN' && workspaceModel?.name) {
                    return { ...spec, effectiveId: workspaceModel.name };
                }
            } catch {
                console.warn(`[ModelRouter] fetchModel failed — using tier default: ${spec.id}`);
            }
        }

        return { ...spec, effectiveId: spec.id };
    }

    /**
     * Estimate the USD cost for a completion at a given tier.
     * Used by the governance layer's budget check before issuing the call.
     */
    estimateCost(tier: ModelTier, estimatedInputTokens: number): number {
        const spec = MODEL_TIER_MAP[tier];
        return (estimatedInputTokens / 1000) * spec.costPerKInputTokens;
    }

    /**
     * Determine which tier to use based on FSM state.
     * This is the routing logic — it maps states to tiers explicitly.
     */
    tierForState(fsmState: string): ModelTier {
        switch (fsmState) {
            case 'PLAN':
            case 'SUBGRAPH_START':
                return 'PLAN';

            case 'VALIDATE_PLAN':
            case 'CRITIQUE_STEP':
            case 'HUMAN_REVIEW':
                return 'CRITIQUE';

            case 'EXECUTE_STEP':
            case 'FORMAT':
                return 'FORMAT';

            case 'LOAD_CONTEXT':
            case 'MERGE_BRANCH':
                return 'EMBED';

            default:
                return 'ROUTING';
        }
    }
}

export const agentModelRouter = new AgentModelRouter();
