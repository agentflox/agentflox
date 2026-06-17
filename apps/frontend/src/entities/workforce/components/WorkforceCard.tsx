"use client";

import { Workflow, LayoutGrid, Clock, Zap, MoreVertical, Eye, Share2, Users } from "lucide-react";
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
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
};

export function WorkforceCard({ item, onOpen, isSelected, onSelect }: Props) {
    const mode = MODE_STYLE[item.mode];
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE["DRAFT"];
    const ModeIcon = mode.icon;

    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

    return (
        <div
            className={cn(
                "group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full",
                isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            )}
            onClick={() => onOpen?.(item.id)}
        >
            {/* Top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-0.5 ${item.mode === "FLOW" ? "bg-violet-500" : "bg-sky-500"}`} />

            {/* Checkbox — top left */}
            <div
                className={cn(
                    "absolute top-2 left-2 z-10 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => { e.stopPropagation(); onSelect?.(item.id, !isSelected); }}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
                    className="h-4 w-4 border-zinc-300 bg-white shadow-sm cursor-pointer"
                />
            </div>

            {/* Actions — top right, vertical dots */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4 text-zinc-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Workforce
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="p-4 flex flex-col gap-3 flex-1 pt-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors dark:text-zinc-50">
                                {item.name}
                            </h3>
                            <div className={`h-2 w-2 flex-shrink-0 rounded-full animate-pulse ${status.dot}`} title={status.label} />
                        </div>
                    </div>

                    <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${mode.badge}`}>
                        <ModeIcon className="h-3 w-3" />
                        {mode.label}
                    </span>
                </div>

                <p className="line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                    {item.description || "No description provided."}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-2">
                    {item._count?.agents !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-zinc-300" />
                            <span className="text-zinc-600 dark:text-zinc-300">{item._count.agents}</span>
                        </div>
                    )}
                    {item.mode === "FLOW" && item._count?.nodes !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span>Nodes</span>
                            <span className="text-zinc-600 dark:text-zinc-300">{item._count.nodes}</span>
                        </div>
                    )}
                    {item._count?.executions !== undefined && (
                        <div className="flex items-center gap-1.5 ">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-zinc-600 dark:text-zinc-300 bg-amber-500/10 px-1 rounded">{item._count.executions} runs</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-zinc-300" />
                            <span>
                                {updatedAt ? `Updated ${updatedAt.toLocaleDateString()}` : "No recent activity"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
