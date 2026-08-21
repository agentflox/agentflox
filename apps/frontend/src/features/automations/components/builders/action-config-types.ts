import type { AutomationActionTypeV1 } from "../../types";
import { ACTION_BY_TYPE } from "../../actionCatalog";

export type ActionConfigState = {
  statusId?: string;
  statusFallback?: string;
  content?: string;
  prompt?: string;
  customFieldId?: string;
  value?: string;
  userId?: string;
  listId?: string;
  listName?: string;
  title?: string;
  url?: string;
  priority?: string;
  tags?: string;
  name?: string;
  taskTypeId?: string;
  taskType?: string;
  dueDate?: string;
  startDate?: string;
  timeEstimate?: string;
  duration?: string;
  agentId?: string;
  assigneeIds?: string[];
  removeAssigneeIds?: string[];
  reassignUserIds?: string[];
  reassignUserId?: string;
  removeAllAssignees?: boolean;
  templateId?: string;
  templateName?: string;
  relationshipType?: string;
  relatedTaskId?: string;
  channelId?: string;
  removeFollowerAll?: boolean;
  moveMode?: string;
  locationKey?: string;
  removeTags?: string;
  agentName?: string;
  agentDescription?: string;
  toolIds?: string[];
  toolConfigs?: Record<string, any>;
  workspaceAccess?: boolean;
  teamSpaceAccess?: boolean;
  externalSearch?: {
    gpt?: boolean;
    clickupHelp?: boolean;
    webSearch?: boolean;
    connections?: Array<{
      kind: string;
      enabled: boolean;
      accountId?: string;
      accountLabel?: string;
    }>;
  };
  selectedSpaces?: string[];
  selectedKnowledgeItems?: string[];
};

export function actionConfigIsValid(type: AutomationActionTypeV1, config: ActionConfigState) {
  const meta = ACTION_BY_TYPE[type];
  if (meta?.comingSoon) return false;
  if (type === "UPDATE_STATUS") return !!config.statusId;
  if (type === "ADD_COMMENT") return !!config.content?.trim();
  if (type === "DO_ANYTHING_WITH_AI") return !!config.prompt?.trim();
  if (type === "LAUNCH_AI_AGENT") return !!config.agentId && !!config.prompt?.trim();
  if (type === "UPDATE_FOLLOWERS") return !!config.assigneeIds?.length || !!config.removeAssigneeIds?.length || !!config.removeFollowerAll;
  if (type === "APPLY_TEMPLATE") return !!config.templateId;
  if (["UPDATE_ASSIGNEES", "ADD_ASSIGNEE", "ADD_FOLLOWER"].includes(type))
    return !!config.userId || !!config.assigneeIds?.length || !!config.removeAssigneeIds?.length || !!config.reassignUserIds?.length || !!config.reassignUserId || !!config.removeAllAssignees;
  if (["MOVE_TO_LIST", "ADD_TO_LIST"].includes(type)) return !!config.listId;
  if (type === "CREATE_LIST") return !!config.listName?.trim();
  if (["CREATE_TASK", "CREATE_SUBTASK"].includes(type)) return !!config.title?.trim();
  if (type === "CALL_WEBHOOK") return !!config.url?.trim();
  if (type === "UPDATE_TASK_NAME") return !!config.name?.trim();
  if (type === "ESTIMATE_TIME") return !!config.timeEstimate;
  if (type === "TRACK_TIME") return !!config.duration;
  if (type === "DUPLICATE_TASK") return !!config.listId;
  if (type === "ADD_RELATIONSHIP") return !!config.relationshipType;
  if (type === "UPDATE_DUE_DATE" || type === "UPDATE_START_DATE") {
    const val = type === "UPDATE_DUE_DATE" ? config.dueDate : config.startDate;
    if (!val) return false;
    try {
      const parsed = JSON.parse(val);
      if (parsed.mode === "days_after") return parsed.days !== "" && parsed.days !== undefined;
      if (parsed.mode === "trigger_field") return !!parsed.triggerField;
      if (parsed.mode === "exact_date") return !!parsed.exactDate;
      return !!parsed.mode;
    } catch {
      return false;
    }
  }
  return true;
}

export function serializeAction(type: AutomationActionTypeV1, config: ActionConfigState) {
  if (type === "ADD_ASSIGNEE") {
    return { type: "ADD_ASSIGNEE" as const, input: { userId: config.userId, assigneeIds: config.assigneeIds } };
  }
  if (type === "UPDATE_ASSIGNEES") {
    return {
      type: "UPDATE_ASSIGNEES" as const, input: {
        assigneeIds: config.assigneeIds,
        removeAssigneeIds: config.removeAssigneeIds,
        reassignUserIds: config.reassignUserIds,
        reassignUserId: config.reassignUserId,
        removeAllAssignees: config.removeAllAssignees,
      }
    };
  }
  if (type === "ADD_FOLLOWER") {
    return { type: "ADD_FOLLOWER" as const, input: { userId: config.userId || "" } };
  }
  if (type === "UPDATE_FOLLOWERS") {
    return { type: "UPDATE_FOLLOWERS" as const, input: { addFollowerIds: config.assigneeIds, removeFollowerIds: config.removeAssigneeIds, removeAll: config.removeFollowerAll } };
  }
  if (type === "APPLY_TEMPLATE") {
    return { type: "APPLY_TEMPLATE" as const, input: { templateId: config.templateId || "" } };
  }
  if (type === "DUPLICATE_TASK") {
    return { type: "DUPLICATE_TASK" as const, input: { targetListId: config.listId || "", linkToOriginal: config.relationshipType === "link" } };
  }
  if (type === "ADD_RELATIONSHIP") {
    return { type: "ADD_RELATIONSHIP" as const, input: { relationshipType: config.relationshipType || "", relatedTaskId: config.relatedTaskId } };
  }
  if (type === "DO_ANYTHING_WITH_AI" || type === "LAUNCH_AI_AGENT") {
    return { type, input: { prompt: config.prompt || "", agentId: config.agentId } };
  }
  return { type, input: { ...config } };
}
