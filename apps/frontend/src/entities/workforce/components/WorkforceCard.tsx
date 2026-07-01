"use client";

import { Workflow, LayoutGrid, Clock, Zap, MoreVertical, Eye, Share2, Users, Calendar, ArrowRight, Trash2, PenSquare } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkforceSummary } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const MODE_STYLE = {
    FLOW: {
        label: "Workflow",
        icon: Workflow,
        badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        dot: "bg-violet-500",
    },
    SWARM: {
        label: "Swarm",
        icon: LayoutGrid,
        badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        dot: "bg-sky-500",
    },
} as const;

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
    ACTIVE: { dot: "bg-emerald-500", label: "Active" },
    PAUSED: { dot: "bg-amber-500", label: "Paused" },
    DRAFT: { dot: "bg-zinc-400", label: "Draft" },
    ARCHIVED: { dot: "bg-zinc-300 dark:bg-zinc-600", label: "Archived" },
};

type Props = {
    item: WorkforceSummary;
    onOpen?: (id: string) => void;
    onDelete?: (id: string) => void;
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
};

export function WorkforceCard({ item, onOpen, onDelete, isSelected, onSelect }: Props) {
    const mode = MODE_STYLE[item.mode];
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE["DRAFT"];
    const ModeIcon = mode.icon;

    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

    return (
        <div
            className={cn(
                "group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden h-full",
                isSelected ? "border-orange-300 ring-2 ring-orange-200 bg-orange-50/20" : "border-slate-200 hover:border-orange-300 hover:shadow-orange-500/10"
            )}
            onClick={() => onOpen?.(item.id)}
        >
            {/* Checkbox — top left */}
            <div
                className={cn(
                    "absolute top-2 left-3 z-10 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => { e.stopPropagation(); onSelect?.(item.id, !isSelected); }}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
                    className="h-4 w-4 border-slate-300 bg-white shadow-sm cursor-pointer"
                />
            </div>

            {/* Actions — top right, vertical dots */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 z-20">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4 text-zinc-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>
                            <PenSquare className="mr-1 h-4 w-4" />
                            Edit Workforce
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
                            className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                        >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete Workforce
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="p-3 flex flex-col gap-4 flex-1 pt-12 relative z-0">
                <div className="min-w-0 space-y-2.5 flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 flex-shrink-0 rounded-full animate-pulse ${status.dot}`} title={status.label} />
                            <h3 className={cn(
                                "font-medium text-base leading-snug line-clamp-1 transition-colors duration-200",
                                isSelected ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-700"
                            )}>
                                {item.name || "Untitled Workforce"}
                            </h3>
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${mode.badge}`}>
                            <ModeIcon className="h-3 w-3" />
                            {mode.label}
                        </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
                        {item.description || "No description provided."}
                    </p>
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-300" />
                            <span className="font-medium">
                                {updatedAt ? `Updated ${updatedAt.toLocaleDateString()}` : "No recent activity"}
                            </span>
                        </div>

                        {/* Hover Open Indicator */}
                        <div className={cn(
                            "flex items-center gap-1 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-600"
                        )}>
                            <span>View</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
