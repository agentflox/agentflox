"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    MessageSquare,
    ClipboardList,
    Activity,
    Gavel,
    Shield,
    CheckSquare,
    Users,
    BarChart3,
    Swords,
    Store,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    List as ListIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ProjectView =
    | "overview"
    | "discussions"
    | "logs"
    | "activities"
    | "appeal"
    | "governance"
    | "tasks"
    | "lists"
    | "members"
    | "analytics"
    | "war_room"
    | "marketplace"
    | "settings";

interface ProjectNavigationSidebarProps {
    projectId: string;
    activeView: ProjectView;
    onViewChange: (view: ProjectView) => void;
    mode?: "inline" | "overlay";
    onClose?: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const navigationItems: Array<{
    id: ProjectView;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    href?: string;
}> = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "discussions", label: "Discussions", icon: MessageSquare },
        { id: "tasks", label: "Tasks", icon: CheckSquare },
        { id: "lists", label: "Lists", icon: ListIcon },
        { id: "activities", label: "Activities", icon: Activity },
        { id: "members", label: "Members", icon: Users },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "logs", label: "Audit Logs", icon: ClipboardList },
        { id: "appeal", label: "Appeal", icon: Gavel },
        { id: "governance", label: "Governance", icon: Shield },
        { id: "war_room", label: "War Room", icon: Swords },
        { id: "marketplace", label: "Marketplace", icon: Store },
        // { id: "settings", label: "Settings", icon: Settings }, // Might handle settings separately
    ];

export default function ProjectNavigationSidebar({
    projectId,
    activeView,
    onViewChange,
    mode = "inline",
    onClose,
    collapsed = false,
    onToggleCollapse,
}: ProjectNavigationSidebarProps) {
    return (
        <aside
            className={cn(
                "relative flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out shadow-lg",
                collapsed ? "w-16" : "w-72",
                mode === "overlay" ? "h-full fixed inset-y-0 left-0 z-40" : "h-screen"
            )}
        >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 py-2">
                {!collapsed && <h2 className="text-sm font-semibold text-zinc-900">Project</h2>}
                <div className="flex items-center gap-2 ml-auto">
                    {mode === "overlay" && (
                        <button
                            aria-label="Close sidebar"
                            onClick={onClose}
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        >
                            <Menu size={16} />
                        </button>
                    )}
                    {onToggleCollapse && (
                        <button
                            aria-label="Toggle sidebar"
                            onClick={onToggleCollapse}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;

                        const commonClassName = cn(
                            "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                            collapsed && "justify-center px-2"
                        );

                        if (item.href) {
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={commonClassName}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id as ProjectView)}
                                className={commonClassName}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                                {!collapsed && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </aside>
    );
}
