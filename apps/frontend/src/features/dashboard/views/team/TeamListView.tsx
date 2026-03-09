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

    // Fetch lists for this team
    const { data: listsData, isLoading: isLoadingList, refetch: refetchList } = trpc.list.byContext.useQuery(
        { teamId, workspaceId: workspaceId || undefined },
        { enabled: !!teamId }
    );

    // Fetch folders for this team
    const { data: foldersData, isLoading: isLoadingFolders } = trpc.folder.byContext.useQuery(
        { teamId, workspaceId: workspaceId || undefined },
        { enabled: !!teamId }
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

    const activeFolderId = searchParams.get("folder");
    const activeListId = searchParams.get("list");
    const activeViewId = searchParams.get("lv") || undefined;
    const activeFolderViewId = searchParams.get("fv") || undefined;

    const isLoading = isLoadingList || isLoadingFolders;

    const handleCreateClick = (options: { folderId?: string }) => {
        setTargetFolderId(options.folderId);
        setIsCreateOptionsModalOpen(true);
    };

    const handleCreateTask = (listId: string) => {
        setTargetListId(listId);
        setIsTaskModalOpen(true);
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
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => setIsListModalOpen(true)}>
                                                    <ListIcon className="mr-2 h-4 w-4" />
                                                    Create List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setIsFolderModalOpen(true)}>
                                                    <Folder className="mr-2 h-4 w-4" />
                                                    Create Folder
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
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                                </div>
                            ) : groupedStructure.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                        <ListIcon className="h-5 w-5 text-slate-300" />
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">No lists created yet.</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => setIsListModalOpen(true)}
                                        className="mt-1 h-auto py-0 text-primary/80"
                                    >
                                        Create one now
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {groupedStructure.map(item => {
                                        if (item.type === 'folder') {
                                            const isExpanded = expandedFolders[item.id];
                                            const isActive = activeFolderId === item.id;

                                            return (
                                                <div key={item.id} className="space-y-0.5">
                                                    <div
                                                        className={cn(
                                                            "group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-all duration-200 select-none cursor-pointer",
                                                            isActive ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
                                                        )}
                                                        onClick={() => handleFolderClick(item.id)}
                                                    >
                                                        <div
                                                            className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-slate-200/50 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedFolders(prev => ({
                                                                    ...prev,
                                                                    [item.id]: !prev[item.id]
                                                                }));
                                                            }}
                                                        >
                                                            <ChevronRight className={cn(
                                                                "h-3.5 w-3.5 transition-transform duration-200",
                                                                isExpanded && "rotate-90"
                                                            )} />
                                                        </div>
                                                        <Folder className={cn(
                                                            "h-4 w-4 shrink-0 transition-colors",
                                                            isActive ? "text-primary/70" : "text-slate-400 group-hover:text-slate-500"
                                                        )} />
                                                        <span className="flex-1 truncate text-sm font-medium leading-none">
                                                            {item.name}
                                                        </span>

                                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <FolderActionsMenu
                                                                folder={item.data}
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 rounded-sm text-slate-400 hover:text-foreground"
                                                                    >
                                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                }
                                                                onCreateList={() => handleOpenCreateListInFolder(item.id)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="ml-3 pl-3 border-l border-slate-100 py-0.5 space-y-0.5 animate-in slide-in-from-left-2 duration-200">
                                                            {item.items && item.items.length > 0 ? (
                                                                item.items.map(list => (
                                                                    <div
                                                                        key={list.id}
                                                                        className={cn(
                                                                            "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-200 cursor-pointer",
                                                                            activeListId === list.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-foreground"
                                                                        )}
                                                                        onClick={() => handleListClick(list.id)}
                                                                    >
                                                                        <ListIcon className={cn(
                                                                            "h-3.5 w-3.5 shrink-0 transition-colors",
                                                                            activeListId === list.id ? "text-primary/70" : "text-slate-400 group-hover:text-slate-500"
                                                                        )} />
                                                                        <span className="flex-1 truncate text-xs font-medium leading-none">
                                                                            {list.name}
                                                                        </span>

                                                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <ListActionsMenu
                                                                                list={list}
                                                                                trigger={
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-5 w-5 rounded-sm text-slate-400 hover:text-foreground"
                                                                                    >
                                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                                    </Button>
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div
                                                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-400 hover:bg-slate-50 cursor-pointer group"
                                                                    onClick={() => handleOpenCreateListInFolder(item.id)}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                    <span className="text-[11px] italic font-medium">Create list...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            const isActive = activeListId === item.id;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-200 select-none cursor-pointer",
                                                        isActive ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
                                                    )}
                                                    onClick={() => handleListClick(item.id)}
                                                >
                                                    <ListIcon className={cn(
                                                        "h-4 w-4 shrink-0 transition-colors",
                                                        isActive ? "text-primary/70" : "text-slate-400 group-hover:text-slate-500"
                                                    )} />
                                                    <span className="flex-1 truncate text-sm font-medium leading-none">
                                                        {item.name}
                                                    </span>

                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ListActionsMenu
                                                            list={item.data}
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

            {/* Sidebar Toggle (when collapsed) */}
            {isSidebarCollapsed && (
                <div className="bg-white border-r border-slate-200 flex flex-col pt-3 px-2 h-full z-10 animate-in fade-in slide-in-from-left-4 duration-300">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                        onClick={() => setIsSidebarCollapsed(false)}
                        title="Expand Sidebar"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                    <div className="mt-4 flex flex-col gap-2 items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground bg-slate-50"
                            onClick={() => setIsListModalOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/30">
                {activeListId ? (
                    <ListDashboardView
                        listId={activeListId}
                        viewId={activeViewId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                ) : activeFolderId ? (
                    <FolderDashboardView
                        folderId={activeFolderId}
                        viewId={activeFolderViewId}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 select-none">
                        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="mx-auto w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <ListIcon className="h-10 w-10 text-primary/60 group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight text-slate-800">Team Lists</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Manage your team's tasks and organization. Create folders and lists to keep everything structured and clearly defined.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <Button
                                    onClick={() => setIsListModalOpen(true)}
                                    className="w-full sm:w-auto px-6 h-10 gap-2 shadow-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    New List
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsFolderModalOpen(true)}
                                    className="w-full sm:w-auto px-6 h-10 gap-2 bg-white"
                                >
                                    <Folder className="h-4 w-4" />
                                    New Folder
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            <ListCreationModal
                context="TEAM"
                contextId={teamId}
                workspaceId={workspaceId}
                open={isListModalOpen}
                onOpenChange={setIsListModalOpen}
                onListCreated={(list) => {
                    refetchList();
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("list", list.id);
                    params.delete("folder");
                    router.push(`?${params.toString()}`);
                }}
            />

            <FolderCreationModal
                context="TEAM"
                contextId={teamId}
                workspaceId={workspaceId}
                open={isFolderModalOpen}
                onOpenChange={setIsFolderModalOpen}
                onFolderCreated={(folder) => {
                    refetchList();
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("folder", folder.id);
                    params.delete("list");
                    router.push(`?${params.toString()}`);
                }}
            />

            <CreateOptionsModal
                open={isCreateOptionsModalOpen}
                onOpenChange={setIsCreateOptionsModalOpen}
                onSelectList={() => {
                    setIsCreateOptionsModalOpen(false);
                    setIsListModalOpen(true);
                }}
                onSelectFolder={() => {
                    setIsCreateOptionsModalOpen(false);
                    setIsFolderModalOpen(true);
                }}
            />

            {targetListId && (
                <TaskCreationModal
                    open={isTaskModalOpen}
                    onOpenChange={setIsTaskModalOpen}
                    listId={targetListId}
                    workspaceId={workspaceId || ''}
                    onTaskCreated={() => {
                        // Task created
                    }}
                />
            )}
        </div>
    );
}
