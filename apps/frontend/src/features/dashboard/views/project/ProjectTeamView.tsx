"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildCleanDashboardParams } from "@/features/dashboard/utils/dashboardUrl";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, ChevronRight, Users, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { TeamImportModal } from "@/entities/teams/components/TeamImportModal";
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
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

interface ProjectTeamViewProps {
    projectId: string;
    workspaceId: string;
    selectedTeamId?: string;
    onTeamSelect: (teamId: string) => void;
}

// Removing TEAM_TABS array as it's no longer needed in this file

function formatNumber(value: number | null | undefined) {
    if (!value) return "0";
    return value.toLocaleString();
}

export default function ProjectTeamView({ projectId, workspaceId, selectedTeamId, onTeamSelect }: ProjectTeamViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);
    const [settingsTab, setSettingsTab] = useState("general");

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isManageView, setIsManageView] = useState(false);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const activeTeamId = !isManageView ? selectedTeamId : undefined;

    // Fetch teams linked to this project
    const { data: projectData, isLoading: isLoadingList, refetch: refetchList } = trpc.project.get.useQuery({ id: projectId }, { staleTime: 60_000, gcTime: 5 * 60_000 });

    const teamsRaw = useMemo(
        () => (projectData?.teams ?? []).map((link) => link.team),
        [projectData?.teams]
    );

    // Client-side filter
    const teams = useMemo(() => {
        if (!debouncedQuery) return teamsRaw;
        return teamsRaw.filter(t => t.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [teamsRaw, debouncedQuery]);

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tm");
        params.delete("ttab");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTeamClick = (teamId: string) => {
        setIsManageView(false);
        if (onTeamSelect) {
            onTeamSelect(teamId);
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "teams",
                entityKey: "tm",
                entityId: teamId,
                keepTask: true,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
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

    const handleCreateTeam = () => {
        setCreateModalOpen(true);
    };

    // List View
    return (
        <div className="flex h-full gap-0 bg-background transition-all">
            {/* Teams Sidebar */}
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
                                <div className="flex items-center justify-between px-4 h-full">
                                    <h2 className={cn("text-sm font-semibold", isManageView ? "text-indigo-600" : "text-foreground")}>
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
                                                    <Plus className="mr-2 h-4 w-4" />
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
                            <div className="my-1.5 border-t border-slate-100" />
                            {isLoadingList ? (
                                <LoadingContainer
                                    label="Loading teams..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : teams.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No teams yet</p>
                                    {searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Try adjusting your search
                                        </p>
                                    )}
                                    {!searchQuery && (
                                        <div className="flex flex-col items-center">
                                            <p className="mt-1 text-xs text-muted-foreground mb-4">
                                                Create your first team to start collaborating
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setCreateModalOpen(true)}
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Create Team
                                            </Button>
                                        </div>
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
                                                    "group/team flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer",
                                                    "hover:bg-slate-50",
                                                    isActive && "bg-slate-100"
                                                )}
                                                onClick={() => handleTeamClick(team.id)}
                                            >
                                                <span
                                                    className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5"
                                                    style={{ backgroundColor: team.icon ? (team.color || "#8b5cf6") : "transparent" }}
                                                >
                                                    <TeamIcon
                                                        icon={team.icon}
                                                        className={cn(team.icon ? "text-white" : isActive ? "text-violet-500" : "text-violet-500/80")}
                                                        size={14}
                                                        fill
                                                    />
                                                </span>
                                                <span className={cn(
                                                    "flex-1 truncate text-sm",
                                                    isActive ? "font-normal text-foreground" : "text-zinc-600 group-hover/team:text-foreground"
                                                )}>
                                                    {team.name}
                                                </span>
                                                <div
                                                    className="opacity-0 group-hover/team:opacity-100 transition-opacity flex items-center gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <TeamActionsMenu
                                                        workspaceId={workspaceId}
                                                        teamId={team.id}
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
                {isManageView ? (
                    <SharedManageTeamsView workspaceId={workspaceId} onTeamCreated={handleTeamCreated} />
                ) : activeTeamId ? (
                    <div className={cn("flex h-full flex-col", isSidebarCollapsed && "[&_[role=tablist]]:pl-6")}>
                        <DashboardTeamView
                            teamId={activeTeamId}
                            projectId={projectId}
                            workspaceId={workspaceId}
                        />
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

            {/* Modals - Pass projectId as defaultProjectId */}
            <TeamCreationModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                defaultSpaceId={projectData?.spaceId ?? undefined}
                onCreated={handleTeamCreated}
            />
            <TeamImportModal
                spaceId={projectData?.spaceId ?? ""}
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
            />
        </div>
    );
}
