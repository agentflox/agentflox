"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import {
    Bell, Inbox, Activity, FileText, CheckSquare, MessageCircle,
    User, ChevronLeft, ChevronRight, ChevronDown,
    Briefcase, UserCheck, ListTodo
} from 'lucide-react';
import { NotificationsView } from '@/features/dashboard/components/personal/NotificationsView';
import { RequestsView } from '@/features/dashboard/components/personal/RequestsView';
import { ActivitiesView } from '@/features/dashboard/components/personal/ActivitiesView';
import { PostsView } from '@/features/dashboard/components/personal/PostsView';
import { TasksView, type TaskSubView } from '@/features/dashboard/components/personal/TasksView';
import { CommentsView } from '@/features/dashboard/components/personal/CommentsView';
import { buildDashboardPath } from '@/features/dashboard/utils/dashboardUrl';

type PersonalTab = 'notifications' | 'requests' | 'activities' | 'posts' | 'tasks' | 'comments';

const TASK_SUB_ITEMS: { value: TaskSubView; label: string; icon: React.ElementType }[] = [
    { value: 'my-work', label: 'My Work', icon: Briefcase },
    { value: 'assigned', label: 'Assigned to Me', icon: UserCheck },
    { value: 'personal-list', label: 'Personal List', icon: ListTodo },
];

const NAV_ITEMS: { id: PersonalTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Assigned to me & lists' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Updates & alerts' },
    { id: 'comments', label: 'Comments', icon: MessageCircle, description: 'Discussions & replies' },
    { id: 'requests', label: 'Requests', icon: Inbox, description: 'Pending invitations' },
    { id: 'activities', label: 'Activities', icon: Activity, description: 'Recent actions' },
    { id: 'posts', label: 'Posts', icon: FileText, description: 'Your posts' },
];

interface WorkspacePersonalViewProps {
    workspaceId: string;
    personalTab?: string;
    taskSubView?: string;
    viewId?: string;
}

export default function WorkspacePersonalView({ workspaceId, personalTab, taskSubView, viewId }: WorkspacePersonalViewProps) {
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [tasksExpanded, setTasksExpanded] = useState(true);

    const activeTab: PersonalTab = (personalTab as PersonalTab) || "tasks";
    const activeTaskSub: TaskSubView = (taskSubView as TaskSubView) || "my-work";

    const basePath = `/workspaces/${workspaceId}`;

    useEffect(() => {
        if (!personalTab) {
            router.replace(buildDashboardPath({
                basePath,
                tab: "personal",
                personalTab: "tasks",
                taskSubView: "my-work",
            }), { scroll: false });
        } else if (personalTab === "tasks" && !taskSubView) {
            router.replace(buildDashboardPath({
                basePath,
                tab: "personal",
                personalTab: "tasks",
                taskSubView: "my-work",
            }), { scroll: false });
        }
    }, [personalTab, taskSubView, basePath]);

    const handleTabChange = (tab: PersonalTab) => {
        if (tab === "tasks") {
            router.push(buildDashboardPath({ basePath, tab: "personal", personalTab: "tasks", taskSubView: activeTaskSub }), { scroll: false });
        } else {
            router.push(buildDashboardPath({ basePath, tab: "personal", personalTab: tab }), { scroll: false });
        }
    };

    const handleTaskSubViewChange = (subView: TaskSubView) => {
        router.push(buildDashboardPath({ basePath, tab: "personal", personalTab: "tasks", taskSubView: subView }), { scroll: false });
    };

    const renderContent = () => {
        const props = { workspaceId, context: "workspace" as const };
        switch (activeTab) {
            case 'notifications': return <NotificationsView {...props} />;
            case 'requests': return <RequestsView {...props} />;
            case 'activities': return <ActivitiesView {...props} />;
            case 'posts': return <PostsView {...props} />;
            case 'tasks': return <TasksView subView={activeTaskSub} {...props} />;
            case 'comments': return <CommentsView {...props} />;
            default: return <TasksView subView={activeTaskSub} {...props} />;
        }
    };

    const activeLabel = activeTab === 'tasks'
        ? TASK_SUB_ITEMS.find(s => s.value === activeTaskSub)?.label ?? 'Tasks'
        : NAV_ITEMS.find(n => n.id === activeTab)?.label ?? activeTab;

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
                        <div className="px-2 space-y-0.5">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                const isTasksItem = item.id === 'tasks';

                                const buttonContent = (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isTasksItem) {
                                                setTasksExpanded(!tasksExpanded);
                                                if (!isActive) handleTabChange('tasks');
                                            } else {
                                                handleTabChange(item.id);
                                            }
                                        }}
                                        className={cn(
                                            "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                                            collapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                                        )}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                                        {!collapsed && (
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
                                        {collapsed && <span className="text-center max-w-[52px] truncate">{item.label}</span>}
                                    </button>
                                );

                                if (collapsed) {
                                    return (
                                        <div key={item.id}>
                                            <Tooltip>
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
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.id}>
                                        {buttonContent}

                                        {/* Tasks sub-items */}
                                        {isTasksItem && activeTab === 'tasks' && tasksExpanded && !collapsed && (
                                            <div className="ml-2 mt-0.5 space-y-0.5 border-l border-zinc-200 pl-3">
                                                {TASK_SUB_ITEMS.map((sub) => {
                                                    const SubIcon = sub.icon;
                                                    const isSubActive = activeTab === 'tasks' && activeTaskSub === sub.value;
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

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-14 border-b border-zinc-200 flex items-center px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const navItem = NAV_ITEMS.find(n => n.id === activeTab);
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
                                                {TASK_SUB_ITEMS.find(s => s.value === activeTaskSub)?.label ?? 'My Work'}
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
