/**
 * Personal Page
 * Centralized view for notifications, requests, activities, and user-specific content
 */
"use client"
import { useState } from 'react';
import { Bell, Inbox, Activity, FileText, CheckSquare, MessageSquare, MessageCircle, Menu, User } from 'lucide-react';
import { NotificationsView } from './tabs/NotificationsView';
import { RequestsView } from './tabs/RequestsView';
import { ActivitiesView } from './tabs/ActivitiesView';
import { PostsView } from './tabs/PostsView';
import { TasksView } from './tabs/TasksView';
import { MessagesView } from './tabs/MessagesView';
import { CommentsView } from './tabs/CommentsView';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type PersonalTab = 'notifications' | 'requests' | 'activities' | 'posts' | 'tasks' | 'messages' | 'comments';

export function PersonalPage() {
    const [activeTab, setActiveTab] = useState<PersonalTab>('tasks');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navItems = [
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Assigned to me & lists' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
        { id: 'requests', label: 'Requests', icon: Inbox, description: 'Pending invitatons' },
        { id: 'activities', label: 'Activities', icon: Activity, description: 'Recent actions' },
        { id: 'posts', label: 'Posts', icon: FileText, description: 'Your posts' },
        // { id: 'messages', label: 'Messages', icon: MessageSquare },
        // { id: 'comments', label: 'Comments', icon: MessageCircle },
    ] as const;

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
            {/* Personal Sidebar */}
            <div
                className={cn(
                    "flex-shrink-0 bg-white border-r border-zinc-200 h-full transition-all duration-300",
                    isSidebarOpen ? "w-64" : "w-[60px]"
                )}
            >
                <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-200">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-2 px-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <User className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-zinc-900">Personal</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <User className="h-5 w-5 text-indigo-600" />
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="h-4 w-4 text-zinc-400" />
                    </Button>
                </div>

                <ScrollArea className="h-[calc(100vh-3.5rem)] py-4">
                    <div className="px-2 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as PersonalTab)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                                        !isSidebarOpen && "justify-center px-0"
                                    )}
                                    title={!isSidebarOpen ? item.label : undefined}
                                >
                                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-600")} />
                                    {isSidebarOpen && (
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="truncate w-full">{item.label}</span>
                                            {isActive && <span className="text-[10px] text-indigo-500/80 font-normal truncate w-full text-left">{item.description}</span>}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-zinc-900 capitalize">
                        {activeTab}
                    </h2>
                </header>
                <ScrollArea className="flex-1">
                    <main className="p-6">
                        {renderContent()}
                    </main>
                </ScrollArea>
            </div>
        </div>
    );
}
