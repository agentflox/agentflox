/**
 * Trigger Definitions - Externalized Constants
 * 
 * All trigger definitions for the agent system.
 * Separated from business logic for better maintainability.
 */

import { AgentTriggerType, AutomationTriggerType } from '../types/types';

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

// Manual triggers (event-based)
export const MANUAL_TRIGGERS: TriggerDefinition[] = [
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
export const AUTOMATION_TRIGGERS: TriggerDefinition[] = [
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
    // Add more automation triggers here...
];

// Schedule-based triggers
export const SCHEDULE_TRIGGERS: TriggerDefinition[] = [
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
];

/**
 * Get all trigger definitions organized by type
 */
export function getAllTriggerDefinitions(): {
    manual: TriggerDefinition[];
    scheduled: TriggerDefinition[];
    automation: TriggerDefinition[];
} {
    return {
        manual: MANUAL_TRIGGERS,
        scheduled: SCHEDULE_TRIGGERS,
        automation: AUTOMATION_TRIGGERS,
    };
}
