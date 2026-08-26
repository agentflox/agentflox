"use client";

import React from "react";
import { FileText, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";

export function breadcrumbItemClass(isSelected: boolean, compact = false) {
    return cn(
        "flex w-full items-center gap-2 rounded-md px-2 transition-colors cursor-pointer text-left text-sm hover:bg-zinc-100",
        compact ? "py-1" : "py-1.5",
        isSelected && "bg-zinc-100"
    );
}

export const ENTITY_TREE_NEST = "ml-3 pl-2 border-l border-slate-200 space-y-0.5";

export function BreadcrumbTypeBadge({ label, className }: { label: string; className: string }) {
    return (
        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0", className)}>
            {label}
        </span>
    );
}

export const BREADCRUMB_BADGE = {
    workspace: "text-zinc-600 bg-zinc-100",
    space: "text-indigo-600 bg-indigo-100",
    project: "text-purple-600 bg-purple-100",
    team: "text-emerald-600 bg-emerald-100",
    folder: "text-blue-600 bg-blue-100",
    list: "text-emerald-700 bg-emerald-100",
    doc: "text-teal-700 bg-teal-100",
    channel: "text-emerald-600 bg-emerald-100",
    ai: "text-purple-600 bg-purple-100",
};

const ENTITY_TYPE_LABEL: Record<string, { label: string; badge: keyof typeof BREADCRUMB_BADGE }> = {
    workspace: { label: "Workspace", badge: "workspace" },
    space: { label: "Space", badge: "space" },
    project: { label: "Project", badge: "project" },
    team: { label: "Team", badge: "team" },
    folder: { label: "Folder", badge: "folder" },
    list: { label: "List", badge: "list" },
    personal: { label: "List", badge: "list" },
    doc: { label: "Doc", badge: "doc" },
    document: { label: "Doc", badge: "doc" },
    channel: { label: "Channel", badge: "channel" },
    ai: { label: "AI Chat", badge: "ai" },
    aichat: { label: "AI Chat", badge: "ai" },
};

export function EntityTypeBadge({ type }: { type: string }) {
    const cfg = ENTITY_TYPE_LABEL[type.toLowerCase()];
    if (!cfg) return null;
    return <BreadcrumbTypeBadge label={cfg.label} className={BREADCRUMB_BADGE[cfg.badge]} />;
}

type EntityTreeIconEntity = {
    icon?: string | null;
    logo?: string | null;
    avatar?: string | null;
    color?: string | null;
} | null;

const ENTITY_TREE_ICON: Record<string, {
    Icon: React.ComponentType<{ icon?: string | null; className?: string; size?: number; fill?: boolean }>;
    fallbackClass: string;
    color: string;
}> = {
    workspace: { Icon: WorkspaceIcon, fallbackClass: "text-zinc-500", color: "#71717a" },
    space: { Icon: SpaceIcon, fallbackClass: "text-indigo-500", color: "#6366f1" },
    project: { Icon: ProjectIcon, fallbackClass: "text-purple-600", color: "#6366f1" },
    team: { Icon: TeamIcon, fallbackClass: "text-emerald-600", color: "#10b981" },
    folder: { Icon: FolderIcon, fallbackClass: "text-blue-500", color: "#3b82f6" },
    list: { Icon: ListEntityIcon, fallbackClass: "text-emerald-600", color: "#10b981" },
    personal: { Icon: ListEntityIcon, fallbackClass: "text-emerald-600", color: "#10b981" },
};

export function EntityTreeIcon({
    kind,
    entity,
    size = 14,
}: {
    kind: string;
    entity?: EntityTreeIconEntity;
    size?: number;
}) {
    const k = kind.toLowerCase();
    if (k === "doc" || k === "document") {
        return (
            <div className="h-5 w-5 rounded bg-teal-50 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-teal-600" />
            </div>
        );
    }

    const cfg = ENTITY_TREE_ICON[k];
    if (!cfg) return null;

    const iconValue = entity?.icon ?? entity?.logo ?? entity?.avatar ?? null;
    const { Icon } = cfg;

    return (
        <span
            className="h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center"
            style={{ backgroundColor: iconValue ? (entity?.color || cfg.color) : "transparent" }}
        >
            <Icon
                icon={iconValue}
                className={iconValue ? "text-white" : cfg.fallbackClass}
                size={size}
                fill
            />
        </span>
    );
}

export function DestinationTreeRow({
    selected,
    onClick,
    kind,
    entity,
    label,
    hasChildren = false,
    expanded = false,
    onToggle,
    trailing,
}: {
    selected: boolean;
    onClick: () => void;
    kind: string;
    entity?: EntityTreeIconEntity;
    label: string;
    hasChildren?: boolean;
    expanded?: boolean;
    onToggle?: (e: React.MouseEvent) => void;
    trailing?: React.ReactNode;
}) {
    return (
        <div className={cn(breadcrumbItemClass(selected), "justify-between")} onClick={onClick}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <ExpandControl expanded={expanded} hasChildren={hasChildren} onToggle={onToggle ?? (() => {})}>
                    <EntityTreeIcon kind={kind} entity={entity} />
                </ExpandControl>
                <span className="truncate text-zinc-700">{label}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {trailing}
                <EntityTypeBadge type={kind} />
            </div>
        </div>
    );
}

export function ExpandControl({
    expanded,
    hasChildren,
    onToggle,
    children,
}: {
    expanded: boolean;
    hasChildren: boolean;
    onToggle: (e: React.MouseEvent) => void;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "relative h-5 w-5 rounded shrink-0 flex items-center justify-center group/expand",
                hasChildren && "cursor-pointer"
            )}
            onPointerDown={(e) => {
                if (hasChildren) e.stopPropagation();
            }}
            onClick={(e) => {
                if (hasChildren) {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle(e);
                }
            }}
        >
            <div className={cn(hasChildren && "group-hover/expand:hidden")}>
                {children}
            </div>
            {hasChildren && (
                <div className="hidden group-hover/expand:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", expanded && "rotate-90")} />
                </div>
            )}
        </div>
    );
}
