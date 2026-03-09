export type TaskListItem = {
    id: string;
    title: string;
    description?: string | null;
    status?: string | null;
    visibility?: string | null;
    isPublic?: boolean | null;
    workspaceId?: string | null;
    channelId?: string | null;
    projectId?: string | null;
    teamId?: string | null;
    assigneeId?: string | null;
    updatedAt?: string | Date | null;
    project?: { id: string; name: string | null } | null;
    team?: { id: string; name: string | null } | null;
    channel?: { id: string; name: string | null } | null;
    assignee?: { id: string; name: string | null; email: string | null } | null;
};

export interface Task {
    id: string;
    title: string;
    name?: string;
    description?: string | null;
    status?: {
        id: string;
        name: string;
        color: string;
    } | null;
    priority?: "URGENT" | "HIGH" | "NORMAL" | "LOW" | string | null;
    dueDate?: string | Date | null;
    assignees?: {
        user?: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        } | null;
        team?: {
            id: string;
            name: string | null;
            image: string | null;
        } | null;
        agent?: {
            id: string;
            name: string | null;
            image: string | null;
        } | null;
    }[];
    assignee?: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
    isStarred?: boolean;
    tags?: string[];
    timeTracked?: string;
    timeEstimate?: string;
    completedSubtasks?: number;
    completed_at?: string | Date | null;
    taskType?: any;
    taskTypeId?: string | null;
    _count?: {
        comments: number;
        attachments: number;
        checklists: number;
        other_tasks: number;
    };
}
