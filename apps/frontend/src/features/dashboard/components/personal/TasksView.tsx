"use client"
import { ListTodo } from 'lucide-react';
import { MyWorkView } from './MyWorkView';
import DashboardListView from "@/features/dashboard/views/generic/DashboardListView";
import ListView from "@/features/dashboard/views/generic/ListView";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export type TaskSubView = 'assigned' | 'personal-list' | 'my-work';

export interface PersonalTabProps {
    spaceId?: string;
    projectId?: string;
    workspaceId?: string;
    teamId?: string;
    basePath?: string;
    context?: "space" | "workspace" | "project" | "team";
}

interface TasksViewProps extends PersonalTabProps {
    subView?: TaskSubView;
}

function AssignedTasksView({ spaceId, projectId, workspaceId, teamId, context }: PersonalTabProps) {
    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            <ListView scope="assigned" spaceId={spaceId} projectId={projectId} teamId={teamId} />
        </div>
    );
}

function PersonalListView({ spaceId, projectId, workspaceId, teamId, basePath, context }: PersonalTabProps) {
    const { data: personalList, isLoading } = trpc.list.getPersonal.useQuery();

    const resolvedBasePath = basePath || (
        workspaceId ? `/workspaces/${workspaceId}/personal/tasks/personal-list` :
        spaceId ? `/spaces/${spaceId}/personal/tasks/personal-list` :
        teamId ? `/teams/${teamId}/personal/tasks/personal-list` :
        projectId ? `/projects/${projectId}/personal/tasks/personal-list` : undefined
    );

    if (isLoading) {
        return (
            <div className="p-6 space-y-4 h-full">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-[calc(100%-60px)] w-full" />
            </div>
        );
    }

    if (!personalList) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <ListTodo className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">Personal list unavailable</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                    We couldn't load your personal list. Please try again.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            <DashboardListView listId={personalList.id} basePath={resolvedBasePath} workspaceId={workspaceId} spaceId={spaceId} projectId={projectId} teamId={teamId} />
        </div>
    );
}

export function TasksView({ subView = 'my-work', spaceId, projectId, workspaceId, teamId, basePath, context }: TasksViewProps) {
    if (subView === 'my-work') return <MyWorkView spaceId={spaceId} projectId={projectId} workspaceId={workspaceId} teamId={teamId} context={context} />;
    if (subView === 'assigned') return <AssignedTasksView spaceId={spaceId} projectId={projectId} workspaceId={workspaceId} teamId={teamId} context={context} />;
    if (subView === 'personal-list') return <PersonalListView spaceId={spaceId} projectId={projectId} workspaceId={workspaceId} teamId={teamId} basePath={basePath} context={context} />;
    return <MyWorkView spaceId={spaceId} projectId={projectId} workspaceId={workspaceId} teamId={teamId} context={context} />;
}
