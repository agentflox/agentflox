"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, ChevronRight, Users, MoreHorizontal, Building2, Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import TeamViewSwitcher from "@/features/dashboard/views/team/ViewSwitcher";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { TeamImportModal } from "@/entities/teams/components/TeamImportModal";
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { TeamCreateMenu } from "@/features/dashboard/components/sidebar/TeamCreateMenu";
import { useWorkspaceDetail } from "@/entities/workspace";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

interface WorkspaceTeamViewProps {
    workspaceId: string;
    selectedTeamId?: string;
    onTeamSelect: (teamId: string) => void;
}

const TEAM_TABS = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "discussions", label: "Discussions" },
    { id: "chat", label: "Chat" },
    { id: "activities", label: "Activities" },
    { id: "members", label: "Members" },
    { id: "analytics", label: "Analytics" },
    { id: "governance", label: "Governance" },
    { id: "appeal", label: "Appeals" },
    { id: "logs", label: "Logs" },
];

function formatNumber(value: number | null | undefined) {
    if (!value) return "0";
    return value.toLocaleString();
}

export default function WorkspaceTeamView({ workspaceId, selectedTeamId, onTeamSelect }: WorkspaceTeamViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: workspace } = useWorkspaceDetail(workspaceId);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);
    const [settingsTab, setSettingsTab] = useState("general");

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

    // Get active tab from URL or default to overview
    const activeTab = searchParams.get("tab") || "overview";

    // Fetch teams list
    const { data: teamsData, isLoading: isLoadingList, refetch: refetchList } = trpc.team.list.useQuery({
        workspaceId,
        scope: "owned",
        pageSize: 50
    });

    const teamsRaw = teamsData?.items ?? [];

    // Client-side filter
    const teams = useMemo(() => {
        if (!debouncedQuery) return teamsRaw;
        return teamsRaw.filter(t => t.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [teamsRaw, debouncedQuery]);

    const activeTeamId = selectedTeamId;
    const organization = workspace?.organization;

    // Fetch details if a team is selected
    const { data: selectedTeam, isLoading: isLoadingDetail } = trpc.team.get.useQuery(
        { id: selectedTeamId! },
        { enabled: !!selectedTeamId }
    );

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tabId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("teamId");
        params.delete("tab");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTeamClick = (teamId: string) => {
        if (onTeamSelect) {
            onTeamSelect(teamId);
        }
    };

    const handleTeamCreated = (teamId: string) => {
        handleTeamClick(teamId);
    };

    const handleCreateTeam = () => {
        setCreateModalOpen(true);
    };

    if (selectedTeamId) {
        if (isLoadingDetail) {
            return (
                <LoadingPage label="Loading team details..." />
            );
        }

        if (!selectedTeam) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">Team not found</p>
                    <Button onClick={handleBackToList}>Back to Teams</Button>
                </div>
            );
        }

        return (
            <div className="flex h-full flex-col">
                <div className="border-b border-zinc-200 bg-white px-6 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-zinc-500">
                            ← Back
                        </Button>
                        <h1 className="text-2xl font-bold text-zinc-900">{selectedTeam.name}</h1>
                        <Badge variant={selectedTeam.isActive ? "default" : "secondary"}>
                            {selectedTeam.isActive ? "Active" : "Archived"}
                        </Badge>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className="bg-transparent p-0 h-auto flex-wrap">
                            {TEAM_TABS.map(tab => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="data-[state=active]:bg-zinc-100 data-[state=active]:shadow-none rounded-md"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-hidden bg-zinc-50">
                    <TeamViewSwitcher activeTab={activeTab} team={selectedTeam} />
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="flex h-full gap-0 bg-background transition-all">
            {/* Teams Sidebar */}
            <aside className={cn(
                "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
                isSidebarCollapsed ? "w-0 border-none" : "w-80 border-r border-slate-200"
            )}>
                <div className="flex h-full flex-col overflow-hidden">

                    {/* Header */}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col border-b border-slate-200">
                            {/* Organization Section */}
                            {organization && !isSearchOpen && (
                                <div className="border-b border-slate-200 px-4 py-3">
                                    <Link
                                        href={DASHBOARD_ROUTES.ORGANIZATION}
                                        className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <Building2 size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground truncate">Organization</p>
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                {organization.name}
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            )}

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
                                    <h2 className="text-sm font-semibold text-foreground">Teams</h2>
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem onClick={() => setCreateModalOpen(true)}>
                                                    <Plus className="mr-2 h-4 w-4" /> Create Team
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                                                    <Users className="mr-2 h-4 w-4" /> Import Team
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

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

                                        <Button
                                            onClick={handleCreateTeam}
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            title="Create Team"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Teams List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {isLoadingList ? (
                                <LoadingContainer
                                    label="Loading teams..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : teams.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No teams found</p>
                                    {searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Try adjusting your search
                                        </p>
                                    )}
                                    {!searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Create your first team to start collaborating
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {teams.map((team) => {
                                        const isActive = activeTeamId === team.id;
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
                                                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
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
                                                    <TeamActionsMenu
                                                        workspaceId={workspaceId}
                                                        teamId={team.id}
                                                    />
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
            </aside >

            {/* Main Content */}
            < div className="flex-1 overflow-hidden relative" >
                {isSidebarCollapsed && (
                    <div className="absolute left-0 top-3 z-30">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-4 w-4 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
                            onClick={() => setIsSidebarCollapsed(false)}
                            title="Expand Sidebar"
                        >
                            <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                {
                    activeTeamId ? (
                        selectedTeam ? (
                            <div className="flex h-full flex-col">
                                <div className="border-b border-zinc-200 bg-white px-6 py-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleTeamClick("")} className="text-zinc-500">
                                            ← Back
                                        </Button>
                                        <h1 className="text-2xl font-bold text-zinc-900">{selectedTeam.name}</h1>
                                        <Badge variant={selectedTeam.isActive ? "default" : "secondary"}>
                                            {selectedTeam.isActive ? "Active" : "Archived"}
                                        </Badge>
                                    </div>

                                    <Tabs value={activeTab} onValueChange={(tab) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("tab", tab);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}>
                                        <TabsList className="bg-transparent p-0 h-auto flex-wrap">
                                            {TEAM_TABS.map(tab => (
                                                <TabsTrigger
                                                    key={tab.id}
                                                    value={tab.id}
                                                    className="data-[state=active]:bg-zinc-100 data-[state=active]:shadow-none rounded-md"
                                                >
                                                    {tab.label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </div>

                                <div className="flex-1 overflow-hidden bg-zinc-50">
                                    <TeamViewSwitcher activeTab={activeTab} team={selectedTeam} />
                                </div>
                            </div>
                        ) : isLoadingDetail ? (
                            <LoadingPage label="Loading team details..." />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-4">
                                <p className="text-muted-foreground">Team not found</p>
                                <Button onClick={() => handleTeamClick("")}>Back to Teams</Button>
                            </div>
                        )
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                                <p className="text-lg font-medium text-foreground">Select a team</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Choose a team from the sidebar to view its details
                                </p>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Modals */}
            < TeamCreationModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onCreated={handleTeamCreated}
            />
            <TeamImportModal
                spaceId=""
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
            />
        </div >
    );
}
