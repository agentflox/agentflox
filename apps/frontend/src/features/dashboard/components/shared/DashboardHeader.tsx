"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Link2,
    Settings,
    Bot,
    Sparkles,
    Share2,
    Star,
    Copy,
    ExternalLink,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Configuration for a header action item
 */
export interface HeaderAction {
    /** Unique identifier for the action */
    id: string;
    /** Display label */
    label: string;
    /** Icon component */
    icon: React.ComponentType<{ className?: string }>;
    /** Click handler */
    onClick: () => void;
    /** Optional tooltip text */
    tooltip?: string;
    /** Visual variant */
    variant?: "default" | "outline" | "ghost" | "primary";
    /** Whether the action is disabled */
    disabled?: boolean;
    /** Optional badge content (e.g., "New", count) */
    badge?: string | number;
    /** Optional dropdown items for this action */
    dropdownItems?: HeaderDropdownItem[];
    /** Optional custom render function for the entire action */
    render?: (action: HeaderAction) => React.ReactNode;
}

/**
 * Configuration for dropdown menu items
 */
export interface HeaderDropdownItem {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Optional icon */
    icon?: React.ComponentType<{ className?: string }>;
    /** Click handler */
    onClick: () => void;
    /** Whether this is a separator */
    separator?: boolean;
    /** Whether the item is disabled */
    disabled?: boolean;
    /** Optional variant for styling */
    variant?: "default" | "destructive";
}

/**
 * Props for the DashboardHeader component
 */
export interface DashboardHeaderProps {
    /** Entity name (e.g., "Project Alpha", "Marketing Team") */
    entityName: React.ReactNode;
    /** Entity type for context (e.g., "project", "space", "team") */
    entityType?: "project" | "space" | "team" | "workspace";
    /** Optional entity icon */
    entityIcon?: React.ReactNode;
    /** Whether the entity is starred/favorited */
    isStarred?: boolean;
    /** Handler for star toggle */
    onToggleStar?: () => void;
    /** URL to copy when clicking "Copy Link" */
    shareUrl?: string;
    /** Handler for settings click */
    onSettingsClick?: () => void;
    /** Handler for agent click */
    onAgentClick?: () => void;
    /** Handler for Ask AI click */
    onAskAIClick?: () => void;
    /** Handler for share click */
    onShareClick?: () => void;
    /** Additional custom actions for the left side */
    leftActions?: HeaderAction[];
    /** Additional custom actions for the right side */
    rightActions?: HeaderAction[];
    /** Optional className for custom styling */
    className?: string;
    /** Whether to show the default actions */
    showCopyLink?: boolean;
    showSettings?: boolean;
    showAgent?: boolean;
    showAskAI?: boolean;
    showShare?: boolean;

    // Popover Contents (Optional): If provided, the action will trigger a popover instead of just onClick
    // However, onClick can still be used for state management (like setting open state)
    agentPopoverContent?: React.ReactNode;
    agentOpen?: boolean;
    onAgentOpenChange?: (open: boolean) => void;

    sharePopoverContent?: React.ReactNode;
    shareOpen?: boolean;
    onShareOpenChange?: (open: boolean) => void;

    settingsPopoverContent?: React.ReactNode;
    settingsOpen?: boolean;
    onSettingsOpenChange?: (open: boolean) => void;

    askAIPopoverContent?: React.ReactNode;
    askAIOpen?: boolean;
    onAskAIOpenChange?: (open: boolean) => void;
}

/**
 * DashboardHeader - Enterprise-grade reusable header component
 * 
 * Features:
 * - Flexible action system (easy to add/remove items)
 * - Built-in common actions (copy link, settings, agent, AI, share)
 * - Support for custom actions on both sides
 * - Responsive design
 * - Accessible with tooltips and ARIA labels
 * - Consistent styling with design system
 * 
 * @example
 * ```tsx
 * <DashboardHeader
 *   entityName="Marketing Campaign"
 *   entityType="project"
 *   isStarred={true}
 *   onToggleStar={() => {}}
 *   onSettingsClick={() => {}}
 *   onAgentClick={() => {}}
 *   onAskAIClick={() => {}}
 *   onShareClick={() => {}}
 * />
 * ```
 */
export function DashboardHeader({
    entityName,
    entityType = "project",
    entityIcon,
    isStarred = false,
    onToggleStar,
    shareUrl,
    onSettingsClick,
    onAgentClick,
    onAskAIClick,
    onShareClick,
    leftActions = [],
    rightActions = [],
    className,
    showCopyLink = true,
    showSettings = true,
    showAgent = true,
    showAskAI = true,
    showShare = true,
    agentPopoverContent,
    agentOpen,
    onAgentOpenChange,
    sharePopoverContent,
    shareOpen,
    onShareOpenChange,
    settingsPopoverContent,
    settingsOpen,
    onSettingsOpenChange,
    askAIPopoverContent,
    askAIOpen,
    onAskAIOpenChange,
}: DashboardHeaderProps) {

    const handleCopyLink = () => {
        const url = shareUrl || window.location.href;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const renderAction = (action: HeaderAction) => {
        if (action.render) {
            return <React.Fragment key={action.id}>{action.render(action)}</React.Fragment>;
        }
        const Icon = action.icon;
        const buttonVariant = action.variant || "ghost";

        const button = (
            <Button
                key={action.id}
                variant={buttonVariant}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                    "h-8 relative group transition-all duration-200 ease-in-out",
                    buttonVariant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
                    // If label exists, we want to animate width or just show on hover.
                    // Simple approach: Icon always visible. Text hidden by default, visible on hover.
                    // We need to override the 'hidden sm:inline' logic.
                    "w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                )}
            >
                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                    <Icon className="h-4 w-4" />
                </div>
                <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap transition-all duration-200">
                    {action.label}
                </span>

                {action.badge && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                        {action.badge}
                    </span>
                )}
                {action.dropdownItems && <ChevronDown className="h-3 w-3 ml-1 hidden group-hover:block" />}
            </Button>
        );

        if (action.dropdownItems) {
            return (
                <DropdownMenu key={action.id}>
                    <DropdownMenuTrigger asChild>
                        {button}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {action.dropdownItems.map((item) => {
                            if (item.separator) {
                                return <DropdownMenuSeparator key={item.id} />;
                            }
                            const ItemIcon = item.icon;
                            return (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={item.onClick}
                                    disabled={item.disabled}
                                    className={cn(
                                        item.variant === "destructive" && "text-destructive focus:text-destructive"
                                    )}
                                >
                                    {ItemIcon && <ItemIcon className="h-4 w-4 mr-2" />}
                                    {item.label}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        if (action.tooltip) {
            return (
                <TooltipProvider key={action.id}>
                    <Tooltip>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent>
                            <p>{action.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return button;
    };

    return (
        <header
            className={cn(
                "flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3",
                className
            )}
            role="banner"
        >
            {/* Left Section: Entity Info + Actions */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Entity Icon & Name */}
                <div className="flex items-center gap-2 min-w-0">
                    {entityIcon && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            {entityIcon}
                        </div>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-900 truncate">
                            {entityName}
                        </h1>
                        {onToggleStar && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onToggleStar}
                                            className="flex-shrink-0 text-slate-400 hover:text-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
                                            aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                                        >
                                            <Star
                                                className={cn(
                                                    "h-4 w-4 transition-all",
                                                    isStarred && "fill-amber-500 text-amber-500"
                                                )}
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isStarred ? "Remove from favorites" : "Add to favorites"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                {/* Left Actions */}
                <div className="flex items-center gap-1">
                    {/* Copy Link */}
                    {showCopyLink && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopyLink}
                                        className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                    >
                                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                            <Link2 className="h-4 w-4" />
                                        </div>
                                        <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Copy link</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Copy link to {entityType}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Settings */}
                    {showSettings && (
                        settingsPopoverContent ? (
                            <Popover open={settingsOpen} onOpenChange={onSettingsOpenChange}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onSettingsClick}
                                        className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                    >
                                        <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                            <Settings className="h-4 w-4" />
                                        </div>
                                        <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap transition-all duration-200">Settings</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-80 p-0">
                                    {settingsPopoverContent}
                                </PopoverContent>
                            </Popover>
                        ) : (
                            onSettingsClick && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onSettingsClick}
                                                className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                                    <Settings className="h-4 w-4" />
                                                </div>
                                                <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap transition-all duration-200">Settings</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{entityType} settings</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        )
                    )}

                    {/* Custom Left Actions */}
                    {leftActions.map(renderAction)}
                </div>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Custom Right Actions */}
                {rightActions.map(renderAction)}

                {/* Agent */}
                {showAgent && (
                    agentPopoverContent ? (
                        <Popover open={agentOpen} onOpenChange={onAgentOpenChange}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAgentClick}
                                    className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                >
                                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Agent</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="p-0 w-auto">
                                {agentPopoverContent}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        onAgentClick && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onAgentClick}
                                            className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Agent</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Open AI Agents</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    )
                )}

                {/* Ask AI */}
                {showAskAI && (
                    askAIPopoverContent ? (
                        <Popover open={askAIOpen} onOpenChange={onAskAIOpenChange}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAskAIClick}
                                    className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                >
                                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Ask AI</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="p-0 w-auto">
                                {askAIPopoverContent}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        onAskAIClick && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onAskAIClick}
                                            className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                            <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Ask AI</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Ask AI about this {entityType}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    )
                )}

                {/* Share */}
                {showShare && (
                    sharePopoverContent ? (
                        <Popover open={shareOpen} onOpenChange={onShareOpenChange}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onShareClick}
                                    className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                >
                                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                        <Share2 className="h-4 w-4" />
                                    </div>
                                    <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Share</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="p-0 w-auto">
                                {sharePopoverContent}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        onShareClick && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onShareClick}
                                            className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                                <Share2 className="h-4 w-4" />
                                            </div>
                                            <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap">Share</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Share {entityType}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    )
                )}
            </div>
        </header>
    );
}

/**
 * Preset configurations for common use cases
 */
export const DashboardHeaderPresets = {
    /**
     * Minimal header with just entity name
     */
    minimal: {
        showCopyLink: false,
        showSettings: false,
        showAgent: false,
        showAskAI: false,
        showShare: false,
    },

    /**
     * Standard header with all default actions
     */
    standard: {
        showCopyLink: true,
        showSettings: true,
        showAgent: true,
        showAskAI: true,
        showShare: true,
    },

    /**
     * Viewer mode (read-only)
     */
    viewer: {
        showCopyLink: true,
        showSettings: false,
        showAgent: false,
        showAskAI: true,
        showShare: false,
    },
};
