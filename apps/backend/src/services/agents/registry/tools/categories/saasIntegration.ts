import { buildSaasIntegrationToolDefinitions } from '@/modules/integrations/registry/catalogTools';
import type { ToolDefinition } from '../core/ToolRegistryManager';

/**
 * SaaS integration tools — generated from the canonical integration catalog.
 */
export const SAAS_INTEGRATION_TOOLS: ToolDefinition[] = buildSaasIntegrationToolDefinitions();
