/**
 * Centralized Schema Definitions
 * 
 * All Zod schemas used across the agent builder system.
 * This centralizes schema definitions for consistency and maintainability.
 */

import { z } from 'zod';
import { AgentTriggerType, AutomationTriggerType } from './types';

// ============================================================================
// Entity Scope Inference Schemas
// ============================================================================

export const InferredEntityScopeSchema = z.object({
  scopeType: z.enum(['workspace', 'space', 'project', 'team', 'portable', 'none']),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  shouldFetchDetails: z.boolean(),
});

// ============================================================================
// Agent Trigger Schemas (MANUAL and SCHEDULED only)
// ============================================================================

export const InferredAgentTriggerSchema = z.object({
  triggerType: z.nativeEnum(AgentTriggerType),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()).default({}),
  priority: z.number().default(0),
  conditions: z.record(z.any()).optional(),
  filters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export const AgentTriggerInferenceResponseSchema = z.object({
  triggers: z.array(InferredAgentTriggerSchema),
  shouldUseDefaults: z.boolean(),
  reasoning: z.string(),
});

// ============================================================================
// Automation Trigger Schemas (Event-based automations only)
// ============================================================================

export const InferredAutomationTriggerSchema = z.object({
  triggerType: z.nativeEnum(AutomationTriggerType),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()).default({}),
  priority: z.number().default(0),
  conditions: z.record(z.any()).optional(),
  filters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export const InferredAutomationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  conditions: z.record(z.any()).optional(),
  triggers: z.array(InferredAutomationTriggerSchema),
  actions: z.array(z.record(z.any())).default([]),
  isScheduled: z.boolean().default(false),
  cronExpression: z.string().optional(),
  timezone: z.string().default('UTC'),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export const AutomationInferenceResponseSchema = z.object({
  automations: z.array(InferredAutomationSchema),
  reasoning: z.string(),
});

// ============================================================================
// Configuration Extraction Schemas
// ============================================================================

export const ExtractedConfigurationSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  agentType: z.string().optional(),
  systemPrompt: z.string().optional(),
  personality: z.any().optional(),
  capabilities: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  modelConfig: z.object({
    modelId: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
  }).optional(),
  tools: z.array(z.object({
    id: z.string(),
    name: z.string(),
    config: z.any().optional(),
  })).optional(),
  knowledgeBases: z.array(z.any()).optional(),
  rules: z.array(z.object({
    type: z.string(),
    condition: z.string(),
    action: z.string(),
  })).optional(),
  triggers: z.array(InferredAgentTriggerSchema).optional(),
  stage: z.string().optional(),
  completedFields: z.array(z.string()).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  suggestedSkills: z.array(z.string()).optional(),
  skillInferenceConfidence: z.number().min(0).max(1).optional(),
  skillInferenceReasoning: z.string().optional(),
  scopeType: z.enum(['workspace', 'space', 'project', 'team', 'portable']).optional(),
  isPortable: z.boolean().optional(),
});

// ============================================================================
// Stage Readiness Assessment Schemas
// ============================================================================

export const StageReadinessSchema = z.object({
  isReady: z.boolean(),
  missingFields: z.array(z.string()),
  completionPercentage: z.number().min(0).max(100),
  criticalIssues: z.array(z.string()),
  recommendations: z.array(z.string()),
  canProceed: z.boolean(),
  userFriendlyMessage: z.string(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const FollowupResponseSchema = z.object({
  response: z.string(),
  followups: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })).optional(),
});

// ============================================================================
// Self Verification Schemas
// ============================================================================

export const VerificationResultSchema = z.object({
  isValid: z.boolean(),
  confidence: z.number().min(0).max(100),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// ============================================================================
// TypeScript Interfaces (inferred from Zod schemas)
// ============================================================================

export interface InferredAgentTrigger {
  triggerType: AgentTriggerType;
  name: string;
  description?: string;
  config: Record<string, any>;
  priority: number;
  conditions?: Record<string, any>;
  filters?: Record<string, any>;
  confidence: number;
  reasoning: string;
}

export interface InferredAutomationTrigger {
  triggerType: AutomationTriggerType;
  name: string;
  description?: string;
  config: Record<string, any>;
  priority: number;
  conditions?: Record<string, any>;
  filters?: Record<string, any>;
  confidence: number;
  reasoning: string;
}

export interface InferredAutomation {
  name: string;
  description?: string;
  conditions?: Record<string, any>;
  triggers: InferredAutomationTrigger[];
  actions: Array<Record<string, any>>;
  isScheduled: boolean;
  cronExpression?: string;
  timezone: string;
  confidence: number;
  reasoning: string;
}

export interface ExtractedConfiguration {
  name?: string;
  description?: string;
  avatar?: string;
  agentType?: string;
  systemPrompt?: string;
  personality?: any;
  capabilities?: string[];
  constraints?: string[];
  modelConfig?: {
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
  };
  tools?: Array<{ id: string; name: string; config?: any }>;
  knowledgeBases?: Array<any>;
  rules?: Array<{ type: string; condition: string; action: string }>;
  triggers?: InferredAgentTrigger[];
  stage?: string;
  completedFields?: string[];
  confidenceScore?: number;
  suggestedSkills?: string[];
  skillInferenceConfidence?: number;
  skillInferenceReasoning?: string;
  scopeType?: 'workspace' | 'space' | 'project' | 'team' | 'portable';
  isPortable?: boolean;
}

export interface StageReadinessAssessment {
  isReady: boolean;
  missingFields: string[];
  completionPercentage: number;
  criticalIssues: string[];
  recommendations: string[];
  canProceed: boolean;
  userFriendlyMessage: string;
}

export interface VerificationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

