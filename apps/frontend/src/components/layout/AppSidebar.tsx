"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SidebarItem {
    label: string;
    icon: LucideIcon;
    href?: string;
    value?: string;
    onClick?: () => void;
}

interface AppSidebarProps {
    items?: SidebarItem[];
    title?: React.ReactNode;
    mode?: "inline" | "overlay";
    onClose?: () => void;
    cssVarName?: string;
    onCollapseChange?: (collapsed: boolean) => void;
    activeItem?: string; // value or href to match
    onItemClick?: (item: SidebarItem) => void;
    renderHeader?: (isCollapsed: boolean) => React.ReactNode;
    renderFooter?: (isCollapsed: boolean) => React.ReactNode;
    children?: React.ReactNode;
    expandedWidth?: string; // Tailwind class, e.g. "w-64" or "w-72"
    className?: string;
}

export function AppSidebar({
    items = [],
    title,
    mode = "inline",
    onClose,
    cssVarName = "--sidebar-width",
    onCollapseChange,
    activeItem,
    onItemClick,
    renderHeader,
    renderFooter,
    children,
    expandedWidth = "w-64",
    className
}: AppSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Extract pixel/rem value if possible, or just default.
        // CSS vars usually expect actual values like '16rem'.
        // If expandedWidth is a tailwind class like "w-64", we know it's 16rem.
        // "w-72" is 18rem.
        // Map common classes or allow logic to determine.
        let widthStr = "16rem";
        if (expandedWidth === "w-72") widthStr = "18rem";
        if (expandedWidth === "w-80") widthStr = "20rem";

        const width = isCollapsed ? "4rem" : widthStr;
        if (typeof document !== "undefined" && cssVarName) {
            document.documentElement.style.setProperty(cssVarName, width);
        }
        onCollapseChange?.(isCollapsed);
    }, [isCollapsed, cssVarName, onCollapseChange, expandedWidth]);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const Content = (
        <div className="space-y-1">
            {items.map((item) => {
                const Icon = item.icon;
                let isActive = false;
                if (activeItem) {
                    isActive = activeItem === item.value || activeItem === item.href;
                } else if (item.href) {
                    isActive = pathname === item.href;
                }

                const commonClasses = cn(
                    "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    isCollapsed && "justify-center px-2"
                );

                const handleClick = () => {
                    item.onClick?.();
                    onItemClick?.(item);
                    if (mode === 'overlay' && onClose) {
                        onClose();
                    }
                };

                const Label = !isCollapsed && <span>{item.label}</span>;

                if (item.href) {
                    return (
                        <Link
                            key={item.href || item.label}
                            href={item.href}
                            onClick={handleClick}
                            className={commonClasses}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                            {Label}
                        </Link>
                    );
                }

                return (
                    <button
                        key={item.value || item.label}
                        onClick={handleClick}
                        className={commonClasses}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                        {Label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <aside
            className={cn(
                "flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : expandedWidth,
                mode === "overlay" && "fixed inset-y-0 left-0 z-40 shadow-xl",
                className
            )}
        >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 py-2">
                {renderHeader ? (
                    renderHeader(isCollapsed)
                ) : (
                    <>
                        {!isCollapsed && title && (
                            <div className="font-semibold text-zinc-900 truncate text-sm">
                                {title}
                            </div>
                        )}
                    </>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    {mode === 'overlay' && onClose && (
                        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900">
                            <Menu size={16} />
                        </button>
                    )}
                    <button
                        onClick={toggleCollapse}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
                {items.length > 0 && Content}
                {children}
                {renderFooter && renderFooter(isCollapsed)}
            </ScrollArea>
        </aside>
    );
}
