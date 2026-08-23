"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkspaceActionsMenu } from "@/features/dashboard/components/sidebar/WorkspaceActionsMenu";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import {
    Briefcase,
    FolderKanban,
    Users,
    MessageSquare,
    FileText,
    User,
    ChevronDown,
    ChevronRight,
    Link2,
    MoreHorizontal,
    Plus,
    LayoutDashboard,
    Check,
    Folder,
    List as ListIcon,
    Sparkles,
    Play,
} from "lucide-react";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { FolderIcon as FolderEntityIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface WorkspaceHeaderBreadcrumbsProps {
    workspaceId: string;
    workspaceName: string;
    currentTab: string;
    selectedProjectId?: string;
    selectedSpaceId?: string;
    selectedTeamId?: string;
    selectedFolderId?: string;
    selectedListId?: string;
    selectedChatId?: string;
    selectedAiChatId?: string;
    onSelectProject?: (projectId: string) => void;
    onSelectSpace?: (spaceId: string) => void;
    onSelectTeam?: (teamId: string) => void;
    onSelectFolder?: (folderId: string) => void;
    onSelectList?: (listId: string) => void;
    onSelectDoc?: (docId: string) => void;
    onSelectChat?: (chatId: string) => void;
    onSelectAiChat?: (aiChatId: string) => void;
    onNavigateWorkspace?: () => void;
}

export function WorkspaceHeaderBreadcrumbs({
    workspaceId,
    workspaceName,
    currentTab,
    selectedProjectId,
    selectedSpaceId,
    selectedTeamId,
    selectedFolderId,
    selectedListId,
    selectedChatId,
    selectedAiChatId,
    onSelectProject,
    onSelectSpace,
    onSelectTeam,
    onSelectFolder,
    onSelectList,
    onSelectDoc,
    onSelectChat,
    onSelectAiChat,
    onNavigateWorkspace,
}: WorkspaceHeaderBreadcrumbsProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [workspacePopoverOpen, setWorkspacePopoverOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [workspaceEditName, setWorkspaceEditName] = useState(workspaceName || "");
    const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

    const toggleNode = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Workspaces list query
    const { data: workspacesData } = trpc.workspace.list.useQuery(
        { scope: "all", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const workspaces = workspacesData?.items ?? [];

    const { data: currentWorkspace } = trpc.workspace.get.useQuery(
        { id: workspaceId },
        { enabled: !!workspaceId }
    );

    useEffect(() => {
        if (currentWorkspace?.name) {
            setWorkspaceEditName(currentWorkspace.name);
        } else if (workspaceName) {
            setWorkspaceEditName(workspaceName);
        }
    }, [currentWorkspace?.name, workspaceName]);

    // Queries based on active tab
    const isProjectTab = currentTab === "projects";
    const isSpaceTab = currentTab === "spaces";
    const isTeamTab = currentTab === "teams";
    const isChatTab = currentTab === "chats" || currentTab === "channels";
    const isAiChatTab = currentTab === "ai-chat";
    const isListsTab = currentTab === "lists" || !!selectedListId || !!selectedFolderId;
    const isDocsTab = currentTab === "docs";
    const isPersonalTab = currentTab === "personal";

    // Projects list query
    const { data: projectsData } = trpc.project.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const projects = projectsData?.items ?? [];

    // Spaces list query
    const { data: spacesData } = trpc.space.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const spaces = spacesData?.items ?? [];

    // Teams list query
    const { data: teamsData } = trpc.team.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const teams = teamsData?.items ?? [];

    // Channels query
    const { data: channelsData } = trpc.channel.list.useQuery(
        { workspaceId },
        { enabled: !!workspaceId }
    );
    const channels = channelsData ?? [];

    // AI Chats query
    const { data: aiChatsData } = trpc.chat.list.useQuery(
        { contextType: "workspace", entityId: workspaceId },
        { enabled: !!workspaceId }
    );
    const aiChats = aiChatsData ?? [];

    // Folders list query
    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { workspaceId, includeViewDetails: false },
        { enabled: !!workspaceId }
    );
    const folders = foldersData?.items ?? [];

    // Lists list query
    const { data: listsData } = trpc.list.byContext.useQuery(
        { workspaceId, includeViewDetails: false },
        { enabled: !!workspaceId }
    );
    const lists = listsData?.items ?? [];

    // Resolve Active Item
    const activeProject = useMemo(() => {
        if (selectedProjectId) {
            return projects.find((p) => p.id === selectedProjectId) || null;
        }
        if (isProjectTab) return projects[0] || null;
        return null;
    }, [isProjectTab, selectedProjectId, projects]);

    const activeSpace = useMemo(() => {
        if (selectedSpaceId) {
            return spaces.find((s) => s.id === selectedSpaceId) || null;
        }
        if (isSpaceTab) return spaces[0] || null;
        return null;
    }, [isSpaceTab, selectedSpaceId, spaces]);

    const activeTeam = useMemo(() => {
        if (selectedTeamId) {
            return teams.find((t) => t.id === selectedTeamId) || null;
        }
        if (isTeamTab) return teams[0] || null;
        return null;
    }, [isTeamTab, selectedTeamId, teams]);

    const activeFolder = useMemo(() => {
        if (selectedFolderId) return folders.find((f: any) => f.id === selectedFolderId) || null;
        return null;
    }, [selectedFolderId, folders]);

    const activeList = useMemo(() => {
        if (selectedListId) return lists.find((l: any) => l.id === selectedListId) || null;
        return null;
    }, [selectedListId, lists]);

    const activeChannel = useMemo(() => {
        if (selectedChatId) return channels.find((c: any) => c.id === selectedChatId) || null;
        if (isChatTab && channels.length > 0) return channels[0] || null;
        return null;
    }, [selectedChatId, isChatTab, channels]);

    const activeAiChat = useMemo(() => {
        if (selectedAiChatId) return aiChats.find((c: any) => c.id === selectedAiChatId) || null;
        if (isAiChatTab && aiChats.length > 0) return aiChats[0] || null;
        return null;
    }, [selectedAiChatId, isAiChatTab, aiChats]);

    // Active item name and sync to edit input
    const currentActiveItem = useMemo(() => {
        if (activeFolder) return { type: "folder" as const, id: activeFolder.id, name: activeFolder.name, icon: Folder };
        if (activeList) return { type: "list" as const, id: activeList.id, name: activeList.name, icon: ListIcon };
        if (isProjectTab && activeProject) return { type: "project" as const, id: activeProject.id, name: activeProject.name, icon: FolderKanban };
        if (isSpaceTab && activeSpace) return { type: "space" as const, id: activeSpace.id, name: activeSpace.name, icon: LayoutDashboard };
        if (isTeamTab && activeTeam) return { type: "team" as const, id: activeTeam.id, name: activeTeam.name, icon: Users };
        if (isDocsTab) return { type: "docs" as const, id: "docs", name: "Documents", icon: FileText };
        if (isChatTab) return { type: "chat" as const, id: activeChannel?.id || selectedChatId || "chats", name: activeChannel?.name ? `#${activeChannel.name}` : "Channels", icon: MessageSquare };
        if (isAiChatTab) return { type: "ai-chat" as const, id: activeAiChat?.id || selectedAiChatId || "ai-chat", name: activeAiChat?.title || "AI Chat", icon: Sparkles };
        if (isPersonalTab) return { type: "personal" as const, id: "personal", name: "Personal", icon: User };
        return null;
    }, [activeFolder, activeList, isProjectTab, isSpaceTab, isTeamTab, isDocsTab, isChatTab, isAiChatTab, isPersonalTab, activeProject, activeSpace, activeTeam, activeChannel, activeAiChat, selectedChatId, selectedAiChatId]);

    useEffect(() => {
        if (currentActiveItem?.name) {
            setEditName(currentActiveItem.name);
        }
    }, [currentActiveItem?.name]);

    // Mutations for inline renaming
    const updateProjectMutation = trpc.project.update.useMutation({
        onSuccess: () => {
            utils.project.list.invalidate();
            if (activeProject?.id) {
                utils.project.get.invalidate({ id: activeProject.id });
            }
            toast.success("Project renamed");
        },
        onError: (err) => toast.error(`Failed to rename project: ${err.message}`),
    });

    const updateSpaceMutation = trpc.space.update.useMutation({
        onSuccess: () => {
            utils.space.list.invalidate();
            if (activeSpace?.id) {
                utils.space.get.invalidate({ id: activeSpace.id });
            }
            toast.success("Space renamed");
        },
        onError: (err) => toast.error(`Failed to rename space: ${err.message}`),
    });

    const updateTeamMutation = trpc.team.update.useMutation({
        onSuccess: () => {
            utils.team.list.invalidate();
            if (activeTeam?.id) {
                utils.team.get.invalidate({ id: activeTeam.id });
            }
            toast.success("Team renamed");
        },
        onError: (err) => toast.error(`Failed to rename team: ${err.message}`),
    });

    const updateFolderMutation = trpc.folder.update.useMutation({
        onSuccess: () => {
            utils.folder.byContext.invalidate();
            toast.success("Folder renamed");
        },
        onError: (err) => toast.error(`Failed to rename folder: ${err.message}`),
    });

    const updateListMutation = trpc.list.update.useMutation({
        onSuccess: () => {
            utils.list.byContext.invalidate();
            toast.success("List renamed");
        },
        onError: (err) => toast.error(`Failed to rename list: ${err.message}`),
    });

    const updateWorkspaceMutation = trpc.workspace.update.useMutation({
        onSuccess: () => {
            utils.workspace.list.invalidate();
            utils.workspace.get.invalidate({ id: workspaceId });
            toast.success("Workspace updated");
        },
        onError: (err) => toast.error(`Failed to update workspace: ${err.message}`),
    });

    const handleSaveWorkspaceName = () => {
        const trimmed = workspaceEditName.trim();
        if (!trimmed || trimmed === (currentWorkspace?.name || workspaceName)) return;
        updateWorkspaceMutation.mutate({ id: workspaceId, name: trimmed });
    };

    const handleCopyWorkspaceLink = () => {
        const url = `${window.location.origin}/dashboard/workspaces/${workspaceId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleSaveName = () => {
        const trimmed = editName.trim();
        if (!trimmed || !currentActiveItem || trimmed === currentActiveItem.name) return;

        if (currentActiveItem.type === "project" && activeProject) {
            updateProjectMutation.mutate({ id: activeProject.id, name: trimmed });
        } else if (currentActiveItem.type === "space" && activeSpace) {
            updateSpaceMutation.mutate({ id: activeSpace.id, name: trimmed });
        } else if (currentActiveItem.type === "team" && activeTeam) {
            updateTeamMutation.mutate({ id: activeTeam.id, name: trimmed });
        } else if (currentActiveItem.type === "folder" && activeFolder) {
            updateFolderMutation.mutate({ id: activeFolder.id, name: trimmed });
        } else if (currentActiveItem.type === "list" && activeList) {
            updateListMutation.mutate({ id: activeList.id, name: trimmed });
        }
    };

    const handleCopyItemLink = () => {
        if (!currentActiveItem) return;
        let url = window.location.href;
        if (currentActiveItem.type === "project" && activeProject) {
            url = `${window.location.origin}${window.location.pathname}?tab=projects&pj=${activeProject.id}`;
        } else if (currentActiveItem.type === "space" && activeSpace) {
            url = `${window.location.origin}${window.location.pathname}?tab=spaces&sp=${activeSpace.id}`;
        } else if (currentActiveItem.type === "team" && activeTeam) {
            url = `${window.location.origin}${window.location.pathname}?tab=teams&tm=${activeTeam.id}`;
        } else if (currentActiveItem.type === "folder" && activeFolder) {
            url = `${window.location.origin}${window.location.pathname}?tab=lists&folder=${activeFolder.id}`;
        } else if (currentActiveItem.type === "list" && activeList) {
            url = `${window.location.origin}${window.location.pathname}?tab=lists&list=${activeList.id}`;
        }
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleNavigate = (type: "project" | "space" | "team" | "folder" | "list" | "chat" | "ai-chat", id: string) => {
        setPopoverOpen(false);
        if (type === "project") {
            if (onSelectProject) onSelectProject(id);
            else router.push(`?tab=projects&pj=${id}`, { scroll: false });
        } else if (type === "space") {
            if (onSelectSpace) onSelectSpace(id);
            else router.push(`?tab=spaces&sp=${id}`, { scroll: false });
        } else if (type === "team") {
            if (onSelectTeam) onSelectTeam(id);
            else router.push(`?tab=teams&tm=${id}`, { scroll: false });
        } else if (type === "folder") {
            if (onSelectFolder) onSelectFolder(id);
            else router.push(`?tab=lists&folder=${id}`, { scroll: false });
        } else if (type === "list") {
            if (onSelectList) onSelectList(id);
            else router.push(`?tab=lists&list=${id}`, { scroll: false });
        } else if (type === "chat") {
            if (onSelectChat) onSelectChat(id);
            else router.push(`?tab=channels&ch=${id}`, { scroll: false });
        } else if (type === "ai-chat") {
            if (onSelectAiChat) onSelectAiChat(id);
            else if (onSelectChat) onSelectChat(id);
            else router.push(`?tab=ai-chat&aid=${id}`, { scroll: false });
        }
    };

    const ItemIcon = currentActiveItem?.icon || FolderKanban;

    return (
        <div className="flex items-center gap-0.5 min-w-0">
            {/* Workspace Dropdown */}
            <Popover open={workspacePopoverOpen} onOpenChange={setWorkspacePopoverOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-sm font-semibold max-w-[200px] truncate cursor-pointer group",
                            currentActiveItem ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900" : "text-slate-900 hover:bg-slate-100",
                            workspacePopoverOpen && "bg-slate-100"
                        )}
                    >
                        <span
                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                            style={{ backgroundColor: currentWorkspace?.icon ? (currentWorkspace.color || "#6366f1") : "transparent" }}
                        >
                            <WorkspaceIcon
                                icon={currentWorkspace?.icon}
                                className={cn(currentWorkspace?.icon ? "text-white" : "text-slate-700")}
                                size={14}
                                fill
                            />
                        </span>
                        <span className="truncate">{currentWorkspace?.name || workspaceName || "Workspace"}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200" />
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-[300px] p-2 bg-white rounded-xl shadow-xl border border-slate-200/90 flex flex-col gap-2 z-50"
                >
                    {/* Top Editable Bar for Workspace */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <IconColorSelector
                            icon={currentWorkspace?.icon}
                            color={currentWorkspace?.color || "#6366f1"}
                            onIconChange={(icon) => updateWorkspaceMutation.mutate({ id: workspaceId, icon })}
                            onColorChange={(color) => updateWorkspaceMutation.mutate({ id: workspaceId, color })}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                style={{ backgroundColor: currentWorkspace?.icon ? (currentWorkspace.color || "#6366f1") : "transparent" }}
                            >
                                <WorkspaceIcon
                                    icon={currentWorkspace?.icon}
                                    className={cn(currentWorkspace?.icon ? "text-white" : "text-slate-700")}
                                    size={16}
                                    fill
                                />
                            </Button>
                        </IconColorSelector>
                        <Input
                            value={workspaceEditName}
                            onChange={(e) => setWorkspaceEditName(e.target.value)}
                            onBlur={handleSaveWorkspaceName}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            className="h-8 flex-1 text-sm font-normal border border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 px-2 py-1 rounded-sm"
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCopyWorkspaceLink}
                                        className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                    >
                                        <Link2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="text-xs">Copy link</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <WorkspaceActionsMenu
                            workspaceId={workspaceId}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            }
                        />
                    </div>

                    {/* Workspaces List */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <span>Workspaces</span>
                    </div>

                    <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-0.5">
                        {workspaces.map((ws: any) => {
                            const isSelected = ws.id === workspaceId;
                            return (
                                <button
                                    key={ws.id}
                                    type="button"
                                    onClick={() => {
                                        setWorkspacePopoverOpen(false);
                                        router.push(`/dashboard/workspaces/${ws.id}`);
                                    }}
                                    className={cn(
                                        "group/ws flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left cursor-pointer",
                                        "hover:bg-slate-50",
                                        isSelected && "bg-slate-100"
                                    )}
                                >
                                    <span
                                        className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5"
                                        style={{ backgroundColor: ws.icon ? (ws.color || "#6366f1") : "transparent" }}
                                    >
                                        <WorkspaceIcon
                                            icon={ws.icon}
                                            className={cn(ws.icon ? "text-white" : isSelected ? "text-indigo-600" : "text-slate-500")}
                                            size={14}
                                            fill
                                        />
                                    </span>
                                    <span className={cn(
                                        "flex-1 truncate text-sm",
                                        isSelected ? "font-normal text-foreground" : "text-zinc-600 group-hover/ws:text-foreground"
                                    )}>
                                        {ws.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Separator and Sub-Item */}
            {currentActiveItem && (
                <>
                    <span className="text-slate-300 font-light text-base select-none">/</span>

                    {["project", "space", "team", "folder", "list", "chat", "ai-chat"].includes(currentActiveItem.type) ? (
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group min-w-0 max-w-[260px]",
                                        popoverOpen && "bg-slate-100"
                                    )}
                                >
                                    {currentActiveItem.type === "project" && activeProject ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeProject.icon ? (activeProject.color || "#6366f1") : "transparent" }}
                                        >
                                            <ProjectIcon
                                                icon={activeProject.icon}
                                                className={cn(activeProject.icon ? "text-white" : "text-indigo-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : currentActiveItem.type === "space" && activeSpace ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeSpace.icon ? (activeSpace.color || "#6366f1") : "transparent" }}
                                        >
                                            <SpaceIcon
                                                icon={activeSpace.icon}
                                                className={cn(activeSpace.icon ? "text-white" : "text-indigo-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : currentActiveItem.type === "team" && activeTeam ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeTeam.icon ? (activeTeam.color || "#6366f1") : "transparent" }}
                                        >
                                            <TeamIcon
                                                icon={activeTeam.icon}
                                                className={cn(activeTeam.icon ? "text-white" : "text-indigo-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : currentActiveItem.type === "folder" && activeFolder ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeFolder.icon ? (activeFolder.color || "#3b82f6") : "transparent" }}
                                        >
                                            <FolderEntityIcon
                                                icon={activeFolder.icon}
                                                className={cn(activeFolder.icon ? "text-white" : "text-blue-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : currentActiveItem.type === "list" && activeList ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeList.icon ? (activeList.color || "#6366f1") : "transparent" }}
                                        >
                                            <ListEntityIcon
                                                icon={activeList.icon}
                                                className={cn(activeList.icon ? "text-white" : "text-indigo-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : currentActiveItem.type === "chat" ? (
                                        <span className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                        </span>
                                    ) : currentActiveItem.type === "ai-chat" ? (
                                        <span className="h-5 w-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </span>
                                    ) : (
                                        <ItemIcon className="h-4 w-4 text-slate-600 group-hover:text-slate-900 shrink-0" />
                                    )}
                                    <span className="truncate">{currentActiveItem.name}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-600 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </button>
                            </PopoverTrigger>

                            <PopoverContent
                                align="start"
                                sideOffset={8}
                                className="w-[320px] p-2 bg-white rounded-xl shadow-xl border border-slate-200/90 flex flex-col gap-2 z-50"
                            >
                                {/* Top Editable Header */}
                                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                                    {currentActiveItem.type === "project" && activeProject ? (
                                        <IconColorSelector
                                            icon={activeProject.icon}
                                            color={activeProject.color || "#6366f1"}
                                            onIconChange={(icon) => updateProjectMutation.mutate({ id: activeProject.id, icon })}
                                            onColorChange={(color) => updateProjectMutation.mutate({ id: activeProject.id, color })}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                                style={{ backgroundColor: activeProject.icon ? (activeProject.color || "#6366f1") : "transparent" }}
                                            >
                                                <ProjectIcon
                                                    icon={activeProject.icon}
                                                    className={cn(activeProject.icon ? "text-white" : "text-indigo-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : currentActiveItem.type === "space" && activeSpace ? (
                                        <IconColorSelector
                                            icon={activeSpace.icon}
                                            color={activeSpace.color || "#6366f1"}
                                            onIconChange={(icon) => updateSpaceMutation.mutate({ id: activeSpace.id, icon })}
                                            onColorChange={(color) => updateSpaceMutation.mutate({ id: activeSpace.id, color })}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                                style={{ backgroundColor: activeSpace.icon ? (activeSpace.color || "#6366f1") : "transparent" }}
                                            >
                                                <SpaceIcon
                                                    icon={activeSpace.icon}
                                                    className={cn(activeSpace.icon ? "text-white" : "text-indigo-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : currentActiveItem.type === "team" && activeTeam ? (
                                        <IconColorSelector
                                            icon={activeTeam.icon}
                                            color={activeTeam.color || "#6366f1"}
                                            onIconChange={(icon) => updateTeamMutation.mutate({ id: activeTeam.id, icon })}
                                            onColorChange={(color) => updateTeamMutation.mutate({ id: activeTeam.id, color })}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                                style={{ backgroundColor: activeTeam.icon ? (activeTeam.color || "#6366f1") : "transparent" }}
                                            >
                                                <TeamIcon
                                                    icon={activeTeam.icon}
                                                    className={cn(activeTeam.icon ? "text-white" : "text-indigo-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : currentActiveItem.type === "folder" && activeFolder ? (
                                        <IconColorSelector
                                            icon={activeFolder.icon}
                                            color={activeFolder.color || "#3b82f6"}
                                            onIconChange={(icon) => updateFolderMutation.mutate({ id: activeFolder.id, icon })}
                                            onColorChange={(color) => updateFolderMutation.mutate({ id: activeFolder.id, color })}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                                style={{ backgroundColor: activeFolder.icon ? (activeFolder.color || "#3b82f6") : "transparent" }}
                                            >
                                                <FolderEntityIcon
                                                    icon={activeFolder.icon}
                                                    className={cn(activeFolder.icon ? "text-white" : "text-blue-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : currentActiveItem.type === "list" && activeList ? (
                                        <IconColorSelector
                                            icon={activeList.icon}
                                            color={activeList.color || "#6366f1"}
                                            onIconChange={(icon) => updateListMutation.mutate({ id: activeList.id, icon })}
                                            onColorChange={(color) => updateListMutation.mutate({ id: activeList.id, color })}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                                style={{ backgroundColor: activeList.icon ? (activeList.color || "#6366f1") : "transparent" }}
                                            >
                                                <ListEntityIcon
                                                    icon={activeList.icon}
                                                    className={cn(activeList.icon ? "text-white" : "text-indigo-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : currentActiveItem.type === "chat" ? (
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <MessageSquare className="h-4 w-4" />
                                        </div>
                                    ) : currentActiveItem.type === "ai-chat" ? (
                                        <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                            <ItemIcon className="h-4 w-4" />
                                        </div>
                                    )}
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleSaveName}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        disabled={!["project", "space", "team", "folder", "list"].includes(currentActiveItem.type)}
                                        className="h-8 flex-1 text-sm font-normal border border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 px-2 py-1 rounded-sm disabled:bg-transparent disabled:opacity-100 disabled:cursor-default"
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleCopyItemLink}
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <Link2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p className="text-xs">Copy link</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {/* More Action Menu */}
                                    {currentActiveItem.type === "project" && activeProject && (
                                        <ProjectActionsMenu
                                            workspaceId={workspaceId}
                                            projectId={activeProject.id}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                    {currentActiveItem.type === "space" && activeSpace && (
                                        <SpaceActionsMenu
                                            workspaceId={workspaceId}
                                            spaceId={activeSpace.id}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                    {currentActiveItem.type === "team" && activeTeam && (
                                        <TeamActionsMenu
                                            workspaceId={workspaceId}
                                            teamId={activeTeam.id}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                    {currentActiveItem.type === "folder" && activeFolder && (
                                        <FolderActionsMenu
                                            workspaceId={workspaceId}
                                            folderId={activeFolder.id}
                                            folderName={activeFolder.name}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                    {currentActiveItem.type === "list" && activeList && (
                                        <ListActionsMenu
                                            workspaceId={workspaceId}
                                            listId={activeList.id}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm shrink-0"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>

                                {currentActiveItem.type === "chat" ? (
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {channels.length === 0 ? (
                                            <div className="text-xs text-muted-foreground px-2 py-3 text-center">No channels found</div>
                                        ) : (
                                            channels.map((ch: any) => {
                                                const isSelected = ch.id === activeChannel?.id;
                                                return (
                                                    <div
                                                        key={ch.id}
                                                        className={cn(
                                                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-emerald-50",
                                                            isSelected && "bg-emerald-100 font-semibold"
                                                        )}
                                                        onClick={() => handleNavigate("chat", ch.id)}
                                                    >
                                                        <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-semibold text-emerald-600">#</span>
                                                        </div>
                                                        <span className="flex-1 truncate text-slate-700">
                                                            {ch.name}
                                                        </span>
                                                        <span className="text-[9px] text-emerald-600 font-medium px-1 py-0.2 bg-emerald-100 rounded">
                                                            Channel
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : currentActiveItem.type === "ai-chat" ? (
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {aiChats.length === 0 ? (
                                            <div className="text-xs text-muted-foreground px-2 py-3 text-center">No AI chats found</div>
                                        ) : (
                                            aiChats.map((c: any) => {
                                                const isSelected = c.id === activeAiChat?.id;
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className={cn(
                                                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-purple-50",
                                                            isSelected && "bg-purple-100 font-semibold"
                                                        )}
                                                        onClick={() => handleNavigate("ai-chat", c.id)}
                                                    >
                                                        <div className="h-5 w-5 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                            <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                                        </div>
                                                        <span className="flex-1 truncate text-slate-700">
                                                            {c.title || "Untitled Conversation"}
                                                        </span>
                                                        <span className="text-[9px] text-purple-600 font-medium px-1 py-0.2 bg-purple-100 rounded">
                                                            AI Chat
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : (
                                    /* Full Hierarchy Tree of Workspace Items */
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {/* Spaces and nested items */}
                                        {spaces.map((sp: any) => {
                                            const spaceProjects = projects.filter((p: any) => p.spaceId === sp.id);
                                            const spaceFolders = folders.filter((f: any) => f.spaceId === sp.id && !f.projectId);
                                            const spaceLists = lists.filter((l: any) => l.spaceId === sp.id && !l.projectId && !l.folderId);
                                            const spaceHasChildren = spaceProjects.length > 0 || spaceFolders.length > 0 || spaceLists.length > 0;
                                            const isSpaceExpanded = !collapsedNodes[`space-${sp.id}`];
                                            const isSelected = sp.id === activeSpace?.id && currentActiveItem.type === "space";

                                            return (
                                                <div key={sp.id} className="space-y-0.5">
                                                    <div
                                                        className={cn(
                                                            "group/space flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer text-left text-xs",
                                                            "hover:bg-slate-50",
                                                            isSelected && "bg-slate-100 font-semibold"
                                                        )}
                                                        onClick={() => handleNavigate("space", sp.id)}
                                                    >
                                                        <div
                                                            className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center cursor-pointer"
                                                            onClick={(e) => {
                                                                if (spaceHasChildren) {
                                                                    toggleNode(e, `space-${sp.id}`);
                                                                }
                                                            }}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5",
                                                                    spaceHasChildren && "group-hover/space:hidden"
                                                                )}
                                                                style={{ backgroundColor: sp.icon ? (sp.color || "#6366f1") : "transparent" }}
                                                            >
                                                                <SpaceIcon
                                                                    icon={sp.icon}
                                                                    className={cn(sp.icon ? "text-white" : isSelected ? "text-indigo-500" : "text-indigo-500/80")}
                                                                    size={13}
                                                                    fill
                                                                />
                                                            </span>
                                                            {spaceHasChildren && (
                                                                <div className="hidden group-hover/space:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isSpaceExpanded && "rotate-90")} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={cn("flex-1 truncate", isSelected ? "text-foreground font-semibold" : "text-zinc-700")}>
                                                            {sp.name}
                                                        </span>
                                                    </div>

                                                    {/* Space Children */}
                                                    {isSpaceExpanded && spaceHasChildren && (
                                                        <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                            {/* Space Projects */}
                                                            {spaceProjects.map((proj: any) => {
                                                                const projFolders = folders.filter((f: any) => f.projectId === proj.id);
                                                                const projLists = lists.filter((l: any) => l.projectId === proj.id && !l.folderId);
                                                                const projHasChildren = projFolders.length > 0 || projLists.length > 0;
                                                                const isProjExpanded = !collapsedNodes[`proj-${proj.id}`];
                                                                const isProjSelected = proj.id === activeProject?.id && currentActiveItem.type === "project";

                                                                return (
                                                                    <div key={proj.id} className="space-y-0.5">
                                                                        <div
                                                                            className={cn(
                                                                                "group/proj flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs",
                                                                                "hover:bg-purple-50",
                                                                                isProjSelected && "bg-purple-100 font-semibold"
                                                                            )}
                                                                            onClick={() => handleNavigate("project", proj.id)}
                                                                        >
                                                                            <div
                                                                                className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
                                                                                onClick={(e) => {
                                                                                    if (projHasChildren) {
                                                                                        toggleNode(e, `proj-${proj.id}`);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className={cn("h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0", projHasChildren && "group-hover/proj:hidden")}>
                                                                                    <Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
                                                                                </div>
                                                                                {projHasChildren && (
                                                                                    <div className="hidden group-hover/proj:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                                        <Play className={cn("h-2 w-2 fill-zinc-700 text-zinc-700 transition-transform duration-200", isProjExpanded && "rotate-90")} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="flex-1 truncate text-slate-700 group-hover/proj:text-purple-800">
                                                                                {proj.name}
                                                                            </span>
                                                                            <span className="text-[9px] text-purple-600 font-medium px-1 py-0.2 bg-purple-100 rounded">
                                                                                Project
                                                                            </span>
                                                                        </div>

                                                                        {/* Project Folders & Lists */}
                                                                        {isProjExpanded && projHasChildren && (
                                                                            <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                                                {projFolders.map((pf: any) => {
                                                                                    const pfLists = lists.filter((l: any) => l.folderId === pf.id);
                                                                                    const pfHasChildren = pfLists.length > 0;
                                                                                    const isPfExpanded = !collapsedNodes[`folder-${pf.id}`];
                                                                                    const isPfSelected = pf.id === activeFolder?.id && currentActiveItem.type === "folder";

                                                                                    return (
                                                                                        <div key={pf.id} className="space-y-0.5">
                                                                                            <div
                                                                                                className={cn(
                                                                                                    "group/folder flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs",
                                                                                                    "hover:bg-slate-50",
                                                                                                    isPfSelected && "bg-slate-100 font-semibold"
                                                                                                )}
                                                                                                onClick={() => handleNavigate("folder", pf.id)}
                                                                                            >
                                                                                                <div
                                                                                                    className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
                                                                                                    onClick={(e) => {
                                                                                                        if (pfHasChildren) {
                                                                                                            toggleNode(e, `folder-${pf.id}`);
                                                                                                        }
                                                                                                    }}
                                                                                                >
                                                                                                    <div className={cn("h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0", pfHasChildren && "group-hover/folder:hidden")}>
                                                                                                        <Folder className="h-3 w-3 text-blue-600 shrink-0" />
                                                                                                    </div>
                                                                                                    {pfHasChildren && (
                                                                                                        <div className="hidden group-hover/folder:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                                                            <Play className={cn("h-2 w-2 fill-zinc-700 text-zinc-700 transition-transform duration-200", isPfExpanded && "rotate-90")} />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <span className="flex-1 truncate text-zinc-600 group-hover/folder:text-foreground">
                                                                                                    {pf.name}
                                                                                                </span>
                                                                                            </div>
                                                                                            {isPfExpanded && pfHasChildren && (
                                                                                                <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                                                                    {pfLists.map((pfl: any) => (
                                                                                                        <div
                                                                                                            key={pfl.id}
                                                                                                            className={cn(
                                                                                                                "flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                                                                                pfl.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                                                                            )}
                                                                                                            onClick={() => handleNavigate("list", pfl.id)}
                                                                                                        >
                                                                                                            <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                                                                <ListIcon className="h-3 w-3 text-emerald-600" />
                                                                                                            </div>
                                                                                                            <span className="flex-1 truncate text-zinc-600">
                                                                                                                {pfl.name}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}

                                                                                {projLists.map((pl: any) => (
                                                                                    <div
                                                                                        key={pl.id}
                                                                                        className={cn(
                                                                                            "flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                                                            pl.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                                                        )}
                                                                                        onClick={() => handleNavigate("list", pl.id)}
                                                                                    >
                                                                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                                            <ListIcon className="h-3 w-3 text-emerald-600" />
                                                                                        </div>
                                                                                        <span className="flex-1 truncate text-zinc-600">
                                                                                            {pl.name}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Space Folders */}
                                                            {spaceFolders.map((sf: any) => {
                                                                const sfLists = lists.filter((l: any) => l.folderId === sf.id);
                                                                const sfHasChildren = sfLists.length > 0;
                                                                const isSfExpanded = !collapsedNodes[`folder-${sf.id}`];
                                                                const isSfSelected = sf.id === activeFolder?.id && currentActiveItem.type === "folder";

                                                                return (
                                                                    <div key={sf.id} className="space-y-0.5">
                                                                        <div
                                                                            className={cn(
                                                                                "group/folder flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs",
                                                                                "hover:bg-slate-50",
                                                                                isSfSelected && "bg-slate-100 font-semibold"
                                                                            )}
                                                                            onClick={() => handleNavigate("folder", sf.id)}
                                                                        >
                                                                            <div
                                                                                className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
                                                                                onClick={(e) => {
                                                                                    if (sfHasChildren) {
                                                                                        toggleNode(e, `folder-${sf.id}`);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className={cn("h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0", sfHasChildren && "group-hover/folder:hidden")}>
                                                                                    <Folder className="h-3 w-3 text-blue-600 shrink-0" />
                                                                                </div>
                                                                                {sfHasChildren && (
                                                                                    <div className="hidden group-hover/folder:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                                        <Play className={cn("h-2 w-2 fill-zinc-700 text-zinc-700 transition-transform duration-200", isSfExpanded && "rotate-90")} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="flex-1 truncate text-zinc-600 group-hover/folder:text-foreground">
                                                                                {sf.name}
                                                                            </span>
                                                                        </div>
                                                                        {isSfExpanded && sfHasChildren && (
                                                                            <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                                                {sfLists.map((sfl: any) => (
                                                                                    <div
                                                                                        key={sfl.id}
                                                                                        className={cn(
                                                                                            "flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                                                            sfl.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                                                        )}
                                                                                        onClick={() => handleNavigate("list", sfl.id)}
                                                                                    >
                                                                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                                            <ListIcon className="h-3 w-3 text-emerald-600" />
                                                                                        </div>
                                                                                        <span className="flex-1 truncate text-zinc-600">
                                                                                            {sfl.name}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Space Direct Lists */}
                                                            {spaceLists.map((sl: any) => (
                                                                <div
                                                                    key={sl.id}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                                        sl.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                                    )}
                                                                    onClick={() => handleNavigate("list", sl.id)}
                                                                >
                                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                        <ListIcon className="h-3 w-3 text-emerald-600" />
                                                                    </div>
                                                                    <span className="flex-1 truncate text-zinc-600">
                                                                        {sl.name}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Direct Projects under Workspace */}
                                        {projects.filter((p: any) => !p.spaceId).map((proj: any) => {
                                            const isProjSelected = proj.id === activeProject?.id && currentActiveItem.type === "project";
                                            return (
                                                <div
                                                    key={proj.id}
                                                    className={cn(
                                                        "group/proj flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-purple-50",
                                                        isProjSelected && "bg-purple-100 font-semibold"
                                                    )}
                                                    onClick={() => handleNavigate("project", proj.id)}
                                                >
                                                    <div className="h-5 w-5 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                        <Briefcase className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                                    </div>
                                                    <span className="flex-1 truncate text-slate-700 group-hover/proj:text-purple-800">
                                                        {proj.name}
                                                    </span>
                                                    <span className="text-[9px] text-purple-600 font-medium px-1 py-0.2 bg-purple-100 rounded">
                                                        Project
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Direct Folders under Workspace */}
                                        {folders.filter((f: any) => !f.spaceId && !f.projectId).map((fold: any) => {
                                            const foldLists = lists.filter((l: any) => l.folderId === fold.id);
                                            const foldHasChildren = foldLists.length > 0;
                                            const isFoldExpanded = !collapsedNodes[`folder-${fold.id}`];
                                            const isFoldSelected = fold.id === activeFolder?.id && currentActiveItem.type === "folder";

                                            return (
                                                <div key={fold.id} className="space-y-0.5">
                                                    <div
                                                        className={cn(
                                                            "group/folder flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                            isFoldSelected && "bg-slate-100 font-semibold"
                                                        )}
                                                        onClick={() => handleNavigate("folder", fold.id)}
                                                    >
                                                        <div
                                                            className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
                                                            onClick={(e) => {
                                                                if (foldHasChildren) {
                                                                    toggleNode(e, `folder-${fold.id}`);
                                                                }
                                                            }}
                                                        >
                                                            <div className={cn("h-5 w-5 rounded bg-blue-50 flex items-center justify-center shrink-0", foldHasChildren && "group-hover/folder:hidden")}>
                                                                <Folder className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                            </div>
                                                            {foldHasChildren && (
                                                                <div className="hidden group-hover/folder:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isFoldExpanded && "rotate-90")} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="flex-1 truncate text-zinc-600 group-hover/folder:text-foreground">
                                                            {fold.name}
                                                        </span>
                                                    </div>
                                                    {isFoldExpanded && foldHasChildren && (
                                                        <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                            {foldLists.map((fl: any) => (
                                                                <div
                                                                    key={fl.id}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                                        fl.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                                    )}
                                                                    onClick={() => handleNavigate("list", fl.id)}
                                                                >
                                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                        <ListIcon className="h-3 w-3 text-emerald-600" />
                                                                    </div>
                                                                    <span className="flex-1 truncate text-zinc-600">
                                                                        {fl.name}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Direct Lists under Workspace */}
                                        {lists.filter((l: any) => !l.spaceId && !l.projectId && !l.folderId).map((lst: any) => (
                                            <div
                                                key={lst.id}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                    lst.id === activeList?.id && currentActiveItem.type === "list" && "bg-slate-100 font-semibold"
                                                )}
                                                onClick={() => handleNavigate("list", lst.id)}
                                            >
                                                <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <ListIcon className="h-3.5 w-3.5 text-emerald-600" />
                                                </div>
                                                <span className="flex-1 truncate text-zinc-600">
                                                    {lst.name}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Teams */}
                                        {teams.map((tm: any) => {
                                            const isSelected = tm.id === activeTeam?.id && currentActiveItem.type === "team";
                                            return (
                                                <div
                                                    key={tm.id}
                                                    className={cn(
                                                        "group/team flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-emerald-50",
                                                        isSelected && "bg-emerald-100 font-semibold"
                                                    )}
                                                    onClick={() => handleNavigate("team", tm.id)}
                                                >
                                                    <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                                                    </div>
                                                    <span className="flex-1 truncate text-slate-700 group-hover/team:text-emerald-800">
                                                        {tm.name}
                                                    </span>
                                                    <span className="text-[9px] text-emerald-600 font-medium px-1 py-0.2 bg-emerald-100 rounded">
                                                        Team
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-sm font-semibold text-slate-900 min-w-0 max-w-[260px]">
                            {currentActiveItem.type === "docs" ? (
                                <span className="h-5 w-5 rounded-sm bg-blue-500 text-white flex items-center justify-center shrink-0">
                                    <FileText className="h-3.5 w-3.5" />
                                </span>
                            ) : (
                                <span className="h-5 w-5 rounded-sm bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                    <ItemIcon className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <span className="truncate">{currentActiveItem.name}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
