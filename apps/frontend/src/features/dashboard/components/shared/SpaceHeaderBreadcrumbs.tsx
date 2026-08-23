"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    MessageSquare,
    FileText,
    User,
    ChevronDown,
    ChevronRight,
    Link2,
    MoreHorizontal,
    Folder,
    List as ListIcon,
    Hash,
    Sparkles,
    Briefcase,
    Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SpaceHeaderBreadcrumbsProps {
    workspaceId: string;
    spaceId: string;
    spaceName: string;
    currentTab: string;
    selectedProjectId?: string;
    selectedTeamId?: string;
    selectedListId?: string;
    selectedFolderId?: string;
    selectedChannelId?: string;
    selectedAiChatId?: string;
    onSelectProject?: (projectId: string) => void;
    onSelectTeam?: (teamId: string) => void;
    onSelectList?: (listId: string) => void;
    onSelectFolder?: (folderId: string) => void;
    onSelectChannel?: (channelId: string) => void;
    onSelectAiChat?: (aiChatId: string) => void;
    onNavigateSpace?: () => void;
}

export function SpaceHeaderBreadcrumbs({
    workspaceId,
    spaceId,
    spaceName,
    currentTab,
    selectedProjectId,
    selectedTeamId,
    selectedListId,
    selectedFolderId,
    selectedChannelId,
    selectedAiChatId,
    onSelectProject,
    onSelectTeam,
    onSelectList,
    onSelectFolder,
    onSelectChannel,
    onSelectAiChat,
    onNavigateSpace,
}: SpaceHeaderBreadcrumbsProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [spacePopoverOpen, setSpacePopoverOpen] = useState(false);
    const [subPopoverOpen, setSubPopoverOpen] = useState(false);
    const [spaceEditName, setSpaceEditName] = useState(spaceName || "");
    const [subEditName, setSubEditName] = useState("");
    const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

    const toggleNode = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    useEffect(() => {
        setSpaceEditName(spaceName || "");
    }, [spaceName]);

    // Query current space details
    const { data: currentSpace } = trpc.space.get.useQuery(
        { id: spaceId },
        { enabled: !!spaceId }
    );

    // Query spaces in workspace for Space dropdown
    const { data: spacesData } = trpc.space.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId && spacePopoverOpen }
    );
    const spaces = spacesData?.items ?? [];

    // Sub-queries
    const isProjectTab = currentTab === "projects";
    const isTeamTab = currentTab === "teams";
    const isListTab = currentTab === "lists" || !!selectedListId || !!selectedFolderId;
    const isDocsTab = currentTab === "docs";
    const isChannelsTab = currentTab === "channels" || currentTab === "chats";
    const isAiChatTab = currentTab === "ai-chat";
    const isPersonalTab = currentTab === "personal";

    const { data: projectsData } = trpc.project.list.useQuery(
        { spaceId, workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!spaceId }
    );
    const projects = projectsData?.items ?? [];

    const { data: teamsData } = trpc.team.list.useQuery(
        { spaceId, workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!spaceId }
    );
    const teams = teamsData?.items ?? [];

    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId, workspaceId, includeViewDetails: false },
        { enabled: !!spaceId }
    );
    const lists = listsData?.items ?? [];

    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { spaceId, workspaceId, includeViewDetails: false },
        { enabled: !!spaceId }
    );
    const folders = foldersData?.items ?? [];

    const { data: channelsData } = trpc.channel.list.useQuery(
        { spaceId },
        { enabled: !!spaceId }
    );
    const channels = channelsData ?? [];

    const { data: aiChatsData } = trpc.chat.list.useQuery(
        { contextType: "space", entityId: spaceId },
        { enabled: !!spaceId }
    );
    const aiChats = aiChatsData ?? [];

    // Active sub-item resolution
    const activeProject = useMemo(() => {
        if (selectedProjectId) return projects.find((p) => p.id === selectedProjectId) || null;
        if (isProjectTab) return projects[0] || null;
        return null;
    }, [isProjectTab, selectedProjectId, projects]);

    const activeTeam = useMemo(() => {
        if (selectedTeamId) return teams.find((t) => t.id === selectedTeamId) || null;
        if (isTeamTab) return teams[0] || null;
        return null;
    }, [isTeamTab, selectedTeamId, teams]);

    const activeList = useMemo(() => {
        if (selectedListId) return lists.find((l: any) => l.id === selectedListId) || null;
        return null;
    }, [selectedListId, lists]);

    const activeFolder = useMemo(() => {
        if (selectedFolderId) return folders.find((f: any) => f.id === selectedFolderId) || null;
        return null;
    }, [selectedFolderId, folders]);

    const activeChannel = useMemo(() => {
        if (selectedChannelId) return channels.find((c: any) => c.id === selectedChannelId) || null;
        if (isChannelsTab && channels.length > 0) return channels[0] || null;
        return null;
    }, [selectedChannelId, isChannelsTab, channels]);

    const activeAiChat = useMemo(() => {
        if (selectedAiChatId) return aiChats.find((c: any) => c.id === selectedAiChatId) || null;
        if (isAiChatTab && aiChats.length > 0) return aiChats[0] || null;
        return null;
    }, [selectedAiChatId, isAiChatTab, aiChats]);

    const currentSubItem = useMemo(() => {
        if (activeFolder) return { type: "folder" as const, id: activeFolder.id, name: activeFolder.name, icon: Folder };
        if (activeList) return { type: "list" as const, id: activeList.id, name: activeList.name, icon: ListIcon };
        if (isProjectTab && activeProject) return { type: "project" as const, id: activeProject.id, name: activeProject.name, icon: FolderKanban };
        if (isTeamTab && activeTeam) return { type: "team" as const, id: activeTeam.id, name: activeTeam.name, icon: Users };
        if (isDocsTab) return { type: "docs" as const, id: "docs", name: "Space Docs", icon: FileText };
        if (isChannelsTab) return { type: "channels" as const, id: activeChannel?.id || selectedChannelId || "channels", name: activeChannel?.name ? `#${activeChannel.name}` : "Channels", icon: Hash };
        if (isAiChatTab) return { type: "ai-chat" as const, id: activeAiChat?.id || selectedAiChatId || "ai-chat", name: activeAiChat?.title || "AI Chat", icon: Sparkles };
        if (isPersonalTab) return { type: "personal" as const, id: "personal", name: "Personal", icon: User };
        if (currentTab === "lists") return { type: "lists-overview" as const, id: "lists", name: "Lists", icon: ListIcon };
        return null;
    }, [isProjectTab, activeProject, isTeamTab, activeTeam, activeList, activeFolder, isDocsTab, isChannelsTab, isAiChatTab, isPersonalTab, activeChannel, activeAiChat, selectedChannelId, selectedAiChatId, currentTab]);

    useEffect(() => {
        if (currentSubItem?.name) {
            setSubEditName(currentSubItem.name);
        }
    }, [currentSubItem?.name]);

    // Mutations
    const updateSpaceMutation = trpc.space.update.useMutation({
        onSuccess: () => {
            utils.space.get.invalidate({ id: spaceId });
            utils.space.list.invalidate();
            toast.success("Space updated");
        },
        onError: (err) => toast.error(`Failed to update space: ${err.message}`),
    });

    const updateProjectMutation = trpc.project.update.useMutation({
        onSuccess: () => {
            utils.project.list.invalidate();
            if (activeProject?.id) utils.project.get.invalidate({ id: activeProject.id });
            toast.success("Project updated");
        },
        onError: (err) => toast.error(`Failed to update project: ${err.message}`),
    });

    const updateTeamMutation = trpc.team.update.useMutation({
        onSuccess: () => {
            utils.team.list.invalidate();
            if (activeTeam?.id) utils.team.get.invalidate({ id: activeTeam.id });
            toast.success("Team updated");
        },
        onError: (err) => toast.error(`Failed to update team: ${err.message}`),
    });

    const updateListMutation = trpc.list.update.useMutation({
        onSuccess: () => {
            utils.list.byContext.invalidate();
            toast.success("List updated");
        },
        onError: (err) => toast.error(`Failed to update list: ${err.message}`),
    });

    const updateFolderMutation = trpc.folder.update.useMutation({
        onSuccess: () => {
            utils.folder.byContext.invalidate();
            toast.success("Folder updated");
        },
        onError: (err) => toast.error(`Failed to update folder: ${err.message}`),
    });

    const handleSaveSpaceName = () => {
        const trimmed = spaceEditName.trim();
        if (!trimmed || trimmed === spaceName) return;
        updateSpaceMutation.mutate({ id: spaceId, name: trimmed });
    };

    const handleSaveSubName = () => {
        const trimmed = subEditName.trim();
        if (!trimmed || !currentSubItem || trimmed === currentSubItem.name) return;

        if (currentSubItem.type === "project" && activeProject) {
            updateProjectMutation.mutate({ id: activeProject.id, name: trimmed });
        } else if (currentSubItem.type === "team" && activeTeam) {
            updateTeamMutation.mutate({ id: activeTeam.id, name: trimmed });
        } else if (currentSubItem.type === "list" && activeList) {
            updateListMutation.mutate({ id: activeList.id, name: trimmed });
        } else if (currentSubItem.type === "folder" && activeFolder) {
            updateFolderMutation.mutate({ id: activeFolder.id, name: trimmed });
        }
    };

    const handleCopySpaceLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleCopySubLink = () => {
        if (!currentSubItem) return;
        let url = window.location.href;
        if (currentSubItem.type === "project" && activeProject) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&pj=${activeProject.id}`;
        } else if (currentSubItem.type === "team" && activeTeam) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&tm=${activeTeam.id}`;
        } else if (currentSubItem.type === "list" && activeList) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&list=${activeList.id}`;
        } else if (currentSubItem.type === "folder" && activeFolder) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&folder=${activeFolder.id}`;
        } else if (currentSubItem.type === "channels" && activeChannel) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&tab=channels&ch=${activeChannel.id}`;
        } else if (currentSubItem.type === "ai-chat" && activeAiChat) {
            url = `${window.location.origin}${window.location.pathname}?spaceId=${spaceId}&tab=ai-chat&aid=${activeAiChat.id}`;
        }
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleNavigate = (type: "project" | "team" | "folder" | "list" | "channels" | "ai-chat", id: string) => {
        setSubPopoverOpen(false);
        if (type === "project") {
            if (onSelectProject) onSelectProject(id);
            else router.push(`?spaceId=${spaceId}&pj=${id}`, { scroll: false });
        } else if (type === "team") {
            if (onSelectTeam) onSelectTeam(id);
            else router.push(`?spaceId=${spaceId}&tm=${id}`, { scroll: false });
        } else if (type === "folder") {
            if (onSelectFolder) onSelectFolder(id);
            else router.push(`?spaceId=${spaceId}&folder=${id}`, { scroll: false });
        } else if (type === "list") {
            if (onSelectList) onSelectList(id);
            else router.push(`?spaceId=${spaceId}&list=${id}`, { scroll: false });
        } else if (type === "channels") {
            if (onSelectChannel) onSelectChannel(id);
            else router.push(`?spaceId=${spaceId}&tab=channels&ch=${id}`, { scroll: false });
        } else if (type === "ai-chat") {
            if (onSelectAiChat) onSelectAiChat(id);
            else if (onSelectChannel) onSelectChannel(id);
            else router.push(`?spaceId=${spaceId}&tab=ai-chat&aid=${id}`, { scroll: false });
        }
    };

    const SubIcon = currentSubItem?.icon || FolderKanban;

    return (
        <div className="flex items-center gap-1 min-w-0">
            {/* Space Dropdown */}
            <Popover open={spacePopoverOpen} onOpenChange={setSpacePopoverOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-sm font-semibold max-w-[200px] truncate cursor-pointer group",
                            currentSubItem ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900" : "text-slate-900 hover:bg-slate-100",
                            spacePopoverOpen && "bg-slate-100"
                        )}
                    >
                        <span
                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                            style={{ backgroundColor: currentSpace?.icon ? (currentSpace.color || "#6366f1") : "transparent" }}
                        >
                            <SpaceIcon
                                icon={currentSpace?.icon}
                                className={cn(currentSpace?.icon ? "text-white" : "text-indigo-500")}
                                size={14}
                                fill
                            />
                        </span>
                        <span className="truncate">{spaceName || "Space"}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200" />
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-[300px] p-2 bg-white rounded-xl shadow-xl border border-slate-200/90 flex flex-col gap-2 z-50"
                >
                    {/* Top Editable Bar for Space */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <IconColorSelector
                            icon={currentSpace?.icon}
                            color={currentSpace?.color || "#6366f1"}
                            onIconChange={(icon) => updateSpaceMutation.mutate({ id: spaceId, icon })}
                            onColorChange={(color) => updateSpaceMutation.mutate({ id: spaceId, color })}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                style={{ backgroundColor: currentSpace?.icon ? (currentSpace.color || "#6366f1") : "transparent" }}
                            >
                                <SpaceIcon
                                    icon={currentSpace?.icon}
                                    className={cn(currentSpace?.icon ? "text-white" : "text-indigo-500")}
                                    size={16}
                                    fill
                                />
                            </Button>
                        </IconColorSelector>
                        <Input
                            value={spaceEditName}
                            onChange={(e) => setSpaceEditName(e.target.value)}
                            onBlur={handleSaveSpaceName}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            className="h-8 flex-1 text-sm font-normal border border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 px-2 py-1 rounded-sm"
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCopySpaceLink}
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

                        <SpaceActionsMenu
                            workspaceId={workspaceId}
                            spaceId={spaceId}
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

                    {/* Sibling Spaces List */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <span>Spaces</span>
                    </div>

                    <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-0.5">
                        {spaces.map((sp) => {
                            const isSelected = sp.id === spaceId;
                            return (
                                <button
                                    key={sp.id}
                                    type="button"
                                    onClick={() => {
                                        setSpacePopoverOpen(false);
                                        const params = new URLSearchParams(window.location.search);
                                        params.set("spaceId", sp.id);
                                        window.location.search = params.toString();
                                    }}
                                    className={cn(
                                        "group/space flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left cursor-pointer",
                                        "hover:bg-slate-50",
                                        isSelected && "bg-slate-100"
                                    )}
                                >
                                    <span
                                        className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5"
                                        style={{ backgroundColor: sp.icon ? (sp.color || "#6366f1") : "transparent" }}
                                    >
                                        <SpaceIcon
                                            icon={sp.icon}
                                            className={cn(sp.icon ? "text-white" : isSelected ? "text-indigo-500" : "text-indigo-500/80")}
                                            size={14}
                                            fill
                                        />
                                    </span>
                                    <span className={cn(
                                        "flex-1 truncate text-sm",
                                        isSelected ? "font-normal text-foreground" : "text-zinc-600 group-hover/space:text-foreground"
                                    )}>
                                        {sp.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Sub-item */}
            {currentSubItem && (
                <>
                    <span className="text-slate-300 font-light text-base select-none">/</span>

                    {["project", "team", "list", "folder", "channels", "ai-chat"].includes(currentSubItem.type) ? (
                        <Popover open={subPopoverOpen} onOpenChange={setSubPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group min-w-0 max-w-[260px]",
                                        subPopoverOpen && "bg-slate-100"
                                    )}
                                >
                                    {isProjectTab && activeProject ? (
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
                                    ) : isTeamTab && activeTeam ? (
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
                                    ) : activeFolder ? (
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                                            style={{ backgroundColor: activeFolder.icon ? (activeFolder.color || "#3b82f6") : "transparent" }}
                                        >
                                            <FolderIcon
                                                icon={activeFolder.icon}
                                                className={cn(activeFolder.icon ? "text-white" : "text-blue-500")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                    ) : activeList ? (
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
                                    ) : currentSubItem.type === "channels" ? (
                                        <span className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Hash className="h-3.5 w-3.5" />
                                        </span>
                                    ) : currentSubItem.type === "ai-chat" ? (
                                        <span className="h-5 w-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-3.5 w-3.5" />
                                        </span>
                                    ) : (
                                        <SubIcon className="h-4 w-4 text-slate-600 group-hover:text-slate-900 shrink-0" />
                                    )}
                                    <span className="truncate">{currentSubItem.name}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200" />
                                </button>
                            </PopoverTrigger>

                            <PopoverContent
                                align="start"
                                sideOffset={8}
                                className="w-[320px] p-2 bg-white rounded-xl shadow-xl border border-slate-200/90 flex flex-col gap-2 z-50"
                            >
                                {/* Top Editable Header */}
                                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                                    {isProjectTab && activeProject ? (
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
                                    ) : isTeamTab && activeTeam ? (
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
                                    ) : activeFolder ? (
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
                                                <FolderIcon
                                                    icon={activeFolder.icon}
                                                    className={cn(activeFolder.icon ? "text-white" : "text-blue-500")}
                                                    size={16}
                                                    fill
                                                />
                                            </Button>
                                        </IconColorSelector>
                                    ) : activeList ? (
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
                                    ) : currentSubItem.type === "channels" ? (
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Hash className="h-4 w-4" />
                                        </div>
                                    ) : currentSubItem.type === "ai-chat" ? (
                                        <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                            <SubIcon className="h-4 w-4" />
                                        </div>
                                    )}
                                    <Input
                                        value={subEditName}
                                        onChange={(e) => setSubEditName(e.target.value)}
                                        onBlur={handleSaveSubName}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                                        disabled={!["project", "team", "list", "folder"].includes(currentSubItem.type)}
                                        className="h-8 flex-1 text-sm font-normal border border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 px-2 py-1 rounded-sm disabled:bg-transparent disabled:opacity-100 disabled:cursor-default"
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleCopySubLink}
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

                                    {currentSubItem.type === "project" && activeProject && (
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
                                    {currentSubItem.type === "team" && activeTeam && (
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
                                    {currentSubItem.type === "list" && activeList && (
                                        <ListActionsMenu
                                            workspaceId={workspaceId}
                                            spaceId={spaceId}
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
                                    {currentSubItem.type === "folder" && activeFolder && (
                                        <FolderActionsMenu
                                            workspaceId={workspaceId}
                                            spaceId={spaceId}
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
                                </div>

                                {currentSubItem.type === "channels" ? (
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
                                                        onClick={() => handleNavigate("channels", ch.id)}
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
                                ) : currentSubItem.type === "ai-chat" ? (
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
                                    /* Full Nested Hierarchy Tree under current Space */
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {/* Projects under Space */}
                                        {projects.map((proj: any) => {
                                            const projFolders = folders.filter((f: any) => f.projectId === proj.id);
                                            const projLists = lists.filter((l: any) => l.projectId === proj.id && !l.folderId);
                                            const projHasChildren = projFolders.length > 0 || projLists.length > 0;
                                            const isProjExpanded = !collapsedNodes[`proj-${proj.id}`];
                                            const isProjSelected = proj.id === activeProject?.id && currentSubItem.type === "project";

                                            return (
                                                <div key={proj.id} className="space-y-0.5">
                                                    <div
                                                        className={cn(
                                                            "group/proj flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-purple-50",
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

                                                    {/* Project Children */}
                                                    {isProjExpanded && projHasChildren && (
                                                        <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                                                            {projFolders.map((pf: any) => {
                                                                const pfLists = lists.filter((l: any) => l.folderId === pf.id);
                                                                const pfHasChildren = pfLists.length > 0;
                                                                const isPfExpanded = !collapsedNodes[`folder-${pf.id}`];
                                                                const isPfSelected = pf.id === activeFolder?.id && currentSubItem.type === "folder";

                                                                return (
                                                                    <div key={pf.id} className="space-y-0.5">
                                                                        <div
                                                                            className={cn(
                                                                                "group/folder flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
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
                                                                                            pfl.id === activeList?.id && currentSubItem.type === "list" && "bg-slate-100 font-semibold"
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
                                                                        pl.id === activeList?.id && currentSubItem.type === "list" && "bg-slate-100 font-semibold"
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

                                        {/* Direct Folders under Space */}
                                        {folders.filter((f: any) => !f.projectId).map((sf: any) => {
                                            const sfLists = lists.filter((l: any) => l.folderId === sf.id);
                                            const sfHasChildren = sfLists.length > 0;
                                            const isSfExpanded = !collapsedNodes[`folder-${sf.id}`];
                                            const isSfSelected = sf.id === activeFolder?.id && currentSubItem.type === "folder";

                                            return (
                                                <div key={sf.id} className="space-y-0.5">
                                                    <div
                                                        className={cn(
                                                            "group/folder flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
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
                                                                        sfl.id === activeList?.id && currentSubItem.type === "list" && "bg-slate-100 font-semibold"
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

                                        {/* Direct Lists under Space */}
                                        {lists.filter((l: any) => !l.projectId && !l.folderId).map((sl: any) => (
                                            <div
                                                key={sl.id}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer text-left text-xs hover:bg-slate-50",
                                                    sl.id === activeList?.id && currentSubItem.type === "list" && "bg-slate-100 font-semibold"
                                                )}
                                                onClick={() => handleNavigate("list", sl.id)}
                                            >
                                                <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <ListIcon className="h-3.5 w-3.5 text-emerald-600" />
                                                </div>
                                                <span className="flex-1 truncate text-zinc-600">
                                                    {sl.name}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Direct Teams under Space */}
                                        {teams.map((tm: any) => {
                                            const isSelected = tm.id === activeTeam?.id && currentSubItem.type === "team";
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
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-slate-900 min-w-0 max-w-[260px]">
                            {currentSubItem.type === "docs" ? (
                                <span className="h-5 w-5 rounded-sm bg-blue-500 text-white flex items-center justify-center shrink-0">
                                    <FileText className="h-3.5 w-3.5" />
                                </span>
                            ) : currentSubItem.type === "lists-overview" ? (
                                <span className="h-5 w-5 rounded-sm bg-indigo-500 text-white flex items-center justify-center shrink-0">
                                    <ListIcon className="h-3.5 w-3.5" />
                                </span>
                            ) : (
                                <span className="h-5 w-5 rounded-sm bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                    <SubIcon className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <span className="truncate">{currentSubItem.name}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
