"use client";

import { TASK_LIST_PAGE_SIZE } from "@/features/dashboard/constants";
import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { VirtualizedDivRows } from "@/features/dashboard/components/shared/VirtualizedListRows";
import { getCustomFieldIcon, collectUsedCustomFieldIds } from "@/features/dashboard/utils/taskViewUtils";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus,
    Search,
    Filter,
    Settings,
    Users,
    ListChecks,
    CheckCircle2,
    Calendar,
    Clock,
    Flag,
    Activity,
    MessageSquare,
    Paperclip,
    X,
    LayoutList,
    Type,
    Hash,
    CheckSquare,
    Globe,
    Mail,
    Phone,
    Tag,
    DollarSign,
    FunctionSquare,
    Link2,
    TrendingUp,
    SlidersHorizontal,
    FileText,
    Heart,
    MapPin,
    Star,
    PenTool,
    MousePointer,
    Target,
    AlignLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";
import { Switch } from "@/components/ui/switch";
import type { FilterCondition, FilterGroup, FilterOperator } from "./listViewTypes";
import { STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup } from "./filterUtils";
import { ListViewFilterPopoverContent } from "./ListViewFilterPopoverContent";

interface ActivityViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    folderId?: string;
    viewId?: string;
    workspaceId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

const getPriorityColor = (p: string | null | undefined) => {
    switch (p) {
        case "URGENT": return "text-red-600 bg-red-50";
        case "HIGH": return "text-orange-600 bg-orange-50";
        case "NORMAL": return "text-blue-600 bg-blue-50";
        case "LOW": return "text-zinc-500 bg-zinc-100";
        default: return "text-zinc-400 bg-zinc-50";
    }
};

const getPriorityIcon = (p: string | null | undefined) => {
    return <Flag className={cn("h-3 w-3", getPriorityColor(p)?.split(" ")[0])} />;
};

export function ActivityView({ spaceId, projectId, teamId, listId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect }: ActivityViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(selectedTaskIdFromParent || null);

    // Toolbar state to match ListView
    const [isToolbarSearchOpen, setIsToolbarSearchOpen] = useState(false);
    const toolbarSearchContainerRef = useRef<HTMLDivElement | null>(null);
    const toolbarSearchInputRef = useRef<HTMLInputElement | null>(null);
    const activityScrollRef = useRef<HTMLDivElement | null>(null);

    // Customize Panel State
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [viewNameDraft, setViewNameDraft] = useState("Activity View");
    const [showTaskProperties, setShowTaskProperties] = useState(true);

    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; config: FilterGroup }[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("agentflox_saved_filters");
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [filterSearch, setFilterSearch] = useState("");
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);

    const updateViewMutation = trpc.view.update.useMutation();

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups)),
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, unknown>;
                const activityView = (raw as { activityView?: Record<string, unknown> }).activityView ?? {};
                void updateViewMutation.mutateAsync({
                    id: viewId,
                    config: { ...raw, activityView: { ...activityView, savedFilterPresets: next } },
                });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId, initialConfig, updateViewMutation]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, unknown>;
                const activityView = (raw as { activityView?: Record<string, unknown> }).activityView ?? {};
                void updateViewMutation.mutateAsync({
                    id: viewId,
                    config: { ...raw, activityView: { ...activityView, savedFilterPresets: next } },
                });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId, initialConfig, updateViewMutation]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    const addFilterCondition = (groupId: string = "root") => {
        const newCond: FilterCondition = {
            id: Math.random().toString(36).substring(7),
            field: "",
            operator: "is",
            value: [],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, conditions: [...group.conditions, newCond] };
            return { ...group, conditions: group.conditions.map(c => ("conditions" in c ? update(c as FilterGroup) : c)) };
        };
        setFilterGroups(update(filterGroups));
    };

    const addFilterGroup = (parentId: string = "root") => {
        const newGroup: FilterGroup = {
            id: Math.random().toString(36).substring(7),
            operator: "AND",
            conditions: [{
                id: Math.random().toString(36).substring(7),
                field: "",
                operator: "is",
                value: [],
            }],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newGroup] };
            return { ...group, conditions: group.conditions.map(c => ("conditions" in c ? update(c as FilterGroup) : c)) };
        };
        setFilterGroups(update(filterGroups));
    };

    const removeFilterItem = (id: string) => {
        if (id === "root") {
            setFilterGroups({ ...filterGroups, conditions: [] });
            return;
        }
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions
                .filter(c => c.id !== id)
                .map(c => ("conditions" in c ? update(c as FilterGroup) : c)),
        });
        setFilterGroups(update(filterGroups));
    };

    const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions.map(c => {
                if (c.id === id) return { ...c, ...updates } as FilterCondition;
                return "conditions" in c ? update(c as FilterGroup) : c;
            }),
        });
        const updatedGroups = update(filterGroups);

        const isValueUpdate = "value" in updates;
        let shouldCleanup = false;

        if (isValueUpdate) {
            const findCondition = (group: FilterGroup): FilterCondition | null => {
                for (const c of group.conditions) {
                    if (c.id === id && !("conditions" in c)) {
                        return c as FilterCondition;
                    }
                    if ("conditions" in c) {
                        const found = findCondition(c as FilterGroup);
                        if (found) return found;
                    }
                }
                return null;
            };

            const updatedCondition = findCondition(updatedGroups);
            if (updatedCondition && hasFilterValue(updatedCondition)) {
                shouldCleanup = hasAnyValueInGroup(updatedGroups);
            }
        }

        if (shouldCleanup) {
            const removeEmptyFilters = (group: FilterGroup): FilterGroup => {
                const filteredConditions = group.conditions
                    .filter(c => {
                        if ("conditions" in c) {
                            const cleanedGroup = removeEmptyFilters(c as FilterGroup);
                            return cleanedGroup.conditions.length > 0;
                        }
                        const cond = c as FilterCondition;
                        return !!(cond.field && cond.field.trim().length > 0 && hasFilterValue(cond));
                    })
                    .map(c => ("conditions" in c ? removeEmptyFilters(c as FilterGroup) : c));

                return { ...group, conditions: filteredConditions };
            };

            setFilterGroups(removeEmptyFilters(updatedGroups));
        } else {
            setFilterGroups(updatedGroups);
        }
    };

    const updateFilterGroupOperator = (id: string, operator: FilterOperator) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => ("conditions" in c ? update(c as FilterGroup) : c)) };
        };
        setFilterGroups(update(filterGroups));
    };

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: newName.trim() });
        } catch (e) {
            console.error("Failed to update name");
        }
    };

    useEffect(() => {
        if (!isToolbarSearchOpen) return;
        const raf = requestAnimationFrame(() => {
            toolbarSearchInputRef.current?.focus();
        });
        const handleOutsideClick = (event: MouseEvent) => {
            if (toolbarSearchContainerRef.current && !toolbarSearchContainerRef.current.contains(event.target as Node)) {
                setIsToolbarSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isToolbarSearchOpen]);

    const {
        resolvedWorkspaceId,
        customFields,
        availableTaskTypes,
        workspaceMembers,
        projectParticipants,
        teamParticipants,
        listsData,
        currentList,
        tasks: rawTasks,
        isTasksLoading,
        hasMore: hasMoreTasks,
        isFetchingNextPage,
        loadMoreRef,
        total: taskTotal,
    } = useGenericTaskViewData({ spaceId, projectId, teamId, listId, workspaceId, includeRelations: "card" });

    const usedCustomFieldIds = useMemo(() => collectUsedCustomFieldIds(rawTasks), [rawTasks]);

    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false as const }));
        const customFieldsConfig = (customFields as { id: string; name: string; type: string }[])
            .filter(cf => usedCustomFieldIds.has(cf.id))
            .map(cf => {
                const IconComponent = getCustomFieldIcon(cf.type);
                return {
                    id: cf.id,
                    label: cf.name,
                    icon: IconComponent,
                    isCustom: true as const,
                    customField: cf,
                };
            });
        return [...standardFields, ...customFieldsConfig];
    }, [customFields, usedCustomFieldIds]);

    const allAvailableStatuses = useMemo(() => {
        if (listId && currentList?.statuses) {
            return (currentList.statuses as { id: string; name: string; color: string }[]).map((s: { id: string; name: string; color: string }) => ({
                ...s,
                listId: currentList.id,
            }));
        }
        if (listsData?.items) {
            const statusMap = new Map<string, { id: string; name: string; color: string; listId: string }>();
            (listsData.items as { id: string; statuses?: { id: string; name: string; color: string }[] }[]).forEach((list: { id: string; statuses?: { id: string; name: string; color: string }[] }) => {
                (list.statuses || []).forEach((s: { id: string; name: string; color: string }) => {
                    if (!statusMap.has(s.id)) statusMap.set(s.id, { ...s, listId: list.id });
                });
            });
            return Array.from(statusMap.values());
        }
        return [];
    }, [listId, currentList, listsData]);

    const allAvailableTags = useMemo(() => {
        const tagSet = new Set<string>();
        rawTasks.forEach((t: { tags?: string[] }) => {
            (t.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [rawTasks]);

    const workspaceUserById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        for (const m of workspaceMembers ?? []) {
            const u = (m as { user?: { id: string; name?: string | null; email?: string | null; image?: string | null } }).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspaceMembers]);

    const users = useMemo(() => {
        if (teamId && teamParticipants?.users?.length) {
            return (teamParticipants.users as { id: string; name?: string | null; email?: string | null }[]).map(u => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        if (projectId && projectParticipants?.users?.length) {
            return (projectParticipants.users as { id: string; name?: string | null; email?: string | null }[]).map(u => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        return Array.from(workspaceUserById.values()).map(u => ({ id: u.id, name: u.name, image: u.image ?? null, email: u.email ?? null }));
    }, [teamId, teamParticipants?.users, projectId, projectParticipants?.users, workspaceUserById]);

    const tasks = useMemo(() => {
        if (!rawTasks.length) return [];
        let filtered = [...rawTasks];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t: { name?: string; title?: string; description?: string | null }) =>
                    ((t.title || t.name || "") as string).toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
            );
        }

        if (filterAssignee.length > 0) {
            const hasUnassigned = filterAssignee.includes("__unassigned__");
            const assigneeIds = filterAssignee.filter(id => id !== "__unassigned__");
            filtered = filtered.filter((t: { assignees?: { user?: { id: string } }[] }) => {
                const assignees = t.assignees ?? [];
                const hasAnyAssignee = assignees.length > 0;
                const matchesAssigned =
                    assigneeIds.length > 0 ? assignees.some((a: { user?: { id: string } }) => assigneeIds.includes(a.user?.id ?? "")) : false;
                const matchesUnassigned = hasUnassigned && !hasAnyAssignee;
                return matchesAssigned || matchesUnassigned;
            });
        }

        if (filterGroups.conditions.length > 0) {
            filtered = filtered.filter(t => evaluateGroup(t, filterGroups));
        }

        return filtered.sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt || 0).getTime();
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    }, [rawTasks, searchQuery, filterAssignee, filterGroups]);

    const renderFilterContent = (opts?: { onClose?: () => void }) => (
        <ListViewFilterPopoverContent
            onClose={opts?.onClose ?? (() => setFiltersPanelOpen(false))}
            savedFiltersPanelOpen={savedFiltersPanelOpen}
            setSavedFiltersPanelOpen={setSavedFiltersPanelOpen}
            savedFiltersSearch={savedFiltersSearch}
            setSavedFiltersSearch={setSavedFiltersSearch}
            savedFilterName={savedFilterName}
            setSavedFilterName={setSavedFilterName}
            savedFilters={savedFilters}
            saveNewFilter={saveNewFilter}
            deleteSavedFilter={deleteSavedFilter}
            applySavedFilter={applySavedFilter}
            filterGroups={filterGroups}
            setFilterGroups={setFilterGroups}
            addFilterGroup={addFilterGroup}
            addFilterCondition={addFilterCondition}
            removeFilterItem={removeFilterItem}
            updateFilterCondition={updateFilterCondition}
            updateFilterGroupOperator={updateFilterGroupOperator}
            filterSearch={filterSearch}
            setFilterSearch={setFilterSearch}
            assigneesSearch={assigneesSearch}
            setAssigneesSearch={setAssigneesSearch}
            FIELD_CONFIG={FIELD_CONFIG}
            users={users}
            allAvailableStatuses={allAvailableStatuses}
            allAvailableTags={allAvailableTags}
            availableTaskTypes={availableTaskTypes}
            resolvedWorkspaceId={resolvedWorkspaceId}
        />
    );

    const handleTaskClick = (taskId: string) => {
        if (onTaskSelect) {
            onTaskSelect(taskId);
        } else {
            setSelectedTaskId(taskId);
        }
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="h-full w-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden font-sans relative min-w-0">
                {/* Toolbar matching ListView design exactly */}
                <div className="border-b border-zinc-100 bg-white px-3 py-2 shrink-0">
                    <div className="flex items-center justify-between gap-3 overflow-x-auto">
                        {/* Left side (empty or basic view tools if needed) */}
                        <div className="flex items-center gap-1.5 flex-1">
                            {/* Empty space for left toolbar components if any */}
                        </div>

                        {/* Right: Save view, Filter, Closed, Assignee, Search, Customize, Add Task */}
                        <div className="flex items-center gap-2 flex-1 justify-end shrink-0">
                            <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                                setFiltersPanelOpen(open);
                                if (open === true) {
                                    setAssigneesPanelOpen(false);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <div className="relative group/filter inline-flex">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 text-xs font-medium pr-7 bg-white hover:bg-zinc-100 shadow-none",
                                                        filtersPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                                        appliedFilterCount > 0 && "border-violet-200 text-violet-700",
                                                    )}
                                                    onClick={() => {
                                                        if (!filtersPanelOpen && filterGroups.conditions.length === 0) {
                                                            addFilterGroup();
                                                        }
                                                    }}
                                                >
                                                    <Filter className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline ml-1">
                                                        {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Filter tasks</TooltipContent>
                                        </Tooltip>
                                        {(appliedFilterCount > 0 || filtersPanelOpen) && (
                                            <div
                                                className={cn(
                                                    "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md hover:bg-violet-100 cursor-pointer z-10",
                                                    filtersPanelOpen ? "text-violet-700" : "text-zinc-400",
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (appliedFilterCount > 0) {
                                                        setFilterGroups({ id: "root", operator: "AND", conditions: [] });
                                                    } else {
                                                        setFiltersPanelOpen(false);
                                                    }
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[600px] max-w-[95vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={8}>
                                    {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                                </PopoverContent>
                            </Popover>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none",
                                            assigneesPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                        )}
                                        onClick={() => {
                                            setAssigneesPanelOpen(!assigneesPanelOpen);
                                            setFiltersPanelOpen(false);
                                        }}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Assignee</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                            </Tooltip>

                            <div ref={toolbarSearchContainerRef} className="hidden sm:block">
                                {isToolbarSearchOpen ? (
                                    <div className="w-56 min-w-[12rem]">
                                        <div className="flex items-center h-8 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2">
                                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                            <Input
                                                ref={toolbarSearchInputRef}
                                                variant="ghost"
                                                className="h-full px-2 text-sm border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                                placeholder="Search..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") {
                                                        setIsToolbarSearchOpen(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none"
                                                onClick={() => setIsToolbarSearchOpen(true)}
                                                title="Search"
                                            >
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Search tasks</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none",
                                            customizePanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                        )}
                                        onClick={() => setCustomizePanelOpen(true)}
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Customize</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Customize view</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 shadow-sm"
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Add Task</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Add new task</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 bg-[#f7f8f9] relative">
                    <ScrollArea ref={activityScrollRef} className="h-full">
                        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
                                        <Activity className="h-6 w-6 text-brand-500" />
                                        Activity Stream
                                    </h1>
                                    <p className="text-sm text-zinc-500 mt-1">Recent updates and tasks in this view.</p>
                                </div>
                            </div>

                            {isTasksLoading ? (
                                <div className="flex flex-col space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex gap-4">
                                            <div className="w-10 h-10 bg-zinc-100 rounded-full shrink-0" />
                                            <div className="space-y-3 flex-1">
                                                <div className="h-4 bg-zinc-100 rounded w-1/3" />
                                                <div className="h-3 bg-zinc-100 rounded w-full" />
                                                <div className="h-3 bg-zinc-100 rounded w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-300">
                                    <Activity className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium text-zinc-900">No activity yet</h3>
                                    <p className="text-zinc-500 mt-1 text-sm">There are no tasks or recent activities to show here.</p>
                                </div>
                            ) : (
                                <VirtualizedDivRows
                                    scrollRef={activityScrollRef}
                                    rowCount={tasks.length}
                                    estimateSize={152}
                                    className="space-y-4"
                                    renderRow={(idx) => {
                                        const task = tasks[idx] as any;
                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => handleTaskClick(task.id)}
                                                className="bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                                            >
                                                <div className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        {/* Status/Type Icon Indicator */}
                                                        <div className="mt-1 shrink-0">
                                                            <div
                                                                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                                                style={{ backgroundColor: task.status?.color || '#cbd5e1' }}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-4 mb-1">
                                                                <h3 className="text-base font-medium text-zinc-900 truncate group-hover:text-brand-600 transition-colors">
                                                                    {task.name}
                                                                </h3>
                                                                <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {format(new Date(task.updatedAt || task.createdAt || Date.now()), 'MMM d, h:mm a')}
                                                                </span>
                                                            </div>

                                                            {showTaskProperties && (
                                                                <div className="flex flex-wrap items-center gap-3 text-sm mt-2 text-zinc-500">
                                                                    {task.status && (
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
                                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.status.color }} />
                                                                            {task.status.name}
                                                                        </span>
                                                                    )}

                                                                    {task.priority && (
                                                                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", getPriorityColor(task.priority))}>
                                                                            {getPriorityIcon(task.priority)}
                                                                            {task.priority.toLowerCase()}
                                                                        </span>
                                                                    )}

                                                                    {task.dueDate && (
                                                                        <span className="flex items-center gap-1 text-xs">
                                                                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                                                            <span className={new Date(task.dueDate) < new Date() ? "text-red-500" : ""}>
                                                                                {format(new Date(task.dueDate), "MMM d")}
                                                                            </span>
                                                                        </span>
                                                                    )}

                                                                    {task.assignees?.length > 0 && (
                                                                        <div className="flex -space-x-1 ml-auto">
                                                                            {task.assignees.map((assigneeObj: any) => {
                                                                                const entity = assigneeObj.user || assigneeObj.agent || assigneeObj.team;
                                                                                if (!entity) return null;
                                                                                const name = entity.name || "Unknown";
                                                                                const image = entity.image || entity.avatar || undefined;
                                                                                const id = entity.id || Math.random().toString();
                                                                                return (
                                                                                    <Avatar key={id} className="h-5 w-5 border-2 border-white">
                                                                                        <AvatarImage src={image} />
                                                                                        <AvatarFallback className="text-[9px] bg-brand-100 text-brand-700">
                                                                                            {name.charAt(0).toUpperCase()}
                                                                                        </AvatarFallback>
                                                                                    </Avatar>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                                                                <div className="flex gap-4">
                                                                    <span className="flex items-center gap-1.5 hover:text-zinc-800">
                                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                                        Discuss
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 hover:text-zinc-800">
                                                                        <ListChecks className="h-3.5 w-3.5" />
                                                                        {task.subtasks?.length || 0} subtasks
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 hover:text-zinc-800">
                                                                        <Paperclip className="h-3.5 w-3.5" />
                                                                        Files
                                                                    </span>
                                                                </div>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">Activity details</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            )}
                            <TaskListLoadMore
                                loadMoreRef={loadMoreRef}
                                hasMore={hasMoreTasks}
                                isFetchingNextPage={isFetchingNextPage}
                                loaded={tasks.length}
                                total={taskTotal}
                            />
                        </div>
                    </ScrollArea>
                </div>

                {/* Customize view panel */}
                <SidePanel
                    open={customizePanelOpen}
                    onClose={() => setCustomizePanelOpen(false)}
                    className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                        <h3 className="font-semibold text-zinc-900">Customize view</h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-3 space-y-2 pb-24">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                    <LayoutList className="h-5 w-5 text-zinc-600" />
                                </div>
                                <Input
                                    value={viewNameDraft}
                                    onChange={(e) => setViewNameDraft(e.target.value)}
                                    onBlur={() => updateViewName(viewNameDraft)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            updateViewName(viewNameDraft);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="h-10 text-sm font-medium border-zinc-200"
                                    placeholder="View name"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show task properties</span>
                                    <Switch
                                        checked={showTaskProperties}
                                        onCheckedChange={setShowTaskProperties}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </SidePanel>

                {assigneesPanelOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setAssigneesPanelOpen(false)} aria-hidden />
                        <div className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Assignees</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssigneesPanelOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="p-3 border-b border-zinc-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        className="pl-9 h-9 text-sm"
                                        placeholder="Search by user or team"
                                        value={assigneesSearch}
                                        onChange={e => setAssigneesSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-3">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">People {users.length}</p>
                                <div className="space-y-1 mb-4">
                                    <label className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                        <Checkbox
                                            checked={filterAssignee.includes("__unassigned__")}
                                            onCheckedChange={(checked) => {
                                                setFilterAssignee(prev =>
                                                    checked ? [...prev, "__unassigned__"] : prev.filter(id => id !== "__unassigned__"),
                                                );
                                            }}
                                        />
                                        <span className="text-sm text-zinc-700">Unassigned</span>
                                    </label>
                                    {users
                                        .filter(u => !assigneesSearch.trim() || (u.name || "").toLowerCase().includes(assigneesSearch.toLowerCase()))
                                        .map(u => (
                                            <label key={u.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                                <Checkbox
                                                    checked={filterAssignee.includes(u.id)}
                                                    onCheckedChange={(checked) => {
                                                        setFilterAssignee(prev =>
                                                            checked ? [...prev, u.id] : prev.filter(id => id !== u.id),
                                                        );
                                                    }}
                                                />
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={u.image || undefined} />
                                                    <AvatarFallback className="text-[9px]">
                                                        {u.name?.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-zinc-700 truncate">{u.name}</span>
                                            </label>
                                        ))}
                                </div>
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Teams 0</p>
                                <div className="py-2 text-sm text-zinc-500">No teams</div>
                            </ScrollArea>
                            <div className="p-3 border-t border-zinc-100 flex items-center justify-between">
                                <span className="text-sm text-zinc-700 flex items-center gap-1.5">
                                    <MessageSquare className="h-4 w-4 text-zinc-400" /> Assigned comments
                                </span>
                                <Switch />
                            </div>
                        </div>
                    </>
                )}

                {isCreateModalOpen && (
                    <TaskCreationModal
                        context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                        contextId={spaceId || projectId}
                        workspaceId={resolvedWorkspaceId}
                        users={users}
                        lists={(listsData?.items ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))}
                        defaultListId={listId}
                        availableStatuses={allAvailableStatuses}
                        open={isCreateModalOpen}
                        onOpenChange={setIsCreateModalOpen}
                        trigger={<span className="sr-only" />}
                    />
                )}

                {selectedTaskIdFromParent === undefined && selectedTaskId && (
                    <TaskDetailModal
                        taskId={selectedTaskId}
                        open={!!selectedTaskId}
                        onOpenChange={(open) => !open && setSelectedTaskId(null)}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}