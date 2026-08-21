import type { CreationSourceFilters } from './catalog/triggers';
import type { AutomationTriggerTypeV1 } from './catalog/triggers';

export type TaskEventType = AutomationTriggerTypeV1;

export type TaskEventPayload = {
  type: TaskEventType;
  taskId: string;
  workspaceId?: string | null;
  spaceId?: string | null;
  projectId?: string | null;
  teamId?: string | null;
  listId?: string | null;
  folderId?: string | null;
  title?: string | null;
  description?: string | null;
  statusId?: string | null;
  previousStatusId?: string | null;
  priority?: string | null;
  previousPriority?: string | null;
  assigneeId?: string | null;
  previousAssigneeId?: string | null;
  dueDate?: string | Date | null;
  startDate?: string | Date | null;
  taskTypeId?: string | null;
  previousTaskTypeId?: string | null;
  previousListId?: string | null;
  tags?: string[];
  previousTags?: string[];
  customFieldId?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  tag?: string | null;
  createdVia?: keyof CreationSourceFilters | 'users';
  ownerId?: string;
};

const ANY = '__any__';
const EMPTY = '__empty__';

function isAny(value: unknown) {
  return !value || value === ANY;
}

function matchesBound(expected: unknown, actual: string | null | undefined) {
  if (isAny(expected)) return true;
  if (expected === EMPTY) return actual == null || actual === '';
  return String(expected) === String(actual ?? '');
}

export function matchesLocation(
  automation: {
    workspaceId?: string | null;
    spaceId?: string | null;
    projectId?: string | null;
    teamId?: string | null;
    listId?: string | null;
    folderId?: string | null;
  },
  event: TaskEventPayload,
): boolean {
  if (automation.listId && automation.listId !== event.listId) return false;
  if (automation.folderId && automation.folderId !== event.folderId) return false;
  if (automation.projectId && automation.projectId !== event.projectId) return false;
  if (automation.spaceId && automation.spaceId !== event.spaceId) return false;
  if (automation.teamId && automation.teamId !== event.teamId) return false;
  if (automation.workspaceId && event.workspaceId && automation.workspaceId !== event.workspaceId) {
    return false;
  }
  return true;
}

export function matchesSources(
  sources: CreationSourceFilters | undefined,
  createdVia: TaskEventPayload['createdVia'],
  eventType: TaskEventType,
): boolean {
  if (eventType !== 'TASK_OR_SUBTASK_CREATED' || !sources) return true;
  const via = createdVia ?? 'users';
  return Boolean((sources as Record<string, boolean>)[via] ?? sources.users);
}

export function matchesTriggerConfig(
  triggerConfig: Record<string, unknown> | null | undefined,
  event: TaskEventPayload,
): boolean {
  if (!triggerConfig) return true;
  const sources = triggerConfig.sources as
    | { listIds?: string[]; folderIds?: string[]; includeSubtasks?: boolean }
    | undefined;
  if (sources?.listIds?.length && event.listId && !sources.listIds.includes(event.listId)) {
    return false;
  }
  if (sources?.folderIds?.length && event.folderId && !sources.folderIds.includes(event.folderId)) {
    return false;
  }
  if (event.type === 'CUSTOM_FIELD_CHANGED') {
    if (triggerConfig.customFieldId && event.customFieldId && triggerConfig.customFieldId !== event.customFieldId) {
      return false;
    }
    if (!matchesBound(triggerConfig.fromValue, event.fromValue)) return false;
    if (!matchesBound(triggerConfig.toValue, event.toValue)) return false;
  }
  if (event.type === 'TASK_STATUS_CHANGED') {
    if (!isAny(triggerConfig.fromStatusId)) {
      if (Array.isArray(triggerConfig.fromStatusId)) {
        if (!triggerConfig.fromStatusId.includes(event.previousStatusId)) return false;
      } else if (triggerConfig.fromStatusId !== event.previousStatusId) {
        return false;
      }
    }
    if (!isAny(triggerConfig.toStatusId)) {
      if (Array.isArray(triggerConfig.toStatusId)) {
        if (!triggerConfig.toStatusId.includes(event.statusId)) return false;
      } else if (triggerConfig.toStatusId !== event.statusId) {
        return false;
      }
    }
  }
  if ((event.type === 'TAG_ADDED' || event.type === 'TAG_REMOVED') && triggerConfig.tag && event.tag) {
    if (triggerConfig.tag !== event.tag) return false;
  }

  if (['TASK_ASSIGNEE_ADDED', 'TASK_ASSIGNEE_REMOVED', 'TASK_ASSIGNEE_CHANGED'].includes(event.type) && triggerConfig.assigneeIds) {
    if (Array.isArray(triggerConfig.assigneeIds) && triggerConfig.assigneeIds.length > 0) {
      if (!triggerConfig.assigneeIds.includes(event.assigneeId)) return false;
    }
  }
  const creation = triggerConfig.creationSources as CreationSourceFilters | undefined;
  return matchesSources(creation, event.createdVia, event.type);
}
