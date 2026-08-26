"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  MoreVertical,
  PenSquare,
  Trash2,
  Copy,
  Eye,
  Workflow,
  ShieldCheck,
  Tag,
  Layers,
  ArrowRight,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillSummary } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SkillCardProps {
  item: SkillSummary;
  onOpen?: (skill: SkillSummary) => void;
  onEdit?: (skill: SkillSummary) => void;
  onDelete?: (skill: SkillSummary) => void;
  onDuplicate?: (skill: SkillSummary) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string; gradient: string }> = {
  creative: {
    label: "Creative",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/50",
    gradient: "from-purple-500/10 to-pink-500/10",
  },
  technical: {
    label: "Technical",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/50",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  automation: {
    label: "Automation",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/50",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  business: {
    label: "Business",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  custom: {
    label: "Custom",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800/50",
    gradient: "from-indigo-500/10 to-violet-500/10",
  },
};

export function SkillCard({
  item,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  isSelected,
  onSelect,
}: SkillCardProps) {
  const categoryStyle =
    CATEGORY_STYLES[item.category?.toLowerCase() || "custom"] || CATEGORY_STYLES.custom;

  // Extract workflow steps count if schema exists
  const workflowSteps = Array.isArray(item.schema?.workflow)
    ? item.schema.workflow
    : [];
  const triggerExamples = item.schema?.triggerExamples || [];

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
          : "border-border/60 hover:border-border/90 hover:shadow-primary/5"
      )}
      onClick={() => onOpen?.(item)}
    >
      {/* Top subtle category background gradient */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-40 pointer-events-none transition-opacity duration-300 group-hover:opacity-70",
          categoryStyle.gradient
        )}
      />

      {/* Header controls: Checkbox (top-left) & Actions menu (top-right) */}
      <div className="flex items-center justify-between relative z-10 mb-3">
        <div
          className={cn(
            "transition-opacity duration-200",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(item.id, !isSelected);
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
            className="h-4 w-4 rounded border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {item.isBuiltIn ? (
            <Badge
              variant="outline"
              className="gap-1 border-sky-200/80 bg-sky-50/90 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/40 dark:text-sky-300 font-medium px-2 py-0.5 text-xs shadow-xs backdrop-blur-xs"
            >
              <Sparkles className="h-3 w-3 text-sky-500" />
              Built-in
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-violet-200/80 bg-violet-50/90 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/40 dark:text-violet-300 font-medium px-2 py-0.5 text-xs shadow-xs backdrop-blur-xs"
            >
              <Bot className="h-3 w-3 text-violet-500" />
              Custom
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-lg">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(item);
                }}
              >
                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.(item);
                }}
              >
                <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                Duplicate Skill
              </DropdownMenuItem>
              {!item.isBuiltIn && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(item);
                    }}
                  >
                    <PenSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                    Edit Skill
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(item);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Skill
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Body */}
      <div className="relative z-10 space-y-3 flex-1">
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl shadow-xs transition-transform duration-200 group-hover:scale-105"
            style={{
              backgroundColor: item.color ? `${item.color}15` : undefined,
              borderColor: item.color ? `${item.color}40` : undefined,
            }}
          >
            {item.icon || "⚡"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold text-base leading-tight truncate transition-colors duration-200",
                  isSelected
                    ? "text-primary"
                    : "text-foreground group-hover:text-primary"
                )}
              >
                {item.displayName || item.name}
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                v{item.version || "1.0.0"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              {item.name}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
          {item.description || item.schema?.purpose || "No description provided."}
        </p>

        {/* Workflow & Safety Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge
            variant="secondary"
            className={cn(
              "text-[11px] font-medium border px-2 py-0.5 rounded-md",
              categoryStyle.bg,
              categoryStyle.text,
              categoryStyle.border
            )}
          >
            {categoryStyle.label}
          </Badge>

          {workflowSteps.length > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] gap-1 px-2 py-0.5 text-muted-foreground border-border/70 bg-muted/30"
            >
              <Workflow className="h-3 w-3" />
              {workflowSteps.length} Steps
            </Badge>
          )}

          {triggerExamples.length > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] gap-1 px-2 py-0.5 text-muted-foreground border-border/70 bg-muted/30"
            >
              <Layers className="h-3 w-3" />
              {triggerExamples.length} Triggers
            </Badge>
          )}
        </div>

        {/* Tags preview */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-[10px] text-muted-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded-sm"
              >
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground/60 px-1 py-0.5">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer info: Owner & Explore button */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground relative z-10">
        <div className="flex items-center gap-1.5">
          {item.isBuiltIn ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-3 w-3 text-sky-500" />
              <span>System Core</span>
            </div>
          ) : item.owner ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={item.owner.image || item.owner.avatar || undefined} />
                <AvatarFallback className="text-[9px]">
                  {item.owner.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[100px]">{item.owner.name || "User"}</span>
            </div>
          ) : (
            <span>Personal</span>
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">
          Inspect
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
