"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildCleanDashboardParams, parseDashboardState, buildDashboardPath } from "@/features/dashboard/utils/dashboardUrl";
import { trpc } from "@/lib/trpc";
import {
    Plus,
    FileText,
    Search,
    ChevronsLeft,
    ChevronsRight,
    X,
    MoreHorizontal,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { DocView } from "@/features/dashboard/views/generic/DocView";
import { DocumentActionsMenu } from "@/features/dashboard/components/sidebar/DocumentActionsMenu";
import { DocumentCreationModal } from "@/entities/documents/components/DocumentCreationModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectDocsViewProps {
    projectId: string;
}

export default function ProjectDocsView({ projectId }: ProjectDocsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch DOC views for this project with sidebarView: true
    const { data: viewsData, isLoading, refetch } = trpc.view.list.useQuery(
        { projectId, type: "DOC", sidebarView: true },
        { enabled: !!projectId }
    );

    const allViews = (viewsData ?? []).filter(v => v.sidebarView === true);

    // Client-side filter
    const views = searchQuery
        ? allViews.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : allViews;

    const parsedState = useMemo(() => parseDashboardState(searchParams), [searchParams]);
    const activeViewId = parsedState.docViewId || views[0]?.id;
    const basePath = projectId ? `/dashboard/projects/${projectId}` : null;

    // Auto-select first view
    useEffect(() => {
        if (!parsedState.docViewId && views.length > 0) {
            if (basePath) {
                history.replaceState(null, "", buildDashboardPath({ basePath, type: "dv", id: views[0].id }));
            } else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "docs",
                    entityKey: "dv",
                    entityId: views[0].id,
                });
                history.replaceState(null, "", `?${clean.toString()}`);
            }
        }
    }, [views, parsedState.docViewId, basePath, searchParams]);

    const handleViewClick = (viewId: string) => {
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "dv", id: viewId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "docs",
                entityKey: "dv",
                entityId: viewId,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    const handleCreated = (id: string) => {
        refetch();
        if (basePath) {
            router.push(buildDashboardPath({ basePath, type: "dv", id }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "docs",
                entityKey: "dv",
                entityId: id,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    };

    return (
        <div className="flex h-full bg-background">
            {/* Docs Sidebar */}
            <aside className={cn(
                "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
                isSidebarCollapsed ? "w-0 border-l border-slate-200" : "w-[256px] border-x border-slate-200"
            )}>
                {!isSidebarCollapsed && (
                    <div className="flex h-full flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col justify-center border-b border-slate-200 h-[57px] shrink-0">
                            {isSearchOpen ? (
                                <div className="flex items-center gap-2 px-3 h-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Input
                                        autoFocus
                                        placeholder="Search docs..."
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
                                    <h2 className="text-sm font-semibold text-foreground">Docs</h2>
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
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsCreateModalOpen(true)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>New Document</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Views List */}
                        <div className="flex-1 overflow-y-auto px-2 py-2">
                            {isLoading ? (
                                <LoadingContainer label="Loading docs..." spinnerSize="sm" padding="sm" />
                            ) : views.length === 0 ? (
                                searchQuery ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <FileText className="mb-4 h-10 w-10 text-muted-foreground/40" />
                                        <p className="text-sm font-medium text-foreground">No docs found</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search</p>
                                    </div>
                                ) : (
                                    <div className="flex h-full items-center justify-center py-12">
                                        <div className="flex flex-col items-center text-center max-w-sm p-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mb-4">
                                                <FileText className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
                                            </div>
                                            <h2 className="text-sm font-semibold text-slate-900 mb-1">No documents yet</h2>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                                Create your first document to start writing and collaborating.
                                            </p>
                                            <Button
                                                size="sm"
                                                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white w-full"
                                                onClick={() => setIsCreateModalOpen(true)}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                New Document
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-0.5">
                                    {views.map((view) => {
                                        const isActive = activeViewId === view.id;
                                        return (
                                            <div
                                                key={view.id}
                                                className={cn(
                                                    "group/doc flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer",
                                                    "hover:bg-slate-50",
                                                    isActive && "bg-slate-100"
                                                )}
                                                onClick={() => handleViewClick(view.id)}
                                            >
                                                <FileText className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    isActive ? "text-indigo-500" : "text-muted-foreground"
                                                )} />
                                                <span className={cn(
                                                    "flex-1 truncate text-sm",
                                                    isActive ? "font-normal text-foreground" : "text-zinc-600 group-hover/doc:text-foreground"
                                                )}>
                                                    {view.name}
                                                </span>
                                                <div
                                                    className="opacity-0 group-hover/doc:opacity-100 transition-opacity flex items-center gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <DocumentActionsMenu
                                                        projectId={projectId}
                                                        documentId={view.id}
                                                        liveTitle={view.name}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
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

                <div className="flex-1 overflow-hidden h-full">
                    {activeViewId ? (
                        <DocView
                            viewId={activeViewId}
                            projectId={projectId}
                            isMainSidebarCollapsed={isSidebarCollapsed}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95 duration-700 ease-out fill-mode-both">
                            <div className="relative mb-6 group">
                                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full transition-all duration-700 group-hover:bg-primary/20 group-hover:blur-3xl" />
                                <div className="relative h-20 w-20 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 shadow-lg shadow-slate-200/20 rounded-3xl flex items-center justify-center text-primary transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                                    <FileText className="h-9 w-9 stroke-[1.5]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">No document selected</h3>
                            <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
                                Select a document from the sidebar or create a new one to start writing.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                New Document
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Document Creation Modal */}
            <DocumentCreationModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                projectId={projectId}
                onSuccess={handleCreated}
            />
        </div>
    );
}
