"use client";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Bell, Inbox, Activity, FileText, CheckSquare, MessageSquare, MessageCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { NotificationsView } from '@/features/dashboard/components/personal/NotificationsView';
import { RequestsView } from '@/features/dashboard/components/personal/RequestsView';
import { ActivitiesView } from '@/features/dashboard/components/personal/ActivitiesView';
import { PostsView } from '@/features/dashboard/components/personal/PostsView';
import { TasksView } from '@/features/dashboard/components/personal/TasksView';
import { MessagesView } from '@/features/dashboard/components/personal/MessagesView';
import { CommentsView } from '@/features/dashboard/components/personal/CommentsView';

type PersonalTab = 'notifications' | 'requests' | 'activities' | 'posts' | 'tasks' | 'messages' | 'comments';

interface WorkspacePersonalViewProps {
    workspaceId: string;
}

export default function WorkspacePersonalView({ workspaceId }: WorkspacePersonalViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const activeTab = (searchParams.get("tab") as PersonalTab) || "tasks";

    const navItems = [
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Assigned to me & lists' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, description: 'Direct messages' },
        { id: 'comments', label: 'Comments', icon: MessageCircle, description: 'Discussions & replies' },
        { id: 'requests', label: 'Requests', icon: Inbox, description: 'Pending invitatons' },
        { id: 'activities', label: 'Activities', icon: Activity, description: 'Recent actions' },
        { id: 'posts', label: 'Posts', icon: FileText, description: 'Your posts' },
    ] as const;

    const handleTabChange = (tab: PersonalTab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const renderContent = () => {
        const props = { workspaceId, context: "workspace" as const };
        switch (activeTab) {
            case 'notifications': return <NotificationsView {...props} />;
            case 'requests': return <RequestsView {...props} />;
            case 'activities': return <ActivitiesView {...props} />;
            case 'posts': return <PostsView {...props} />;
            case 'tasks': return <TasksView {...props} />;
            case 'messages': return <MessagesView {...props} />;
            case 'comments': return <CommentsView {...props} />;
            default: return <TasksView {...props} />;
        }
    };

    return (
        <div className="flex h-full w-full bg-zinc-50/50">
            {/* Inner Sidebar for Personal View */}
            <aside
                className={cn(
                    "flex-shrink-0 flex flex-col bg-white border-r border-zinc-200 h-full transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                <div className="h-14 flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <User className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-zinc-900 text-sm">Personal</span>
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label="Toggle personal sidebar"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer",
                            collapsed ? "mx-auto" : "ml-auto"
                        )}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <TooltipProvider delayDuration={0}>
                    <ScrollArea className="flex-1 py-4">
                        <div className="px-2 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                const buttonContent = (
                                    <button
                                        type="button"
                                        onClick={() => handleTabChange(item.id as PersonalTab)}
                                        className={cn(
                                            "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mb-1 text-left cursor-pointer",
                                            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-600")} />
                                        {!collapsed && (
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="truncate w-full">{item.label}</span>
                                                {isActive && <span className="text-[10px] text-indigo-500/80 font-normal truncate w-full text-left">{item.description}</span>}
                                            </div>
                                        )}
                                    </button>
                                );

                                if (collapsed) {
                                    return (
                                        <Tooltip key={item.id}>
                                            <TooltipTrigger asChild>
                                                {buttonContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <div className="text-xs">
                                                    <div className="font-semibold">{item.label}</div>
                                                    <div className="text-muted-foreground text-[10px]">{item.description}</div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return <div key={item.id}>{buttonContent}</div>;
                            })}
                        </div>
                    </ScrollArea>
                </TooltipProvider>
            </aside>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-50">
                <header className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-zinc-900 capitalize">
                        {navItems.find(i => i.id === activeTab)?.label || activeTab}
                    </h2>
                </header>
                <div className="flex-1 overflow-auto p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

