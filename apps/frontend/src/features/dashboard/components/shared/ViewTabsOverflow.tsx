"use client";

import { useRef, useState, useLayoutEffect, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, GripVertical, MoreHorizontal, Plus, Pin, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ViewItem {
    id: string;
    name: string;
    type: string;
    isPinned?: boolean;
    isPrivate?: boolean;
    isLocked?: boolean;
    isDefault?: boolean;
    config?: any;
}

interface ViewTabsOverflowProps {
    /** All views to render */
    views: ViewItem[];
    /** Currently active tab value (view id) */
    activeTab: string | undefined;
    /** Called when a tab is clicked */
    onTabChange: (viewId: string) => void;
    /** Render the trigger for each visible tab (the clickable tab element) */
    renderTab: (view: ViewItem, isActive: boolean) => React.ReactNode;
    /** Extra reserved px to subtract from available width (e.g. for +View button) */
    reservedWidth?: number;

    // --- Dropdown specific props ---
    /** Render the icon for a view type */
    getIcon?: (view: ViewItem) => React.ReactNode;
    /** Called when 'Add View' is clicked in the dropdown */
    onAddView?: () => void;
    /** Called when the pin icon is clicked inside the dropdown item */
    onTogglePin?: (view: ViewItem) => void;
    /** Allows parent to wrap the dropdown item in a ContextMenu */
    renderDropdownItem?: (view: ViewItem, itemNode: React.ReactNode) => React.ReactNode;
    /** Exact non-interactive clone of the tab for accurate measurement */
    renderMeasureTab?: (view: ViewItem) => React.ReactNode;
    /** Called when a drag and drop reordering finishes */
    onReorderViews?: (activeId: string, overId: string, dropPosition: 'before' | 'after') => void;
    /** Replaces the static ellipsis with a custom interactive component */
    renderMoreAction?: (view: ViewItem) => React.ReactNode;
}

const MORE_BTN_FIXED_WIDTH = 124; // px fixed width for stable "N more..." button

function DropdownSortableItem({
    view,
    isActive,
    onTabChange,
    setDropdownOpen,
    setSearch,
    getIcon,
    onTogglePin,
    renderMoreAction,
    renderDropdownItem
}: {
    view: ViewItem;
    isActive: boolean;
    onTabChange: (id: string) => void;
    setDropdownOpen: (open: boolean) => void;
    setSearch: (val: string) => void;
    getIcon?: (view: ViewItem) => React.ReactNode;
    onTogglePin?: (view: ViewItem) => void;
    renderMoreAction?: (view: ViewItem) => React.ReactNode;
    renderDropdownItem?: (view: ViewItem, itemNode: React.ReactNode) => React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: view.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const itemNode = (
        <div
            className={cn(
                "group flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md cursor-pointer transition-colors outline-none select-none",
                isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-50 text-slate-700"
            )}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('.view-actions-ignore')) return;
                onTabChange(view.id);
                setDropdownOpen(false);
                setSearch("");
            }}
        >
            <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="flex items-center text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity hover:text-slate-500 view-actions-ignore"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </div>

            {getIcon && (
                <div className="flex items-center justify-center h-4 w-4 shrink-0 opacity-70">
                    {getIcon(view)}
                </div>
            )}

            <span className="flex-1 truncate text-sm">{view.name}</span>

            {/* Actions - visible on hover, or always visible if pinned */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 view-actions-ignore">
                <div
                    role="button"
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-200"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTogglePin?.(view);
                    }}
                >
                    <Pin className={cn("h-3.5 w-3.5", view.isPinned ? "text-primary rotate-45 opacity-100" : "text-muted-foreground")} />
                </div>
                
                {renderMoreAction ? renderMoreAction(view) : (
                    <div
                        role="button"
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-200"
                        title="Right click for options"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}
            </div>

            {view.isPrivate && !view.isPinned && (
                <div className="group-hover:hidden flex items-center ml-auto pl-1 pr-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
            )}
            {view.isPinned && (
                <div className="group-hover:hidden flex items-center ml-auto pr-1">
                    <Pin className="h-3.5 w-3.5 text-primary rotate-45" />
                </div>
            )}
        </div>
    );

    const content = renderDropdownItem ? renderDropdownItem(view, itemNode) : itemNode;

    return (
        <div ref={setNodeRef} style={style}>
            {content}
        </div>
    );
}

function TabSortableItem({ view, isActive, renderTab }: { view: ViewItem, isActive: boolean, renderTab: (v: ViewItem, active: boolean) => React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: view.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="shrink-0 outline-none">
            {renderTab(view, isActive)}
        </div>
    );
}

export function ViewTabsOverflow({
    views,
    activeTab,
    onTabChange,
    renderTab,
    reservedWidth = 0,
    getIcon,
    onAddView,
    onTogglePin,
    renderDropdownItem,
    renderMeasureTab,
    onReorderViews,
    renderMoreAction
}: ViewTabsOverflowProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    // Optimistic state: immediately reflects drag result before TRPC mutation settles
    const [optimisticViews, setOptimisticViews] = useState<ViewItem[] | null>(null);

    // Wipe optimistic state once canonical views prop updates from server
    useEffect(() => {
        setOptimisticViews(null);
    }, [views]);

    // All derived arrays MUST use displayViews so dnd-kit sees the correct item order
    const displayViews = optimisticViews ?? views;

    const [visibleCount, setVisibleCount] = useState(displayViews.length);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [groupByType, setGroupByType] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const dropPositionRef = useRef<'before' | 'after' | null>(null);

    // ─── Compute visible/hidden from displayViews (optimistic-aware) ───────────
    const visibleViews = displayViews.slice(0, visibleCount);
    const hiddenViews = displayViews.slice(visibleCount);
    const hasHidden = hiddenViews.length > 0;

    const activeIsHidden = hasHidden && hiddenViews.some((v) => v.id === activeTab);
    let finalVisible = visibleViews;
    let finalHidden = hiddenViews;
    if (activeIsHidden && activeTab) {
        const activeViewItem = hiddenViews.find((v) => v.id === activeTab);
        if (activeViewItem) {
            if (visibleViews.length > 0) {
                const lastVisible = visibleViews[visibleViews.length - 1];
                finalVisible = [...visibleViews.slice(0, -1), activeViewItem];
                finalHidden = [lastVisible, ...hiddenViews.filter((v) => v.id !== activeTab)];
            } else {
                finalVisible = [activeViewItem];
                finalHidden = hiddenViews.filter((v) => v.id !== activeTab);
            }
        }
    }
    const hiddenCount = finalHidden.length;
    const moreLabel = hiddenCount > 100 ? "N more..." : `${hiddenCount} more...`;
    const moreBtnReserveWidth = MORE_BTN_FIXED_WIDTH;
    // ──────────────────────────────────────────────────────────────────────────

    const handleDragOver = (event: DragOverEvent) => {
        const { over, active } = event;
        const overId = over?.id ? String(over.id) : null;
        const overRect = over?.rect;
        const activeRect = active?.rect.current.translated;

        if (overId && overRect && activeRect) {
            // Classify using the optimistic finalVisible list
            const isHorizontalTab = finalVisible.some(v => v.id === overId);
            let isBefore: boolean;
            if (isHorizontalTab) {
                isBefore = (activeRect.left + activeRect.width / 2) < (overRect.left + overRect.width / 2);
            } else {
                isBefore = (activeRect.top + activeRect.height / 2) < (overRect.top + overRect.height / 2);
            }
            dropPositionRef.current = isBefore ? 'before' : 'after';
        } else {
            dropPositionRef.current = null;
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        const capturedDropPosition = dropPositionRef.current ?? 'after';
        dropPositionRef.current = null;

        if (!over || active.id === over.id) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        // Compute new order from OPTIMISTIC displayViews so result is always correct
        const activeView = displayViews.find((v) => v.id === activeIdStr);
        const overView = displayViews.find((v) => v.id === overIdStr);

        if (activeView && overView) {
            const otherViews = displayViews.filter((v) => v.id !== activeIdStr);

            let targetViewId: string | null = overIdStr;
            if (capturedDropPosition === "after") {
                const overIdxInOther = otherViews.findIndex(v => v.id === overIdStr);
                if (overIdxInOther >= 0 && overIdxInOther < otherViews.length - 1) {
                    targetViewId = otherViews[overIdxInOther + 1].id;
                } else {
                    targetViewId = null;
                }
            }

            let newSortedViews: ViewItem[];
            if (targetViewId !== null) {
                const idx = otherViews.findIndex(v => v.id === targetViewId);
                newSortedViews = [
                    ...otherViews.slice(0, idx),
                    { ...activeView, isPinned: overView.isPinned },
                    ...otherViews.slice(idx),
                ];
            } else {
                newSortedViews = [...otherViews, { ...activeView, isPinned: overView.isPinned }];
            }

            // Preserve pinned-first ordering (mirrors server sort)
            newSortedViews.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return 0;
            });

            // Apply immediately — zero latency
            setOptimisticViews(newSortedViews);
        }

        // Fire the mutation (will eventually wipe optimisticViews via useEffect)
        onReorderViews?.(activeIdStr, overIdStr, capturedDropPosition);
    };

    const measure = useCallback(() => {
        const container = containerRef.current;
        const measureEl = measureRef.current;
        if (!container || !measureEl) return;

        const totalAvailable = container.offsetWidth - reservedWidth;
        const tabEls = Array.from(measureEl.children) as HTMLElement[];
        if (tabEls.length === 0) return;

        const widths = tabEls.map((el) => el.offsetWidth);
        const total = widths.reduce((a, b) => a + b, 0);

        if (total <= totalAvailable) {
            setVisibleCount(displayViews.length);
            return;
        }

        const availableWithBtn = totalAvailable - moreBtnReserveWidth;
        let sum = 0;
        let count = 0;
        for (const w of widths) {
            if (sum + w > availableWithBtn) break;
            sum += w;
            count++;
        }
        setVisibleCount(Math.max(1, count));
    }, [reservedWidth, displayViews.length, moreBtnReserveWidth]);

    useLayoutEffect(() => {
        measure();
    }, [displayViews, measure]);

    useEffect(() => {
        const observer = new ResizeObserver(() => measure());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [measure]);

    // Dropdown filtered list
    const filteredHiddenViews = finalHidden.filter(
        (v) => {
            if (!v) return false;
            const searchLower = (search || "").toLowerCase();
            const nameLower = (v.name || "").toLowerCase();
            const typeLower = (v.type || "").toLowerCase();
            return nameLower.includes(searchLower) || typeLower.includes(searchLower);
        }
    );
    const pinnedViews = filteredHiddenViews.filter((v) => v.isPinned);
    const unpinnedViews = filteredHiddenViews.filter((v) => !v.isPinned);
    const unpinnedGroupedByType = unpinnedViews.reduce<Record<string, ViewItem[]>>((acc, v) => {
        const key = (v.type || "OTHER").replaceAll("_", " ");
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
        return acc;
    }, {});
    const groupedTypeEntries = Object.entries(unpinnedGroupedByType).sort(([a], [b]) => a.localeCompare(b));

    const renderNode = (view: ViewItem) => (
        <DropdownSortableItem
            key={view.id}
            view={view}
            isActive={view.id === activeTab}
            onTabChange={onTabChange}
            setDropdownOpen={setDropdownOpen}
            setSearch={setSearch}
            getIcon={getIcon}
            onTogglePin={onTogglePin}
            renderMoreAction={renderMoreAction}
            renderDropdownItem={renderDropdownItem}
        />
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div ref={containerRef} className="flex items-center min-w-0 flex-1 relative">
                {/* Invisible measurement layer — canonical views for stable tab sizing */}
                <div
                    ref={measureRef}
                    className="fixed top-[-9999px] left-[-9999px] invisible pointer-events-none flex items-center whitespace-nowrap"
                    aria-hidden
                >
                    {views.map((view) => (
                        <div key={view.id} className="shrink-0">
                            {renderMeasureTab ? renderMeasureTab(view) : (
                                <div className="flex items-center gap-1.5 h-10 px-3 text-sm shrink-0 font-medium">
                                    {getIcon && <div className="h-4 w-4 shrink-0" />}
                                    <span className="max-w-[120px] truncate">{view.name}</span>
                                    {view.isPinned && <span className="w-3 h-3 inline-block" />}
                                    {view.isPrivate && <span className="w-3 h-3 inline-block" />}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Visible tabs — SortableContext ids reflect optimistic finalVisible */}
                <SortableContext items={finalVisible.map(v => v.id)} strategy={horizontalListSortingStrategy}>
                    {finalVisible.map((view) => (
                        <TabSortableItem key={view.id} view={view} isActive={view.id === activeTab} renderTab={renderTab} />
                    ))}
                </SortableContext>

                {/* Overflow "N more..." button */}
                {hasHidden && (
                    <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-10 px-3 py-2 ml-0.5 shrink-0 whitespace-nowrap text-sm font-medium rounded-md",
                                    "text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors",
                                    activeIsHidden && "text-primary font-semibold"
                                )}
                                style={{ width: `${MORE_BTN_FIXED_WIDTH}px` }}
                            >
                                <span>{moreLabel}</span>
                                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            side="bottom"
                            className="w-64 p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                            sideOffset={4}
                            onInteractOutside={(e) => {
                                if ((e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]')) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            {/* Search */}
                            <div className="p-2 border-b border-slate-100 shrink-0">
                                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5">
                                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
                                    <Input
                                        variant="ghost"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search views..."
                                        className="h-full border-0 bg-transparent pl-2 pr-0 text-sm shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* View list */}
                            <div className="max-h-80 overflow-y-auto py-2">
                                {filteredHiddenViews.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                        No views found
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
                                            {(search.trim() ? filteredHiddenViews.length : finalHidden.length)} view{(search.trim() ? filteredHiddenViews.length : finalHidden.length) !== 1 ? "s" : ""}
                                        </div>
                                        {pinnedViews.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-3 pb-1">
                                                    <div className="text-xs font-semibold text-foreground/80">
                                                        Pinned ({pinnedViews.length})
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">Pin views to reorder</div>
                                                </div>
                                                <SortableContext items={pinnedViews.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                                    <div className="mt-1 flex flex-col gap-[1px]">
                                                        {pinnedViews.map(view => renderNode(view))}
                                                    </div>
                                                </SortableContext>
                                            </div>
                                        )}

                                        {pinnedViews.length > 0 && unpinnedViews.length > 0 && (
                                            <div className="h-px bg-slate-100 my-2 mx-2" />
                                        )}

                                        {unpinnedViews.length > 0 && (
                                            <div>
                                                <div className="px-3 pb-1 flex items-center justify-between">
                                                    <div className="text-xs font-semibold text-foreground/80">Views</div>
                                                    <button
                                                        type="button"
                                                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
                                                        onClick={() => setGroupByType((v) => !v)}
                                                    >
                                                        {groupByType ? "Ungroup" : "Group by type"}
                                                    </button>
                                                </div>
                                                {groupByType ? (
                                                    <div className="mt-1 space-y-2">
                                                        {groupedTypeEntries.map(([typeName, viewsInType]) => (
                                                            <div key={typeName}>
                                                                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                    {typeName} ({viewsInType.length})
                                                                </div>
                                                                <SortableContext items={viewsInType.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                                                    <div className="flex flex-col gap-[1px]">
                                                                        {viewsInType.map(view => renderNode(view))}
                                                                    </div>
                                                                </SortableContext>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <SortableContext items={unpinnedViews.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="mt-1 flex flex-col gap-[1px]">
                                                            {unpinnedViews.map(view => renderNode(view))}
                                                        </div>
                                                    </SortableContext>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </DndContext>
    );
}
