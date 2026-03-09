"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavigationSidebar, { type WorkspaceView as WorkspaceViewType } from "@/features/dashboard/layouts/workspace/NavigationSidebar";
import WorkspaceOverviewView from "@/features/dashboard/views/workspace/WorkspaceOverviewView";
import SpacesView from "@/features/dashboard/views/space/SpacesView";
import WorkspaceChatView from "@/features/dashboard/views/workspace/WorkspaceChatView";
import WorkspaceAIChatView from "@/features/dashboard/views/workspace/WorkspaceAIChatView";
import WorkspaceProjectView from "@/features/dashboard/views/workspace/WorkspaceProjectView";
import WorkspaceTeamView from "@/features/dashboard/views/workspace/WorkspaceTeamView";
import WorkspacePersonalView from "@/features/dashboard/views/workspace/WorkspacePersonalView";

interface WorkspaceViewProps {
	workspaceId: string;
}

export default function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
	const searchParams = useSearchParams();
	const router = useRouter();

	const activeView = (searchParams.get("v") as WorkspaceViewType) || "overview";
	const selectedSpaceId = searchParams.get("sid") || undefined;
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
	const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [selectedAIChatId, setSelectedAIChatId] = useState<string | null>(null);

	const handleViewChange = (view: WorkspaceViewType) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("v", view);
		// Clear space selection when changing main view
		if (view !== "spaces") {
			params.delete("sid");
			params.delete("sview");
		}
		router.push(`?${params.toString()}`);
	};

	const handleProjectSelect = (projectId: string) => setSelectedProjectId(projectId);
	const handleTeamSelect = (teamId: string) => setSelectedTeamId(teamId);

	const handleSpaceSelect = (spaceId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("sid", spaceId);
		router.push(`?${params.toString()}`);
	};

	const handleChatSelect = (chatId: string) => setSelectedChatId(chatId);
	const handleAIChatSelect = (chatId: string) => setSelectedAIChatId(chatId);

	const renderContent = () => {
		switch (activeView) {
			case "personal":
				return <WorkspacePersonalView workspaceId={workspaceId} />;
			case "spaces":
				return (
					<SpacesView
						workspaceId={workspaceId}
						selectedSpaceId={selectedSpaceId}
						onSpaceSelect={handleSpaceSelect}
					/>
				);
			case "projects":
				return (
					<WorkspaceProjectView
						workspaceId={workspaceId}
						selectedProjectId={selectedProjectId}
						onProjectSelect={handleProjectSelect}
					/>
				);
			case "teams":
				return (
					<WorkspaceTeamView
						workspaceId={workspaceId}
						selectedTeamId={selectedTeamId}
						onTeamSelect={handleTeamSelect}
					/>
				);
			case "chats":
				return (
					<WorkspaceChatView
						workspaceId={workspaceId}
						selectedChatId={selectedChatId}
						onChatSelect={handleChatSelect}
					/>
				);
			case "ai-chat":
				return (
					<WorkspaceAIChatView
						workspaceId={workspaceId}
						selectedAIChatId={selectedAIChatId}
						onAIChatSelect={handleAIChatSelect}
					/>
				);
			case "overview":
			default:
				return <WorkspaceOverviewView workspaceId={workspaceId} />;
		}
	};

	return (
		<div className="flex h-full gap-1">
			{/* Navigation Sidebar */}
			<NavigationSidebar
				workspaceId={workspaceId}
				activeView={activeView}
				onViewChange={handleViewChange}
				collapsed={sidebarCollapsed}
				onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
			/>

			{/* Main Content */}
			<div className="flex-1 overflow-y-auto w-full h-full">{renderContent()}</div>
		</div>
	);
}

