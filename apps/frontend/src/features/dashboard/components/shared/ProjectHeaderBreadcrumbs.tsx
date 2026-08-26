"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import {
    FileText,
    User,
    ChevronDown,
    Link2,
    MoreHorizontal,
    Folder,
    List as ListIcon,
    Hash,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    breadcrumbItemClass,
    BreadcrumbTypeBadge,
    BREADCRUMB_BADGE,
    ExpandControl,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";

export interface ProjectHeaderBreadcrumbsProps {
    workspaceId: string;
    projectId: string;
    projectName: string;
    currentTab: string;
    selectedListId?: string;
    selectedFolderId?: string;
    selectedChatId?: string;
    selectedAiChatId?: string;
    onSelectList?: (listId: string) => void;
    onSelectFolder?: (folderId: string) => void;
    onSelectChat?: (chatId: string) => void;
    onSelectAiChat?: (aiChatId: string) => void;
    onNavigateProject?: () => void;
}

export function ProjectHeaderBreadcrumbs({
    workspaceId,
    projectId,
    projectName,
    currentTab,
    selectedListId,
    selectedFolderId,
    selectedChatId,
    selectedAiChatId,
    onSelectList,
    onSelectFolder,
    onSelectChat,
    onSelectAiChat,
    onNavigateProject,
}: ProjectHeaderBreadcrumbsProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
    const [subPopoverOpen, setSubPopoverOpen] = useState(false);
    const [projectEditName, setProjectEditName] = useState(projectName || "");
    const [subEditName, setSubEditName] = useState("");
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const isNodeExpanded = (nodeId: string) => !!expandedNodes[nodeId];

    const toggleNode = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    useEffect(() => {
        setProjectEditName(projectName || "");
    }, [projectName]);

    // Query current project details
    const { data: currentProject } = trpc.project.get.useQuery(
        { id: projectId },
        { enabled: !!projectId }
    );

    // Query projects in workspace for Project dropdown
    const { data: projectsData } = trpc.project.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId && projectPopoverOpen }
    );
    const projects = projectsData?.items ?? [];

    // Sub-queries
    const isListTab = currentTab === "lists" || !!selectedListId || !!selectedFolderId;
    const isDocsTab = currentTab === "docs";
    const isChannelsTab = currentTab === "channels" || currentTab === "chats";
    const isAiChatTab = currentTab === "ai-chat";
    const isPersonalTab = currentTab === "personal";

    const { data: listsData } = trpc.list.byContext.useQuery(
        { projectId, workspaceId, includeViewDetails: false },
        { enabled: !!projectId }
    );
    const lists = listsData?.items ?? [];

    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { projectId, workspaceId, includeViewDetails: false },
        { enabled: !!projectId }
    );
    const folders = foldersData?.items ?? [];

    const { data: channelsData } = trpc.channel.list.useQuery(
        { projectId },
        { enabled: !!projectId }
    );
    const channels = channelsData ?? [];

    const { data: aiChatsData } = trpc.chat.list.useQuery(
        { contextType: "project", entityId: projectId },
        { enabled: !!projectId }
    );
    const aiChats = aiChatsData ?? [];

    // Project-level docs query
    const { data: projectDocsData } = trpc.view.list.useQuery(
        { projectId, type: "DOC", sidebarView: true },
        { enabled: !!projectId }
    );
    const docs = ((projectDocsData as any[]) ?? []).filter((v: any) => v.sidebarView !== false);
    const projectDocs = docs.filter((d: any) => !d.folderId && !d.listId);

    const activeList = useMemo(() => {
        if (selectedListId) return lists.find((l: any) => l.id === selectedListId) || null;
        return null;
    }, [selectedListId, lists]);

    const activeFolder = useMemo(() => {
        if (selectedFolderId) return folders.find((f: any) => f.id === selectedFolderId) || null;
        return null;
    }, [selectedFolderId, folders]);

    const activeChannel = useMemo(() => {
        if (selectedChatId) return channels.find((c: any) => c.id === selectedChatId) || null;
        if (isChannelsTab && channels.length > 0) return channels[0] || null;
        return null;
    }, [selectedChatId, isChannelsTab, channels]);

    const activeAiChat = useMemo(() => {
        if (selectedAiChatId) return aiChats.find((c: any) => c.id === selectedAiChatId) || null;
        if (isAiChatTab && aiChats.length > 0) return aiChats[0] || null;
        return null;
    }, [selectedAiChatId, isAiChatTab, aiChats]);

    const currentSubItem = useMemo(() => {
        if (activeFolder) return { type: "folder" as const, id: activeFolder.id, name: activeFolder.name, icon: Folder };
        if (activeList) return { type: "list" as const, id: activeList.id, name: activeList.name, icon: ListIcon };
        if (isDocsTab) return { type: "docs" as const, id: "docs", name: "Project Docs", icon: FileText };
        if (isChannelsTab) return { type: "channels" as const, id: activeChannel?.id || selectedChatId || "channels", name: activeChannel?.name ? `#${activeChannel.name}` : "Channels", icon: Hash };
        if (isAiChatTab) return { type: "ai-chat" as const, id: activeAiChat?.id || selectedAiChatId || "ai-chat", name: activeAiChat?.title || "AI Chat", icon: Sparkles };
        if (isPersonalTab) return { type: "personal" as const, id: "personal", name: "Personal", icon: User };
        if (currentTab === "lists") return { type: "lists-overview" as const, id: "lists", name: "Lists", icon: ListIcon };
        return null;
    }, [activeList, activeFolder, isDocsTab, isChannelsTab, isAiChatTab, isPersonalTab, activeChannel, activeAiChat, selectedChatId, selectedAiChatId, currentTab]);

    useEffect(() => {
        if (currentSubItem?.name) {
            setSubEditName(currentSubItem.name);
        }
    }, [currentSubItem?.name]);

    useEffect(() => {
        if (!subPopoverOpen) return;
        const next: Record<string, boolean> = {};
        if (activeFolder) {
            next[`folder-${activeFolder.id}`] = true;
        }
        if (activeList) {
            if (activeList.folderId) next[`folder-${activeList.folderId}`] = true;
        }
        if (Object.keys(next).length > 0) {
            setExpandedNodes((prev) => ({ ...prev, ...next }));
        }
    }, [subPopoverOpen, activeFolder, activeList]);

    // Mutations
    const updateProjectMutation = trpc.project.update.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
            utils.project.list.invalidate();
            toast.success("Project updated");
        },
        onError: (err) => toast.error(`Failed to update project: ${err.message}`),
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

    const handleSaveProjectName = () => {
        const trimmed = projectEditName.trim();
        if (!trimmed || trimmed === projectName) return;
        updateProjectMutation.mutate({ id: projectId, name: trimmed });
    };

    const handleSaveSubName = () => {
        const trimmed = subEditName.trim();
        if (!trimmed || !currentSubItem || trimmed === currentSubItem.name) return;

        if (currentSubItem.type === "list" && activeList) {
            updateListMutation.mutate({ id: activeList.id, name: trimmed });
        } else if (currentSubItem.type === "folder" && activeFolder) {
            updateFolderMutation.mutate({ id: activeFolder.id, name: trimmed });
        }
    };

    const handleCopyProjectLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?projectId=${projectId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleCopySubLink = () => {
        if (!currentSubItem) return;
        let url = window.location.href;
        if (currentSubItem.type === "list" && activeList) {
            url = `${window.location.origin}${window.location.pathname}?projectId=${projectId}&list=${activeList.id}`;
        } else if (currentSubItem.type === "folder" && activeFolder) {
            url = `${window.location.origin}${window.location.pathname}?projectId=${projectId}&folder=${activeFolder.id}`;
        } else if (currentSubItem.type === "channels" && activeChannel) {
            url = `${window.location.origin}${window.location.pathname}?projectId=${projectId}&tab=channels&ch=${activeChannel.id}`;
        } else if (currentSubItem.type === "ai-chat" && activeAiChat) {
            url = `${window.location.origin}${window.location.pathname}?projectId=${projectId}&tab=ai-chat&aid=${activeAiChat.id}`;
        }
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleNavigate = (type: "folder" | "list" | "channels" | "ai-chat" | "doc", id: string) => {
        setSubPopoverOpen(false);
        if (type === "folder") {
            if (onSelectFolder) onSelectFolder(id);
            else router.push(`?projectId=${projectId}&folder=${id}`, { scroll: false });
        } else if (type === "list") {
            if (onSelectList) onSelectList(id);
            else router.push(`?projectId=${projectId}&list=${id}`, { scroll: false });
        } else if (type === "channels") {
            if (onSelectChat) onSelectChat(id);
            else router.push(`?projectId=${projectId}&tab=channels&ch=${id}`, { scroll: false });
        } else if (type === "ai-chat") {
            if (onSelectAiChat) onSelectAiChat(id);
            else if (onSelectChat) onSelectChat(id);
            else router.push(`?projectId=${projectId}&tab=ai-chat&aid=${id}`, { scroll: false });
        } else if (type === "doc") {
            router.push(`?projectId=${projectId}&tab=docs&dc=${id}`, { scroll: false });
        }
    };

    const renderDocRow = (doc: any, compact = false) => (
        <div
            key={doc.id}
            className={breadcrumbItemClass(false, compact)}
            onClick={() => handleNavigate("doc", doc.id)}
        >
            <div className="h-5 w-5 rounded bg-teal-50 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            </div>
            <span className="flex-1 truncate text-zinc-700">{doc.name}</span>
            <BreadcrumbTypeBadge label="Doc" className={BREADCRUMB_BADGE.doc} />
        </div>
    );

    const renderListRow = (lst: any, compact = false) => {
        const listDocs = docs.filter((d: any) => d.listId === lst.id);
        const listHasChildren = listDocs.length > 0;
        const listNodeId = `list-${lst.id}`;
        const isListExpanded = isNodeExpanded(listNodeId);
        const isListSelected = lst.id === activeList?.id && currentSubItem?.type === "list";

        return (
            <div key={lst.id} className="space-y-0.5">
                <div
                    className={breadcrumbItemClass(isListSelected, compact)}
                    onClick={() => handleNavigate("list", lst.id)}
                >
                    <ExpandControl
                        expanded={isListExpanded}
                        hasChildren={listHasChildren}
                        onToggle={(e) => toggleNode(e, listNodeId)}
                    >
                        <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                            <ListIcon className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                    </ExpandControl>
                    <span className="flex-1 truncate text-zinc-700">{lst.name}</span>
                    <BreadcrumbTypeBadge label="List" className={BREADCRUMB_BADGE.list} />
                </div>
                {isListExpanded && listHasChildren && (
                    <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                        {listDocs.map((d: any) => renderDocRow(d, true))}
                    </div>
                )}
            </div>
        );
    };

    const renderFolderNode = (fold: any, compact = false) => {
        const foldLists = lists.filter((l: any) => l.folderId === fold.id);
        const foldDocs = docs.filter((d: any) => d.folderId === fold.id && !d.listId);
        const foldHasChildren = foldLists.length > 0 || foldDocs.length > 0;
        const foldNodeId = `folder-${fold.id}`;
        const isFoldExpanded = isNodeExpanded(foldNodeId);
        const isFoldSelected = fold.id === activeFolder?.id && currentSubItem?.type === "folder";

        return (
            <div key={fold.id} className="space-y-0.5">
                <div
                    className={breadcrumbItemClass(isFoldSelected, compact)}
                    onClick={() => handleNavigate("folder", fold.id)}
                >
                    <ExpandControl
                        expanded={isFoldExpanded}
                        hasChildren={foldHasChildren}
                        onToggle={(e) => toggleNode(e, foldNodeId)}
                    >
                        <div className="h-5 w-5 rounded bg-blue-50 flex items-center justify-center shrink-0">
                            <Folder className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        </div>
                    </ExpandControl>
                    <span className="flex-1 truncate text-zinc-700">{fold.name}</span>
                    <BreadcrumbTypeBadge label="Folder" className={BREADCRUMB_BADGE.folder} />
                </div>
                {isFoldExpanded && foldHasChildren && (
                    <div className="ml-3 pl-2 border-l border-slate-200 space-y-0.5">
                        {foldLists.map((fl: any) => renderListRow(fl, true))}
                        {foldDocs.map((d: any) => renderDocRow(d, true))}
                    </div>
                )}
            </div>
        );
    };

    const SubIcon = currentSubItem?.icon || Folder;

    return (
        <div className="flex items-center gap-0.5 min-w-0">
            {/* Project Dropdown */}
            <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-sm font-semibold max-w-[200px] truncate cursor-pointer group",
                            currentSubItem ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900" : "text-slate-900 hover:bg-slate-100",
                            projectPopoverOpen && "bg-slate-100"
                        )}
                    >
                        <span
                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
                            style={{ backgroundColor: currentProject?.icon ? (currentProject.color || "#6366f1") : "transparent" }}
                        >
                            <ProjectIcon
                                icon={currentProject?.icon}
                                className={cn(currentProject?.icon ? "text-white" : "text-indigo-500")}
                                size={14}
                                fill
                            />
                        </span>
                        <span className="truncate">{projectName || "Project"}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200" />
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-[300px] p-2 bg-white rounded-xl shadow-xl border border-slate-200/90 flex flex-col gap-2 z-50"
                >
                    {/* Top Editable Bar for Project */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <IconColorSelector
                            icon={currentProject?.icon}
                            color={currentProject?.color || "#6366f1"}
                            onIconChange={(icon) => updateProjectMutation.mutate({ id: projectId, icon })}
                            onColorChange={(color) => updateProjectMutation.mutate({ id: projectId, color })}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg shrink-0 overflow-hidden grid place-items-center p-0 border border-slate-200 hover:border-slate-300"
                                style={{ backgroundColor: currentProject?.icon ? (currentProject.color || "#6366f1") : "transparent" }}
                            >
                                <ProjectIcon
                                    icon={currentProject?.icon}
                                    className={cn(currentProject?.icon ? "text-white" : "text-indigo-500")}
                                    size={16}
                                    fill
                                />
                            </Button>
                        </IconColorSelector>
                        <Input
                            value={projectEditName}
                            onChange={(e) => setProjectEditName(e.target.value)}
                            onBlur={handleSaveProjectName}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            className="h-8 flex-1 text-sm font-normal border border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 px-2 py-1 rounded-sm"
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCopyProjectLink}
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

                        <ProjectActionsMenu
                            workspaceId={workspaceId}
                            projectId={projectId}
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

                    {/* Sibling Projects List */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <span>Projects</span>
                    </div>

                    <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-0.5">
                        {projects.map((proj) => {
                            const isSelected = proj.id === projectId;
                            return (
                                <button
                                    key={proj.id}
                                    type="button"
                                    onClick={() => {
                                        setProjectPopoverOpen(false);
                                        const params = new URLSearchParams(window.location.search);
                                        params.set("projectId", proj.id);
                                        window.location.search = params.toString();
                                    }}
                                    className={cn(
                                        "group/project flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left cursor-pointer",
                                        "hover:bg-zinc-100",
                                        isSelected && "bg-zinc-100"
                                    )}
                                >
                                    <span
                                        className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5"
                                        style={{ backgroundColor: proj.icon ? (proj.color || "#6366f1") : "transparent" }}
                                    >
                                        <ProjectIcon
                                            icon={proj.icon}
                                            className={cn(proj.icon ? "text-white" : isSelected ? "text-indigo-500" : "text-indigo-500/80")}
                                            size={14}
                                            fill
                                        />
                                    </span>
                                    <span className={cn(
                                        "flex-1 truncate text-sm",
                                        isSelected ? "font-normal text-foreground" : "text-zinc-600 group-hover/project:text-foreground"
                                    )}>
                                        {proj.name}
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

                    {["list", "folder", "channels", "ai-chat", "docs"].includes(currentSubItem.type) ? (
                        <Popover open={subPopoverOpen} onOpenChange={setSubPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group min-w-0 max-w-[260px]",
                                        subPopoverOpen && "bg-slate-100"
                                    )}
                                >
                                    {activeFolder ? (
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
                                    ) : currentSubItem.type === "docs" ? (
                                        <span className="h-5 w-5 rounded-sm bg-blue-500 text-white flex items-center justify-center shrink-0">
                                            <FileText className="h-3.5 w-3.5" />
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
                                    {activeFolder ? (
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
                                    ) : currentSubItem.type === "docs" ? (
                                        <div className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4" />
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
                                        disabled={!["list", "folder"].includes(currentSubItem.type)}
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

                                    {currentSubItem.type === "list" && activeList && (
                                        <ListActionsMenu
                                            workspaceId={workspaceId}
                                            projectId={projectId}
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
                                            projectId={projectId}
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
                                                        className={breadcrumbItemClass(isSelected)}
                                                        onClick={() => handleNavigate("channels", ch.id)}
                                                    >
                                                        <div className="h-5 w-5 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-semibold text-emerald-600">#</span>
                                                        </div>
                                                        <span className="flex-1 truncate text-zinc-700">{ch.name}</span>
                                                        <BreadcrumbTypeBadge label="Channel" className={BREADCRUMB_BADGE.channel} />
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
                                                        className={breadcrumbItemClass(isSelected)}
                                                        onClick={() => handleNavigate("ai-chat", c.id)}
                                                    >
                                                        <div className="h-5 w-5 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                            <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                                        </div>
                                                        <span className="flex-1 truncate text-zinc-700">{c.title || "Untitled Conversation"}</span>
                                                        <BreadcrumbTypeBadge label="AI Chat" className={BREADCRUMB_BADGE.ai} />
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : currentSubItem.type === "docs" ? (
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {docs.length === 0 ? (
                                            <div className="text-xs text-muted-foreground px-2 py-3 text-center">No documents in this project</div>
                                        ) : (
                                            docs.map((doc: any) => renderDocRow(doc))
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-0.5 select-none">
                                        {folders.map((folder: any) => renderFolderNode(folder))}
                                        {lists.filter((l: any) => !l.folderId).map((list: any) => renderListRow(list))}
                                        {projectDocs.map((d: any) => renderDocRow(d))}
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-slate-900 min-w-0 max-w-[260px]">
                            {currentSubItem.type === "lists-overview" ? (
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
