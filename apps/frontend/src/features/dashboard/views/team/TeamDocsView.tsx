"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { CreateDocViewModal } from "@/features/dashboard/components/modals/CreateDocViewModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamDocsViewProps {
    teamId: string;
}

export default function TeamDocsView({ teamId }: TeamDocsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch DOC views for this team with sidebarView: true
    const { data: viewsData, isLoading, refetch } = trpc.view.list.useQuery(
        { teamId, type: "DOC", sidebarView: true },
        { enabled: !!teamId }
    );

    const allViews = viewsData ?? [];

    // Client-side filter
    const views = searchQuery
        ? allViews.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : allViews;

    const activeViewId = searchParams.get("docView") || views[0]?.id;

    // Auto-select first view
    useEffect(() => {
        if (!searchParams.get("docView") && views.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("docView", views[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [views, searchParams, router]);

    const handleViewClick = (viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("docView", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleCreated = (id: string) => {
        refetch();
        const params = new URLSearchParams(searchParams.toString());
        params.set("docView", id);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex h-full bg-background">
            {/* Docs Sidebar */}
            <aside className={cn(
                "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
                isSidebarCollapsed ? "w-0 border-none" : "w-[256px] border-r border-slate-200"
            )}>
                {!isSidebarCollapsed && (
                    <div className="flex h-full flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col border-b border-slate-200">
                            {isSearchOpen ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                <div className="flex items-center justify-between px-4 py-3">
                                    <h2 className="text-sm font-semibold text-foreground">Docs</h2>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setIsCreateModalOpen(true)}
                                            title="New Document"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
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
                                                    "group/item flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer",
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
                                                    isActive ? "font-medium text-foreground" : "text-zinc-600 group-hover/item:text-foreground"
                                                )}>
                                                    {view.name}
                                                </span>
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

                <div className="flex-1 overflow-hidden h-full">
                    {activeViewId ? (
                        <DocView
                            viewId={activeViewId}
                            teamId={teamId}
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
            <CreateDocViewModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                teamId={teamId}
                onSuccess={handleCreated}
            />
        </div>
    );
}
