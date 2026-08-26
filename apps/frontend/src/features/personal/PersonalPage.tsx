/**
 * Personal Page
 * Centralized view for notifications, requests, activities, and user-specific content
 */
"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    Bell, Inbox, Activity, FileText, CheckSquare, User,
    BriefcaseBusiness, Package, Mail, Sparkles, LayoutDashboard,
    ChevronLeft, ChevronRight, ChevronDown,
    UserCheck, ListTodo, Briefcase
} from 'lucide-react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskSubView } from './tabs/TasksView';

const NotificationsView = dynamic(() => import('./tabs/NotificationsView').then(m => ({ default: m.NotificationsView })));
const RequestsView = dynamic(() => import('./tabs/RequestsView').then(m => ({ default: m.RequestsView })));
const InvitationsView = dynamic(() => import('./tabs/InvitationsView').then(m => ({ default: m.InvitationsView })));
const ActivitiesView = dynamic(() => import('./tabs/ActivitiesView').then(m => ({ default: m.ActivitiesView })));
const PostsView = dynamic(() => import('./tabs/PostsView').then(m => ({ default: m.PostsView })));
const TasksView = dynamic(() => import('./tabs/TasksView').then(m => ({ default: m.TasksView })));
const MessagesView = dynamic(() => import('./tabs/MessagesView').then(m => ({ default: m.MessagesView })));
const CommentsView = dynamic(() => import('./tabs/CommentsView').then(m => ({ default: m.CommentsView })));
const ProfileView = dynamic(() => import('./tabs/ProfileView').then(m => ({ default: m.ProfileView })));
const ApplicationsView = dynamic(() => import('./tabs/ApplicationsView').then(m => ({ default: m.ApplicationsView })));
const MyAssetsView = dynamic(() => import('./tabs/MyAssetsView').then(m => ({ default: m.MyAssetsView })));
const MyListingsView = dynamic(() => import('./tabs/MyListingsView').then(m => ({ default: m.MyListingsView })));
const EarningsView = dynamic(() => import('./tabs/EarningsView').then(m => ({ default: m.EarningsView })));

export type PersonalTab = 'profile' | 'notifications' | 'requests' | 'invitations' | 'activities' | 'posts' | 'tasks' | 'messages' | 'comments' | 'applications' | 'assets' | 'listings' | 'earnings';

export const TASK_SUB_ITEMS: { value: TaskSubView; label: string; icon: React.ElementType }[] = [
    { value: 'my-work', label: 'My Work', icon: Briefcase },
    { value: 'assigned', label: 'Assigned to Me', icon: UserCheck },
    { value: 'personal-list', label: 'Personal List', icon: ListTodo },
];

export const NAV_ITEMS: { value: PersonalTab; label: string; icon: React.ElementType; description?: string }[] = [
    { value: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Assigned to me & lists' },
    { value: 'notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
    { value: 'requests', label: 'Requests', icon: Inbox, description: 'Pending invitations' },
    { value: 'invitations', label: 'Invitations', icon: Mail, description: 'Workspace invitations' },
    { value: 'applications', label: 'Applications', icon: BriefcaseBusiness, description: 'Job & role applications' },
    { value: 'assets', label: 'My Assets', icon: Package, description: 'Owned assets & tools' },
    { value: 'listings', label: 'My Listings', icon: LayoutDashboard, description: 'Marketplace listings' },
    { value: 'earnings', label: 'Earnings', icon: Sparkles, description: 'Revenue & payouts' },
    { value: 'activities', label: 'Activities', icon: Activity, description: 'Recent audit events' },
    { value: 'posts', label: 'Posts', icon: FileText, description: 'Published posts' },
    { value: 'profile', label: 'Profile Settings', icon: User, description: 'User account & settings' },
];

export function PersonalPage({ initialSlug }: { initialSlug?: string[] }) {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();

    const slugArray: string[] = useMemo(() => {
        if (initialSlug && initialSlug.length > 0) return initialSlug;
        const pSlug = (params as any)?.slug;
        if (Array.isArray(pSlug)) return pSlug;
        if (typeof pSlug === 'string') return [pSlug];
        // fallback parsing from pathname
        const segments = pathname.split('/').filter(Boolean);
        const pIdx = segments.indexOf('personal');
        if (pIdx !== -1 && segments.length > pIdx + 1) {
            return segments.slice(pIdx + 1);
        }
        return [];
    }, [initialSlug, params, pathname]);

    const { resolvedTab, resolvedTaskSub } = useMemo(() => {
        const first = slugArray[0];
        const second = slugArray[1];

        if (!first) {
            return { resolvedTab: 'tasks' as PersonalTab, resolvedTaskSub: 'my-work' as TaskSubView };
        }

        if (first === 'my-work' || first === 'assigned' || first === 'personal-list') {
            return { resolvedTab: 'tasks' as PersonalTab, resolvedTaskSub: first as TaskSubView };
        }

        if (first === 'tasks') {
            const sub = second === 'assigned' || second === 'personal-list' ? second : 'my-work';
            return { resolvedTab: 'tasks' as PersonalTab, resolvedTaskSub: sub as TaskSubView };
        }

        const validTabs: PersonalTab[] = [
            'profile', 'notifications', 'requests', 'invitations',
            'activities', 'posts', 'tasks', 'messages', 'comments',
            'applications', 'assets', 'listings', 'earnings'
        ];

        if (validTabs.includes(first as PersonalTab)) {
            return { resolvedTab: first as PersonalTab, resolvedTaskSub: 'my-work' as TaskSubView };
        }

        return { resolvedTab: 'tasks' as PersonalTab, resolvedTaskSub: 'my-work' as TaskSubView };
    }, [slugArray]);

    const [activeTab, setActiveTab] = useState<PersonalTab>(resolvedTab);
    const [taskSubView, setTaskSubView] = useState<TaskSubView>(resolvedTaskSub);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [tasksExpanded, setTasksExpanded] = useState(true);

    useEffect(() => {
        setActiveTab(resolvedTab);
        setTaskSubView(resolvedTaskSub);
        if (resolvedTab === 'tasks') {
            setTasksExpanded(true);
        }
    }, [resolvedTab, resolvedTaskSub]);

    const handleTabChange = (tab: PersonalTab) => {
        setActiveTab(tab);
        if (tab === 'tasks') {
            setTasksExpanded(true);
            router.push(`/personal/${taskSubView}`, { scroll: false });
        } else {
            setTasksExpanded(false);
            router.push(`/personal/${tab}`, { scroll: false });
        }
    };

    const handleTaskSubViewChange = (subView: TaskSubView) => {
        setTaskSubView(subView);
        setActiveTab('tasks');
        setTasksExpanded(true);
        router.push(`/personal/${subView}`, { scroll: false });
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
            default: return <TasksView subView={taskSubView} />;
        }
    };

    return (
        <div className="flex h-full w-full bg-zinc-50/50">
            {/* Custom Sidebar */}
            <aside className={cn(
                "flex h-full flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out relative flex-shrink-0",
                isCollapsed ? "w-16" : "w-64"
            )}>
                {/* Header */}
                <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 py-2">
                    {!isCollapsed && (
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
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer",
                            isCollapsed ? "mx-auto" : "ml-auto"
                        )}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Nav Items */}
                <TooltipProvider delayDuration={0}>
                    <ScrollArea className="flex-1 py-4">
                        <div className="px-2 space-y-0.5">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.value;
                                const isTasksItem = item.value === 'tasks';

                                const buttonContent = (
                                    <button
                                        type="button"
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
                                );

                                if (isCollapsed) {
                                    return (
                                        <div key={item.value}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    {buttonContent}
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    <div className="text-xs">
                                                        <div className="font-semibold">{item.label}</div>
                                                        {item.description && (
                                                            <div className="text-muted-foreground text-[10px]">{item.description}</div>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.value}>
                                        {buttonContent}

                                        {/* Tasks Sub-Items */}
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
                </TooltipProvider>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const navItem = NAV_ITEMS.find(n => n.value === activeTab);
                            const Icon = navItem?.icon ?? User;
                            const isTasks = activeTab === 'tasks';

                            return (
                                <>
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
                                </>
                            );
                        })()}
                    </div>
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

export default PersonalPage;
