export const AUTOMATION_ACTION_TYPES = [
  'LAUNCH_AI_AGENT',
  'UPDATE_ASSIGNEES',
  'ADD_ASSIGNEE',
  'UPDATE_STATUS',
  'CALL_WEBHOOK',
  'CALL_WEBHOOK_LEGACY',
  'CREATE_TASK',
  'UPDATE_CUSTOM_FIELD',
  'SET_AI_FIELD',
  'ADD_TO_SPRINT',
  'ADD_TO_LIST',
  'MOVE_TO_LIST',
  'DO_ANYTHING_WITH_AI',
  'REFRESH_AI_FIELD',
  'ADD_COMMENT',
  'SEND_CHANNEL_MESSAGE',
  'SEND_DIRECT_MESSAGE',
  'UPDATE_FOLLOWERS',
  'ADD_FOLLOWER',
  'APPLY_TEMPLATE',
  'ARCHIVE_TASK',
  'CREATE_LIST',
  'CREATE_SUBTASK',
  'DELETE_TASK',
  'DUPLICATE_TASK',
  'ESTIMATE_TIME',
  'TRACK_TIME',
  'UPDATE_DUE_DATE',
  'UPDATE_START_DATE',
  'ADD_RELATIONSHIP',
  'UPDATE_PRIORITY',
  'UPDATE_TAGS',
  'UPDATE_TASK_NAME',
  'UPDATE_TASK_TYPE',
] as const;

export type AutomationActionTypeV1 = (typeof AUTOMATION_ACTION_TYPES)[number];

export const ACTION_CATALOG: Record<AutomationActionTypeV1, { label: string; description: string }> =
  Object.fromEntries(
    AUTOMATION_ACTION_TYPES.map((type) => [
      type,
      { label: type.replace(/_/g, ' ').toLowerCase(), description: type },
    ]),
  ) as Record<AutomationActionTypeV1, { label: string; description: string }>;

ACTION_CATALOG.LAUNCH_AI_AGENT = { label: 'AI Agents', description: 'Run an AI agent' };
ACTION_CATALOG.UPDATE_ASSIGNEES = { label: 'Update assignees', description: 'Change task assignees' };
ACTION_CATALOG.UPDATE_STATUS = { label: 'Update status', description: 'Change the task status' };
ACTION_CATALOG.CALL_WEBHOOK = { label: 'Call webhook', description: 'POST to an HTTP endpoint' };
ACTION_CATALOG.CREATE_TASK = { label: 'Create task', description: 'Create a new task' };
ACTION_CATALOG.UPDATE_CUSTOM_FIELD = { label: 'Update custom field', description: 'Set a custom field value' };
ACTION_CATALOG.DO_ANYTHING_WITH_AI = { label: 'Do anything with AI', description: 'Run an AI agent with instructions' };
ACTION_CATALOG.REFRESH_AI_FIELD = { label: 'Refresh AI field', description: 'Regenerate an AI custom field' };
ACTION_CATALOG.ADD_COMMENT = { label: 'Add comment', description: 'Post a comment on the task' };
ACTION_CATALOG.UPDATE_FOLLOWERS = { label: 'Update followers', description: 'Add or remove followers' };
ACTION_CATALOG.ARCHIVE_TASK = { label: 'Archive task or subtask', description: 'Archive the task' };
ACTION_CATALOG.CREATE_SUBTASK = { label: 'Create subtask', description: 'Create a subtask' };
ACTION_CATALOG.DELETE_TASK = { label: 'Delete task or subtask', description: 'Delete the task' };
ACTION_CATALOG.DUPLICATE_TASK = { label: 'Duplicate', description: 'Duplicate the task' };
ACTION_CATALOG.MOVE_TO_LIST = { label: 'Move to list', description: 'Move the task to another list' };
ACTION_CATALOG.ADD_TO_LIST = { label: 'Add to list', description: 'Also add the task to a list' };

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

export type ActionSpec = {
  type: AutomationActionTypeV1;
  input: Record<string, any>;
};

export function inferKindFromActions(actions: Array<{ type: string }>): 'CLASSIC' | 'AGENT' {
  return actions.some((a) => a.type === 'DO_ANYTHING_WITH_AI' || a.type === 'LAUNCH_AI_AGENT')
    ? 'AGENT'
    : 'CLASSIC';
}
