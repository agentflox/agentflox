"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
    CheckSquare, Hash, FileCheck, Wrench, Package, LayoutDashboard,
    Activity, MessageSquare, MessageCircle, Users, FileText, FolderKanban
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ViewType } from "@/features/dashboard/components/modals/AddViewModal"; // Assuming this is where ViewType matches
import { SpaceProjectsTab } from "@/features/dashboard/components/space/SpaceProjectsTab";
import { SpaceTeamsTab } from "@/features/dashboard/components/space/SpaceTeamsTab";
import { SpaceToolsTab } from "@/features/dashboard/components/space/SpaceToolsTab";
import { SpaceMaterialsTab } from "@/features/dashboard/components/space/SpaceMaterialsTab";
import { SpaceDocumentsTab } from "@/features/dashboard/components/space/SpaceDocumentsTab";
import { SpaceTasksTab } from "@/features/dashboard/components/space/SpaceTasksTab";
import { SpaceOverviewTab } from "@/features/dashboard/views/space/SpaceOverviewTab";

const viewConfig: Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
> = {
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Overview of the space" },
    PROJECTS: { label: "Projects", icon: FolderKanban, description: "View and manage projects" },
    TEAMS: { label: "Teams", icon: Users, description: "View and manage teams" },
    DOCS: { label: "Docs", icon: FileText, description: "View and manage documents" },
    TASKS: { label: "Tasks", icon: CheckSquare, description: "View and manage tasks" },
    CHANNELS: { label: "Channels", icon: Hash, description: "View and manage channels" },
    PROPOSALS: { label: "Proposals", icon: FileCheck, description: "View and manage proposals" },
    TOOLS: { label: "Tools", icon: Wrench, description: "View and manage tools" },
    MATERIALS: { label: "Materials", icon: Package, description: "View and manage materials" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Space dashboard" },
    ACTIVITY: { label: "Activity", icon: Activity, description: "Activity log" },
    POSTS: { label: "Posts", icon: MessageSquare, description: "Space posts" },
    DISCUSSIONS: { label: "Discussions", icon: MessageCircle, description: "Discussions" },
};

export default function ViewPage() {
    const params = useParams();
    const viewId = params?.viewId as string;

    const { data: view, isLoading: isViewLoading } = trpc.view.get.useQuery({ id: viewId }, { enabled: !!viewId });

    // We only fetch space/workspace if it's a space view
    const spaceId = view?.spaceId;
    const { data: space, isLoading: isSpaceLoading } = trpc.space.get.useQuery(
        { id: spaceId! },
        { enabled: !!spaceId }
    );
    const { data: workspace } = trpc.workspace.get.useQuery(
        { id: space?.workspaceId! },
        { enabled: !!space?.workspaceId }
    );

    // Get projects and teams for this space from workspace (matches SpaceDetailView logic)
    const spaceProjects = useMemo(() => {
        if (!workspace?.projects || !spaceId) return [];
        return workspace.projects.filter((p: any) => p.spaceId === spaceId);
    }, [workspace?.projects, spaceId]);

    const spaceTeams = useMemo(() => {
        if (!workspace?.teams || !spaceId) return [];
        return workspace.teams.filter((t: any) => t.spaceId === spaceId);
    }, [workspace?.teams, spaceId]);

    const spaceWithTools = space as any;

    if (isViewLoading || (view?.spaceId && isSpaceLoading)) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading view...</p>
                </div>
            </div>
        );
    }

    if (!view) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <h3 className="text-lg font-medium">View not found</h3>
                    <p className="text-sm text-muted-foreground">This view does not exist or you don't have permission to see it.</p>
                </div>
            </div>
        );
    }

    const renderViewContent = () => {
        const viewType = view.type as ViewType;

        // If it's a space view, render space components
        if (view.spaceId) {
            if (!space || !workspace) return null; // Wait for data

            switch (viewType) {
                case "OVERVIEW":
                    return <SpaceOverviewTab spaceId={view.spaceId} workspaceId={workspace.id} />;

                case "PROJECTS":
                    return (
                        <SpaceProjectsTab
                            workspaceId={workspace.id}
                            spaceId={view.spaceId}
                            projects={spaceProjects}
                        // onAddClick={openItemSidebar} // TODO: Implement Sidebar for isolated view if needed
                        />
                    );

                case "TEAMS":
                    return (
                        <SpaceTeamsTab
                            workspaceId={workspace.id}
                            spaceId={view.spaceId}
                            teams={spaceTeams}
                        // onAddClick={openItemSidebar}
                        />
                    );

                case "DOCS":
                    return <SpaceDocumentsTab />;

                case "TASKS":
                    return (
                        <SpaceTasksTab
                            spaceId={view.spaceId}
                            workspaceId={workspace.id}
                        />
                    );

                case "TOOLS":
                    return (
                        <SpaceToolsTab
                            workspaceId={workspace.id}
                            spaceId={view.spaceId}
                            tools={spaceWithTools?.tools}
                        // onAddClick={openItemSidebar}
                        />
                    );

                case "MATERIALS":
                    return (
                        <SpaceMaterialsTab
                            workspaceId={workspace.id}
                            spaceId={view.spaceId}
                            materials={spaceWithTools?.materials}
                        // onAddClick={openItemSidebar}
                        />
                    );

                default:
                    return (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">
                                {view.name || viewConfig[viewType]?.label || viewType}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {viewConfig[viewType]?.description || "This view is coming soon"}
                            </p>
                        </div>
                    );
            }
        }

        // Handle other parents (Project, Team, etc.) here if needed
        return (
            <div className="p-8 text-center text-muted-foreground">
                View type not supported for this context yet.
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                    {viewConfig[view.type as ViewType]?.icon && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            {(() => {
                                const Icon = viewConfig[view.type as ViewType].icon;
                                return <Icon size={18} />;
                            })()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{view.name}</h1>
                        {view.spaceId && space && (
                            <p className="text-xs text-slate-500">
                                Space: {space.name}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {renderViewContent()}
            </div>
        </div>
    );
}
