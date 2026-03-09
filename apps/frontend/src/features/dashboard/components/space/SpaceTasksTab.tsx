"use client";

import { TaskView } from "@/entities/task/components/TaskView";

interface SpaceTasksTabProps {
    spaceId: string;
    workspaceId: string;
}

export function SpaceTasksTab({ spaceId, workspaceId }: SpaceTasksTabProps) {
    return (
        <div className="h-full">
            <TaskView
                context="SPACE"
                contextId={spaceId}
                workspaceId={workspaceId}
            />
        </div>
    );
}
