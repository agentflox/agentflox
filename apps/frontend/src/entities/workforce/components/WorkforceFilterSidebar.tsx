"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkforceFilterValues, WorkforceMode, WorkforceScope, WorkforceStatus } from "../types";

type Props = {
    scope: WorkforceScope;
    onScopeChange: (scope: WorkforceScope) => void;
    values: WorkforceFilterValues;
    onChange: (next: WorkforceFilterValues) => void;
    isOverlay?: boolean;
};

const STATUS_OPTIONS: Array<{ value: WorkforceStatus | ""; label: string }> = [
    { value: "", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "PAUSED", label: "Paused" },
    { value: "DRAFT", label: "Draft" },
    { value: "ARCHIVED", label: "Archived" },
];

const MODE_OPTIONS: Array<{ value: WorkforceMode | ""; label: string }> = [
    { value: "", label: "All Types" },
    { value: "FLOW", label: "Workflow" },
    { value: "SWARM", label: "Swarm" },
];

export function WorkforceFilterSidebar({ scope, onScopeChange, values, onChange, isOverlay = false }: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const Wrapper: React.ElementType = "aside";

    if (typeof document !== "undefined" && !isOverlay) {
        const width = collapsed ? "3.5rem" : "18rem";
        document.documentElement.style.setProperty("--filter-sidebar-width", width);
    }

    const baseClasses = isOverlay
        ? cn("h-full bg-background transition-all duration-300", collapsed ? "w-14" : "w-72")
        : cn(
            "sticky top-0 h-[calc(100vh-3.5rem)] border-l border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
            collapsed ? "w-14" : "w-[var(--filter-sidebar-width,_18rem)]",
        );

    return (
        <Wrapper className={baseClasses}>
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    {!collapsed && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            <Filter className="h-4 w-4" />
                            <span>Filters</span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                            collapsed && "mx-auto",
                        )}
                        aria-label={collapsed ? "Expand filters" : "Collapse filters"}
                    >
                        {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                                <span className="text-xs font-bold">S</span>
                            </div>
                            <div className="h-px w-4 bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                                <span className="text-xs font-bold">T</span>
                            </div>
                            <div className="h-px w-4 bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                                <span className="text-xs font-bold">M</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 px-4">
                            {/* Scope */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Scope
                                </h4>
                                <div className="relative">
                                    <select
                                        value={scope}
                                        onChange={(e) => onScopeChange(e.target.value as WorkforceScope)}
                                        className="w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                                    >
                                        <option value="owned">Owned by me</option>
                                        <option value="member">Shared with me</option>
                                        <option value="all">All workforces</option>
                                    </select>
                                    <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-400" />
                                </div>
                            </section>

                            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />

                            {/* Status */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Status
                                </h4>
                                <div className="space-y-1">
                                    {STATUS_OPTIONS.map((option) => {
                                        const isSelected = (values.status ?? "") === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => onChange({ ...values, status: option.value })}
                                                className={cn(
                                                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                                                    isSelected
                                                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-300",
                                                )}
                                            >
                                                <span>{option.label}</span>
                                                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />

                            {/* Mode */}
                            <section className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Type
                                </h4>
                                <div className="space-y-1">
                                    {MODE_OPTIONS.map((option) => {
                                        const isSelected = (values.mode ?? "") === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => onChange({ ...values, mode: option.value })}
                                                className={cn(
                                                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                                                    isSelected
                                                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-300",
                                                )}
                                            >
                                                <span>{option.label}</span>
                                                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </Wrapper>
    );
}
