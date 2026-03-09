"use client";

import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { TasksView } from "./TasksView";
import { DiscussionsView } from "./DiscussionsView";
import { ChatView } from "./ChatView";
import { ActivitiesView } from "./ActivitiesView";
import { MembersView } from "./MembersView";
import { AnalyticsView } from "./AnalyticsView";
import { GovernanceView } from "./GovernanceView";
import { AppealView } from "./AppealView";
import { LogsView } from "./LogsView";
import { WarRoomView } from "./WarRoomView";
import { MarketplaceView } from "./MarketplaceView";

interface ViewSwitcherProps {
    activeTab: string;
    project: any;
}

export default function ProjectViewSwitcher({ activeTab, project }: ViewSwitcherProps) {
    if (!project) return null;

    const renderView = () => {
        switch (activeTab) {
            case "overview":
                return <ProjectOverviewTab project={project} />;
            case "tasks":
                return <TasksView />;
            case "discussions":
                return <DiscussionsView projectId={project.id} />;
            case "chat":
                return <ChatView contextType="PROJECT" contextId={project.id} contextName={project.name} />;
            case "activities":
                return <ActivitiesView projectId={project.id} />;
            case "members":
                return <MembersView projectId={project.id} />;
            case "analytics":
                return <AnalyticsView projectId={project.id} />;
            case "governance":
                return <GovernanceView projectId={project.id} />;
            case "appeal":
                return <AppealView />;
            case "logs":
                return <LogsView />;
            case "war_room":
                return <WarRoomView projectId={project.id} />;
            case "marketplace":
                return <MarketplaceView projectId={project.id} />;
            default:
                return <ProjectOverviewTab project={project} />;
        }
    };

    return (
        <div className="h-full w-full overflow-hidden">
            {renderView()}
        </div>
    );
}
