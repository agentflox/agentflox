"use client"
import { useState } from 'react';
import { Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkTab = 'todo' | 'done' | 'delegated';

interface WorkGroup {
    id: string;
    label: string;
    count: number;
}

const TODO_GROUPS: WorkGroup[] = [
    { id: 'today', label: 'Today', count: 0 },
    { id: 'overdue', label: 'Overdue', count: 17 },
    { id: 'next', label: 'Next', count: 0 },
    { id: 'unscheduled', label: 'Unscheduled', count: 0 },
];

function WorkGroupRow({ group }: { group: WorkGroup }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-zinc-100 last:border-0">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 w-full px-5 py-3.5 hover:bg-zinc-50 transition-colors cursor-pointer group text-left"
            >
                <ChevronRight
                    className={cn(
                        "h-3.5 w-3.5 text-zinc-400 transition-transform shrink-0",
                        expanded && "rotate-90"
                    )}
                />
                <span className={cn(
                    "text-sm font-semibold",
                    group.id === 'overdue' ? "text-zinc-900" : "text-zinc-900"
                )}>
                    {group.label}
                </span>
                <span className="text-sm text-zinc-400 ml-1">{group.count}</span>
            </button>
            {expanded && (
                <div className="px-12 py-3 text-xs text-zinc-400 bg-zinc-50/50">
                    No tasks in this group.
                </div>
            )}
        </div>
    );
}

import type { PersonalTabProps } from './TasksView';

export function MyWorkView({ spaceId, projectId, workspaceId, teamId, context }: PersonalTabProps) {
    const [activeTab, setActiveTab] = useState<WorkTab>('todo');

    const tabs: { value: WorkTab; label: string }[] = [
        { value: 'todo', label: 'To Do' },
        { value: 'done', label: 'Done' },
        { value: 'delegated', label: 'Delegated' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex items-center border-b border-zinc-100 px-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                            "px-1 py-2.5 mr-6 text-sm border-b-2 transition-colors cursor-pointer",
                            activeTab === tab.value
                                ? "border-zinc-900 font-semibold text-zinc-900"
                                : "border-transparent font-medium text-zinc-400 hover:text-zinc-600"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'todo' && (
                    <div className="divide-y divide-zinc-100">
                        {TODO_GROUPS.map((group) => (
                            <WorkGroupRow key={group.id} group={group} />
                        ))}
                    </div>
                )}
                {activeTab === 'done' && (
                    <div className="flex flex-col items-center justify-center h-48 text-sm text-zinc-400">
                        No completed tasks
                    </div>
                )}
                {activeTab === 'delegated' && (
                    <div className="flex flex-col items-center justify-center h-48 text-sm text-zinc-400">
                        No delegated tasks
                    </div>
                )}
            </div>
        </div>
    );
}
