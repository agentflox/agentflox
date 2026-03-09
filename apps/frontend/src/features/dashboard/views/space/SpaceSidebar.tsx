"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { viewConfig } from "./SpaceViewConfig";
import {
    MoreHorizontal,
    Plus,
    FileText,
    Pin,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SpaceSidebarProps {
    views: any[];
    activeTab: string;
    onTabChange: (id: string) => void;
    onAddView: () => void;
    // Context Menu Handlers
    onRename: (view: any) => void;
    onDelete: (view: any) => void;
    onDuplicate: (view: any) => void;
    onTogglePin: (view: any) => void;
    onTogglePrivate: (view: any) => void;
    onToggleLock: (view: any) => void;
    onToggleDefault: (view: any) => void;
    onCopyLink: (view: any) => void;
    onShare: (view: any) => void;
}

export function SpaceSidebar({
    views,
    activeTab,
    onTabChange,
    onAddView,
    onRename,
    onDelete,
    onDuplicate,
    onTogglePin,
    onTogglePrivate,
    onToggleLock,
    onToggleDefault,
    onCopyLink,
    onShare
}: SpaceSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

    // Limit visible items
    const MAX_VISIBLE = 8;
    const visibleViews = views.slice(0, MAX_VISIBLE);
    const hiddenViews = views.slice(MAX_VISIBLE);

    const handleItemClick = (id: string) => {
        onTabChange(id);
        setMoreOpen(false);
    };

    const renderItem = (view: any, isActive: boolean, isMoreItem = false) => {
        const viewType = view.type as ViewType;
        const config = viewConfig[viewType] || { label: view.name, icon: FileText };
        const Icon = config.icon;

        const content = (
            <div
                className={cn(
                    "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    collapsed && !isMoreItem && "justify-center px-2",
                    isMoreItem && "flex-col items-center justify-center p-4 border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-200 h-auto"
                )}
                onClick={() => handleItemClick(view.id)}
                title={collapsed && !isMoreItem ? view.name : undefined}
            >
                <Icon size={isMoreItem ? 24 : 18} className={cn("shrink-0", isActive ? "text-primary" : isMoreItem ? "text-zinc-400" : "text-zinc-400 group-hover:text-zinc-900")} />
                {(!collapsed || isMoreItem) && (
                    <span className={cn("truncate", isMoreItem && "text-center text-sm font-medium text-zinc-700")}>
                        {view.name}
                    </span>
                )}
                {(!collapsed || isMoreItem) && (
                    <div className="ml-auto flex items-center gap-1">
                        {view.isPinned && <Pin className="h-3 w-3 rotate-45 text-muted-foreground" />}
                        {view.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                )}
            </div>
        );

        return (
            <ContextMenu key={view.id}>
                <ContextMenuTrigger asChild>
                    {content}
                </ContextMenuTrigger>
                <SpaceViewContextMenu
                    view={view}
                    onRename={onRename}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onTogglePin={onTogglePin}
                    onTogglePrivate={onTogglePrivate}
                    onToggleLock={onToggleLock}
                    onToggleDefault={onToggleDefault}
                    onCopyLink={onCopyLink}
                    onShare={onShare}
                />
            </ContextMenu>
        );
    };

    return (
        <AppSidebar
            items={[]}
            onCollapseChange={setCollapsed}
            title="Views"
            className="h-full border-r border-zinc-200"
            cssVarName="--space-sidebar-width"
            expandedWidth="w-60"
        >
            <div className="space-y-1 mt-2">
                {visibleViews.map(view => renderItem(view, activeTab === view.id))}

                {hiddenViews.length > 0 && (
                    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
                        <DialogTrigger asChild>
                            <button
                                className={cn(
                                    "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none mt-2",
                                    collapsed ? "justify-center" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                                )}
                                title="More Views"
                            >
                                <MoreHorizontal size={18} className="shrink-0 text-zinc-400 group-hover:text-zinc-900" />
                                {!collapsed && <span>More</span>}
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white border-zinc-200 text-zinc-900 p-0 overflow-hidden gap-0">
                            <DialogHeader className="p-6 pb-2">
                                <DialogTitle className="text-lg font-medium text-zinc-900">All Views</DialogTitle>
                            </DialogHeader>
                            <div className="p-4 pt-2 pb-6">
                                <div className="grid grid-cols-3 gap-2">
                                    {hiddenViews.map(view => renderItem(view, activeTab === view.id, true))}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <div className="pt-2 mt-2 border-t border-zinc-100">
                    <button
                        onClick={onAddView}
                        className={cn(
                            "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none",
                            collapsed ? "justify-center" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        )}
                        title="Add View"
                    >
                        <Plus size={18} className="shrink-0 text-zinc-400 group-hover:text-zinc-900" />
                        {!collapsed && <span>Add View</span>}
                    </button>
                </div>
            </div>
        </AppSidebar>
    );
}
