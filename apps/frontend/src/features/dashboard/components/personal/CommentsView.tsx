import type { PersonalTabProps } from './TasksView';

export function CommentsView({ spaceId, projectId, workspaceId, teamId, context }: PersonalTabProps) {
    return <div className="p-4 text-muted-foreground text-center">No comments yet</div>;
}
