/**
 * Trigger Registry
 * 
 * Registers all default triggers available to AI agents
 * 
 * Triggers are stored in database (AgentTrigger model) and loaded from there.
 * This file contains the default trigger definitions that are synced to the database.
 */

import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { AgentTriggerType, AutomationTriggerType } from '../types/types';


// Trigger definition type
export type TriggerParameter = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
};

export type TriggerDefinition = {
  name: string;
  type: 'MANUAL' | 'SCHEDULED' | 'AUTOMATION';
  description: string;
  scope: string[];
  triggerType: AgentTriggerType | AutomationTriggerType;
  parameters: TriggerParameter[];
};

// Default Triggers
// Manual triggers (event-based)
const manualTriggers: TriggerDefinition[] = [
  {
    name: 'Mention',
    type: 'MANUAL',
    description: 'When the agent is mentioned in a message or comment',
    scope: ['workspace', 'channel', 'task', 'conversation'],
    triggerType: AgentTriggerType.MENTION,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'keywords', type: 'string[]', required: false },
    ],
  },
  {
    name: 'Direct Message',
    type: 'MANUAL',
    description: 'When the agent receives a direct message',
    scope: ['all'],
    triggerType: AgentTriggerType.DIRECT_MESSAGE,
    parameters: [
      { name: 'conversationId', type: 'string', required: false },
    ],
  },
  {
    name: 'Assign Task',
    type: 'MANUAL',
    description: 'When a task is assigned to the agent',
    scope: ['all'],
    triggerType: AgentTriggerType.ASSIGN_TASK,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'taskId', type: 'string', required: false },
    ],
  },
];

// Automation triggers (event-based)
const automationTriggers: TriggerDefinition[] = [
  // Task & Subtask Event Triggers
  {
    name: 'Task or Subtask Created',
    type: 'AUTOMATION',
    description: 'When a task or subtask is created',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_OR_SUBTASK_CREATED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'taskType', type: 'string', required: false, description: 'Filter by task type' },
    ],
  },
  {
    name: 'Task Status Changed',
    type: 'AUTOMATION',
    description: 'When a task\'s status changes',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_STATUS_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'fromStatus', type: 'string', required: false, description: 'Previous status' },
      { name: 'toStatus', type: 'string', required: false, description: 'New status' },
    ],
  },
  {
    name: 'Task Assignee Added',
    type: 'AUTOMATION',
    description: 'When an assignee is added to a task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_ASSIGNEE_ADDED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'assigneeId', type: 'string', required: false, description: 'Filter by specific assignee' },
    ],
  },
  {
    name: 'Task Assignee Removed',
    type: 'AUTOMATION',
    description: 'When an assignee is removed from a task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_ASSIGNEE_REMOVED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'assigneeId', type: 'string', required: false, description: 'Filter by specific assignee' },
    ],
  },
  {
    name: 'Task Due Date Arrives',
    type: 'AUTOMATION',
    description: 'When the due date arrives',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_DUE_DATE_ARRIVES,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'timeOffset', type: 'number', required: false, description: 'Offset in minutes (e.g., -60 for 1 hour before)' },
    ],
  },
  {
    name: 'Task Due Date Changed',
    type: 'AUTOMATION',
    description: 'When due date is updated',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_DUE_DATE_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },
  {
    name: 'Task Start Date Arrives',
    type: 'AUTOMATION',
    description: 'When the start date arrives',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_START_DATE_ARRIVES,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'timeOffset', type: 'number', required: false, description: 'Offset in minutes (e.g., -60 for 1 hour before)' },
    ],
  },
  {
    name: 'Task Start Date Changed',
    type: 'AUTOMATION',
    description: 'When start date is updated',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_START_DATE_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },
  {
    name: 'Task Priority Changed',
    type: 'AUTOMATION',
    description: 'When a task\'s priority changes',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_PRIORITY_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'fromPriority', type: 'string', required: false, description: 'Previous priority' },
      { name: 'toPriority', type: 'string', required: false, description: 'New priority' },
    ],
  },
  {
    name: 'Task Name Changed',
    type: 'AUTOMATION',
    description: 'When a task or subtask name is updated',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_NAME_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },
  {
    name: 'Task Type Changed',
    type: 'AUTOMATION',
    description: 'When task type changes',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_TYPE_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'fromType', type: 'string', required: false, description: 'Previous type' },
      { name: 'toType', type: 'string', required: false, description: 'New type' },
    ],
  },
  {
    name: 'Task Linked',
    type: 'AUTOMATION',
    description: 'When a task or subtask is linked to another task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_LINKED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'linkType', type: 'string', required: false, description: 'Type of link' },
    ],
  },
  {
    name: 'Task Time Tracked',
    type: 'AUTOMATION',
    description: 'When time is tracked on a task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_TIME_TRACKED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'minDuration', type: 'number', required: false, description: 'Minimum duration in minutes' },
    ],
  },
  {
    name: 'Task Unblocked',
    type: 'AUTOMATION',
    description: 'When a task or subtask becomes unblocked',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TASK_UNBLOCKED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },

  // Field & Metadata Changes
  {
    name: 'Custom Field Changed',
    type: 'AUTOMATION',
    description: 'When a custom field value changes',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.CUSTOM_FIELD_CHANGED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'fieldId', type: 'string', required: false, description: 'Specific custom field ID' },
      { name: 'fieldName', type: 'string', required: false, description: 'Custom field name' },
    ],
  },
  {
    name: 'Tag Added',
    type: 'AUTOMATION',
    description: 'When one or more tags are added to a task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TAG_ADDED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'tagName', type: 'string', required: false, description: 'Specific tag name' },
    ],
  },
  {
    name: 'Tag Removed',
    type: 'AUTOMATION',
    description: 'When one or more tags are removed from a task',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.TAG_REMOVED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'tagName', type: 'string', required: false, description: 'Specific tag name' },
    ],
  },
  {
    name: 'All Checklists Resolved',
    type: 'AUTOMATION',
    description: 'When all checklists in a task are resolved',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.CHECKLISTS_RESOLVED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },
  {
    name: 'All Subtasks Resolved',
    type: 'AUTOMATION',
    description: 'When all subtasks of a task are resolved',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.SUBTASKS_RESOLVED,
    parameters: [
      { name: 'location', type: 'location', required: false },
    ],
  },

  // Location & Movement Triggers
  {
    name: 'Existing Task Added to Location',
    type: 'AUTOMATION',
    description: 'When an existing task or subtask is added to a location',
    scope: ['workspace', 'channel'],
    triggerType: AutomationTriggerType.EXISTING_TASK_ADDED_TO_LOCATION,
    parameters: [
      { name: 'location', type: 'location', required: true, description: 'Target location' },
    ],
  },
  {
    name: 'Task Moved to List',
    type: 'AUTOMATION',
    description: 'When a task moves to a specific list',
    scope: ['workspace', 'channel'],
    triggerType: AutomationTriggerType.MOVE_TO_LIST,
    parameters: [
      { name: 'listId', type: 'string', required: false, description: 'Target list ID' },
      { name: 'listName', type: 'string', required: false, description: 'Target list name' },
    ],
  },

  // Time-Based / Scheduled Triggers
  {
    name: 'Date Before/After',
    type: 'AUTOMATION',
    description: 'Trigger relative to a date (e.g., X days before/after due date)',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.DATE_BEFORE_AFTER,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'dateField', type: 'string', required: true, description: 'Date field (e.g., "dueDate", "startDate")' },
      { name: 'offset', type: 'number', required: true, description: 'Days offset (negative for before, positive for after)' },
      { name: 'time', type: 'string', required: false, description: 'Time of day (e.g., "09:00")' },
    ],
  },
  {
    name: 'Every Scheduled Time',
    type: 'AUTOMATION',
    description: 'Recurring trigger at scheduled day/time',
    scope: ['workspace', 'channel', 'task'],
    triggerType: AutomationTriggerType.EVERY_SCHEDULED_TIME,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'cronExpression', type: 'string', required: true, description: 'Cron expression for schedule' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
    ],
  },

  // Chat-Specific Triggers
  {
    name: 'Chat Message Posted',
    type: 'AUTOMATION',
    description: 'When a message is posted in chat',
    scope: ['workspace', 'channel', 'conversation'],
    triggerType: AutomationTriggerType.CHAT_MESSAGE_POSTED,
    parameters: [
      { name: 'location', type: 'location', required: false },
      { name: 'keywords', type: 'string[]', required: false, description: 'Filter by keywords in message' },
      { name: 'userId', type: 'string', required: false, description: 'Filter by specific user' },
    ],
  },

  // Webhook Trigger
  {
    name: 'Webhook',
    type: 'AUTOMATION',
    description: 'Generic webhook trigger for external integrations',
    scope: ['workspace'],
    triggerType: AutomationTriggerType.WEBHOOK,
    parameters: [
      { name: 'webhookId', type: 'string', required: false, description: 'Specific webhook identifier' },
      { name: 'secret', type: 'string', required: false, description: 'Webhook secret for validation' },
    ],
  },
];

// Schedule-based triggers
const scheduleTriggers: TriggerDefinition[] = [
  {
    name: 'Daily Schedule',
    type: 'SCHEDULED',
    description: 'Run the agent on a daily schedule',
    scope: ['workspace'],
    triggerType: AgentTriggerType.SCHEDULED,
    parameters: [
      { name: 'time', type: 'string', required: true, description: 'Time of day (e.g., "09:00")' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
      { name: 'instructions', type: 'string', required: false, description: 'Specific instructions for this schedule' },
    ],
  },
  {
    name: 'Weekly Schedule',
    type: 'SCHEDULED',
    description: 'Run the agent on a weekly schedule',
    scope: ['workspace'],
    triggerType: AgentTriggerType.SCHEDULED,
    parameters: [
      { name: 'dayOfWeek', type: 'string', required: true, description: 'Day of week (0-6, Sunday=0)' },
      { name: 'time', type: 'string', required: true, description: 'Time of day (e.g., "09:00")' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
      { name: 'instructions', type: 'string', required: false, description: 'Specific instructions for this schedule' },
    ],
  },
  {
    name: 'Monthly Schedule',
    type: 'SCHEDULED',
    description: 'Run the agent on a monthly schedule',
    scope: ['workspace'],
    triggerType: AgentTriggerType.SCHEDULED,
    parameters: [
      { name: 'dayOfMonth', type: 'number', required: true, description: 'Day of month (1-31)' },
      { name: 'time', type: 'string', required: true, description: 'Time of day (e.g., "09:00")' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
      { name: 'instructions', type: 'string', required: false, description: 'Specific instructions for this schedule' },
    ],
  },
  {
    name: 'Custom Cron Schedule',
    type: 'SCHEDULED',
    description: 'Run the agent using a custom cron expression',
    scope: ['workspace'],
    triggerType: AgentTriggerType.SCHEDULED,
    parameters: [
      { name: 'cronExpression', type: 'string', required: true, description: 'Cron expression (e.g., "0 9 * * *" for daily at 9 AM)' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
      { name: 'instructions', type: 'string', required: false, description: 'Specific instructions for this schedule' },
    ],
  },
  {
    name: 'Hourly Schedule',
    type: 'SCHEDULED',
    description: 'Run the agent every hour',
    scope: ['workspace'],
    triggerType: AgentTriggerType.SCHEDULED,
    parameters: [
      { name: 'minute', type: 'number', required: false, description: 'Minute of hour (0-59, default: 0)' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone (default: UTC)' },
      { name: 'instructions', type: 'string', required: false, description: 'Specific instructions for this schedule' },
    ],
  },
];


/**
 * Get all default trigger definitions
 */
export function getAllTriggerDefinitions(): {
  manual: TriggerDefinition[];
  scheduled: TriggerDefinition[];
  automation: TriggerDefinition[];
} {
  return {
    manual: manualTriggers,
    scheduled: scheduleTriggers,
    automation: automationTriggers,
  };
}

/**
 * Sync all trigger definitions to database
 * This should be called on startup or when triggers are updated
 */
export async function syncTriggersToDatabase(): Promise<void> {
  const triggerGroups = getAllTriggerDefinitions();
  const allTriggers = [
    ...triggerGroups.manual,
    ...triggerGroups.scheduled,
    ...triggerGroups.automation
  ];

  for (const triggerDef of allTriggers) {
    // Note: Triggers are stored per-agent in AgentTrigger table
    // This function just ensures the definitions are available for reference
    // The actual AgentTrigger records are created when agents are created

    console.log(`[TriggerRegistry] Default trigger definition: ${triggerDef.type}`);
  }

  console.log(`[TriggerRegistry] Synced ${allTriggers.length} default trigger definitions`);
}

/**
 * Get default triggers for new agents
 */
export function getDefaultTriggers(): TriggerDefinition[] {
  return manualTriggers;
}

