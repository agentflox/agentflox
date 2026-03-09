"use client";

import { useState, useMemo, useEffect } from "react";
import { ChatView } from "@/features/dashboard/views/project/ChatView";
import { useWorkspaceDetail } from "@/entities/workspace";
import { ChatContextModal, type ContextEntity } from "@/features/dashboard/components/modals/ChatContextModal";
import type { ChatContextType } from "@/entities/chats/utils/context";

interface WorkspaceAIChatViewProps {
	workspaceId: string;
	selectedAIChatId?: string;
	onAIChatSelect?: (aiChatId: string) => void;
}

export default function WorkspaceAIChatView({
	workspaceId,
	selectedAIChatId,
	onAIChatSelect
}: WorkspaceAIChatViewProps) {
	const { data: workspace } = useWorkspaceDetail(workspaceId);
	const [contextModalOpen, setContextModalOpen] = useState(false);
	const [selectedContexts, setSelectedContexts] = useState<ContextEntity[]>([]);
	const [activeChatId, setActiveChatId] = useState<string | undefined>(selectedAIChatId);

	// Notify parent component when active chat changes
	useEffect(() => {
		if (activeChatId && onAIChatSelect) {
			onAIChatSelect(activeChatId);
		}
	}, [activeChatId, onAIChatSelect]);

	// Update active chat when selectedAIChatId changes
	useEffect(() => {
		if (selectedAIChatId) {
			setActiveChatId(selectedAIChatId);
		}
	}, [selectedAIChatId]);

	const chatContextOptions = useMemo(() => {
		if (!workspace) return [];
		const options: Array<{
			label: string;
			value: ChatContextType;
			entityId: string;
			name?: string;
		}> = [];

		// Add workspace
		options.push({
			label: `${workspace.name} (Workspace)`,
			value: "workspace" as ChatContextType,
			entityId: workspace.id,
			name: workspace.name,
		});

		// Add spaces
		(workspace.spaces ?? []).forEach((space) => {
			options.push({
				label: `${space.name} • Space`,
				value: "space" as ChatContextType,
				entityId: space.id,
				name: space.name,
			});
		});

		// Add channels
		(workspace.channels ?? []).forEach((channel) => {
			options.push({
				label: `${channel.name} • Channel`,
				value: "channel" as ChatContextType,
				entityId: channel.id,
				name: channel.name,
			});
		});

		// Add projects
		(workspace.projects ?? []).forEach((project) => {
			options.push({
				label: `${project.name} • Project`,
				value: "project" as ChatContextType,
				entityId: project.id,
				name: project.name,
			});
		});

		// Add teams
		(workspace.teams ?? []).forEach((team) => {
			options.push({
				label: `${team.name} • Team`,
				value: "team" as ChatContextType,
				entityId: team.id,
				name: team.name,
			});
		});

		return options;
	}, [workspace]);

	return (
		<div className="flex h-full flex-col">
			<ChatView
				contextType="WORKSPACE"
				contextId={workspace?.id}
				contextName={workspace?.name}
				contextOptions={chatContextOptions}
				onContextClick={() => setContextModalOpen(true)}
				contextCount={selectedContexts.length}
				selectedContexts={selectedContexts}
				chatId={activeChatId}
				onChatIdChange={setActiveChatId}
			/>

			<ChatContextModal
				workspaceId={workspaceId}
				open={contextModalOpen}
				onOpenChange={setContextModalOpen}
				selectedContexts={selectedContexts}
				onContextsChange={setSelectedContexts}
			/>
		</div>
	);
}

