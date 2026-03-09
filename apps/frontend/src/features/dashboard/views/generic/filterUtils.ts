
import type { FilterCondition, FilterGroup, FilterOperator } from "./listViewTypes";

export const isEmpty = (v: any) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export const getCustomFieldValue = (task: any, customFieldId: string) => {
    const fieldValue = task.customFieldValues?.find((v: any) => v.customFieldId === customFieldId);
    return fieldValue?.value;
};

export const evaluateCondition = (task: any, cond: FilterCondition): boolean => {
    if (!cond.field) return true;
    let fieldValue: any = null;
    if (cond.field === "status") fieldValue = task.status?.id;
    else if (cond.field === "priority") fieldValue = task.priority;
    else if (cond.field === "assignee") fieldValue = task.assignees?.map((a: any) => a.user?.id) || [];
    else if (cond.field === "tags") fieldValue = task.tags || [];
    else if (cond.field === "dueDate") fieldValue = task.dueDate;
    else if (cond.field === "startDate") fieldValue = (task as any).startDate;
    else if (cond.field === "dateCreated") fieldValue = (task as any).createdAt;
    else if (cond.field === "dateClosed") fieldValue = (task as any).dateClosed;
    else if (cond.field === "dateDone") fieldValue = (task as any).dateDone;
    else if (cond.field === "taskType") fieldValue = (task as any).type || (task as any).taskType;
    else if (cond.field === "archived") fieldValue = (task as any).archived || false;
    else if (cond.field === "name") fieldValue = task.title || task.name || "";
    else if (cond.field === "description") fieldValue = task.description || "";
    else if (cond.field === "timeEstimate") fieldValue = (task as any).timeEstimate;
    else if (cond.field === "timeTracked") fieldValue = (task as any).timeTracked;
    else if (cond.field === "duration") fieldValue = (task as any).duration;
    else if (cond.field === "createdBy") fieldValue = (task as any).createdById;
    else if (cond.field === "follower") fieldValue = (task as any).followers?.map((f: any) => f.userId) || [];
    else if (cond.field === "assignedComment") fieldValue = ((task as any)._count?.assignedComments || 0) > 0;
    else if (cond.field === "dependency") fieldValue = (task as any).dependencies || [];
    else if (cond.field === "latestStatusChange") fieldValue = (task as any).latestStatusChangeAt;
    else {
        fieldValue = getCustomFieldValue(task, cond.field);
    }

    const arrayMatch = (arr: any[], vals: any[]) => Array.isArray(vals) && vals.length > 0 && vals.some((v: any) => arr.includes(v));

    switch (cond.operator) {
        case "is":
            if (Array.isArray(fieldValue) && Array.isArray(cond.value)) return arrayMatch(fieldValue, cond.value);
            if (Array.isArray(cond.value) && cond.value.length === 1) return fieldValue === cond.value[0];
            return fieldValue === cond.value;
        case "is_not":
            if (Array.isArray(fieldValue) && Array.isArray(cond.value)) return !arrayMatch(fieldValue, cond.value);
            if (Array.isArray(cond.value) && cond.value.length === 1) return fieldValue !== cond.value[0];
            return fieldValue !== cond.value;
        case "contains":
            if (Array.isArray(fieldValue)) return fieldValue.includes(cond.value);
            return String(fieldValue || "").toLowerCase().includes(String(cond.value || "").toLowerCase());
        case "not_contains":
            if (Array.isArray(fieldValue)) return !fieldValue.includes(cond.value);
            return !String(fieldValue || "").toLowerCase().includes(String(cond.value || "").toLowerCase());
        case "any_of":
            if (Array.isArray(cond.value)) {
                if (Array.isArray(fieldValue)) return fieldValue.some(v => cond.value.includes(v));
                return cond.value.includes(fieldValue);
            }
            return false;
        case "is_set": return !isEmpty(fieldValue);
        case "is_not_set": return isEmpty(fieldValue);
        case "after": return fieldValue && cond.value && new Date(fieldValue) > new Date(cond.value);
        case "before": return fieldValue && cond.value && new Date(fieldValue) < new Date(cond.value);
        case "greater_than": return Number(fieldValue || 0) > Number(cond.value || 0);
        case "less_than": return Number(fieldValue || 0) < Number(cond.value || 0);
        case "equal": return Number(fieldValue || 0) === Number(cond.value || 0);
        case "is_archived": return !!fieldValue;
        case "is_not_archived": return !fieldValue;
        case "has":
            if (Array.isArray(fieldValue)) return fieldValue.length > 0;
            return !!fieldValue;
        case "doesnt_have":
            if (Array.isArray(fieldValue)) return fieldValue.length === 0;
            return !fieldValue;
        default: return true;
    }
};

export const evaluateGroup = (task: any, group: FilterGroup): boolean => {
    if (group.conditions.length === 0) return true;
    if (group.operator === "AND") {
        return group.conditions.every(c => "conditions" in c ? evaluateGroup(task, c as FilterGroup) : evaluateCondition(task, c as FilterCondition));
    } else {
        return group.conditions.some(c => "conditions" in c ? evaluateGroup(task, c as FilterGroup) : evaluateCondition(task, c as FilterCondition));
    }
};

export const hasFilterValue = (cond: FilterCondition): boolean => {
    if (cond.operator === "is_set" || cond.operator === "is_not_set" ||
        cond.operator === "is_archived" || cond.operator === "is_not_archived" ||
        cond.operator === "has" || cond.operator === "doesnt_have") {
        return true;
    }

    if (Array.isArray(cond.value)) {
        return cond.value.length > 0;
    }
    if (typeof cond.value === "string") {
        return cond.value.trim().length > 0;
    }
    if (typeof cond.value === "number") {
        return cond.value !== null && cond.value !== undefined;
    }

    return cond.value !== null && cond.value !== undefined && cond.value !== "";
};

export const hasAnyValueInGroup = (group: FilterGroup): boolean => {
    return group.conditions.some(c => {
        if ("conditions" in c) {
            return hasAnyValueInGroup(c as FilterGroup);
        }
        return hasFilterValue(c as FilterCondition);
    });
};
