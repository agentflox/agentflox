"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, ChevronRight, Briefcase, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import ProjectViewSwitcher from "@/features/dashboard/views/project/ViewSwitcher";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { ProjectImportModal } from "@/entities/projects/components/ProjectImportModal";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { ProjectCreateMenu } from "@/features/dashboard/components/sidebar/ProjectCreateMenu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SpaceProjectViewProps {
    spaceId: string;
    workspaceId: string;
    selectedProjectId?: string;
    onProjectSelect: (projectId: string) => void;
}

const PROJECT_TABS = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "discussions", label: "Discussions" },
    { id: "chat", label: "Chat" },
    { id: "activities", label: "Activities" },
    { id: "members", label: "Team" },
    { id: "analytics", label: "Analytics" },
    { id: "governance", label: "Governance" },
    { id: "appeal", label: "Appeals" },
    { id: "logs", label: "Logs" },
    { id: "war_room", label: "War Room" },
    { id: "marketplace", label: "Marketplace" },
];

function formatNumber(value: number | null | undefined) {
    if (!value) return "0";
    return value.toLocaleString();
}

export default function SpaceProjectView({ spaceId, workspaceId, selectedProjectId, onProjectSelect }: SpaceProjectViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
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
    const activeTab = searchParams.get("ptab") || "overview";

    // Fetch projects list for this space
    const { data: projectsData, isLoading: isLoadingList, refetch: refetchList } = trpc.project.list.useQuery({
        workspaceId,
        spaceId,
        scope: "owned",
        pageSize: 50
    });

    const projectsRaw = projectsData?.items ?? [];

    // Client-side filter
    const projects = useMemo(() => {
        if (!debouncedQuery) return projectsRaw;
        return projectsRaw.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [projectsRaw, debouncedQuery]);

    const activeProjectId = selectedProjectId;

    // Fetch details if a project is selected
    const { data: selectedProject, isLoading: isLoadingDetail } = trpc.project.get.useQuery(
        { id: selectedProjectId! },
        { enabled: !!selectedProjectId }
    );

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("ptab", tabId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("pj");
        params.delete("ptab");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleProjectClick = (projectId: string) => {
        if (onProjectSelect) {
            onProjectSelect(projectId);
        }
    };

    const handleProjectCreated = (projectId: string) => {
        handleProjectClick(projectId);
    };

    const handleCreateProject = () => {
        setCreateModalOpen(true);
    };

    if (selectedProjectId) {
        if (isLoadingDetail) {
            return (
                <LoadingPage label="Loading project details..." />
            );
        }

        if (!selectedProject) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">Project not found</p>
                    <Button onClick={handleBackToList}>Back to Projects</Button>
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
                        <h1 className="text-2xl font-bold text-zinc-900">{selectedProject.name}</h1>
                        <Badge variant={selectedProject.isActive ? "default" : "secondary"}>
                            {selectedProject.isActive ? "Active" : "Archived"}
                        </Badge>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className="bg-transparent p-0 h-auto flex-wrap">
                            {PROJECT_TABS.map(tab => (
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
                    <ProjectViewSwitcher activeTab={activeTab} project={selectedProject} />
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="flex h-full gap-0 bg-background transition-all">
            {/* Projects Sidebar */}
            <aside className={cn(
                "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
                isSidebarCollapsed ? "w-0 border-none" : "w-80 border-r border-slate-200"
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
                                        placeholder="Search projects..."
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
                                    <h2 className="text-sm font-semibold text-foreground">Projects</h2>
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem onClick={() => setCreateModalOpen(true)}>
                                                    <Plus className="mr-2 h-4 w-4" /> Create Project
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                                                    <Briefcase className="mr-2 h-4 w-4" /> Import Project
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
                                            onClick={handleCreateProject}
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            title="Create Project"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Projects List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {isLoadingList ? (
                                <LoadingContainer
                                    label="Loading projects..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : projects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-foreground">No projects found</p>
                                    {searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Try adjusting your search
                                        </p>
                                    )}
                                    {!searchQuery && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Create your first project to get started
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {projects.map((project) => {
                                        const isActive = activeProjectId === project.id;
                                        return (
                                            <div
                                                key={project.id}
                                                className={cn(
                                                    "group/item flex w-full items-start gap-3 rounded-lg px-3 py-3 transition-colors",
                                                    "hover:bg-slate-50",
                                                    isActive && "bg-slate-100"
                                                )}
                                            >
                                                <button
                                                    onClick={() => handleProjectClick(project.id)}
                                                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
                                                >
                                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {project.name}
                                                            </p>
                                                            {project.status && project.status !== "PUBLISHED" && (
                                                                <Badge variant="secondary" className="shrink-0 text-xs px-1 h-5">
                                                                    {project.status}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 flex items-center gap-1">
                                                    <ProjectActionsMenu
                                                        workspaceId={workspaceId}
                                                        projectId={project.id}
                                                    />
                                                    <ProjectCreateMenu
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
                            className="h-4 w-4 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
                            onClick={() => setIsSidebarCollapsed(false)}
                            title="Expand Sidebar"
                        >
                            <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                {
                    activeProjectId ? (
                        selectedProject ? (
                            <div className="flex h-full flex-col">
                                <div className="border-b border-zinc-200 bg-white px-6 py-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleProjectClick("")} className="text-zinc-500">
                                            ← Back
                                        </Button>
                                        <h1 className="text-2xl font-bold text-zinc-900">{selectedProject.name}</h1>
                                        <Badge variant={selectedProject.isActive ? "default" : "secondary"}>
                                            {selectedProject.isActive ? "Active" : "Archived"}
                                        </Badge>
                                        <div className="ml-auto">
                                            <ProjectActionsMenu
                                                workspaceId={workspaceId}
                                                projectId={selectedProject.id}
                                                trigger={
                                                    <Button variant="ghost" size="sm" className="h-8 gap-2">
                                                        <Settings className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Settings</span>
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>

                                    <Tabs value={activeTab} onValueChange={(tab) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("ptab", tab);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}>
                                        <TabsList className="bg-transparent p-0 h-auto flex-wrap">
                                            {PROJECT_TABS.map(tab => (
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
                                    <ProjectViewSwitcher activeTab={activeTab} project={selectedProject} />
                                </div>
                            </div>
                        ) : isLoadingDetail ? (
                            <LoadingPage label="Loading project details..." />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-4">
                                <p className="text-muted-foreground">Project not found</p>
                                <Button onClick={() => handleProjectClick("")}>Back to Projects</Button>
                            </div>
                        )
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                                <p className="text-lg font-medium text-foreground">Select a project</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Choose a project from the sidebar to view its details
                                </p>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Modals - Pass spaceId as defaultSpaceId */}
            <ProjectCreationModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onCreated={handleProjectCreated}
                defaultSpaceId={spaceId}
            />
            <ProjectImportModal
                spaceId={spaceId}
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
            />
        </div>
    );
}
