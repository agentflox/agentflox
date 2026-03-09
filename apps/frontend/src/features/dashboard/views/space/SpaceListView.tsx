"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, ChevronRight, List as ListIcon, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X, Folder, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import ListDashboardView from "@/features/dashboard/views/generic/ListDashboardView";
import FolderDashboardView from "@/features/dashboard/views/generic/FolderDashboardView";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { FolderCreationModal } from "@/entities/task/components/FolderCreationModal";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { ListActionsMenu } from "@/features/dashboard/components/sidebar/ListActionsMenu";
import { FolderActionsMenu } from "@/features/dashboard/components/sidebar/FolderActionsMenu";
import { CreateOptionsModal } from "@/features/dashboard/components/modals/CreateOptionsModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SpaceListViewProps {
    spaceId: string;
    workspaceId: string;
    selectedListId?: string;
    onListSelect: (listId: string) => void;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

export default function SpaceListView({ spaceId, workspaceId, selectedListId, onListSelect, selectedTaskIdFromParent, onTaskSelect }: SpaceListViewProps) {
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
    const [targetListId, setTargetListId] = useState<string | undefined>(undefined);

    // Folder State
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);

    const handleFolderClick = (folderId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("folder", folderId);
        params.delete("list");
        params.delete("lv");
        params.delete("fv");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Sync expanded state with URL
    useEffect(() => {
        const folderId = searchParams.get("folder");
        if (folderId) {
            setExpandedFolders(prev => {
                if (prev[folderId]) return prev;
                return { ...prev, [folderId]: true };
            });
        }
    }, [searchParams]);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch lists for this space
    const { data: listsData, isLoading: isLoadingList, refetch: refetchList } = trpc.list.byContext.useQuery(
        { spaceId, workspaceId },
        { enabled: !!(spaceId && workspaceId) }
    );

    // Fetch folders for this space
    const { data: foldersData, isLoading: isLoadingFolders } = trpc.folder.byContext.useQuery(
        { spaceId, workspaceId },
        { enabled: !!(spaceId && workspaceId) }
    );

    const listsRaw = listsData?.items ?? [];
    const folders = foldersData?.items ?? [];

    // Client-side filter
    const lists = useMemo(() => {
        if (!debouncedQuery) return listsRaw;
        // Filter lists only (for now, maybe filter folders later)
        return listsRaw.filter(l => l.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [listsRaw, debouncedQuery]);

    // Auto-select first list when page loads
    useEffect(() => {
        const hasListParam = searchParams.get("list");
        const hasFolderParam = searchParams.get("folder");

        // Only auto-select if neither list nor folder is selected and we have lists
        if (!hasListParam && !hasFolderParam && lists.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("list", lists[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [searchParams, lists, router]);

    // Group items by folder
    const groupedStructure = useMemo(() => {
        const structure: { id: string, name: string, type: 'folder' | 'list', items?: any[], data?: any }[] = [];

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
                type: 'folder',
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
                type: 'list',
                data: l
            });
        });

        return structure;
    }, [folders, lists]);

    const activeListId = selectedListId;
    const activeFolderId = searchParams.get("folder");

    // Fetch details if a list is selected
    const selectedList = listsRaw.find(l => l.id === selectedListId);

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("list");
        params.delete("lv");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleListCreated = (list: any) => {
        refetchList();
        const params = new URLSearchParams(searchParams.toString());
        params.set("list", list.id);
        params.delete("lv");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleListClick = (listId: string) => {
        if (onListSelect) {
            onListSelect(listId);
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
                isSidebarCollapsed ? "w-0 border-none" : "w-[256px] border-r border-slate-200"
            )}>
                <div className="flex h-full flex-col overflow-hidden">
                    {/* Header */}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col border-b border-slate-200">
                            {isSearchOpen ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                <div className="flex items-center justify-between px-4 py-3">
                                    <h2 className="text-sm font-semibold text-foreground">Lists</h2>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setIsSearchOpen(true)}
                                            title="Search"
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setIsSidebarCollapsed(true)}
                                            title="Collapse Sidebar"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    title="Create"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => {
                                                    setTargetFolderId(activeFolderId || undefined);
                                                    setIsListModalOpen(true);
                                                }}>
                                                    <ListIcon className="mr-2 h-4 w-4" />
                                                    List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setTargetFolderId(activeFolderId || undefined);
                                                    setIsFolderModalOpen(true);
                                                }}>
                                                    <Folder className="mr-2 h-4 w-4" />
                                                    Folder
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lists List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {(isLoadingList || isLoadingFolders) ? (
                                <LoadingContainer
                                    label="Loading..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : groupedStructure.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <ListIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No lists or folders found</p>
                                    {searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Try adjusting your search
                                        </p>
                                    )}
                                    {!searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Create your first list or folder to get started
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {groupedStructure.map((item) => {
                                        if (item.type === 'folder') {
                                            const isExpanded = expandedFolders[item.id];
                                            return (
                                                <div key={item.id} className="relative select-none">
                                                    <div
                                                        className={cn(
                                                            "group/folder flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50",
                                                            "cursor-pointer",
                                                            activeFolderId === item.id && "bg-slate-100"
                                                        )}
                                                        onClick={(e) => {
                                                            handleFolderClick(item.id);
                                                        }}
                                                    >
                                                        <div
                                                            className={cn("p-0.5 rounded-sm hover:bg-slate-200 transition-colors mr-1")}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedFolders(prev => ({
                                                                    ...prev,
                                                                    [item.id]: !prev[item.id]
                                                                }));
                                                            }}
                                                        >
                                                            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")} />
                                                        </div>

                                                        <Folder className="h-4 w-4 text-blue-500/80 shrink-0" />
                                                        <span className="flex-1 truncate">{item.name}</span>

                                                        <div className="opacity-0 group-hover/folder:opacity-100 transition-opacity flex items-center" onClick={(e) => e.stopPropagation()}>
                                                            <FolderActionsMenu
                                                                workspaceId={workspaceId}
                                                                spaceId={spaceId}
                                                                folderId={item.id}
                                                                folderName={item.name}
                                                                folderIcon={item.data.icon}
                                                                folderColor={item.data.color}
                                                            />
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-slate-200 text-muted-foreground hover:text-foreground"
                                                                        title="Create"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
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
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>


                                                    </div>

                                                    {isExpanded && (
                                                        <div className="ml-[1.125rem] pl-2 border-l border-slate-200 mt-1 space-y-1">
                                                            {item.items && item.items.length > 0 ? (
                                                                item.items.map((list: any) => {
                                                                    const isActive = activeListId === list.id;
                                                                    return (
                                                                        <div
                                                                            key={list.id}
                                                                            className={cn(
                                                                                "group/item flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors",
                                                                                "hover:bg-slate-50",
                                                                                isActive && "bg-slate-100"
                                                                            )}
                                                                        >
                                                                            <button
                                                                                onClick={() => handleListClick(list.id)}
                                                                                className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
                                                                            >
                                                                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: list.color || '#cbd5e1' }} />
                                                                                <span className={cn("truncate text-sm", isActive ? "font-medium text-foreground" : "text-muted-foreground group-hover/item:text-foreground")}>
                                                                                    {list.name}
                                                                                </span>
                                                                            </button>
                                                                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1">
                                                                                <ListActionsMenu
                                                                                    workspaceId={workspaceId}
                                                                                    spaceId={spaceId}
                                                                                    listId={list.id}
                                                                                />
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <button
                                                                                            className="h-5 w-5 inline-flex items-center justify-center rounded-sm hover:bg-slate-200 text-muted-foreground hover:text-foreground"
                                                                                            title="Create"
                                                                                        >
                                                                                            <Plus className="h-3 w-3" />
                                                                                        </button>
                                                                                    </DropdownMenuTrigger>
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
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenCreateListInFolder(item.id)}
                                                                    className="flex w-full items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-blue-600 hover:bg-slate-50 rounded-md transition-all group/add"
                                                                >
                                                                    <Plus className="h-3 w-3 group-hover/add:scale-110 transition-transform" />
                                                                    <span>Add item</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            // Render List Item (Top Level)
                                            const list = item.data;
                                            const isActive = activeListId === list.id;
                                            return (
                                                <div
                                                    key={list.id}
                                                    className={cn(
                                                        "group/item flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                                                        "hover:bg-slate-50",
                                                        isActive && "bg-slate-100"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => handleListClick(list.id)}
                                                        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
                                                    >
                                                        <ListIcon
                                                            className="h-4 w-4 shrink-0 text-muted-foreground"
                                                            style={{ color: list.color || undefined }}
                                                        />
                                                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                                                            <p className={cn("truncate text-sm font-medium", isActive ? "text-foreground" : "text-zinc-600")}>
                                                                {list.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1">
                                                        <ListActionsMenu
                                                            workspaceId={workspaceId}
                                                            spaceId={spaceId}
                                                            listId={list.id}
                                                        />
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className="h-5 w-5 inline-flex items-center justify-center rounded-sm hover:bg-slate-200 text-muted-foreground hover:text-foreground"
                                                                    title="Create"
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </button>
                                                            </DropdownMenuTrigger>
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
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
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
                    <div className="absolute left-0 top-3 z-30">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
                            onClick={() => setIsSidebarCollapsed(false)}
                            title="Expand Sidebar"
                        >
                            <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                    {
                        activeListId ? (
                            <div className="flex-1 overflow-hidden bg-zinc-50 h-full">
                                <ListDashboardView
                                    listId={activeListId}
                                    spaceId={spaceId}
                                    workspaceId={workspaceId}
                                    selectedTaskIdFromParent={selectedTaskIdFromParent}
                                    onTaskSelect={onTaskSelect}
                                />
                            </div>
                        ) : activeFolderId ? (
                            <div className="flex-1 overflow-hidden bg-zinc-50 h-full">
                                <FolderDashboardView
                                    folderId={activeFolderId}
                                    spaceId={spaceId}
                                    workspaceId={workspaceId}
                                    selectedTaskIdFromParent={selectedTaskIdFromParent}
                                    onTaskSelect={onTaskSelect}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <ListIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                                    <p className="text-lg font-medium text-foreground">Select a list or folder</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Choose a list or folder from the sidebar to view its details
                                    </p>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Modals */}
            <ListCreationModal
                context="SPACE"
                contextId={spaceId}
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
                context="SPACE"
                contextId={spaceId}
                workspaceId={workspaceId}
                parentFolderId={targetFolderId}
                open={isFolderModalOpen}
                onOpenChange={(open) => {
                    setIsFolderModalOpen(open);
                    if (!open) setTargetFolderId(undefined);
                }}
                onFolderCreated={(folder) => {
                    // Handle folder creation if needed
                    console.log("Folder created:", folder);
                }}
                trigger={<span className="hidden" />}
            />

            <CreateOptionsModal
                open={isCreateOptionsModalOpen}
                onOpenChange={setIsCreateOptionsModalOpen}
                spaceId={spaceId}
                workspaceId={workspaceId}
                selectedListId={selectedListId}
                selectedFolderId={activeFolderId || undefined}
                onListCreated={handleListCreated}
            />

            <TaskCreationModal
                context="SPACE"
                contextId={spaceId}
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
        </div>
    );
}
