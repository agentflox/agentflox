"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildCleanDashboardParams, parseDashboardState, buildDashboardPath } from "@/features/dashboard/utils/dashboardUrl";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Play, List as ListIcon, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X, Folder, CheckSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import DashboardListView from "@/features/dashboard/views/generic/DashboardListView";
import DashboardFolderView from "@/features/dashboard/views/generic/DashboardFolderView";
import { DocView } from "@/features/dashboard/views/generic/DocView";
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { FolderCreationModal } from "@/entities/folders/components/FolderCreationModal";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { DocumentCreationModal } from "@/entities/documents/components/DocumentCreationModal";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { CreateOptionsModal } from "@/features/dashboard/components/modals/CreateOptionsModal";
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
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeamListViewProps {
    teamId: string;
    workspaceId?: string;
    selectedListId?: string;
    onListSelect: (listId: string) => void;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

export default function TeamListView({ teamId, workspaceId, selectedListId, onListSelect, selectedTaskIdFromParent, onTaskSelect }: TeamListViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Modal States
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isCreateOptionsModalOpen, setIsCreateOptionsModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [targetListId, setTargetListId] = useState<string | undefined>(undefined);
    const [docTargetListId, setDocTargetListId] = useState<string | undefined>(undefined);
    const [docTargetFolderId, setDocTargetFolderId] = useState<string | undefined>(undefined);

    // Folder State
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
    const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);
    const parsedState = useMemo(() => parseDashboardState(searchParams), [searchParams]);

    const basePath = teamId ? `/dashboard/teams/${teamId}` : (workspaceId ? `/dashboard/workspaces/${workspaceId}` : null);

    const handleFolderClick = (folderId: string) => {
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "fd", id: folderId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "lists",
                entityKey: "folder",
                entityId: folderId,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    // Sync expanded state with URL
    useEffect(() => {
        const folderId = parsedState.folderId;
        if (folderId) {
            setExpandedFolders(prev => {
                if (prev[folderId]) return prev;
                return { ...prev, [folderId]: true };
            });
        }
    }, [parsedState.folderId]);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch lists for this team (direct team-only)
    const { data: listsData, isLoading: isLoadingList, refetch: refetchList } = trpc.list.byContext.useQuery(
        { teamId, workspaceId, directOnly: true, includeViewDetails: false },
        { enabled: !!teamId }
    );

    // Fetch folders for this team (direct team-only)
    const { data: foldersData, isLoading: isLoadingFolders } = trpc.folder.byContext.useQuery(
        { teamId, workspaceId, directOnly: true, includeViewDetails: false },
        { enabled: !!teamId }
    );

    const listsRaw = listsData?.items ?? [];
    const folders = foldersData?.items ?? [];

    // Fetch all DOC views for this team (direct team-only)
    const { data: docViewsData, refetch: refetchDocViews } = trpc.view.list.useQuery(
        { teamId, directOnly: true, type: "DOC", sidebarView: true },
        { enabled: !!teamId }
    );
    const allDocViews = (docViewsData ?? []).filter(v => v.sidebarView === true);

    // Client-side filter
    const lists = useMemo(() => {
        if (!debouncedQuery) return listsRaw;
        // Filter lists only (for now, maybe filter folders later)
        return listsRaw.filter(l => l.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [listsRaw, debouncedQuery]);

    // Auto-select first list when page loads
    useEffect(() => {
        const hasListParam = parsedState.listId;
        const hasFolderParam = parsedState.folderId;

        // Only auto-select if neither list nor folder is selected and we have lists
        if (!hasListParam && !hasFolderParam && lists.length > 0) {
            if (basePath) {
                history.replaceState(null, "", buildDashboardPath({ basePath, type: "lt", id: lists[0].id }));
            } else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "lists",
                    entityKey: "list",
                    entityId: lists[0].id,
                });
                history.replaceState(null, "", `?${clean.toString()}`);
            }
        }
    }, [parsedState, lists, basePath]);

    // Group items by folder
    const groupedStructure = useMemo(() => {
        const structure: { id: string; name: string; type: "folder" | "list"; items?: any[]; data?: any }[] = [];

        // Map of folderId -> lists
        const folderMap: Record<string, any[]> = {};

        lists.forEach(l => {
            if (l.folderId) {
                if (!folderMap[l.folderId]) folderMap[l.folderId] = [];
                folderMap[l.folderId].push(l);
            }
        });

        // Add folders to structure
        folders.forEach(f => {
            structure.push({
                id: f.id,
                name: f.name,
                type: "folder",
                data: f,
                items: folderMap[f.id] || []
            });
        });

        // Find orphan lists (lists not in any folder in our current folder set)
        // Note: lists might refer to deleted folders or folders not fetched? Assuming consistency.
        // We also want lists with no folderId.
        const uncategorizedListMap = lists.filter(l => !l.folderId);

        // Add uncategorized lists
        uncategorizedListMap.forEach(l => {
            structure.push({
                id: l.id,
                name: l.name,
                type: "list",
                data: l
            });
        });

        return structure;
    }, [folders, lists]);

    const activeListId = selectedListId || parsedState.listId;
    const activeFolderId = parsedState.folderId;
    const activeDocViewId = parsedState.docViewId || null;

    const handleListCreated = (list: any) => {
        refetchList();
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "lt", id: list.id }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "lists",
                entityKey: "list",
                entityId: list.id,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    const handleListClick = (listId: string) => {
        if (onListSelect) {
            onListSelect(listId);
        } else if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "lt", id: listId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "lists",
                entityKey: "list",
                entityId: listId,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    // Auto-select first list if nothing is selected
    useEffect(() => {
        if (!activeListId && !activeFolderId && !activeDocViewId && listsRaw.length > 0) {
            handleListClick(listsRaw[0].id);
        }
    }, [listsRaw, activeListId, activeFolderId, activeDocViewId]);

    const handleDocViewClick = (docViewId: string) => {
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "dv", id: docViewId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "lists",
                entityKey: "docView",
                entityId: docViewId,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    const handleDocCreated = (id: string) => {
        refetchDocViews();
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "dv", id }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "lists",
                entityKey: "docView",
                entityId: id,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    const handleOpenCreateListInFolder = (folderId: string) => {
        setTargetFolderId(folderId);
        setIsListModalOpen(true);
    };

    // List View
    return (
        <div className="flex h-full gap-0 bg-background transition-all">
            {/* Lists Sidebar */}
            <aside className={cn(
                "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
                isSidebarCollapsed ? "w-0 border-l border-slate-200" : "w-[256px] border-x border-slate-200"
            )}>
                <div className="flex h-full flex-col overflow-hidden">
                    {/* Header */}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col justify-center border-b border-slate-200 h-[57px] shrink-0">
                            {isSearchOpen ? (
                                <div className="flex items-center gap-2 px-3 h-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Input
                                        autoFocus
                                        placeholder="Search lists..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/70"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 rounded-full hover:bg-slate-100"
                                        onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery("");
                                        }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-4 h-full">
                                    <h2 className="text-sm font-semibold text-foreground">Lists</h2>
                                    <div className="flex items-center gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsSearchOpen(true)}
                                                >
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Search</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsSidebarCollapsed(true)}
                                                >
                                                    <ChevronsLeft className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Collapse Sidebar</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <DropdownMenu>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Create Folders, Lists and more</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => setIsListModalOpen(true)}>
                                                    <ListIcon className="mr-2 h-4 w-4" />
                                                    Create List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setIsFolderModalOpen(true)}>
                                                    <Folder className="mr-2 h-4 w-4" />
                                                    Create Folder
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => {
                                                    setDocTargetListId(undefined);
                                                    setDocTargetFolderId(activeFolderId || undefined);
                                                    setIsDocModalOpen(true);
                                                }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Create Doc
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar">
                            {(isLoadingList || isLoadingFolders) ? (
                                <LoadingContainer
                                    label="Loading..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : groupedStructure.length === 0 ? (
                                searchQuery ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <ListIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                        <p className="text-sm font-medium text-foreground">No lists or folders found</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Try adjusting your search
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex h-full items-center justify-center py-12">
                                        <div className="flex flex-col items-center text-center max-w-sm p-6">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-4">
                                                <ListIcon className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                                            </div>

                                            <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                                Organize your Lists
                                            </h2>

                                            <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                                Lists help you organize tasks and workflows. Select one or create a new one.
                                            </p>

                                            <Button
                                                size="sm"
                                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                                                onClick={() => {
                                                    setTargetFolderId(activeFolderId || undefined);
                                                    setIsListModalOpen(true);
                                                }}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                Create a List
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-1">
                                    {groupedStructure.map(item => {
                                        if (item.type === 'folder') {
                                            const hasFolderItems = Boolean(item.items && item.items.length > 0);
                                            const isExpanded = hasFolderItems && Boolean(expandedFolders[item.id]);
                                            return (
                                                <div key={item.id} className="relative select-none">
                                                    <div
                                                        className={cn(
                                                            "group/folder flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50",
                                                            "cursor-pointer",
                                                            activeFolderId === item.id && "bg-slate-100"
                                                        )}
                                                        onClick={(e) => {
                                                            handleFolderClick(item.id);
                                                        }}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "relative h-5 w-5 rounded shrink-0 flex items-center justify-center",
                                                                hasFolderItems ? "cursor-pointer" : ""
                                                            )}
                                                            onClick={(e) => {
                                                                if (hasFolderItems) {
                                                                    e.stopPropagation();
                                                                    setExpandedFolders(prev => ({
                                                                        ...prev,
                                                                        [item.id]: !prev[item.id]
                                                                    }));
                                                                }
                                                            }}
                                                        >
                                                            {/* Normal: Folder Icon */}
                                                            <span
                                                                className={cn(
                                                                    "h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center",
                                                                    hasFolderItems && "group-hover/folder:hidden"
                                                                )}
                                                                style={{ backgroundColor: item.data?.icon ? (item.data?.color || "#3b82f6") : "transparent" }}
                                                            >
                                                                <FolderIcon
                                                                    icon={item.data?.icon}
                                                                    className={cn(item.data?.icon ? "text-white" : activeFolderId === item.id ? "text-blue-500" : "text-blue-500/80")}
                                                                    size={14}
                                                                    fill
                                                                />
                                                            </span>

                                                            {/* Hover: Expand / Collapse Triangle button */}
                                                            {hasFolderItems && (
                                                                <div className="hidden group-hover/folder:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "flex-1 truncate text-sm",
                                                            activeFolderId === item.id ? "font-normal text-foreground" : "text-zinc-600 group-hover/folder:text-foreground"
                                                        )}>
                                                            {item.name}
                                                        </span>

                                                        <div className="opacity-0 group-hover/folder:opacity-100 transition-opacity flex items-center" onClick={(e) => e.stopPropagation()}>
                                                            <FolderActionsMenu
                                                                workspaceId={workspaceId || ""}
                                                                spaceId={(item.data as any)?.spaceId ?? ""}
                                                                teamId={teamId}
                                                                folderId={item.id}
                                                                folderName={item.name}
                                                                folderIcon={(item.data as any)?.icon}
                                                                folderColor={(item.data as any)?.color}
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 rounded-sm text-slate-400 hover:text-foreground"
                                                                    >
                                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                            <DropdownMenu>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <button
                                                                                className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                                                            >
                                                                                <Plus className="h-4 w-4" />
                                                                            </button>
                                                                        </DropdownMenuTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Create Folders, Lists and more</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuItem onClick={() => handleOpenCreateListInFolder(item.id)}>
                                                                        <ListIcon className="mr-2 h-4 w-4" />
                                                                        List
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setTargetFolderId(item.id);
                                                                        setIsFolderModalOpen(true);
                                                                    }}>
                                                                        <Folder className="mr-2 h-4 w-4" />
                                                                        Folder
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setDocTargetListId(undefined);
                                                                        setDocTargetFolderId(item.id);
                                                                        setIsDocModalOpen(true);
                                                                    }}>
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        Doc
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>

                                                    {isExpanded && hasFolderItems && (
                                                        <div className="ml-[1.125rem] pl-2 border-l border-slate-200 mt-1 space-y-1">
                                                            {item.items?.map((list: any) => {
                                                                const isActive = activeListId === list.id && !activeDocViewId;
                                                                const listDocViews = allDocViews.filter(v => v.listId === list.id);
                                                                const isDocExpanded = expandedDocs[list.id];
                                                                return (
                                                                    <div key={list.id}>
                                                                        <div
                                                                            className={cn(
                                                                                "group/item flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors",
                                                                                "hover:bg-slate-50",
                                                                                isActive && "bg-slate-100"
                                                                            )}
                                                                        >
                                                                            <div
                                                                                className={cn(
                                                                                    "relative h-5 w-5 rounded shrink-0 flex items-center justify-center",
                                                                                    listDocViews.length > 0 && "cursor-pointer"
                                                                                )}
                                                                                onClick={(e) => {
                                                                                    if (listDocViews.length > 0) {
                                                                                        e.stopPropagation();
                                                                                        setExpandedDocs(prev => ({ ...prev, [list.id]: !prev[list.id] }));
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {/* Normal: List Icon */}
                                                                                <span
                                                                                    className={cn(
                                                                                        "h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center",
                                                                                        listDocViews.length > 0 && "group-hover/item:hidden"
                                                                                    )}
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

                                                                                {/* Hover: Expand / Collapse Triangle button */}
                                                                                {listDocViews.length > 0 && (
                                                                                    <div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                                        <Play className={cn("h-2 w-2 fill-zinc-700 text-zinc-700 transition-transform duration-200", isDocExpanded && "rotate-90")} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => handleListClick(list.id)}
                                                                                className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none cursor-pointer"
                                                                            >
                                                                                <span className={cn("truncate text-sm", isActive ? "font-normal text-foreground" : "text-zinc-600 group-hover/item:text-foreground")}>
                                                                                    {list.name}
                                                                                </span>
                                                                            </button>
                                                                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1">
                                                                                <ListActionsMenu
                                                                                    workspaceId={workspaceId || ""}
                                                                                    teamId={teamId}
                                                                                    listId={list.id}
                                                                                    trigger={
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-5 w-5 rounded-sm text-slate-400 hover:text-foreground"
                                                                                        >
                                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    }
                                                                                />
                                                                                <DropdownMenu>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <DropdownMenuTrigger asChild>
                                                                                                <button
                                                                                                    className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                                                                                >
                                                                                                    <Plus className="h-4 w-4" />
                                                                                                </button>
                                                                                            </DropdownMenuTrigger>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p>Create Tasks, Lists, Docs and more</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                    <DropdownMenuContent align="end" className="w-48">
                                                                                        <DropdownMenuItem onClick={() => {
                                                                                            setTargetListId(list.id);
                                                                                            setIsTaskModalOpen(true);
                                                                                        }}>
                                                                                            <CheckSquare className="mr-2 h-4 w-4" />
                                                                                            Task
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem onClick={() => handleOpenCreateListInFolder(item.id)}>
                                                                                            <ListIcon className="mr-2 h-4 w-4" />
                                                                                            List
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuSeparator />
                                                                                        <DropdownMenuItem onClick={() => {
                                                                                            setDocTargetListId(list.id);
                                                                                            setDocTargetFolderId(undefined);
                                                                                            setIsDocModalOpen(true);
                                                                                        }}>
                                                                                            <FileText className="mr-2 h-4 w-4" />
                                                                                            Doc
                                                                                        </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>
                                                                        </div>
                                                                        {isDocExpanded && listDocViews.length > 0 && (
                                                                            <div className="ml-4 pl-2 border-l border-slate-200 mt-0.5 space-y-0.5">
                                                                                {listDocViews.map((docView) => {
                                                                                    const isDocActive = activeDocViewId === docView.id;
                                                                                    return (
                                                                                        <button
                                                                                            key={docView.id}
                                                                                            onClick={() => handleDocViewClick(docView.id)}
                                                                                            className={cn(
                                                                                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                                                                                "hover:bg-slate-50",
                                                                                                isDocActive ? "bg-slate-100 font-normal text-foreground" : "text-muted-foreground"
                                                                                            )}
                                                                                        >
                                                                                            <FileText className={cn("h-3 w-3 shrink-0", isDocActive ? "text-indigo-500" : "text-muted-foreground")} />
                                                                                            <span className="truncate">{docView.name}</span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            // Render List Item (Top Level)
                                            const list = item.data;
                                            const isActive = activeListId === list.id && !activeDocViewId;
                                            const listDocViews = allDocViews.filter(v => v.listId === list.id);
                                            const isDocExpanded = expandedDocs[list.id];
                                            return (
                                                <div key={list.id}>
                                                    <div
                                                        className={cn(
                                                            "group/item flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                                                            "hover:bg-slate-50",
                                                            isActive && "bg-slate-100"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "relative h-5 w-5 rounded shrink-0 flex items-center justify-center ml-0.5",
                                                                listDocViews.length > 0 && "cursor-pointer"
                                                            )}
                                                            onClick={(e) => {
                                                                if (listDocViews.length > 0) {
                                                                    e.stopPropagation();
                                                                    setExpandedDocs(prev => ({ ...prev, [list.id]: !prev[list.id] }));
                                                                }
                                                            }}
                                                        >
                                                            {/* Normal: List Icon */}
                                                            <span
                                                                className={cn(
                                                                    "h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center",
                                                                    listDocViews.length > 0 && "group-hover/item:hidden"
                                                                )}
                                                                style={{ backgroundColor: list.icon ? (list.color || "#6366f1") : "transparent" }}
                                                            >
                                                                <ListEntityIcon
                                                                    icon={list.icon}
                                                                    className={cn(list.icon ? "text-white" : isActive ? "text-foreground" : "text-muted-foreground")}
                                                                    size={14}
                                                                    fill
                                                                />
                                                            </span>

                                                            {/* Hover: Expand / Collapse Triangle button */}
                                                            {listDocViews.length > 0 && (
                                                                <div className="hidden group-hover/item:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isDocExpanded && "rotate-90")} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleListClick(list.id)}
                                                            className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none cursor-pointer"
                                                        >
                                                            <span className={cn("truncate text-sm", isActive ? "font-normal text-foreground" : "text-zinc-600 group-hover/item:text-foreground")}>
                                                                {list.name}
                                                            </span>
                                                        </button>
                                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1">
                                                            <ListActionsMenu
                                                                workspaceId={workspaceId || ""}
                                                                teamId={teamId}
                                                                listId={list.id}
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 rounded-sm text-slate-400 hover:text-foreground"
                                                                    >
                                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                            <DropdownMenu>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <button
                                                                                className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                                                            >
                                                                                <Plus className="h-4 w-4" />
                                                                            </button>
                                                                        </DropdownMenuTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Create Tasks, Lists, Docs and more</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setTargetListId(list.id);
                                                                        setIsTaskModalOpen(true);
                                                                    }}>
                                                                        <CheckSquare className="mr-2 h-4 w-4" />
                                                                        Task
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setTargetFolderId(undefined);
                                                                        setIsListModalOpen(true);
                                                                    }}>
                                                                        <ListIcon className="mr-2 h-4 w-4" />
                                                                        List
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setDocTargetListId(list.id);
                                                                        setDocTargetFolderId(undefined);
                                                                        setIsDocModalOpen(true);
                                                                    }}>
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        Doc
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                    {isDocExpanded && listDocViews.length > 0 && (
                                                        <div className="ml-4 pl-2 border-l border-slate-200 mt-0.5 space-y-0.5">
                                                            {listDocViews.map((docView) => {
                                                                const isDocActive = activeDocViewId === docView.id;
                                                                return (
                                                                    <button
                                                                        key={docView.id}
                                                                        onClick={() => handleDocViewClick(docView.id)}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                                                            "hover:bg-slate-50",
                                                                            isDocActive ? "bg-slate-100 font-normal text-foreground" : "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        <FileText className={cn("h-3 w-3 shrink-0", isDocActive ? "text-indigo-500" : "text-muted-foreground")} />
                                                                        <span className="truncate">{docView.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {isSidebarCollapsed && (
                    <div className="absolute left-0 top-2 z-40">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
                                    onClick={() => setIsSidebarCollapsed(false)}
                                >
                                    <ChevronsRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>Expand Sidebar</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                    {
                        activeDocViewId ? (
                            <div className="flex-1 overflow-hidden h-full">
                                <DocView
                                    viewId={activeDocViewId}
                                    teamId={teamId}
                                    workspaceId={workspaceId}
                                    listId={docTargetListId}
                                    folderId={docTargetFolderId}
                                />
                            </div>
                        ) : activeListId ? (
                            <div className={cn("flex-1 overflow-hidden bg-zinc-50 h-full", isSidebarCollapsed && "[&_[role=tablist]]:pl-6")}>
                                <DashboardListView
                                    listId={activeListId}
                                    teamId={teamId}
                                    workspaceId={workspaceId}
                                    selectedTaskIdFromParent={selectedTaskIdFromParent}
                                    onTaskSelect={onTaskSelect}
                                />
                            </div>
                        ) : activeFolderId ? (
                            <div className={cn("flex-1 overflow-hidden bg-zinc-50 h-full", isSidebarCollapsed && "[&_[role=tablist]]:pl-6")}>
                                <DashboardFolderView
                                    folderId={activeFolderId}
                                    teamId={teamId}
                                    workspaceId={workspaceId}
                                    selectedTaskIdFromParent={selectedTaskIdFromParent}
                                    onTaskSelect={onTaskSelect}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center py-12">
                                <div className="flex flex-col items-center text-center max-w-sm p-6">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-4">
                                        <ListIcon className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                                    </div>

                                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                        Organize your Lists
                                    </h2>

                                    <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                        Lists help you organize tasks and workflows. Select one or create a new one.
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <Button
                                            size="sm"
                                            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto"
                                            onClick={() => {
                                                setTargetFolderId(activeFolderId || undefined);
                                                setIsListModalOpen(true);
                                            }}
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            Create a List
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg border-[#2D2D2D] text-[#2D2D2D] hover:bg-[#f5f5f5] hover:border-[#1a1a1a] w-full sm:w-auto"
                                            onClick={() => {
                                                setTargetFolderId(activeFolderId || undefined);
                                                setIsFolderModalOpen(true);
                                            }}
                                        >
                                            <Folder className="mr-1.5 h-4 w-4" />
                                            Create a Folder
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Modals */}
            <ListCreationModal
                context="TEAM"
                contextId={teamId}
                folderId={targetFolderId}
                workspaceId={workspaceId}
                open={isListModalOpen}
                onOpenChange={(open) => {
                    setIsListModalOpen(open);
                    if (!open) setTargetFolderId(undefined);
                }}
                onListCreated={handleListCreated}
                trigger={<span className="hidden" />}
            />

            <FolderCreationModal
                context="TEAM"
                contextId={teamId}
                workspaceId={workspaceId}
                parentFolderId={targetFolderId}
                open={isFolderModalOpen}
                onOpenChange={(open) => {
                    setIsFolderModalOpen(open);
                    if (!open) setTargetFolderId(undefined);
                }}
                onFolderCreated={(folder) => {
                    console.log("Folder created:", folder);
                }}
                trigger={<span className="hidden" />}
            />

            <CreateOptionsModal
                open={isCreateOptionsModalOpen}
                onOpenChange={setIsCreateOptionsModalOpen}
                workspaceId={workspaceId || ""}
                teamId={teamId}
                selectedListId={selectedListId}
                selectedFolderId={activeFolderId || undefined}
                onListCreated={handleListCreated}
            />

            <TaskCreationModal
                context="TEAM"
                contextId={teamId}
                workspaceId={workspaceId}
                open={isTaskModalOpen}
                onOpenChange={(open) => {
                    setIsTaskModalOpen(open);
                    if (!open) setTargetListId(undefined);
                }}
                defaultListId={targetListId}
                availableStatuses={listsRaw.find(l => l.id === targetListId)?.statuses}
                trigger={<span className="hidden" />}
            />

            <DocumentCreationModal
                open={isDocModalOpen}
                onOpenChange={(open) => {
                    setIsDocModalOpen(open);
                    if (!open) { setDocTargetListId(undefined); setDocTargetFolderId(undefined); }
                }}
                workspaceId={workspaceId}
                teamId={teamId}
                listId={docTargetListId}
                folderId={docTargetFolderId}
                sidebarView={true}
                onSuccess={handleDocCreated}
            />
        </div>
    );
}
