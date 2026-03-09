"use client";

import { TeamOverviewTab } from "./TeamOverviewTab";
import { TasksView } from "./TasksView";
import { DiscussionsView } from "./DiscussionsView";
import { ChatView } from "./ChatView";
import { ActivitiesView } from "./ActivitiesView";
import { MembersView } from "./MembersView";
import { GovernanceView } from "./GovernanceView";
import { AppealView } from "./AppealView";
import { LogsView } from "./LogsView";

interface ViewSwitcherProps {
    activeTab: string;
    team: any;
}

export default function TeamViewSwitcher({ activeTab, team }: ViewSwitcherProps) {
    if (!team) return null;

    const renderView = () => {
        switch (activeTab) {
            case "overview":
                return <TeamOverviewTab team={team} />;
            case "tasks":
                return <TasksView />;
            case "discussions":
                return <DiscussionsView teamId={team.id} />;
            case "chat":
                return <ChatView contextType="TEAM" contextId={team.id} contextName={team.name} />;
            case "activities":
                return <ActivitiesView teamId={team.id} />;
            case "members":
                return <MembersView teamId={team.id} />;
            case "governance":
                return <GovernanceView />;
            case "appeal":
                return <AppealView />;
            case "logs":
                return <LogsView />;
            default:
                return <TeamOverviewTab team={team} />;
        }
    };

    return (
        <div className="h-full w-full overflow-hidden">
            {renderView()}
        </div>
    );
}
