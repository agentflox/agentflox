/**
 * Shared types for ListView config, filters, and saved view state.
 * Used by ListView.tsx and view router validation.
 */

export type FilterOperator = "AND" | "OR";

export type FilterCondition = {
    id: string;
    field: string;
    operator: string;
    value: any;
};

export type FilterGroup = {
    id: string;
    operator: FilterOperator;
    conditions: (FilterCondition | FilterGroup)[];
};

export type ColumnKey =
    | "name"
    | "status"
    | "assignee"
    | "priority"
    | "dueDate"
    | "tags"
    | "timeTracked"
    | "subtasks"
    | "comments"
    | "attachments"
    | "dateCreated"
    | "timeEstimate"
    | "pullRequests"
    | "taskType"
    | "linkedTasks"
    | string;

export type ListViewSavedConfig = {
    // Layout options
    showEmptyStatuses?: boolean;
    wrapText?: boolean;
    showTaskLocations?: boolean;
    showSubtaskParentNames?: boolean;
    showTaskProperties?: boolean;
    showTasksFromOtherLists?: boolean;
    showSubtasksFromOtherLists?: boolean;
    pinDescription?: boolean;

    // Customize view options
    showClosedTasks?: boolean;
    showCompleted?: boolean;
    showCompletedSubtasks?: boolean;
    groupBy?: string;
    groupDirection?: "asc" | "desc";
    subtasksMode?: "collapsed" | "expanded" | "separate";
    visibleColumns?: string[];
    sortBy?: "manual" | "name" | "dueDate" | "priority" | "status";
    sortDirection?: "asc" | "desc";

    // View settings
    viewAutosave?: boolean;
    defaultToMeMode?: boolean;

    // Filters
    filterGroups?: FilterGroup;
    savedFilterPresets?: { id: string; name: string; config: FilterGroup }[];
};
