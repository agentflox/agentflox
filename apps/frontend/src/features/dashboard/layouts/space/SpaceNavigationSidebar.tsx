import Link from "next/link";
import {
    LayoutDashboard,
    MessageSquare,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Menu,
    Users,
    Briefcase,
    User,
    List as ListIcon,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SpaceView = "overview" | "personal" | "projects" | "teams" | "lists" | "docs" | "chats" | "ai-chat";

interface SpaceNavigationSidebarProps {
    spaceId: string;
    activeView: SpaceView;
    onViewChange: (view: SpaceView) => void;
    mode?: "inline" | "overlay";
    onClose?: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const navigationItems: Array<{
    id: SpaceView;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    href?: string;
}> = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "personal", label: "Personal", icon: User },
        { id: "projects", label: "Projects", icon: Briefcase },
        { id: "teams", label: "Teams", icon: Users },
        { id: "lists", label: "Lists", icon: ListIcon },
        { id: "docs", label: "Docs", icon: FileText },
        { id: "chats", label: "Chats", icon: MessageSquare },
        { id: "ai-chat", label: "AI Chat", icon: Sparkles },
    ];

export default function SpaceNavigationSidebar({
    spaceId,
    activeView,
    onViewChange,
    mode = "inline",
    onClose,
    collapsed = false,
    onToggleCollapse,
}: SpaceNavigationSidebarProps) {
    return (
        <aside
            className={cn(
                "relative flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out shadow-lg",
                collapsed ? "w-16" : "w-[256px]",
                mode === "overlay" ? "h-full fixed inset-y-0 left-0 z-40" : "h-screen"
            )}
        >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 py-2">
                {!collapsed && <h2 className="text-sm font-semibold text-zinc-900">Space</h2>}
                <div className="flex items-center gap-2 ml-auto">
                    {mode === "overlay" && (
                        <button
                            aria-label="Close sidebar"
                            onClick={onClose}
                            className="cursor-pointer rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                        >
                            <Menu size={16} />
                        </button>
                    )}
                    {onToggleCollapse && (
                        <button
                            aria-label="Toggle sidebar"
                            onClick={onToggleCollapse}
                            className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
                        >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <TooltipProvider delayDuration={0}>
                <ScrollArea className="flex-1 px-1.5 py-4">
                    <div className="space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;

                            const commonClassName = cn(
                                "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                                collapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                            );

                            const content = (
                                <>
                                    <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                                    {collapsed ? (
                                        <span className="text-center max-w-[52px] truncate">{item.label}</span>
                                    ) : (
                                        <span>{item.label}</span>
                                    )}
                                </>
                            );

                            const ItemWrapper = item.href ? (
                                <Link
                                    href={item.href}
                                    className={commonClassName}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => onViewChange(item.id)}
                                    className={commonClassName}
                                >
                                    {content}
                                </button>
                            );

                            if (collapsed) {
                                return (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            {ItemWrapper}
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return <div key={item.id}>{ItemWrapper}</div>;
                        })}
                    </div>
                </ScrollArea>
            </TooltipProvider>
        </aside>
    );
}
