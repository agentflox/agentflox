"use client";

import React from "react";
import {
    LayoutDashboard,
    FolderKanban,
    FileStack,
    FileText,
    Lightbulb,
    Library,
    Wrench,
    CheckSquare,
    Users,
    Bot,
    Settings,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ContentTab =
    | "overview"
    | "organization"
    | "projects"
    | "materials"
    | "documents"
    | "proposals"
    | "resources"
    | "tools"
    | "tasks"
    | "teams"
    | "agents"
    | "settings";

interface WorkspaceContentTabsProps {
    activeTab: ContentTab;
    onTabChange: (tab: ContentTab) => void;
}

const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "materials", label: "Materials", icon: FileStack },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "proposals", label: "Proposals", icon: Lightbulb },
    { id: "resources", label: "Resources", icon: Library },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "settings", label: "Settings", icon: Settings },
];

export function WorkspaceContentTabs({
    activeTab,
    onTabChange,
}: WorkspaceContentTabsProps) {
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
                            onClick={() => onTabChange(tab.id as ContentTab)}
                            className={cn(
                                "relative h-10 gap-2 rounded-none border-b-2 border-transparent px-4 font-medium text-zinc-500 hover:bg-transparent hover:text-zinc-900",
                                isActive &&
                                "border-primary text-primary hover:text-primary"
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
