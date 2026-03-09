"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, X, FolderKanban, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSpaceList } from "@/entities/spaces/hooks";
import { SpaceCreationModal } from "@/entities/spaces/components/SpaceCreationModal";
import { cn } from "@/lib/utils";
import { LoadingContainer } from "@/components/ui/loading";
import { SpaceCard } from "./SpaceCard";

interface ManageSpacesViewProps {
    workspaceId: string;
    onClose: () => void;
    onSpaceSelect: (spaceId: string) => void;
    isSidebarCollapsed: boolean;
}

export function ManageSpacesView({ workspaceId, onClose, onSpaceSelect, isSidebarCollapsed }: ManageSpacesViewProps) {
    const [filterType, setFilterType] = useState<'all' | 'owned' | 'shared' | 'archived'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Calculate scope and status based on filter type
    const { scope, status } = useMemo(() => {
        if (filterType === 'archived') {
            return { scope: 'all' as const, status: 'archived' as const };
        }
        if (filterType === 'owned') {
            return { scope: 'owned' as const, status: 'active' as const };
        }
        if (filterType === 'shared') {
            return { scope: 'member' as const, status: 'active' as const };
        }
        return { scope: 'all' as const, status: 'active' as const };
    }, [filterType]);

    // Use the centralized hook
    const {
        spaces,
        isLoading,
        query,
        setQuery,
        debouncedQuery,
        page,
        setPage,
        pageSize,
        total,
        totalPages,
        filters,
        setFilters,
        setScope,
    } = useSpaceList({
        pageSize: 50,
        debounceMs: 300,
        syncWithUrl: false,
        initialScope: scope,
        initialFilters: { workspaceId, status },
    });

    // Update filters when workspaceId or status changes
    useEffect(() => {
        setFilters({ workspaceId, status });
    }, [workspaceId, status, setFilters]);

    // Update scope when filterType changes
    useEffect(() => {
        setScope(scope);
    }, [scope, setScope]);

    // Reset page on filter change
    const handleFilterChange = (type: typeof filterType) => {
        setFilterType(type);
        setPage(1);
    };

    return (
        <div className="flex h-full flex-col bg-background animate-in fade-in duration-300">
            {/* Header */}
            <div className={cn(
                "border-b px-6 py-4 flex items-center justify-between bg-background z-10 sticky top-0 transition-all"
            )}>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Spaces</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        View and manage all spaces in this workspace.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Search & Actions */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                placeholder="Search spaces..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-10 bg-muted/30"
                            />
                        </div>
                        <Button onClick={() => setShowCreateModal(true)} size="sm" className="w-auto shrink-0 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> New Space
                        </Button>
                    </div>

                    {/* Filters & Meta */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 mr-2 text-sm font-medium text-muted-foreground">
                                <Filter className="h-4 w-4" />
                                <span>Filters:</span>
                            </div>
                            {(['all', 'owned', 'shared', 'archived'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant={filterType === type ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleFilterChange(type)}
                                    className={cn(
                                        "h-8 rounded-full capitalize w-auto px-3",
                                        filterType === type && "font-medium text-primary bg-primary/10 hover:bg-primary/20",
                                        "transition-all"
                                    )}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>

                        {/* Active Chips */}
                        {(debouncedQuery || filterType !== 'all') && (
                            <div className="flex flex-wrap items-center gap-2">
                                {debouncedQuery && (
                                    <Badge variant="secondary" className="h-7 font-normal flex items-center gap-1.5 px-3">
                                        <span className="text-muted-foreground">q:</span> {debouncedQuery}
                                        <X
                                            className="h-3 w-3 cursor-pointer ml-1 hover:text-foreground"
                                            onClick={() => setQuery("")}
                                        />
                                    </Badge>
                                )}
                                {filterType !== 'all' && (
                                    <Badge variant="secondary" className="h-7 font-normal flex items-center gap-1.5 px-3">
                                        <span className="text-muted-foreground">f:</span> {filterType}
                                        <X
                                            className="h-3 w-3 cursor-pointer ml-1 hover:text-foreground"
                                            onClick={() => handleFilterChange('all')}
                                        />
                                    </Badge>
                                )}
                                {total > 0 && (
                                    <Badge variant="outline" className="h-7 font-normal text-muted-foreground bg-background whitespace-nowrap ml-auto">
                                        Total: {total}
                                    </Badge>
                                )}
                            </div>
                        )}
                        {/* Default Total display if no filters but items exist */}
                        {(!debouncedQuery && filterType === 'all' && total > 0) && (
                            <div className="flex justify-end">
                                <Badge variant="outline" className="h-7 font-normal text-muted-foreground bg-background whitespace-nowrap">
                                    Total: {total}
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* List */}
                {isLoading ? (
                    <LoadingContainer label="Loading spaces..." />
                ) : spaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border rounded-xl border-dashed bg-muted/10">
                        <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-lg font-medium text-foreground">
                            {query ? "No results found" : "No spaces found"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-xs">
                            {query
                                ? `We couldn't find any spaces matching "${query}". Try a different search or create it now.`
                                : "This workspace doesn't have any spaces in this category yet."}
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            {query ? (
                                <Button onClick={() => setQuery("")} variant="outline" size="sm">
                                    <X className="mr-2 h-4 w-4" />
                                    Clear search
                                </Button>
                            ) : (
                                <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Space
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {spaces.map((space) => (
                            <SpaceCard
                                key={space.id}
                                space={space}
                                onSelect={(id) => {
                                    onSpaceSelect(id);
                                    onClose();
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {total > pageSize && (
                    <div className="border-t pt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <SpaceCreationModal
                workspaceId={workspaceId}
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                initialName={query}
                onSuccess={(id) => {
                    onSpaceSelect(id);
                    onClose();
                }}
            />
        </div >
    );
}
