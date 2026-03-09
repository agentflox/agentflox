import { toolRegistryManager } from '../core/ToolRegistryManager';

// Import all tool categories
import { CONTENT_CREATION_TOOLS } from './categories/contentCreation';
import { CODE_OPERATION_TOOLS } from './categories/codeOperations';
import { BROWSER_AUTOMATION_TOOLS } from './categories/browserAutomation';
import { MEDIA_GENERATION_TOOLS } from './categories/mediaGeneration';
import { FILE_OPERATION_TOOLS } from './categories/fileOperations';
import { API_INTEGRATION_TOOLS } from './categories/apiIntegration';

import { TASK_MANAGEMENT_TOOLS } from './categories/taskManagement';
import { SEARCH_TOOLS } from './categories/search';
import { PROJECT_MANAGEMENT_TOOLS } from './categories/projectManagement';
import { TEAM_MANAGEMENT_TOOLS } from './categories/teamManagement';
import { PROFILE_MANAGEMENT_TOOLS } from './categories/profileManagement';
import { PROPOSAL_MANAGEMENT_TOOLS } from './categories/proposalManagement';
import { MARKETPLACE_TOOLS } from './categories/marketplace';
import { AGENT_ORCHESTRATION_TOOLS } from './categories/agentOrchestration';

// Register all tools to the singleton manager
toolRegistryManager.registerMany(CONTENT_CREATION_TOOLS);
toolRegistryManager.registerMany(CODE_OPERATION_TOOLS);
toolRegistryManager.registerMany(BROWSER_AUTOMATION_TOOLS);
toolRegistryManager.registerMany(MEDIA_GENERATION_TOOLS);
toolRegistryManager.registerMany(FILE_OPERATION_TOOLS);
toolRegistryManager.registerMany(API_INTEGRATION_TOOLS);

toolRegistryManager.registerMany(TASK_MANAGEMENT_TOOLS);
toolRegistryManager.registerMany(SEARCH_TOOLS);
toolRegistryManager.registerMany(PROJECT_MANAGEMENT_TOOLS);
toolRegistryManager.registerMany(TEAM_MANAGEMENT_TOOLS);
toolRegistryManager.registerMany(PROFILE_MANAGEMENT_TOOLS);
toolRegistryManager.registerMany(PROPOSAL_MANAGEMENT_TOOLS);
toolRegistryManager.registerMany(MARKETPLACE_TOOLS);
toolRegistryManager.registerMany(AGENT_ORCHESTRATION_TOOLS);

// Export the populated manager for convenience
export { toolRegistryManager };
