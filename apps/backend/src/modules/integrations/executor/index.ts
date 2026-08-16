import { getCatalogActionByToolName } from '@agentflox/types/integrationCatalog';
import { executeApiIntegrationTool } from '@/services/agents/execution/apiIntegrationExecutor';
import {
  executeGithubApiCall,
  executeGithubGetRepository,
  executeGithubListRepos,
} from './githubExecutor';
import { executeSlackPostMessage } from './slackExecutor';

const GITHUB_TOOLS = new Set(['githubGetRepository', 'githubListRepos', 'githubApiCall']);
const SLACK_TOOLS = new Set(['slackPostMessage']);

export function isSaasIntegrationTool(toolName: string): boolean {
  if (GITHUB_TOOLS.has(toolName) || SLACK_TOOLS.has(toolName)) return true;
  const catalogAction = getCatalogActionByToolName(toolName);
  return catalogAction != null && catalogAction.providerId !== 'webhook';
}

export async function executeSaasIntegrationTool(
  toolName: string,
  params: Record<string, unknown>,
  userId: string,
  workspaceId?: string,
): Promise<unknown> {
  const catalogAction = getCatalogActionByToolName(toolName);
  if (catalogAction?.providerId === 'webhook') {
    return executeApiIntegrationTool(toolName, params, userId, workspaceId);
  }

  switch (toolName) {
    case 'githubGetRepository':
      return executeGithubGetRepository(params as any, userId, workspaceId);
    case 'githubListRepos':
      return executeGithubListRepos(params as any, userId, workspaceId);
    case 'githubApiCall':
      return executeGithubApiCall(params as any, userId, workspaceId);
    case 'slackPostMessage':
      return executeSlackPostMessage(params as any, userId, workspaceId);
    default:
      throw new Error(`Unknown SaaS integration tool: ${toolName}`);
  }
}

export function listSaasIntegrationToolNames(): string[] {
  return ['githubGetRepository', 'githubListRepos', 'githubApiCall', 'slackPostMessage'];
}
