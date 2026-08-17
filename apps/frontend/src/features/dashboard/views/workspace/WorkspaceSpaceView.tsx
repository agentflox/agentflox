"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
    Plus,
    Search,
    ChevronsLeft,
    ChevronsRight,
    X,
    LayoutDashboard,
    LayoutGrid,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import DashboardSpaceView from "@/features/dashboard/views/generic/DashboardSpaceView";
import { SpaceCreationModal } from "@/entities/spaces/components/SpaceCreationModal";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";
import { SharedManageSpacesView } from "@/features/dashboard/views/shared/SharedManageSpacesView";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkspaceSpaceViewProps {
    workspaceId: string;
    selectedSpaceId?: string;
    onSpaceSelect?: (spaceId: string) => void;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

export default function WorkspaceSpaceView({
    workspaceId,
    selectedSpaceId,
    onSpaceSelect,
    selectedTaskIdFromParent,
    onTaskSelect,
}: WorkspaceSpaceViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Modal / view states
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [isManageView, setIsManageView] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // URL-derived active items
    const activeSpaceId = !isManageView ? (searchParams.get("sp") || selectedSpaceId || null) : null;

    // Fetch spaces for this workspace
    const { data: spacesData, isLoading: isLoadingSpaces, refetch: refetchSpaces } = trpc.space.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const spacesRaw = spacesData?.items ?? [];

    // Filter spaces by search
    const spaces = useMemo(() => {
        if (!debouncedQuery) return spacesRaw;
        return spacesRaw.filter((s: any) => s.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [spacesRaw, debouncedQuery]);

    // --- Handlers ---
    const handleSpaceClick = useCallback((spaceId: string) => {
        setIsManageView(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("sp", spaceId);
        router.push(`?${params.toString()}`, { scroll: false });
        if (onSpaceSelect) onSpaceSelect(spaceId);
    }, [searchParams, router, onSpaceSelect]);

    // Auto-select first space when no selection exists
    useEffect(() => {
        if (!activeSpaceId && !isManageView && spacesRaw.length > 0) {
            handleSpaceClick(spacesRaw[0].id);
        }
    }, [spacesRaw, activeSpaceId, isManageView]);

    // Render main content
    const renderMainContent = () => {
        if (isManageView) {
            return <SharedManageSpacesView workspaceId={workspaceId} />;
        }
        if (activeSpaceId) {
            return (
                <div className="flex-1 overflow-hidden bg-zinc-50 h-full">
                    <DashboardSpaceView
                        spaceId={activeSpaceId}
                        workspaceId={workspaceId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                </div>
            );
        }
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center text-center max-w-sm p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-4">
                        <LayoutDashboard className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                    </div>

                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                        Design your Workspace
                    </h2>

                    <p className="text-sm text-slate-500 leading-relaxed mb-5">
                        Spaces are dedicated environments for teams or initiatives. Select one or create a new one.
                    </p>

                    <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                        onClick={() => setIsSpaceModalOpen(true)}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Create a Space
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-0 bg-background transition-all relative">
            {/* Spaces Sidebar */}
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
                                        placeholder="Search spaces..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/70"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 rounded-full hover:bg-slate-100"
                                        onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-4 py-3">
                                    <h2 className={cn(
                                        "text-sm font-semibold",
                                        isManageView ? "text-indigo-600" : "text-foreground"
                                    )}>
                                        {isManageView ? "Manage Spaces" : "Spaces"}
                                    </h2>
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    title="More options"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => setIsSpaceModalOpen(true)}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create Space
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setIsManageView(true)}>
                                                    <LayoutGrid className="mr-2 h-4 w-4" />
                                                    Manage Spaces
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <TooltipProvider>
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
                                                <TooltipContent>Search</TooltipContent>
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
                                                <TooltipContent>Collapse Sidebar</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setIsSpaceModalOpen(true)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Create Space</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Spaces List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {isLoadingSpaces ? (
                                <LoadingContainer label="Loading spaces..." spinnerSize="md" padding="md" />
                            ) : spaces.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <LayoutDashboard className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No spaces found</p>
                                    {searchQuery ? (
                                        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search</p>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <p className="mt-1 text-xs text-muted-foreground mb-4">Create your first space to get started</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                                                onClick={() => setIsSpaceModalOpen(true)}
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Create Space
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {spaces.map((space: any) => {
                                        const isSpaceActive = !isManageView && activeSpaceId === space.id;

                                        return (
                                            <div key={space.id} className="relative select-none">
                                                <div
                                                    className={cn(
                                                        "group/space flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 cursor-pointer",
                                                        isSpaceActive && "bg-slate-100"
                                                    )}
                                                    onClick={() => handleSpaceClick(space.id)}
                                                >
                                                    <LayoutDashboard className="h-4 w-4 text-indigo-500/80 shrink-0 ml-1" />
                                                    <span className="flex-1 truncate">{space.name}</span>

                                                    <div
                                                        className="opacity-0 group-hover/space:opacity-100 transition-opacity flex items-center gap-0.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <SpaceActionsMenu
                                                            workspaceId={workspaceId}
                                                            spaceId={space.id}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
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
                    {renderMainContent()}
                </div>
            </div>

            {/* Modals */}
            <SpaceCreationModal
                open={isSpaceModalOpen}
                onOpenChange={setIsSpaceModalOpen}
                workspaceId={workspaceId}
                onSuccess={(spaceId) => {
                    refetchSpaces();
                    if (onSpaceSelect) onSpaceSelect(spaceId);
                }}
            />
        </div>
    );
}
