"use client";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Bell, Inbox, Activity, FileText, CheckSquare, MessageSquare, MessageCircle, User } from 'lucide-react';
import { NotificationsView } from '@/features/personal/tabs/NotificationsView';
import { RequestsView } from '@/features/personal/tabs/RequestsView';
import { ActivitiesView } from '@/features/personal/tabs/ActivitiesView';
import { PostsView } from '@/features/personal/tabs/PostsView';
import { TasksView } from '@/features/personal/tabs/TasksView';
import { MessagesView } from '@/features/personal/tabs/MessagesView';
import { CommentsView } from '@/features/personal/tabs/CommentsView';

type PersonalTab = 'notifications' | 'requests' | 'activities' | 'posts' | 'tasks' | 'messages' | 'comments';

interface SpacePersonalViewProps {
    spaceId: string;
    workspaceId: string;
}

export default function SpacePersonalView({ spaceId, workspaceId }: SpacePersonalViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = (searchParams.get("ptab") as PersonalTab) || "tasks";

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
        params.set("ptab", tab);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'notifications': return <NotificationsView />;
            case 'requests': return <RequestsView />;
            case 'activities': return <ActivitiesView />;
            case 'posts': return <PostsView />;
            case 'tasks': return <TasksView />;
            case 'messages': return <MessagesView />;
            case 'comments': return <CommentsView />;
            default: return <TasksView />;
        }
    };

    return (
        <div className="flex h-full w-full bg-zinc-50/50">
            {/* Inner Sidebar for Personal View */}
            <div className="flex-shrink-0 bg-white border-r border-zinc-200 h-full w-64">
                <div className="h-14 flex items-center px-4 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <User className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-zinc-900">Personal</span>
                    </div>
                </div>

                <ScrollArea className="h-[calc(100vh-3.5rem)] py-4">
                    <div className="px-2 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id as PersonalTab)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 text-left",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-600")} />
                                    <div className="flex flex-col items-start overflow-hidden">
                                        <span className="truncate w-full">{item.label}</span>
                                        {isActive && <span className="text-[10px] text-indigo-500/80 font-normal truncate w-full text-left">{item.description}</span>}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

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
