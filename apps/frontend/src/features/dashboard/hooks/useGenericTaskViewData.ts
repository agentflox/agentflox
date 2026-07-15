"use client";

import { useTaskViewContext, type UseTaskViewContextOptions } from "@/features/dashboard/hooks/useTaskViewContext";
import { useTaskListInfinite, type TaskListRelationMode } from "@/features/dashboard/hooks/useTaskListInfinite";

export type { TaskListRelationMode };

export interface UseGenericTaskViewDataOptions extends UseTaskViewContextOptions {
  scope?: "owned" | "assigned" | "all";
  /** Override spaceId passed to task.list (Gantt uses conditional scoping) */
  taskListSpaceId?: string;
  /** Override projectId passed to task.list */
  taskListProjectId?: string;
  taskListEnabled?: boolean;
  /** `true` = full relations; `"card"` = lighter list payload */
  includeRelations?: TaskListRelationMode;
}

export function useGenericTaskViewData({
  spaceId,
  projectId,
  teamId,
  listId,
  workspaceId,
  includeViewDetails,
  scope,
  taskListSpaceId,
  taskListProjectId,
  taskListEnabled = true,
  includeRelations = true,
}: UseGenericTaskViewDataOptions) {
  const viewContext = useTaskViewContext({
    spaceId,
    projectId,
    teamId,
    listId,
    workspaceId,
    includeViewDetails,
  });

  const effectiveSpaceId = taskListSpaceId ?? spaceId;
  const effectiveProjectId = taskListProjectId ?? projectId;

  const taskList = useTaskListInfinite({
    workspaceId,
    spaceId: effectiveSpaceId,
    projectId: effectiveProjectId,
    teamId,
    listId,
    scope,
    includeRelations,
    enabled:
      taskListEnabled &&
      !!(workspaceId || effectiveSpaceId || effectiveProjectId || teamId || listId || scope),
  });

  return {
    ...viewContext,
    ...taskList,
    isTasksLoading: taskList.isLoading,
  };
}
