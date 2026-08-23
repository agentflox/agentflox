"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildCleanDashboardParams, buildDashboardPath } from "@/features/dashboard/utils/dashboardUrl";
import { trpc } from "@/lib/trpc";
import {
    Plus,
    Briefcase,
    Search,
    ChevronsLeft,
    ChevronsRight,
    X,
    LayoutGrid,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import DashboardProjectView from "@/features/dashboard/views/generic/DashboardProjectView";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { ProjectSidebarItem } from "@/features/dashboard/components/sidebar/ProjectSidebarItem";
import { SharedManageProjectsView } from "@/features/dashboard/views/shared/SharedManageProjectsView";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkspaceProjectViewProps {
    workspaceId: string;
    selectedProjectId?: string;
    onProjectSelect: (projectId: string) => void;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

export default function WorkspaceProjectView({
    workspaceId,
    selectedProjectId,
    onProjectSelect,
    selectedTaskIdFromParent,
    onTaskSelect,
}: WorkspaceProjectViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Modal / view states
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isManageView, setIsManageView] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // URL-derived active items
    const activeProjectId = !isManageView ? (searchParams.get("pj") || selectedProjectId || null) : null;

    // Fetch projects for this workspace
    const { data: projectsData, isLoading: isLoadingProjects, refetch: refetchProjects } = trpc.project.list.useQuery(
        { workspaceId, scope: "owned", pageSize: 50 },
        { enabled: !!workspaceId }
    );
    const projectsRaw = projectsData?.items ?? [];

    // Filter projects by search
    const projects = useMemo(() => {
        if (!debouncedQuery) return projectsRaw;
        return projectsRaw.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [projectsRaw, debouncedQuery]);

    // --- Handlers ---
    const handleProjectClick = useCallback((projectId: string) => {
        setIsManageView(false);
        if (onProjectSelect) {
            onProjectSelect(projectId);
        } else if (workspaceId) {
            router.push(buildDashboardPath({ basePath: `/dashboard/workspaces/${workspaceId}`, type: "pj", id: projectId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "projects",
                entityKey: "pj",
                entityId: projectId,
                keepTask: true,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    }, [searchParams, router, onProjectSelect, workspaceId]);

    // Auto-select first project when no selection exists
    useEffect(() => {
        if (!activeProjectId && !isManageView && projectsRaw.length > 0) {
            handleProjectClick(projectsRaw[0].id);
        }
    }, [projectsRaw, activeProjectId, isManageView]);

    // Render main content
    const renderMainContent = () => {
        if (isManageView) {
            return <SharedManageProjectsView workspaceId={workspaceId} onProjectCreated={handleProjectClick} />;
        }
        if (activeProjectId) {
            const activeProject = projects.find(p => p.id === activeProjectId);
            return (
                <div className={cn("flex-1 overflow-hidden bg-zinc-50 h-full", isSidebarCollapsed && "[&_[role=tablist]]:pl-6")}>
                    <DashboardProjectView
                        projectId={activeProjectId}
                        workspaceId={workspaceId}
                        spaceId={activeProject?.spaceId || undefined}
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
                        <Briefcase className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                    </div>

                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                        Build your Project
                    </h2>

                    <p className="text-sm text-slate-500 leading-relaxed mb-5">
                        Projects are where the real work happens. Select one or create a new one.
                    </p>

                    <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                        onClick={() => setIsProjectModalOpen(true)}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Create a Project
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-0 bg-background transition-all relative">
            {/* Projects Sidebar */}
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
                                        placeholder="Search projects..."
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
                                <div className="flex items-center justify-between px-4 h-full">
                                    <h2 className={cn("text-sm font-semibold", isManageView ? "text-indigo-600" : "text-foreground")}>
                                        {isManageView ? "Manage Projects" : "Projects"}
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
                                                <DropdownMenuItem onClick={() => setIsProjectModalOpen(true)}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create Project
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setIsManageView(true)}>
                                                    <LayoutGrid className="mr-2 h-4 w-4" />
                                                    Manage Projects
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
                                                        onClick={() => setIsProjectModalOpen(true)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Create Project</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Projects List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {isLoadingProjects ? (
                                <LoadingContainer label="Loading projects..." spinnerSize="md" padding="md" />
                            ) : projects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No projects found</p>
                                    {searchQuery ? (
                                        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search</p>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <p className="mt-1 text-xs text-muted-foreground mb-4">Create your first project to get started</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsProjectModalOpen(true)}
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Create Project
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {projects.map((project) => {
                                        const isProjectActive = !isManageView && activeProjectId === project.id;

                                        return (
                                            <ProjectSidebarItem
                                                key={project.id}
                                                workspaceId={workspaceId}
                                                project={project}
                                                isActive={isProjectActive}
                                                onSelectProject={handleProjectClick}
                                            />
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
                    {renderMainContent()}
                </div>
            </div>

            {/* Modals */}
            <ProjectCreationModal
                open={isProjectModalOpen}
                onOpenChange={setIsProjectModalOpen}
                onCreated={(projectId) => {
                    refetchProjects();
                    if (onProjectSelect) onProjectSelect(projectId);
                }}
            />
        </div>
    );
}
