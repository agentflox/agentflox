/**
 * Configuration Validator
 * 
 * Provides deterministic validation layers for agent configurations:
 * - Pre-AI validation: Rule-based checks before AI processing
 * - Post-AI validation: Hallucination detection and sanity checks
 */

import { AgentType, AgentTriggerType } from '../types/types';
import { getAllToolsSync } from '../registry/toolRegistry';
import { getDefaultTriggers } from '../registry/triggerRegistry';

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
  triggers?: Array<{
    triggerType: AgentTriggerType;
    name: string;
    description?: string;
    config: Record<string, any>;
    priority: number;
    conditions?: Record<string, any>;
    filters?: Record<string, any>;
    confidence: number;
    reasoning: string;
  }>;
  stage?: string;
  completedFields?: string[];
  confidenceScore?: number;
  suggestedSkills?: string[];
  skillInferenceConfidence?: number;
  skillInferenceReasoning?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export class ConfigurationValidator {
  private toolRegistry: Map<string, any>;
  private availableTriggerTypes: Set<AgentTriggerType>;

  constructor() {
    // Key by tool name — getAllToolsSync() uses temporary IDs like "temp_0_createTask"
    // so looking up by id would never match names returned by the LLM extractor.
    const tools = getAllToolsSync();
    this.toolRegistry = new Map(tools.map(tool => [tool.name, tool]));

    // Load available trigger types
    const triggers = getDefaultTriggers();
    this.availableTriggerTypes = new Set(
      triggers.map(t => t.triggerType as AgentTriggerType)
    );
  }

  /**
   * Pre-validate user input before AI processing
   * Rule-based checks that don't require AI
   */
  preValidate(message: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!message || typeof message !== 'string') {
      errors.push('Message must be a non-empty string');
      return { valid: false, errors, warnings };
    }

    if (message.trim().length === 0) {
      errors.push('Message cannot be empty');
      return { valid: false, errors, warnings };
    }

    if (message.length > 10000) {
      errors.push(`Message exceeds maximum length of 10000 characters (got ${message.length})`);
      return { valid: false, errors, warnings };
    }

    // Check for potential prompt injection patterns
    const injectionPatterns = [
      /\[SYSTEM\]/gi,
      /\[INSTRUCTIONS\]/gi,
      /\[PROMPT\]/gi,
      /\[CONTEXT\]/gi,
      /ignore\s+previous\s+instructions/gi,
      /forget\s+everything/gi,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(message)) {
        warnings.push('Potential prompt injection pattern detected');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate extracted configuration against business rules
   */
  validateExtractedConfig(extracted: ExtractedConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate agent type
    if (extracted.agentType) {
      if (!Object.values(AgentType).includes(extracted.agentType as AgentType)) {
        errors.push(`Invalid agent type: ${extracted.agentType}. Must be one of: ${Object.values(AgentType).join(', ')}`);
      }
    }

    // Validate tool names against registry
    if (extracted.tools && extracted.tools.length > 0) {
      for (const tool of extracted.tools) {
        // The LLM may return the tool name in either the `id` or `name` field.
        // Registry is keyed by name, so check both.
        const resolvedName = this.toolRegistry.has(tool.name)
          ? tool.name
          : this.toolRegistry.has(tool.id)
            ? tool.id
            : null;

        if (!resolvedName) {
          errors.push(`Invalid tool: "${tool.name || tool.id}". Tool not found in registry`);
        }
      }
    }

    // Validate trigger types
    if (extracted.triggers && extracted.triggers.length > 0) {
      for (const trigger of extracted.triggers) {
        if (!Object.values(AgentTriggerType).includes(trigger.triggerType)) {
          errors.push(`Invalid trigger type: ${trigger.triggerType}. Must be one of: ${Object.values(AgentTriggerType).join(', ')}`);
        }

        // Check confidence threshold
        if ((trigger.confidence || 0) < 50) {
          warnings.push(`Low confidence trigger: ${trigger.name} (${trigger.confidence}%). Consider reviewing.`);
        }
      }
    }

    // Validate model config
    if (extracted.modelConfig) {
      if (extracted.modelConfig.temperature !== undefined) {
        if (extracted.modelConfig.temperature < 0 || extracted.modelConfig.temperature > 2) {
          errors.push(`Invalid temperature: ${extracted.modelConfig.temperature}. Must be between 0 and 2`);
        }
      }

      if (extracted.modelConfig.maxTokens !== undefined) {
        if (extracted.modelConfig.maxTokens < 100 || extracted.modelConfig.maxTokens > 32000) {
          errors.push(`Invalid maxTokens: ${extracted.modelConfig.maxTokens}. Must be between 100 and 32000`);
        }
      }
    }

    // Validate name length
    if (extracted.name) {
      if (extracted.name.length > 255) {
        errors.push(`Agent name exceeds maximum length of 255 characters (got ${extracted.name.length})`);
      }
      if (extracted.name.trim().length === 0) {
        errors.push('Agent name cannot be empty or whitespace only');
      }
    }

    // Validate system prompt length
    if (extracted.systemPrompt) {
      if (extracted.systemPrompt.length < 50) {
        warnings.push('System prompt is very short. Consider adding more detail.');
      }
      if (extracted.systemPrompt.length > 10000) {
        errors.push(`System prompt exceeds maximum length of 10000 characters (got ${extracted.systemPrompt.length})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Detect hallucinations in extracted configuration
   * Compares extracted data against user intent and checks for contradictions
   */
  detectHallucinations(
    extracted: ExtractedConfiguration,
    userMessage: string
  ): string[] {
    const warnings: string[] = [];

    // Check for contradictions
    if (extracted.capabilities && extracted.constraints) {
      const hasDeleteCapability = extracted.capabilities.some(c =>
        c.toLowerCase().includes('delete') || c.toLowerCase().includes('remove')
      );
      const hasDeleteConstraint = extracted.constraints.some(c =>
        c.toLowerCase().includes('never delete') ||
        c.toLowerCase().includes('do not delete') ||
        c.toLowerCase().includes('cannot delete')
      );

      if (hasDeleteCapability && hasDeleteConstraint) {
        warnings.push('Contradiction detected: capabilities include delete but constraints prohibit it');
      }
    }

    // Check for unrealistic confidence scores
    if (extracted.confidenceScore !== undefined) {
      if (extracted.confidenceScore > 95 && !extracted.name) {
        warnings.push('High confidence but missing critical field (name) - possible hallucination');
      }

      if (extracted.confidenceScore > 80 && !extracted.systemPrompt) {
        warnings.push('High confidence but missing critical field (systemPrompt) - possible hallucination');
      }
    }

    // Validate extracted data matches user intent
    const userKeywords = this.extractKeywords(userMessage);
    if (extracted.name && !this.matchesUserIntent(extracted.name, userKeywords)) {
      warnings.push('Extracted name does not match user intent - possible hallucination');
    }

    // Check for tool/task mismatches
    if (extracted.agentType === AgentType.TASK_EXECUTOR && extracted.tools) {
      const hasTaskTools = extracted.tools.some(t =>
        t.name.toLowerCase().includes('task') ||
        t.id.toLowerCase().includes('task')
      );
      if (!hasTaskTools && extracted.tools.length > 0) {
        warnings.push('Task executor agent has no task-related tools - possible mismatch');
      }
    }

    return warnings;
  }

  /**
   * Extract keywords from user message for intent matching
   */
  private extractKeywords(message: string): string[] {
    const words = message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter out short words

    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    return words.filter(word => !stopWords.has(word));
  }

  /**
   * Check if extracted value matches user intent
   */
  private matchesUserIntent(extracted: string, keywords: string[]): boolean {
    const extractedLower = extracted.toLowerCase();

    // If no keywords, can't validate
    if (keywords.length === 0) {
      return true;
    }

    // Check if at least one keyword appears in extracted value
    const matches = keywords.filter(keyword =>
      extractedLower.includes(keyword)
    );

    // If more than 50% of keywords match, consider it a match
    return matches.length / keywords.length >= 0.5;
  }
}

