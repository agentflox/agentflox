"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Trash2, X, Info, ChevronDown, Box, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { FilterCondition, FilterGroup, FilterOperator } from "./viewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS } from "./viewConstants";
import { hasFilterValue, hasAnyValueInGroup } from "./filterUtils";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";

function getPriorityStyles(p: string) {
    if (p === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600" };
    if (p === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600" };
    if (p === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600" };
    if (p === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500" };
    return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400" };
}

export type ViewFilterPopoverContentProps = {
    onClose?: () => void;
    savedFiltersPanelOpen: boolean;
    setSavedFiltersPanelOpen: (open: boolean) => void;
    savedFiltersSearch: string;
    setSavedFiltersSearch: (v: string) => void;
    savedFilterName: string;
    setSavedFilterName: (v: string) => void;
    savedFilters: { id: string; name: string; config: FilterGroup }[];
    saveNewFilter: () => void | Promise<void>;
    deleteSavedFilter: (id: string, e: React.MouseEvent) => void;
    applySavedFilter: (config: FilterGroup) => void;
    filterGroups: FilterGroup;
    setFilterGroups: React.Dispatch<React.SetStateAction<FilterGroup>>;
    addFilterGroup: (parentId?: string) => void;
    addFilterCondition: (groupId?: string) => void;
    removeFilterItem: (id: string) => void;
    updateFilterCondition: (id: string, updates: Partial<FilterCondition>) => void;
    updateFilterGroupOperator: (id: string, operator: FilterOperator) => void;
    filterSearch: string;
    setFilterSearch: (v: string) => void;
    assigneesSearch: string;
    setAssigneesSearch: (v: string) => void;
    FIELD_CONFIG: { id: string; label: string; icon: any; isCustom?: boolean }[];
    users: { id: string; name?: string | null; image?: string | null; email?: string | null }[];
    allAvailableStatuses: { id: string; name: string; color?: string }[];
    allAvailableTags: string[];
    availableTaskTypes: any[];
    resolvedWorkspaceId: string | undefined;
};

export function ViewFilterPopoverContent(props: ViewFilterPopoverContentProps) {
    const {
        onClose,
        savedFiltersPanelOpen,
        setSavedFiltersPanelOpen,
        savedFiltersSearch,
        setSavedFiltersSearch,
        savedFilterName,
        setSavedFilterName,
        savedFilters,
        saveNewFilter,
        deleteSavedFilter,
        applySavedFilter,
        filterGroups,
        setFilterGroups,
        addFilterGroup,
        addFilterCondition,
        removeFilterItem,
        updateFilterCondition,
        updateFilterGroupOperator,
        filterSearch,
        setFilterSearch,
        assigneesSearch,
        setAssigneesSearch,
        FIELD_CONFIG,
        users,
        allAvailableStatuses,
        allAvailableTags,
        availableTaskTypes,
        resolvedWorkspaceId,
    } = props;

    return (
        <div className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                <div>
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-base">
                        Filters
                        <Info className="h-4 w-4 text-zinc-400" />
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={savedFiltersPanelOpen} onOpenChange={setSavedFiltersPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold gap-1.5 border-zinc-200 shadow-none hover:bg-white"
                            >
                                Saved filters
                                <ChevronDown className={cn("h-3 w-3 transition-transform", savedFiltersPanelOpen && "rotate-180")} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl">
                            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                                <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                    <Input
                                        variant="ghost"
                                        placeholder="Search..."
                                        className="h-full px-2 text-xs border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                        value={savedFiltersSearch}
                                        onChange={e => setSavedFiltersSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-auto">
                                {savedFilters.length === 0 ? (
                                    <div className="p-8 text-center bg-white">
                                        <p className="text-xs text-zinc-400">No saved filters yet</p>
                                    </div>
                                ) : (
                                    <div className="p-1 space-y-0.5 bg-white">
                                        <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Workspace</p>
                                        {savedFilters
                                            .filter(f => !savedFiltersSearch || f.name.toLowerCase().includes(savedFiltersSearch.toLowerCase()))
                                            .map(f => (
                                                <div
                                                    key={f.id}
                                                    className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors"
                                                    onClick={() => applySavedFilter(f.config)}
                                                >
                                                    <span className="text-xs font-medium text-zinc-700">{f.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200"
                                                        onClick={(e) => deleteSavedFilter(f.id, e)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-zinc-400" />
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 border-t border-zinc-100 bg-zinc-50/30">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Name..."
                                        className="h-8 text-xs flex-1"
                                        value={savedFilterName}
                                        onChange={e => setSavedFilterName(e.target.value)}
                                    />
                                    <Button
                                        className="h-8 text-xs font-bold bg-zinc-900 hover:bg-black text-white px-3"
                                        onClick={saveNewFilter}
                                        disabled={!savedFilterName.trim()}
                                    >
                                        Save new filter
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100" onClick={() => onClose?.()}><X className="h-4 w-4" /></Button>
                </div>
            </div>

            {filterGroups.conditions.length === 0 ? (
                <div className="p-6 h-[88px]">
                    <Button
                        className="h-9 px-3 text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-sm cursor-pointer"
                        onClick={() => addFilterGroup()}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add filter
                    </Button>
                </div>
            ) : (
                <ScrollArea className="p-5 text-sm h-[350px]">
                    <div className="space-y-4">
                        <div className="space-y-4">
                            {/* Render each top-level group */}
                            {(() => {
                                const hasAnyValueAtRoot = filterGroups.conditions.some(c => {
                                    if ("conditions" in c) {
                                        return hasAnyValueInGroup(c as FilterGroup);
                                    }
                                    return hasFilterValue(c as FilterCondition);
                                });

                                // If any group has a value, only show groups with values
                                // BUT always show ALL empty groups at the end to allow adding multiple filters
                                const visibleGroups = hasAnyValueAtRoot
                                    ? (() => {
                                        const groupsWithValues = filterGroups.conditions.filter(c => {
                                            if ("conditions" in c) {
                                                return hasAnyValueInGroup(c as FilterGroup);
                                            }
                                            return hasFilterValue(c as FilterCondition);
                                        });
                                        // Include ALL empty groups at the end (not just the last one)
                                        const emptyGroups = filterGroups.conditions.filter(c => {
                                            if ("conditions" in c) {
                                                return !hasAnyValueInGroup(c as FilterGroup);
                                            }
                                            return !hasFilterValue(c as FilterCondition);
                                        });
                                        // Return groups with values first, then all empty groups
                                        return [...groupsWithValues, ...emptyGroups];
                                    })()
                                    : filterGroups.conditions;

                                return visibleGroups.map((groupItem, visibleGroupIdx) => {
                                    const isGroup = "conditions" in groupItem;
                                    if (!isGroup) {
                                        // This shouldn't happen at root level, but handle it gracefully
                                        return null;
                                    }
                                    const group = groupItem as FilterGroup;

                                    // Find the original index in the full conditions array for "where" label logic
                                    const originalIdx = filterGroups.conditions.findIndex(c => c.id === group.id);
                                    const isFirstWithValue = hasAnyValueAtRoot && visibleGroupIdx === 0;
                                    const shouldShowWhere = !hasAnyValueAtRoot ? (originalIdx === 0) : isFirstWithValue;
                                    const shouldShowOperator = visibleGroups.length > 1 && visibleGroupIdx === 1;

                                    return (
                                        <div key={group.id} className="flex gap-3 items-start">
                                            {/* Operator selector for inter-group logic - only show when multiple groups */}
                                            {visibleGroups.length > 1 && (
                                                <div className="w-[60px] flex justify-end items-center shrink-0">
                                                    {shouldShowWhere ? (
                                                        <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                    ) : shouldShowOperator ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                            onClick={() => updateFilterGroupOperator("root", filterGroups.operator === "AND" ? "OR" : "AND")}
                                                        >
                                                            {filterGroups.operator}
                                                            <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                        </Button>
                                                    ) : (
                                                        <div className="pr-3 flex items-center h-8">
                                                            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{filterGroups.operator}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Group block */}
                                            <div className="flex-1 p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100/80 space-y-4">
                                                {/* Render conditions within this group */}
                                                {(() => {
                                                    const hasAnyValue = hasAnyValueInGroup(group);
                                                    // If any condition has a value, only show conditions with values
                                                    // BUT always show ALL empty conditions at the end to allow adding multiple nested filters
                                                    const visibleConditions = hasAnyValue
                                                        ? (() => {
                                                            const conditionsWithValues = group.conditions.filter(c => {
                                                                if ("conditions" in c) {
                                                                    return hasAnyValueInGroup(c as FilterGroup);
                                                                }
                                                                return hasFilterValue(c as FilterCondition);
                                                            });
                                                            // Include ALL empty conditions at the end (not just the last one)
                                                            const emptyConditions = group.conditions.filter(c => {
                                                                if ("conditions" in c) {
                                                                    return !hasAnyValueInGroup(c as FilterGroup);
                                                                }
                                                                return !hasFilterValue(c as FilterCondition);
                                                            });
                                                            // Return conditions with values first, then all empty conditions
                                                            return [...conditionsWithValues, ...emptyConditions];
                                                        })()
                                                        : group.conditions;

                                                    return visibleConditions.map((item, visibleIdx) => {
                                                        const isNestedGroup = "conditions" in item;
                                                        const cond = !isNestedGroup ? (item as FilterCondition) : null;
                                                        const field = cond ? (FILTER_OPTIONS.find(f => f.id === cond.field) || FIELD_CONFIG.find(f => f.id === cond.field)) : null;
                                                        const availableOps = cond ? (FIELD_OPERATORS[cond.field] || [{ id: "is", label: "Is" }]) : [];

                                                        if (isNestedGroup) {
                                                            // Handle nested groups if needed (for future expansion)
                                                            return null;
                                                        }

                                                        // Find the original index in the full conditions array for "where" label logic
                                                        const originalIdx = group.conditions.findIndex(c => c.id === item.id);
                                                        const isFirstWithValue = hasAnyValue && visibleIdx === 0;
                                                        const shouldShowWhere = !hasAnyValue ? (originalIdx === 0) : isFirstWithValue;
                                                        const shouldShowOperator = visibleConditions.length > 1 && visibleIdx === 1;

                                                        return (
                                                            <div key={item.id} className="flex gap-3 items-start">
                                                                {/* Label Column for conditions within group - only show when multiple conditions */}
                                                                {visibleConditions.length > 1 && (
                                                                    <div className="w-[60px] flex justify-end items-center shrink-0">
                                                                        {shouldShowWhere ? (
                                                                            <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                                        ) : shouldShowOperator ? (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                                                onClick={() => updateFilterGroupOperator(group.id, group.operator === "AND" ? "OR" : "AND")}
                                                                            >
                                                                                {group.operator}
                                                                                <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-xs font-black uppercase tracking-widest text-zinc-300 pr-3">{group.operator}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Filter condition content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex gap-2 items-center">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-2 px-3 hover:bg-zinc-50 shrink-0 justify-between w-[120px] bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer text-zinc-700 truncate whitespace-nowrap">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        {field ? (
                                                                                            <>
                                                                                                {typeof field.icon === "function" ? <field.icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> : <Box className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                                                                                                <span className="truncate">{field.label}</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <span className="text-zinc-500">Select filter</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <ChevronDown className="h-3 w-3 opacity-30 shrink-0" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent
                                                                                side="bottom"
                                                                                align="start"
                                                                                avoidCollisions={false}
                                                                                sideOffset={6}
                                                                                className="w-64 max-h-[400px] overflow-auto p-0"
                                                                            >
                                                                                <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white z-10">
                                                                                    <Input placeholder="Search fields..." className="h-8 text-xs border-zinc-100" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                                                                                </div>
                                                                                <div className="p-1">
                                                                                    {FILTER_OPTIONS.filter(f => !filterSearch || f.label.toLowerCase().includes(filterSearch.toLowerCase())).map(f => (
                                                                                        <DropdownMenuItem key={f.id} onClick={() => { updateFilterCondition(cond!.id, { field: f.id as string, operator: (FIELD_OPERATORS[f.id] || [{ id: "is" }])[0].id, value: [] }); setFilterSearch(""); }} className="rounded-lg h-9">
                                                                                            <div className="flex items-center gap-2.5">
                                                                                                {typeof f.icon === "function" ? <f.icon className="h-4 w-4 text-zinc-400" /> : <Box className="h-4 w-4 text-zinc-400" />}
                                                                                                <span className="font-medium text-zinc-700">{f.label}</span>
                                                                                            </div>
                                                                                        </DropdownMenuItem>
                                                                                    ))}
                                                                                </div>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>

                                                                        {field && (
                                                                            <>
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-3 text-zinc-800 hover:bg-zinc-50 shrink-0 w-20 justify-start bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer">
                                                                                            {availableOps.find(o => o.id === cond!.operator)?.label || cond!.operator}
                                                                                            <ChevronDown className="h-3 w-3 ml-auto opacity-30" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent className="w-48 p-1">
                                                                                        {availableOps.map(op => (
                                                                                            <DropdownMenuItem key={op.id} onClick={() => updateFilterCondition(cond!.id, { operator: op.id as any })} className="rounded-lg h-9">
                                                                                                <span className="font-medium text-zinc-700">{op.label}</span>
                                                                                            </DropdownMenuItem>
                                                                                        ))}
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>

                                                                                <div className="flex-1 min-w-0">
                                                                                    {cond!.operator === "is_set" || cond!.operator === "is_not_set" || cond!.operator === "is_archived" || cond!.operator === "is_not_archived" || cond!.operator === "has" || cond!.operator === "doesnt_have" ? null : (
                                                                                        <>
                                                                                            {cond!.field === "status" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                ? `${cond!.value.length} selected`
                                                                                                                : "Select option"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-56 p-2">
                                                                                                        <div className="space-y-0.5">
                                                                                                            {allAvailableStatuses.map(s => (
                                                                                                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                    <Checkbox
                                                                                                                        checked={Array.isArray(cond!.value) && cond!.value.includes(s.id)}
                                                                                                                        onCheckedChange={(checked) => {
                                                                                                                            const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                            const next = checked ? [...current, s.id] : current.filter(id => id !== s.id);
                                                                                                                            updateFilterCondition(cond!.id, { value: next });
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                                                                                    <span className="text-xs font-medium text-zinc-700 truncate">{s.name}</span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : cond!.field === "priority" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                ? `${cond!.value.length} selected`
                                                                                                                : "Select option"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-48 p-2">
                                                                                                        <div className="space-y-0.5">
                                                                                                            {["URGENT", "HIGH", "NORMAL", "LOW"].map(p => (
                                                                                                                <label key={p} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                    <Checkbox
                                                                                                                        checked={Array.isArray(cond!.value) && cond!.value.includes(p)}
                                                                                                                        onCheckedChange={(checked) => {
                                                                                                                            const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                            const next = checked ? [...current, p] : current.filter(val => val !== p);
                                                                                                                            updateFilterCondition(cond!.id, { value: next });
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <Flag className={cn("h-3.5 w-3.5", getPriorityStyles(p).icon)} />
                                                                                                                    <span className="text-xs font-medium text-zinc-700 truncate capitalize">{p.toLowerCase()}</span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : cond!.field === "assignee" || cond!.field === "createdBy" || cond!.field === "follower" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                ? `${cond!.value.length} selected`
                                                                                                                : "Select option"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-64 p-2">
                                                                                                        <div className="p-2 border-b border-zinc-100 mb-1">
                                                                                                            <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                                                                                                <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                                                <Input variant="ghost" placeholder="Search people..." className="h-full px-2 text-[10px] border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <ScrollArea className="h-[240px]">
                                                                                                            {users.filter(u => !assigneesSearch || u.name?.toLowerCase().includes(assigneesSearch.toLowerCase())).map(u => (
                                                                                                                <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                    <Checkbox
                                                                                                                        checked={Array.isArray(cond!.value) && cond!.value.includes(u.id)}
                                                                                                                        onCheckedChange={(checked) => {
                                                                                                                            const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                            const next = checked ? [...current, u.id] : current.filter(id => id !== u.id);
                                                                                                                            updateFilterCondition(cond!.id, { value: next });
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <Avatar className="h-6 w-6">
                                                                                                                        <AvatarImage src={u.image || undefined} />
                                                                                                                        <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                                                                    </Avatar>
                                                                                                                    <span className="text-xs font-medium text-zinc-700 truncate">{u.name}</span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </ScrollArea>
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : cond!.field === "tags" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                ? `${cond!.value.length} tags selected`
                                                                                                                : "Select option"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-56 p-2">
                                                                                                        {allAvailableTags.length === 0 ? (
                                                                                                            <p className="text-[10px] text-zinc-500 p-4 text-center">No tags found in this view</p>
                                                                                                        ) : (
                                                                                                            <div className="space-y-0.5">
                                                                                                                {allAvailableTags.map(tag => {
                                                                                                                    const parsed = parseEncodedTag(tag);
                                                                                                                    return (
                                                                                                                        <label key={tag} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                            <Checkbox
                                                                                                                                checked={Array.isArray(cond!.value) && cond!.value.includes(tag)}
                                                                                                                                onCheckedChange={(checked) => {
                                                                                                                                    const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                    const next = checked ? [...current, tag] : current.filter(t => t !== tag);
                                                                                                                                    updateFilterCondition(cond!.id, { value: next });
                                                                                                                                }}
                                                                                                                            />
                                                                                                                            <span className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: parsed.color + '20', color: parsed.color }}>
                                                                                                                                {parsed.label}
                                                                                                                            </span>
                                                                                                                        </label>
                                                                                                                    );
                                                                                                                })}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : cond!.field === "dependency" ? (
                                                                                                <DropdownMenu>
                                                                                                    <DropdownMenuTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {cond!.value || "Select dependency type"}
                                                                                                        </Button>
                                                                                                    </DropdownMenuTrigger>
                                                                                                    <DropdownMenuContent align="start" className="w-48">
                                                                                                        {["Blocking", "Waiting on", "Link", "Any"].map(v => (
                                                                                                            <DropdownMenuItem key={v} onClick={() => updateFilterCondition(cond!.id, { value: v })} className="text-xs font-medium">
                                                                                                                {v}
                                                                                                            </DropdownMenuItem>
                                                                                                        ))}
                                                                                                    </DropdownMenuContent>
                                                                                                </DropdownMenu>
                                                                                            ) : cond!.field === "taskType" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                ? `${cond!.value.length} selected`
                                                                                                                : "Select type"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-48 p-2">
                                                                                                        <div className="space-y-0.5">
                                                                                                            {availableTaskTypes?.map((t: any) => (
                                                                                                                <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                    <Checkbox
                                                                                                                        checked={Array.isArray(cond!.value) && cond!.value.includes(t.id)}
                                                                                                                        onCheckedChange={(checked) => {
                                                                                                                            const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                            const next = checked ? [...current, t.id] : current.filter(val => val !== t.id);
                                                                                                                            updateFilterCondition(cond!.id, { value: next });
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <TaskTypeIcon type={t} className="h-3.5 w-3.5" />
                                                                                                                    <span className="text-xs font-medium text-zinc-700 capitalize">{t.name}</span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : ["dueDate", "startDate", "dateDone", "dateCreated", "dateUpdated", "latestStatusChange"].includes(cond!.field) ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {(() => {
                                                                                                                const raw = cond!.value;
                                                                                                                const ts = typeof raw === "number" && raw > 0 ? raw : null;
                                                                                                                return ts ? format(new Date(ts), "MMM d, yyyy") : "Select date";
                                                                                                            })()}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-auto p-0">
                                                                                                        <SingleDateCalendar
                                                                                                            selectedDate={(() => {
                                                                                                                const raw = cond!.value;
                                                                                                                if (typeof raw !== "number" || raw <= 0) return undefined;
                                                                                                                return new Date(raw);
                                                                                                            })()}
                                                                                                            onDateChange={(d) => updateFilterCondition(cond!.id, { value: d ? d.getTime() : null })}
                                                                                                        />
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : cond!.field === "location" ? (
                                                                                                <Popover>
                                                                                                    <PopoverTrigger asChild>
                                                                                                        <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                            {cond!.value ? "Location selected" : "Select location"}
                                                                                                        </Button>
                                                                                                    </PopoverTrigger>
                                                                                                    <PopoverContent align="start" className="w-[300px] p-0">
                                                                                                        <DestinationPicker
                                                                                                            workspaceId={resolvedWorkspaceId as string}
                                                                                                            onSelect={(listId) => updateFilterCondition(cond!.id, { value: listId })}
                                                                                                        />
                                                                                                    </PopoverContent>
                                                                                                </Popover>
                                                                                            ) : (
                                                                                                <div className="relative">
                                                                                                    <Input
                                                                                                        className="h-8 text-xs border-zinc-100 bg-white rounded-sm focus-visible:ring-violet-500 pr-8"
                                                                                                        placeholder="Select option"
                                                                                                        value={typeof cond!.value === "string" ? cond!.value : ""}
                                                                                                        onChange={e => updateFilterCondition(cond!.id, { value: e.target.value })}
                                                                                                    />
                                                                                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-300 pointer-events-none" />
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-1 cursor-pointer" onClick={() => {
                                                                    if (group.conditions.length === 1) {
                                                                        // If this is the last condition in the group, remove the entire group
                                                                        removeFilterItem(group.id);
                                                                    } else {
                                                                        // Otherwise, just remove this condition
                                                                        removeFilterItem(item.id);
                                                                    }
                                                                }}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        );
                                                    });
                                                })()}

                                                {/* Add nested filter button within group - hide only for first root-level "Where" condition when displaying first filter item with value */}
                                                {(() => {
                                                    const hasAnyValue = hasAnyValueInGroup(group);
                                                    // Get visible conditions to check if first one is "Where" with value
                                                    const visibleConditions = hasAnyValue
                                                        ? (() => {
                                                            const conditionsWithValues = group.conditions.filter(c => {
                                                                if ("conditions" in c) {
                                                                    return hasAnyValueInGroup(c as FilterGroup);
                                                                }
                                                                return hasFilterValue(c as FilterCondition);
                                                            });
                                                            const lastCondition = group.conditions[group.conditions.length - 1];
                                                            if (lastCondition && !conditionsWithValues.includes(lastCondition)) {
                                                                const lastHasValue = "conditions" in lastCondition
                                                                    ? hasAnyValueInGroup(lastCondition as FilterGroup)
                                                                    : hasFilterValue(lastCondition as FilterCondition);
                                                                if (!lastHasValue) {
                                                                    return [...conditionsWithValues, lastCondition];
                                                                }
                                                            }
                                                            return conditionsWithValues;
                                                        })()
                                                        : group.conditions;

                                                    // Check if this is the first root-level group
                                                    const isFirstRootGroup = filterGroups.conditions.findIndex(c => c.id === group.id) === 0;

                                                    // Check if first visible condition is the first "Where" condition with value
                                                    const firstVisibleCondition = visibleConditions[0];
                                                    const firstConditionInGroup = group.conditions[0];

                                                    // Hide if:
                                                    // 1. This is the first root-level group
                                                    // 2. We're displaying filters with values (hasAnyValue is true)
                                                    // 3. The first visible condition exists and has a value
                                                    // 4. The first visible condition is the first condition in the original group (the "Where" condition)
                                                    const isFirstWhereWithValue = isFirstRootGroup &&
                                                        hasAnyValue &&
                                                        firstVisibleCondition &&
                                                        !("conditions" in firstVisibleCondition) &&
                                                        hasFilterValue(firstVisibleCondition as FilterCondition) &&
                                                        firstConditionInGroup &&
                                                        firstConditionInGroup.id === firstVisibleCondition.id;

                                                    // Hide only if it's the first root-level "Where" condition with value
                                                    return !isFirstWhereWithValue && (
                                                        <div className="flex items-center justify-between pt-2 group/footer">
                                                            <button
                                                                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 cursor-pointer px-2 py-1 rounded-md"
                                                                onClick={() => addFilterCondition(group.id)}
                                                            >
                                                                Add nested filter
                                                            </button>
                                                            {group.conditions.length >= 2 && (
                                                                <button
                                                                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 transition-colors opacity-0 group-hover/footer:opacity-100 cursor-pointer px-2 py-1 rounded-md"
                                                                    onClick={() => removeFilterItem(group.id)}
                                                                >
                                                                    Clear group
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}

                        </div>
                    </div>
                </ScrollArea>
            )}
            {filterGroups.conditions.length > 0 && (
                <div className="w-full p-4 border-t border-zinc-100 bg-white flex items-center justify-between z-10">
                    <Button
                        variant="outline"
                        className="h-9 px-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer"
                        onClick={() => addFilterGroup()}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add filter
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 font-medium px-3 hover:bg-red-50 border border-red-200 rounded-xl cursor-pointer"
                        onClick={() => setFilterGroups({
                            id: "root",
                            operator: "AND",
                            conditions: [],
                        })}
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    );
}
