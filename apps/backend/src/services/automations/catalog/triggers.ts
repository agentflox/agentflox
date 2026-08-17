export const AUTOMATION_TRIGGER_TYPES = [
  'TASK_OR_SUBTASK_CREATED',
  'TASK_OR_SUBTASK_UPDATED',
  'TASK_STATUS_CHANGED',
  'TASK_ASSIGNEE_ADDED',
  'TASK_ASSIGNEE_REMOVED',
  'TASK_ASSIGNEE_CHANGED',
  'TASK_DUE_DATE_ARRIVES',
  'TASK_DUE_DATE_CHANGED',
  'TASK_START_DATE_ARRIVES',
  'TASK_START_DATE_CHANGED',
  'TASK_PRIORITY_CHANGED',
  'TASK_NAME_CHANGED',
  'TASK_TYPE_CHANGED',
  'TASK_LINKED',
  'TASK_TIME_TRACKED',
  'TASK_UNBLOCKED',
  'TASK_COMMENT_ADDED',
  'CUSTOM_FIELD_CHANGED',
  'DATE_CUSTOM_FIELD_ARRIVES',
  'TAG_ADDED',
  'TAG_REMOVED',
  'CHECKLISTS_RESOLVED',
  'SUBTASKS_RESOLVED',
  'EXISTING_TASK_ADDED_TO_LOCATION',
  'MOVE_TO_LIST',
  'DATE_BEFORE_AFTER',
  'EVERY_SCHEDULED_TIME',
  'CHAT_MESSAGE_POSTED',
  'WEBHOOK',
] as const;

export type AutomationTriggerTypeV1 = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const TRIGGER_CATALOG: Record<
  AutomationTriggerTypeV1,
  { label: string; entity: string; description: string }
> = {
  TASK_OR_SUBTASK_CREATED: {
    label: 'Task or subtask created',
    entity: 'Tasks or subtasks',
    description: 'When a task or subtask is created',
  },
  TASK_OR_SUBTASK_UPDATED: {
    label: 'Task or subtask updated',
    entity: 'Tasks or subtasks',
    description: 'When a task or subtask is updated',
  },
  TASK_STATUS_CHANGED: {
    label: 'Status changed',
    entity: 'Tasks or subtasks',
    description: 'When a task status changes',
  },
  TASK_ASSIGNEE_ADDED: {
    label: 'Assignee added',
    entity: 'Tasks or subtasks',
    description: 'When an assignee is added',
  },
  TASK_ASSIGNEE_REMOVED: {
    label: 'Assignee removed',
    entity: 'Tasks or subtasks',
    description: 'When an assignee is removed',
  },
  TASK_ASSIGNEE_CHANGED: {
    label: 'Assignee changed',
    entity: 'Tasks or subtasks',
    description: 'When the assignee changes',
  },
  TASK_DUE_DATE_ARRIVES: {
    label: 'Due date arrives',
    entity: 'Tasks or subtasks',
    description: 'When the due date arrives',
  },
  TASK_DUE_DATE_CHANGED: {
    label: 'Due date changed',
    entity: 'Tasks or subtasks',
    description: 'When the due date changes',
  },
  TASK_START_DATE_ARRIVES: {
    label: 'Start date arrives',
    entity: 'Tasks or subtasks',
    description: 'When the start date arrives',
  },
  TASK_START_DATE_CHANGED: {
    label: 'Start date changed',
    entity: 'Tasks or subtasks',
    description: 'When the start date changes',
  },
  TASK_PRIORITY_CHANGED: {
    label: 'Priority changed',
    entity: 'Tasks or subtasks',
    description: 'When priority changes',
  },
  TASK_NAME_CHANGED: {
    label: 'Task or subtask name changes',
    entity: 'Tasks or subtasks',
    description: 'When the task name changes',
  },
  TASK_TYPE_CHANGED: {
    label: 'Task type changed',
    entity: 'Tasks or subtasks',
    description: 'When the task type changes',
  },
  TASK_LINKED: {
    label: 'Task or subtask linked',
    entity: 'Tasks or subtasks',
    description: 'When a task is linked',
  },
  TASK_TIME_TRACKED: {
    label: 'Time tracked',
    entity: 'Tasks or subtasks',
    description: 'When time is tracked on a task',
  },
  TASK_UNBLOCKED: {
    label: 'Task or subtask unblocked',
    entity: 'Tasks or subtasks',
    description: 'When a blocking dependency is removed',
  },
  TASK_COMMENT_ADDED: {
    label: 'Comment added',
    entity: 'Tasks or subtasks',
    description: 'When a comment is added',
  },
  CUSTOM_FIELD_CHANGED: {
    label: 'Custom field changed',
    entity: 'Tasks or subtasks',
    description: 'When a custom field value changes',
  },
  DATE_CUSTOM_FIELD_ARRIVES: {
    label: 'Date custom field arrives',
    entity: 'Tasks or subtasks',
    description: 'When a date custom field arrives',
  },
  TAG_ADDED: {
    label: 'Tag added',
    entity: 'Tasks or subtasks',
    description: 'When a tag is added',
  },
  TAG_REMOVED: {
    label: 'Tag removed',
    entity: 'Tasks or subtasks',
    description: 'When a tag is removed',
  },
  CHECKLISTS_RESOLVED: {
    label: 'All checklists resolved',
    entity: 'Tasks or subtasks',
    description: 'When every checklist item is complete',
  },
  SUBTASKS_RESOLVED: {
    label: 'All immediate subtasks resolved',
    entity: 'Tasks or subtasks',
    description: 'When every immediate subtask is complete',
  },
  EXISTING_TASK_ADDED_TO_LOCATION: {
    label: 'Existing task or subtask added here',
    entity: 'Tasks or subtasks',
    description: 'When an existing task is added to this location',
  },
  MOVE_TO_LIST: {
    label: 'Existing task or subtask moved here',
    entity: 'Tasks or subtasks',
    description: 'When an existing task is moved here',
  },
  DATE_BEFORE_AFTER: {
    label: 'Date is before/after',
    entity: 'Tasks or subtasks',
    description: 'When a date is before or after a value',
  },
  EVERY_SCHEDULED_TIME: {
    label: 'Every...',
    entity: 'Schedule',
    description: 'Run on a cron schedule',
  },
  CHAT_MESSAGE_POSTED: {
    label: 'Chat message posted',
    entity: 'Chat',
    description: 'When a chat message is posted',
  },
  WEBHOOK: {
    label: 'Webhook',
    entity: 'Webhook',
    description: 'Triggered by an inbound webhook',
  },
};

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
