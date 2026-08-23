"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Play,
    Plus,
    Folder as FolderIcon,
    List as ListIcon,
    FileText,
    Users,
    Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import { DocumentActionsMenu } from "@/features/dashboard/components/sidebar/DocumentActionsMenu";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { FolderIcon as FolderEntityIcon } from "@/entities/folders/components/FolderIcon";
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { FolderCreationModal } from "@/entities/folders/components/FolderCreationModal";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { DocumentCreationModal } from "@/entities/documents/components/DocumentCreationModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildCleanDashboardParams } from "@/features/dashboard/utils/dashboardUrl";

interface SpaceSidebarItemProps {
    workspaceId: string;
    space: {
        id: string;
        name: string;
        icon?: string | null;
        color?: string | null;
    };
    isActive: boolean;
    onSelectSpace: (id: string) => void;
    onSelectProject?: (id: string) => void;
    onSelectList?: (id: string) => void;
    onSelectFolder?: (id: string) => void;
    onSelectDoc?: (id: string) => void;
    onSelectTeam?: (id: string) => void;
}

export function SpaceSidebarItem({
    workspaceId,
    space,
    isActive,
    onSelectSpace,
    onSelectProject,
    onSelectList,
    onSelectFolder,
    onSelectDoc,
    onSelectTeam,
}: SpaceSidebarItemProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});

    // Modals state
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);
    const [targetDocFolderId, setTargetDocFolderId] = useState<string | undefined>(undefined);
    const [targetDocListId, setTargetDocListId] = useState<string | undefined>(undefined);

    // Fetch child folders under this space (direct-only)
    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { spaceId: space.id, workspaceId, directOnly: true, includeViewDetails: false },
        { enabled: true }
    );

    // Fetch child lists under this space (direct-only)
    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId: space.id, workspaceId, directOnly: true, includeViewDetails: false },
        { enabled: true }
    );

    // Fetch child docs under this space (direct-only)
    const { data: docViewsData } = trpc.view.list.useQuery(
        { spaceId: space.id, directOnly: true, type: "DOC", sidebarView: true },
        { enabled: true }
    );

    // Fetch child projects under this space
    const { data: projectsData } = trpc.project.list.useQuery(
        { spaceId: space.id, workspaceId, pageSize: 50 },
        { enabled: true }
    );

    // Fetch child teams under this space
    const { data: teamsData } = trpc.team.list.useQuery(
        { spaceId: space.id, workspaceId, pageSize: 50 },
        { enabled: true }
    );

    const folders = foldersData?.items ?? [];
    const lists = listsData?.items ?? [];
    const docs = (docViewsData ?? []).filter(v => v.sidebarView === true);
    const projects = projectsData?.items ?? [];
    const teams = teamsData?.items ?? [];

    const handleItemClick = (type: "project" | "list" | "folder" | "doc" | "team", id: string) => {
        if (type === "project") {
            if (onSelectProject) onSelectProject(id);
            else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "projects",
                    entityKey: "pj",
                    entityId: id,
                    keepTask: true,
                });
                router.push(`?${clean.toString()}`, { scroll: false });
            }
        } else if (type === "list") {
            if (onSelectList) onSelectList(id);
            else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "lists",
                    entityKey: "list",
                    entityId: id,
                    keepTask: true,
                });
                router.push(`?${clean.toString()}`, { scroll: false });
            }
        } else if (type === "folder") {
            if (onSelectFolder) onSelectFolder(id);
            else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "lists",
                    entityKey: "folder",
                    entityId: id,
                    keepTask: true,
                });
                router.push(`?${clean.toString()}`, { scroll: false });
            }
        } else if (type === "doc") {
            if (onSelectDoc) onSelectDoc(id);
            else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "docs",
                    entityKey: "dc",
                    entityId: id,
                    keepTask: true,
                });
                router.push(`?${clean.toString()}`, { scroll: false });
            }
        } else if (type === "team") {
            if (onSelectTeam) onSelectTeam(id);
            else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "teams",
                    entityKey: "tm",
                    entityId: id,
                    keepTask: true,
                });
                router.push(`?${clean.toString()}`, { scroll: false });
            }
        }
    };

    const hasChildren = folders.length > 0 || lists.length > 0 || docs.length > 0 || projects.length > 0 || teams.length > 0;

    return (
        <div className="relative select-none">
            {/* Space Row */}
            <div
                className={cn(
                    "group/space flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer",
                    "hover:bg-slate-50",
                    isActive && "bg-slate-100"
                )}
                onClick={() => onSelectSpace(space.id)}
            >
                {/* Icon Container with hover Play toggle button */}
                <div
                    className={cn(
                        "relative h-5 w-5 rounded shrink-0 flex items-center justify-center",
                        hasChildren && "cursor-pointer"
                    )}
                    onClick={(e) => {
                        if (hasChildren) {
                            e.stopPropagation();
                            setIsExpanded(prev => !prev);
                        }
                    }}
                >
                    {/* Normal: Space Icon */}
                    <span
                        className={cn(
                            "h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5",
                            hasChildren && "group-hover/space:hidden"
                        )}
                        style={{ backgroundColor: space.icon ? (space.color || "#6366f1") : "transparent" }}
                    >
                        <SpaceIcon
                            icon={space.icon}
                            className={cn(space.icon ? "text-white" : isActive ? "text-indigo-500" : "text-indigo-500/80")}
                            size={14}
                            fill
                        />
                    </span>

                    {/* Hover: Expand / Collapse Triangle button */}
                    {hasChildren && (
                        <div className="hidden group-hover/space:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                            <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                        </div>
                    )}
                </div>

                <span className={cn(
                    "flex-1 truncate text-sm",
                    isActive ? "font-normal text-foreground" : "text-zinc-600 group-hover/space:text-foreground"
                )}>
                    {space.name}
                </span>

                {/* Hover Actions: More Menu & Plus Button */}
                <div
                    className="opacity-0 group-hover/space:opacity-100 transition-opacity flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    <SpaceActionsMenu
                        workspaceId={workspaceId}
                        spaceId={space.id}
                    />

                    <DropdownMenu>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Create Projects, Lists, Folders, Docs and more</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setIsProjectModalOpen(true)}>
                                <Briefcase className="mr-2 h-4 w-4" />
                                Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setTargetFolderId(undefined);
                                setIsListModalOpen(true);
                            }}>
                                <ListIcon className="mr-2 h-4 w-4" />
                                List
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setTargetFolderId(undefined);
                                setIsFolderModalOpen(true);
                            }}>
                                <FolderIcon className="mr-2 h-4 w-4" />
                                Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                                setTargetDocFolderId(undefined);
                                setTargetDocListId(undefined);
                                setIsDocModalOpen(true);
                            }}>
                                <FileText className="mr-2 h-4 w-4" />
                                Doc
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Sub-Tree when expanded */}
            {isExpanded && hasChildren && (
                <div className="ml-[1.125rem] pl-2 border-l border-slate-200 mt-1 space-y-1">
                    {/* Direct Projects */}
                    {projects.map((project: any) => (
                        <div key={project.id} className="relative select-none">
                            <div
                                className="group/project flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-purple-50 text-sm cursor-pointer"
                                onClick={() => handleItemClick("project", project.id)}
                            >
                                <div className="h-5 w-5 rounded shrink-0 flex items-center justify-center">
                                    <Briefcase className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                </div>
                                <span className="flex-1 truncate text-xs text-slate-700 group-hover/project:text-purple-800">
                                    {project.name}
                                </span>
                                <span className="text-[10px] text-purple-600 font-medium px-1.5 py-0.5 bg-purple-100/80 rounded">
                                    Project
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Direct Folders */}
                    {folders.map((folder: any) => {
                        const isFolderExpanded = expandedFolders[folder.id];
                        return (
                            <div key={folder.id} className="relative select-none">
                                <div
                                    className="group/folder flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer hover:bg-slate-50 text-sm"
                                    onClick={() => handleItemClick("folder", folder.id)}
                                >
                                    <div
                                        className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }));
                                        }}
                                    >
                                        <span
                                            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center group-hover/folder:hidden"
                                            style={{ backgroundColor: folder.icon ? (folder.color || "#3b82f6") : "transparent" }}
                                        >
                                            <FolderEntityIcon
                                                icon={folder.icon}
                                                className={cn(folder.icon ? "text-white" : "text-blue-500/80")}
                                                size={14}
                                                fill
                                            />
                                        </span>
                                        <div className="hidden group-hover/folder:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                            <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isFolderExpanded && "rotate-90")} />
                                        </div>
                                    </div>
                                    <span className="flex-1 truncate text-xs text-zinc-600 group-hover/folder:text-foreground">
                                        {folder.name}
                                    </span>
                                    <div className="opacity-0 group-hover/folder:opacity-100 transition-opacity flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                        <FolderActionsMenu
                                            workspaceId={workspaceId}
                                            folderId={folder.id}
                                            folderName={folder.name}
                                            folderIcon={folder.icon}
                                            folderColor={folder.color}
                                        />
                                        <DropdownMenu>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer">
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Create in folder</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => {
                                                    setTargetFolderId(folder.id);
                                                    setIsListModalOpen(true);
                                                }}>
                                                    <ListIcon className="mr-2 h-4 w-4" />
                                                    List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setTargetDocFolderId(folder.id);
                                                    setTargetDocListId(undefined);
                                                    setIsDocModalOpen(true);
                                                }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Doc
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Direct Lists */}
                    {lists.map((list: any) => {
                        const isListExpanded = expandedLists[list.id];
                        return (
                            <div key={list.id} className="relative select-none">
                                <div
                                    className="group/item flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50 text-sm cursor-pointer"
                                    onClick={() => handleItemClick("list", list.id)}
                                >
                                    <div
                                        className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedLists(prev => ({ ...prev, [list.id]: !prev[list.id] }));
                                        }}
                                    >
                                        <span
                                            className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center group-hover/item:hidden"
                                            style={{ backgroundColor: list.color || "#6366f1" }}
                                        >
                                            {list.icon ? (
                                                <ListEntityIcon
                                                    icon={list.icon}
                                                    className="text-white"
                                                    size={12}
                                                    fill
                                                />
                                            ) : (
                                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: list.color || '#cbd5e1' }} />
                                            )}
                                        </span>
                                        <div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                            <Play className={cn("h-2 w-2 fill-zinc-700 text-zinc-700 transition-transform duration-200", isListExpanded && "rotate-90")} />
                                        </div>
                                    </div>
                                    <span className="flex-1 truncate text-xs text-zinc-600 group-hover/item:text-foreground">
                                        {list.name}
                                    </span>
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                        <ListActionsMenu
                                            workspaceId={workspaceId}
                                            listId={list.id}
                                        />
                                        <DropdownMenu>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer">
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Create in list</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => {
                                                    setTargetDocListId(list.id);
                                                    setTargetDocFolderId(undefined);
                                                    setIsDocModalOpen(true);
                                                }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Doc
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Direct Docs */}
                    {docs.map((doc: any) => (
                        <div key={doc.id} className="relative select-none">
                            <div
                                className="group/doc flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50 text-sm cursor-pointer"
                                onClick={() => handleItemClick("doc", doc.id)}
                            >
                                <div className="h-5 w-5 rounded shrink-0 flex items-center justify-center">
                                    <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                </div>
                                <span className="flex-1 truncate text-xs text-zinc-600 group-hover/doc:text-foreground">
                                    {doc.name}
                                </span>
                                <div className="opacity-0 group-hover/doc:opacity-100 transition-opacity flex items-center" onClick={e => e.stopPropagation()}>
                                    <DocumentActionsMenu
                                        documentId={doc.id}
                                        workspaceId={workspaceId}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Direct Teams */}
                    {teams.map((team: any) => (
                        <div key={team.id} className="relative select-none">
                            <div
                                className="group/team flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-emerald-50 text-sm cursor-pointer"
                                onClick={() => handleItemClick("team", team.id)}
                            >
                                <div className="h-5 w-5 rounded shrink-0 flex items-center justify-center">
                                    <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                </div>
                                <span className="flex-1 truncate text-xs text-slate-700 group-hover/team:text-emerald-800">
                                    {team.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-100/80 rounded">
                                    Team
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <ProjectCreationModal
                open={isProjectModalOpen}
                onOpenChange={setIsProjectModalOpen}
                defaultSpaceId={space.id}
                onCreated={() => {
                    utils.project.list.invalidate();
                }}
            />

            <ListCreationModal
                context="SPACE"
                contextId={space.id}
                workspaceId={workspaceId}
                folderId={targetFolderId}
                open={isListModalOpen}
                onOpenChange={setIsListModalOpen}
                onListCreated={() => {
                    utils.list.byContext.invalidate();
                }}
                trigger={<span className="hidden" />}
            />

            <FolderCreationModal
                context="SPACE"
                contextId={space.id}
                workspaceId={workspaceId}
                open={isFolderModalOpen}
                onOpenChange={setIsFolderModalOpen}
                onFolderCreated={() => {
                    utils.folder.byContext.invalidate();
                }}
                trigger={<span className="hidden" />}
            />

            <DocumentCreationModal
                open={isDocModalOpen}
                onOpenChange={setIsDocModalOpen}
                workspaceId={workspaceId}
                spaceId={space.id}
                listId={targetDocListId}
                folderId={targetDocFolderId}
                sidebarView={true}
                onSuccess={() => {
                    utils.view.list.invalidate();
                }}
            />
        </div>
    );
}
