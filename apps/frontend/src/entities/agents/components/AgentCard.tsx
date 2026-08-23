"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Calendar, MoreVertical, Eye, Trash2, Bot, ArrowRight, PenSquare, Folder } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const agentTypeStyles: Record<string, { label: string; badge: string; accentBar: string }> = {
  TASK_EXECUTOR: { label: "Task Executor", badge: "bg-violet-500/10 text-violet-600", accentBar: "bg-violet-500" },
  WORKFLOW_MANAGER: { label: "Workflow Manager", badge: "bg-sky-500/10 text-sky-600", accentBar: "bg-sky-500" },
  DATA_ANALYST: { label: "Data Analyst", badge: "bg-amber-500/10 text-amber-600", accentBar: "bg-amber-500" },
};

const statusStyles: Record<string, { dot: string; label: string }> = {
  ACTIVE: { dot: "bg-emerald-500 animate-pulse", label: "Active" },
  PAUSED: { dot: "bg-amber-500", label: "Paused" },
  DRAFT: { dot: "bg-zinc-400", label: "Draft" },
  DISABLED: { dot: "bg-zinc-300", label: "Disabled" },
};

export interface AgentCardProps {
  id: string;
  name: string;
  description?: string | null;
  agentType: string;
  status: string;
  updatedAt?: Date | string | null;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
  className?: string;
  locationPath?: string | null;
  workspaceName?: string | null;
  spaceName?: string | null;
}

export function AgentCard({
  id,
  name,
  description,
  agentType,
  status,
  updatedAt,
  isSelected = false,
  onSelect,
  onDelete,
  className,
  locationPath,
  workspaceName,
  spaceName,
}: AgentCardProps) {
  const router = useRouter();
  const typeStyle = agentTypeStyles[agentType] ?? agentTypeStyles["TASK_EXECUTOR"];
  const statusStyle = statusStyles[status] ?? statusStyles["DRAFT"];
  const updatedDate = updatedAt ? new Date(updatedAt) : null;

  const locationText =
    locationPath ||
    [workspaceName, spaceName].filter(Boolean).join(" / ") ||
    null;

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden h-full",
        isSelected ? "border-violet-300 ring-2 ring-violet-200 bg-violet-50/20" : "border-slate-200 hover:border-violet-300 hover:shadow-violet-500/10",
        className
      )}
      onClick={() => router.push(`/dashboard/agents/${id}`)}
    >
      {/* Checkbox — top left */}
      <div
        className={cn(
          "absolute top-2 left-3 z-10 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => { e.stopPropagation(); onSelect?.(id, !isSelected); }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(id, !!checked)}
          className="h-4 w-4 border-slate-300 bg-white shadow-sm cursor-pointer"
        />
      </div>

      {/* Actions — top right */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50 hover:bg-zinc-100 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/agents/${id}`); }}>
              <PenSquare className="mr-1 h-4 w-4" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
              className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-4 flex-1 pt-12 relative z-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2.5 flex-1">
            {locationText && (
              <div
                className="flex items-center gap-1.5 text-xs text-slate-500 font-normal truncate min-w-0 max-w-full"
                title={locationText}
              >
                <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${statusStyle.dot}`}
                  title={statusStyle.label}
                />
                <h3 className={cn(
                  "font-medium text-base leading-snug line-clamp-1 transition-colors duration-200",
                  isSelected ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-700"
                )}>
                  {name || "Untitled Agent"}
                </h3>
              </div>
            </div>
            <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
              {description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-medium">
                {updatedDate ? `Updated ${updatedDate.toLocaleDateString()}` : "No recent activity"}
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
