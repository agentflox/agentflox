import {
  listVerifiedCatalogActions,
  type CatalogJsonSchema,
} from '@agentflox/types/integrationCatalog';
import type { ToolDefinition } from '@/services/agents/registry/core/ToolRegistryManager';

function toFunctionSchema(toolName: string, description: string, inputSchema: CatalogJsonSchema) {
  return {
    name: toolName,
    description,
    parameters: {
      type: 'object' as const,
      properties: inputSchema.properties,
      required: inputSchema.required,
    },
  };
}

/**
 * Build SAAS_INTEGRATION SystemTool definitions from the canonical catalog.
 * Webhook actions reuse the existing API_INTEGRATION executor and are excluded here.
 */
export function buildSaasIntegrationToolDefinitions(): ToolDefinition[] {
  return listVerifiedCatalogActions()
    .filter((action) => action.providerId !== 'webhook')
    .map((action) => ({
      name: action.toolName,
      displayName: action.displayName,
      description: action.description,
      category: 'SAAS_INTEGRATION' as const,
      isDefault: false,
      functionSchema: toFunctionSchema(action.toolName, action.description, action.inputSchema),
      deterministic: true,
      requiresAuth: true,
      timeout: 60,
      rateLimit: 100,
      examples: [],
    }));
}
