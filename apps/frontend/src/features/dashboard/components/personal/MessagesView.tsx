import type { PersonalTabProps } from './TasksView';

export function MessagesView({ spaceId, projectId, workspaceId, teamId, context }: PersonalTabProps) {
    return <div className="p-4 text-muted-foreground text-center">No messages yet</div>;
}
