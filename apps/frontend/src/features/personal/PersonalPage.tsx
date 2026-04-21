/**
 * Personal Page
 * Centralized view for notifications, requests, activities, and user-specific content
 */
"use client"
import { useState, useEffect } from 'react';
import {
    Bell, Inbox, Activity, FileText, CheckSquare, User,
    BriefcaseBusiness, Package, Mail, Sparkles, LayoutDashboard,
    SquareArrowOutUpRight, ChevronLeft, ChevronRight, ChevronDown,
    UserCheck, ListTodo, Briefcase
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { NotificationsView } from './tabs/NotificationsView';
import { RequestsView } from './tabs/RequestsView';
import { InvitationsView } from './tabs/InvitationsView';
import { ActivitiesView } from './tabs/ActivitiesView';
import { PostsView } from './tabs/PostsView';
import { TasksView } from './tabs/TasksView';
import type { TaskSubView } from './tabs/TasksView';
import { MessagesView } from './tabs/MessagesView';
import { CommentsView } from './tabs/CommentsView';
import { ProfileView } from './tabs/ProfileView';
import { ApplicationsView } from './tabs/ApplicationsView';
import { MyAssetsView } from './tabs/MyAssetsView';
import { MyListingsView } from './tabs/MyListingsView';
import { EarningsView } from './tabs/EarningsView';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type PersonalTab = 'profile' | 'notifications' | 'requests' | 'invitations' | 'activities' | 'posts' | 'tasks' | 'messages' | 'comments' | 'applications' | 'assets' | 'listings' | 'earnings';

const TASK_SUB_ITEMS: { value: TaskSubView; label: string; icon: React.ElementType }[] = [
    { value: 'my-work', label: 'My Work', icon: Briefcase },
    { value: 'assigned', label: 'Assigned to Me', icon: UserCheck },
    { value: 'personal-list', label: 'Personal List', icon: ListTodo },
];

const NAV_ITEMS: { value: PersonalTab; label: string; icon: React.ElementType }[] = [
    { value: 'tasks', label: 'Tasks', icon: CheckSquare },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'requests', label: 'Requests', icon: Inbox },
    { value: 'invitations', label: 'Invitations', icon: Mail },
    { value: 'applications', label: 'Applications', icon: BriefcaseBusiness },
    { value: 'assets', label: 'My Assets', icon: Package },
    { value: 'listings', label: 'My Listings', icon: LayoutDashboard },
    { value: 'earnings', label: 'Earnings', icon: Sparkles },
    { value: 'activities', label: 'Activities', icon: Activity },
    { value: 'posts', label: 'Posts', icon: FileText },
    { value: 'profile', label: 'Profile Settings', icon: User },
];

export function PersonalPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const urlTab = searchParams.get('tab') as PersonalTab | null;
    const urlSubtab = searchParams.get('subtab') as TaskSubView | null;

    const [activeTab, setActiveTab] = useState<PersonalTab>(urlTab || 'tasks');
    const [taskSubView, setTaskSubView] = useState<TaskSubView>(urlSubtab || 'my-work');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [tasksExpanded, setTasksExpanded] = useState(true);

    // Sync URL → state
    useEffect(() => {
        if (!urlTab) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', 'tasks');
            params.set('subtab', 'my-work');
            router.replace(`${pathname}?${params.toString()}`);
        } else {
            setActiveTab(urlTab);
            if (urlTab === 'tasks' && urlSubtab) {
                setTaskSubView(urlSubtab);
            }
            setTasksExpanded(urlTab === 'tasks');
        }
    }, [urlTab, urlSubtab, pathname, router, searchParams]);

    const handleTabChange = (tab: PersonalTab) => {
        setActiveTab(tab);
        if (tab !== 'tasks') {
            setTasksExpanded(false);
        }
        const params = new URLSearchParams();
        params.set('tab', tab);
        if (tab === 'tasks') {
            params.set('subtab', taskSubView);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleTaskSubViewChange = (subView: TaskSubView) => {
        setTaskSubView(subView);
        setActiveTab('tasks');
        setTasksExpanded(true);
        const params = new URLSearchParams();
        params.set('tab', 'tasks');
        params.set('subtab', subView);
        router.push(`${pathname}?${params.toString()}`);
    };

    const activeLabel = activeTab === 'tasks'
        ? TASK_SUB_ITEMS.find(s => s.value === taskSubView)?.label ?? 'Tasks'
        : NAV_ITEMS.find(n => n.value === activeTab)?.label ?? activeTab;

    const renderContent = () => {
        switch (activeTab) {
            case 'notifications': return <NotificationsView />;
            case 'requests': return <RequestsView />;
            case 'invitations': return <InvitationsView />;
            case 'activities': return <ActivitiesView />;
            case 'posts': return <PostsView />;
            case 'tasks': return <TasksView subView={taskSubView} />;
            case 'messages': return <MessagesView />;
            case 'comments': return <CommentsView />;
            case 'profile': return <ProfileView />;
            case 'applications': return <ApplicationsView />;
            case 'assets': return <MyAssetsView />;
            case 'listings': return <MyListingsView />;
            case 'earnings': return <EarningsView />;
            default: return <TasksView subView="my-work" />;
        }
    };

    return (
        <div className="flex h-full w-full bg-zinc-50/50">
            {/* Custom Sidebar */}
            <aside className={cn(
                "flex h-full flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out relative",
                isCollapsed ? "w-20" : "w-64"
            )}>
                {/* Header */}
                <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 py-2">
                    <div className={cn("flex items-center gap-2 overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200">
                            <User size={14} className="text-zinc-600" />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="truncate text-sm font-semibold text-zinc-900 leading-tight">Personal Space</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="ml-auto cursor-pointer flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Nav */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.value;
                            const isTasksItem = item.value === 'tasks';

                            return (
                                <div key={item.value}>
                                    <button
                                        onClick={() => {
                                            if (isTasksItem) {
                                                setTasksExpanded(!tasksExpanded);
                                                if (!isActive) handleTabChange('tasks');
                                            } else {
                                                handleTabChange(item.value);
                                            }
                                        }}
                                        className={cn(
                                            "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                                            isCollapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                                        )}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                                        {!isCollapsed && (
                                            <>
                                                <span className="flex-1 text-left">{item.label}</span>
                                                {isTasksItem && (
                                                    <ChevronDown
                                                        size={14}
                                                        className={cn("text-zinc-400 transition-transform duration-200", tasksExpanded && "rotate-180")}
                                                    />
                                                )}
                                            </>
                                        )}
                                        {isCollapsed && <span className="text-center max-w-[52px] truncate">{item.label}</span>}
                                    </button>

                                    {/* Tasks sub-items */}
                                    {isTasksItem && activeTab === 'tasks' && tasksExpanded && !isCollapsed && (
                                        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-zinc-200 pl-3">
                                            {TASK_SUB_ITEMS.map((sub) => {
                                                const SubIcon = sub.icon;
                                                const isSubActive = activeTab === 'tasks' && taskSubView === sub.value;
                                                return (
                                                    <button
                                                        key={sub.value}
                                                        onClick={() => handleTaskSubViewChange(sub.value)}
                                                        className={cn(
                                                            "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all duration-200 cursor-pointer",
                                                            isSubActive
                                                                ? "bg-primary/10 text-primary font-medium"
                                                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 font-normal"
                                                        )}
                                                    >
                                                        <SubIcon size={15} className={cn("shrink-0", isSubActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-700")} />
                                                        <span>{sub.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-14 border-b border-zinc-200 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {(() => {
                            const navItem = NAV_ITEMS.find(n => n.value === activeTab);
                            const Icon = navItem?.icon ?? User;
                            const isTasks = activeTab === 'tasks';

                            return (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Icon size={18} />
                                        <span className={cn(
                                            "text-base font-medium",
                                            !isTasks && "text-zinc-900 font-semibold"
                                        )}>
                                            {navItem?.label ?? activeTab}
                                        </span>
                                    </div>
                                    {isTasks && (
                                        <>
                                            <ChevronRight size={16} className="text-zinc-300" />
                                            <h2 className="text-base font-semibold text-zinc-900">
                                                {TASK_SUB_ITEMS.find(s => s.value === taskSubView)?.label ?? 'My Work'}
                                            </h2>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 -mr-2 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                        title="Exit Personal Space"
                    >
                        <SquareArrowOutUpRight size={18} />
                    </button>
                </header>
                <div className="flex-1 min-h-0 relative">
                    {activeTab === 'tasks' ? (
                        <div className="absolute inset-0 overflow-hidden">
                            {renderContent()}
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <main className="p-6">
                                {renderContent()}
                            </main>
                        </ScrollArea>
                    )}
                </div>
            </div>
        </div>
    );
}
