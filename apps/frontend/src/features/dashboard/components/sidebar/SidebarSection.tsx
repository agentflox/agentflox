"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarSectionProps<T> {
    title: string;
    items: T[];
    collapsed: boolean;
    headerAction?: React.ReactNode;
    renderItem: (item: T) => React.ReactNode;
    renderActions?: (item: T) => React.ReactNode;
    emptyLabel?: string;
    defaultOpen?: boolean;
}

export function SidebarSection<T extends { id: string }>({
    title,
    items,
    collapsed,
    headerAction,
    renderItem,
    renderActions,
    emptyLabel = "No items",
    defaultOpen = true,
}: SidebarSectionProps<T>) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div>
            <div
                className={cn(
                    "flex items-center justify-between px-2 py-1.5 group select-none",
                    collapsed && "justify-center px-0"
                )}
            >
                {!collapsed && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                        <span className="truncate">{title}</span>
                        {isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                    </button>
                )}

                {/* Header Action */}
                {!collapsed && headerAction && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {headerAction}
                    </div>
                )}

                {/* Collapsed Mode */}
                {collapsed && (
                    <button onClick={() => setIsOpen(!isOpen)} title={title} className="p-1 hover:bg-zinc-100 rounded-md">
                        {isOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                    </button>
                )}
            </div>

            {!collapsed && isOpen && (
                <div className="mt-0.5 space-y-0.5 pl-2 relative">
                    {items.length === 0 ? (
                        <p className="px-2 py-1.5 text-xs text-zinc-400 italic">{emptyLabel}</p>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="group/item flex items-center justify-between rounded-md hover:bg-zinc-100 transition-colors pr-1">
                                <div className="flex-1 min-w-0">
                                    {renderItem(item)}
                                </div>
                                {renderActions && (
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 ml-1">
                                        {renderActions(item)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {/* Visual guideline */}
                    <div className="absolute left-0 top-1 bottom-1 w-px bg-zinc-100" />
                </div>
            )}
        </div>
    );
}
