"use client";

import React from "react";
import {
    LayoutDashboard,
    MessageSquareText,
    Bot,
    CheckSquare,
    Users,
    BarChart3,
    ShieldAlert,
    ShoppingBag,
    Scale,
    Activity,
    Scroll,
    Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ProjectContentTab =
    | "overview"
    | "discussions"
    | "chat"
    | "tasks"
    | "members"
    | "analytics"
    | "war_room"
    | "marketplace"
    | "governance"
    | "activities"
    | "logs"
    | "appeal";

interface ProjectContentTabsProps {
    activeTab: string; // Using string to allow searchParams fallback easier
    onTabChange: (tab: ProjectContentTab) => void;
}

const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "discussions", label: "Discussions", icon: MessageSquareText },
    { id: "chat", label: "AI Chat", icon: Bot },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "members", label: "Members", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "war_room", label: "War Room", icon: ShieldAlert },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "governance", label: "Governance", icon: Scale },
    { id: "activities", label: "Activities", icon: Activity },
    { id: "logs", label: "Logs", icon: Scroll },
    { id: "appeal", label: "Appeal", icon: Gavel },
];

export function ProjectContentTabs({
    activeTab,
    onTabChange,
}: ProjectContentTabsProps) {
    return (
        <div className="border-b border-zinc-200 bg-white px-6">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <Button
                            key={tab.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => onTabChange(tab.id as ProjectContentTab)}
                            className={cn(
                                "relative h-10 gap-2 rounded-none border-b-2 border-transparent px-4 font-medium text-zinc-500 hover:bg-transparent hover:text-zinc-900",
                                isActive &&
                                "border-indigo-500 text-indigo-600 hover:text-indigo-600 bg-indigo-50/50"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
