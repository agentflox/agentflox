import { AgentDraft, ConversationStage, ConversationState } from '../state/agentBuilderStateService';
import { ExtractedConfiguration, ValidationResult } from '../validation/configurationValidator';
import { UserContext } from '../state/agentBuilderContextService';
import { AgentType } from '../types/types';
import { StageReadinessAssessment } from '../orchestration/stageOrchestrator';
import { InferredAutomation } from '../types/schemas';
import { GraphNodeId } from '../orchestration/builderGraph';

export interface IConfigurationValidator {
    preValidate(message: string): ValidationResult;
    validateExtractedConfig(extracted: ExtractedConfiguration): ValidationResult;
    detectHallucinations(extracted: ExtractedConfiguration, userMessage: string): string[];
}

export interface SafetyResult {
    safe: boolean;
    violations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PolicyResult {
    compliant: boolean;
    violations: string[];
    requiresApproval: boolean;
}

export interface ISafetyEvaluator {
    evaluatePrompt(prompt: string): Promise<SafetyResult>;
    evaluateCapabilities(capabilities: string[], allowedTools: string[]): Promise<{ valid: boolean; errors: string[] }>;
}

export interface IPolicyEngine {
    checkCompliance(draft: AgentDraft, userId: string): Promise<PolicyResult>;
}

export interface ICapabilityWhitelist {
    validateCapabilities(agentType: AgentType | string | undefined, capabilities: string[]): { valid: boolean; errors: string[] };
}

export interface IToolAccessController {
    checkToolAccess(agentId: string, toolId: string, userId: string): Promise<boolean>;
    validateCapabilities(agentType: AgentType | string | undefined, capabilities: string[], availableTools: string[]): Promise<{ valid: boolean; errors: string[] }>;
}

export interface IPromptSandbox {
    validatePrompt(prompt: string): Promise<{ valid: boolean; errors: string[]; sanitized?: string }>;
}

export interface IVersionControl {
    createVersion(agentId: string, draft: AgentDraft, userId: string): Promise<void>;
}

export interface IAuditLogger {
    logUpdate(agentId: string, beforeState: any, afterState: any, context: { userId: string }): Promise<void>;
    logLaunch(agentId: string, context: { userId: string }): Promise<void>;
}

export interface IResponseCache {
    generateCacheKey(message: string, context?: any): string;
    getCachedResponse<T>(cacheKey: string): Promise<T | null>;
    cacheResponse<T>(cacheKey: string, response: T, ttl?: number): Promise<void>;
    cacheUserContext(userId: string, context: UserContext, ttl?: number): Promise<void>;
    getCachedUserContext(userId: string): Promise<UserContext | null>;
    cacheExtractedConfiguration(cacheKey: string, config: any): Promise<void>;
}

export interface BudgetCheckResult {
    allowed: boolean;
    estimated: number;
    budget: number;
    recommendation?: string;
}

export interface ITokenBudgetManager {
    checkBudget(stage: string, estimatedTokens: number): Promise<BudgetCheckResult>;
    compressIfNeeded(history: Array<{ role: string; content: string }>, maxTokens: number): Promise<Array<{ role: string; content: string }>>;
    estimateTokens(text: string): number;
    getBudget(stage: string): number;
}

export interface IConfigurationExtractor {
    extract(
        message: string,
        state: any,
        userContext: UserContext,
        userId: string,
        conversationId: string
    ): Promise<ExtractedConfiguration>;
}

export interface IAutomationInferrer {
    infer(
        history: Array<{ role: string; content: string }>,
        message: string,
        draft: AgentDraft,
        userContext: UserContext,
        userId: string
    ): Promise<{ automations: InferredAutomation[]; reasoning: string }>;
}

export interface IPromptGenerator {
    generate(draft: AgentDraft, userContext: UserContext): Promise<string>;
}

export interface IConfigurationMerger {
    mergeConfiguration(draft: AgentDraft, extracted: ExtractedConfiguration): AgentDraft;
}

export interface IInputSanitizer {
    sanitize(input: string): string;
}

export interface IPermissionService {
    checkAgentPermission(agentId: string, userId: string, action: 'read' | 'write' | 'execute'): Promise<boolean>;
}

export interface IEntityScopeInferrer {
    inferAndFetchEntityScope(
        message: string,
        history: Array<{ role: string; content: string }>,
        userContext: UserContext,
        userId: string
    ): Promise<UserContext>;
}

export interface IStageOrchestrator {
    /**
     * Determine the next stage / graph node.
     *
     * @param conversationId Optional — when provided, GraphOrchestrator will persist
     *                        the current node in Redis for stateful cross-request traversal.
     * @param context         Optional — carries previousDraft snapshot (for drift detection)
     *                        and visitCount (for per-node timeout evaluation).
     */
    determineStageProgression(
        currentStage: ConversationStage,
        draft: AgentDraft,
        conversationHistory: Array<{ role: string; content: string }>,
        userMessage: string,
        extractedConfig: ExtractedConfiguration,
        userId: string,
        conversationId?: string,
        context?: { previousDraft?: AgentDraft; visitCount?: number }
    ): Promise<{ nextStage: ConversationStage; reasoning: string; updatedDraft?: AgentDraft; currentNode?: string }>;

    assessStageReadiness(
        targetStage: ConversationStage,
        draft: AgentDraft,
        userId: string
    ): Promise<StageReadinessAssessment>;

    /**
     * Observability: return the current graph node for this conversation.
     * Only implemented by GraphOrchestrator (returns null for StageOrchestrator).
     */
    getCurrentNode?(conversationId: string): Promise<GraphNodeId | null>;

    /**
     * Persistence: write the current graph node for this conversation to Redis.
     * Only implemented by GraphOrchestrator. Used on re-initialization to re-seed
     * a 'launch'-stage conversation so Redis TTL expiry doesn't reset traversal.
     */
    setGraphNode?(conversationId: string, node: GraphNodeId): Promise<void>;
}