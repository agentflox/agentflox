"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Plus, Users, Search, ChevronsLeft, ChevronsRight, X, LayoutGrid, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { TeamImportModal } from "@/entities/teams/components/TeamImportModal";
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { TeamCreateMenu } from "@/features/dashboard/components/sidebar/TeamCreateMenu";
import DashboardTeamView from "@/features/dashboard/views/generic/DashboardTeamView";
import { SharedManageTeamsView } from "@/features/dashboard/views/shared/SharedManageTeamsView";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkspaceTeamViewProps {
    workspaceId: string;
    selectedTeamId?: string;
    onTeamSelect: (teamId: string) => void;
}

export default function WorkspaceTeamView({ workspaceId, selectedTeamId, onTeamSelect }: WorkspaceTeamViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [isManageView, setIsManageView] = useState(false);

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const activeTeamId = !isManageView ? selectedTeamId : undefined;

    // Fetch teams list for this workspace
    const { data: teamsData, isLoading: isLoadingList, refetch: refetchList } = trpc.team.list.useQuery({
        workspaceId,
        scope: "owned",
        pageSize: 50
    }, { staleTime: 60_000, gcTime: 5 * 60_000 });

    const teamsRaw = teamsData?.items ?? [];

    // Client-side filter
    const teams = useMemo(() => {
        if (!debouncedQuery) return teamsRaw;
        return teamsRaw.filter(t => t.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [teamsRaw, debouncedQuery]);

    const handleTeamClick = (teamId: string) => {
        setIsManageView(false);
        if (onTeamSelect) {
            onTeamSelect(teamId);
        }
    };

    // Auto-select first team when no selection exists
    useEffect(() => {
        if (!activeTeamId && !isManageView && teamsRaw.length > 0) {
            handleTeamClick(teamsRaw[0].id);
        }
    }, [teamsRaw, activeTeamId, isManageView]);

    const handleTeamCreated = (teamId: string) => {
        handleTeamClick(teamId);
    };

    // List View
    return (
        <div className="flex h-full gap-0 bg-background transition-all">
            {/* Teams Sidebar */}
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
                                        placeholder="Search teams..."
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
                                    <h2 className={cn(
                                        "text-sm font-semibold",
                                        isManageView ? "text-indigo-600" : "text-foreground"
                                    )}>
                                        {isManageView ? "Manage Teams" : "Teams"}
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
                                                <DropdownMenuItem onClick={() => setCreateModalOpen(true)}>
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Create Team
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Import Team
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setIsManageView(true)}>
                                                    <LayoutGrid className="mr-2 h-4 w-4" />
                                                    Manage Teams
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
                                                  onClick={() => setCreateModalOpen(true)}
                                              >
                                                  <Plus className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Create Team</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Teams List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {/* Manage Teams entry */}
                            <div
                                className={cn(
                                    "group/item flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-slate-50 cursor-pointer mb-1",
                                    isManageView && "bg-indigo-50 text-indigo-700"
                                )}
                                onClick={() => setIsManageView(true)}
                            >
                                <LayoutGrid className={cn("h-4 w-4 shrink-0 ml-1", isManageView ? "text-indigo-600" : "text-muted-foreground")} />
                                <span className="flex-1 truncate">Manage Teams</span>
                            </div>

                            <div className="my-1.5 border-t border-slate-100" />

                            {isLoadingList ? (
                                <LoadingContainer label="Loading teams..." spinnerSize="md" padding="md" />
                            ) : teams.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No teams yet</p>
                                    {searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search</p>
                                    )}
                                    {!searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">Create your first team to start collaborating</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {teams.map((team) => {
                                        const isActive = !isManageView && activeTeamId === team.id;
                                        return (
                                            <div
                                                key={team.id}
                                                className={cn(
                                                    "group/item flex w-full items-start gap-3 rounded-lg px-3 py-3 transition-colors",
                                                    "hover:bg-slate-50",
                                                    isActive && "bg-slate-100"
                                                )}
                                            >
                                                <button
                                                    onClick={() => handleTeamClick(team.id)}
                                                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none cursor-pointer"
                                                >
                                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {team.name}
                                                            </p>
                                                            {!team.isActive && (
                                                                <Badge variant="secondary" className="shrink-0 text-xs px-1 h-5">
                                                                    Archived
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 flex items-center gap-1">
                                                    <TeamActionsMenu workspaceId={workspaceId} teamId={team.id} />
                                                    <TeamCreateMenu
                                                        onCreateNew={() => setCreateModalOpen(true)}
                                                        onImport={() => setImportModalOpen(true)}
                                                    />
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
            <div className="flex-1 overflow-hidden relative">
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
                {isManageView ? (
                    <SharedManageTeamsView workspaceId={workspaceId} onTeamCreated={handleTeamCreated} />
                ) : activeTeamId ? (
                    <div className="flex h-full flex-col">
                        <DashboardTeamView teamId={activeTeamId} workspaceId={workspaceId} />
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center text-center max-w-sm p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-4">
                                <Users className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                            </div>

                            <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                Assemble your Team
                            </h2>

                            <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                Teams represent groups of people working together. Select one or create a new one.
                            </p>

                            <Button
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                                onClick={() => setCreateModalOpen(true)}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Create a Team
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <TeamCreationModal open={createModalOpen} onOpenChange={setCreateModalOpen} onCreated={handleTeamCreated} />
            <TeamImportModal spaceId="" open={importModalOpen} onOpenChange={setImportModalOpen} />
        </div>
    );
}
