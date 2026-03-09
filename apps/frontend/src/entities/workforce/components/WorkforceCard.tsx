"use client";

import { Workflow, LayoutGrid, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkforceSummary } from "../types";

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
};

export function WorkforceCard({ item, onOpen }: Props) {
    const mode = MODE_STYLE[item.mode];
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE["DRAFT"];
    const ModeIcon = mode.icon;

    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

    return (
        <Card
            onClick={() => onOpen?.(item.id)}
            className="group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:border-zinc-400 hover:shadow-md dark:hover:border-zinc-700"
        >
            {/* Top accent bar that shows mode colour */}
            <div className={`absolute inset-x-0 top-0 h-0.5 ${item.mode === "FLOW" ? "bg-violet-500" : "bg-sky-500"}`} />

            <CardHeader className="space-y-3 pb-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <CardTitle className="truncate text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                                {item.name}
                            </CardTitle>
                            <div
                                className={`h-2 w-2 flex-shrink-0 rounded-full animate-pulse ${status.dot}`}
                                title={status.label}
                            />
                        </div>

                        {item.description && (
                            <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {item.description}
                            </p>
                        )}
                    </div>

                    {/* Mode badge */}
                    <span
                        className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${mode.badge}`}
                    >
                        <ModeIcon className="h-3 w-3" />
                        {mode.label}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="mt-auto pb-4 pt-0">
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {item._count?.agents !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span>Agents</span>
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
                        <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-zinc-600 dark:text-zinc-300">{item._count.executions}</span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="border-t bg-zinc-50/50 px-6 py-3 dark:bg-zinc-900/50">
                <div className="flex w-full items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {updatedAt
                            ? `Updated ${updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                            : "No recent activity"}
                    </span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : item.status === "PAUSED"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                : item.status === "DRAFT"
                                    ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                            }`}
                    >
                        {status.label}
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}
