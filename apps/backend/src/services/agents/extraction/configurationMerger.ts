/**
 * Configuration Merger
 * 
 * Merges extracted configuration with existing agent draft.
 * Handles intelligent merging logic to avoid overwriting existing data.
 */

import { AgentDraft } from '../state/agentBuilderStateService';
import { ExtractedConfiguration } from '../validation/configurationValidator';
import { AgentTriggerType } from '../types/types';


export class ConfigurationMerger {
  /**
   * Merge extracted configuration with existing draft
   * Smart merging - don't overwrite with empty values
   */
  mergeConfiguration(
    existingDraft: AgentDraft,
    extracted: ExtractedConfiguration
  ): AgentDraft {
    const merged: AgentDraft = { ...existingDraft };

    // Only update non-empty values
    if (extracted.name) merged.name = extracted.name;
    if (extracted.description) merged.description = extracted.description;
    if (extracted.avatar) merged.avatar = extracted.avatar;
    if (extracted.agentType) merged.agentType = extracted.agentType;
    if (extracted.systemPrompt) merged.systemPrompt = extracted.systemPrompt;
    if (extracted.personality) merged.personality = extracted.personality;
    if (extracted.scopeType) merged.scopeType = extracted.scopeType;
    if (extracted.isPortable !== undefined) merged.isPortable = extracted.isPortable;

    // Arrays - merge intelligently
    if (extracted.capabilities?.length) {
      merged.capabilities = [...(merged.capabilities || []), ...extracted.capabilities];
      // Deduplicate
      merged.capabilities = Array.from(new Set(merged.capabilities));
    }

    if (extracted.constraints?.length) {
      merged.constraints = [...(merged.constraints || []), ...extracted.constraints];
      merged.constraints = Array.from(new Set(merged.constraints));
    }

    if (extracted.tools?.length) {
      merged.tools = [...(merged.tools || []), ...extracted.tools];
      // Deduplicate by id
      const toolMap = new Map(merged.tools.map(t => [t.id, t]));
      merged.tools = Array.from(toolMap.values());
    }

    // Merge agent triggers (only MANUAL/SCHEDULED types)
    if (extracted.triggers?.length) {
      const existingTriggers = merged.triggers || [];
      const newTriggers = extracted.triggers.filter(t =>
        t.triggerType === AgentTriggerType.ASSIGN_TASK ||
        t.triggerType === AgentTriggerType.DIRECT_MESSAGE ||
        t.triggerType === AgentTriggerType.MENTION ||
        t.triggerType === AgentTriggerType.SCHEDULED
      );

      const combinedTriggers = [...existingTriggers, ...newTriggers];
      const triggerMap = new Map(combinedTriggers.map(t => [t.triggerType, t]));
      merged.triggers = Array.from(triggerMap.values());
    }

    if (extracted.rules?.length) {
      merged.rules = [...(merged.rules || []), ...extracted.rules];
    }

    if (extracted.knowledgeBases?.length) {
      merged.knowledgeBases = [...(merged.knowledgeBases || []), ...extracted.knowledgeBases];
    }

    // Model config - merge
    if (extracted.modelConfig) {
      merged.modelConfig = {
        ...merged.modelConfig,
        ...extracted.modelConfig,
      };
    }

    return merged;
  }
}

