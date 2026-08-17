import type { AutomationActionTypeV1 } from './actionCatalog';

export {
  AUTOMATION_TRIGGER_TYPES,
  TRIGGER_CATALOG,
  type AutomationTriggerTypeV1,
} from './triggerCatalog';

export {
  AUTOMATION_ACTION_TYPES,
  ACTION_CATALOG,
  AGENT_ACTION_TYPES,
  type AutomationActionTypeV1,
} from './actionCatalog';

export type CreationSourceFilters = {
  apis: boolean;
  forms: boolean;
  users: boolean;
  emails: boolean;
  imports: boolean;
  templates: boolean;
  recurrence: boolean;
  automations: boolean;
  integrations: boolean;
  chromeExtensions: boolean;
};

export const DEFAULT_CLASSIC_SOURCES: CreationSourceFilters = {
  apis: false,
  forms: true,
  users: true,
  emails: true,
  imports: true,
  templates: true,
  recurrence: true,
  automations: false,
  integrations: true,
  chromeExtensions: false,
};

export const DEFAULT_AGENT_SOURCES: CreationSourceFilters = {
  apis: true,
  forms: true,
  users: true,
  emails: true,
  imports: true,
  templates: true,
  recurrence: true,
  automations: true,
  integrations: true,
  chromeExtensions: true,
};

export type WorkspaceKnowledge = {
  currentLocation: boolean;
  workspaceAssetTypes: Array<'docs' | 'tasks' | 'chats' | 'lists'>;
  extraAssets: { docs: string[]; chats: string[]; lists: string[]; tasks: string[] };
  privateAddedAssets: {
    docs: string[];
    chats: string[];
    lists: string[];
    tasks: string[];
    spaces: string[];
    folders: string[];
  };
};

export const emptyKnowledge = (): WorkspaceKnowledge => ({
  currentLocation: true,
  workspaceAssetTypes: ['docs', 'tasks', 'chats'],
  extraAssets: { docs: [], chats: [], lists: [], tasks: [] },
  privateAddedAssets: { docs: [], chats: [], lists: [], tasks: [], spaces: [], folders: [] },
});

export type ActionSpec = {
  type: AutomationActionTypeV1;
  input: Record<string, any>;
};

export function inferKindFromActions(actions: Array<{ type: string }>): 'CLASSIC' | 'AGENT' {
  return actions.some((a) => a.type === 'DO_ANYTHING_WITH_AI' || a.type === 'LAUNCH_AI_AGENT') ? 'AGENT' : 'CLASSIC';
}

export function logicSentence(triggerLabel: string, actionLabel: string) {
  return `When ${triggerLabel} then ${actionLabel}`;
}

export type AutomationScope = {
  workspaceId?: string;
  teamId?: string;
  spaceId?: string;
  projectId?: string;
  contextType: 'WORKSPACE' | 'TEAM' | 'SPACE' | 'PROJECT';
  contextId: string;
  contextName: string;
};
