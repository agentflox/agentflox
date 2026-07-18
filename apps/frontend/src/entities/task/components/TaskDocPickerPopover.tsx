'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, FileText, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RelationshipDependencyType } from './TaskPickerModal';

interface TaskDocPickerPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId: string;
    dependencyType?: RelationshipDependencyType;
    onSelect: (selected: { type: "TASK" | "DOCUMENT", id: string }) => void;
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    existingTaskIds?: string[];
    existingDocIds?: string[];
}

export function TaskDocPickerPopover({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    dependencyType,
    onSelect,
    trigger,
    side = 'bottom',
    align = 'start',
    existingTaskIds = [],
    existingDocIds = []
}: TaskDocPickerPopoverProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState<{ type: "TASK" | "DOCUMENT", id: string } | null>(null);

    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, scope: 'all', includeRelations: true, pageSize: 20 },
        { enabled: open }
    );
    const { data: docsData } = trpc.document.list.useQuery(
        { workspaceId, pageSize: 20 },
        { enabled: open }
    );

    const tasks = tasksData?.items || [];
    const documents = docsData?.items || [];

    const filteredTasks = tasks.filter((t: any) =>
        t.id !== taskId && !existingTaskIds.includes(t.id) && (!searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filteredDocs = documents.filter((d: any) =>
        !existingDocIds.includes(d.id) && (!searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleConfirm = (item: { type: "TASK" | "DOCUMENT", id: string }) => {
        onSelect(item);
        onOpenChange(false);
        setSelectedItem(null);
        setSearchQuery('');
    };

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
            <PopoverContent className="w-[420px] p-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg" align={align} side={side} sideOffset={4} collisionPadding={16}>
                <div className="p-0">
                    <div className="p-3 pb-1 relative">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-md border border-zinc-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                className="w-full bg-transparent border-none outline-none text-[13px] placeholder:text-zinc-400"
                                placeholder="Search tasks or docs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="tasks" className="w-full">
                        <div className="px-3 pt-2 pb-2 border-b border-zinc-100">
                            <TabsList className="h-8 w-full grid grid-cols-2 bg-zinc-100/80 p-0.5 rounded-md">
                                <TabsTrigger value="tasks" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                    Tasks
                                </TabsTrigger>
                                <TabsTrigger value="docs" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                    Docs
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="tasks" className="m-0 p-0 outline-none">
                            <ScrollArea className="h-[280px]">
                                <div className="p-2">
                                    <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                        {searchQuery ? "Search Results" : "Recent Tasks"}
                                    </div>
                                    {filteredTasks.length === 0 ? (
                                        <div className="text-[13px] text-center text-zinc-500 py-4">No tasks found</div>
                                    ) : (
                                        filteredTasks.map((t: any) => {
                                            const statusName = t.status?.name?.toLowerCase() || "";
                                            let statusIcon = (
                                                <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                            );
                                            if (statusName === "done" || statusName === "completed") {
                                                statusIcon = (
                                                    <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                        <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                                    </div>
                                                );
                                            } else if (statusName === "in progress" || statusName === "doing") {
                                                statusIcon = (
                                                    <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group"
                                                    onClick={() => handleConfirm({ type: "TASK", id: t.id })}
                                                >
                                                    {statusIcon}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[13px] font-medium text-zinc-900 truncate">
                                                            {t.title}
                                                        </div>
                                                        {t.status && (
                                                            <div className="text-[11px] text-zinc-500 truncate">
                                                                {t.status.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="docs" className="m-0 p-0 outline-none">
                            <ScrollArea className="h-[280px]">
                                <div className="p-2">
                                    <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                        {searchQuery ? "Search Results" : "Recent Docs"}
                                    </div>
                                    {filteredDocs.length === 0 ? (
                                        <div className="text-[13px] text-center text-zinc-500 py-4">No docs found</div>
                                    ) : (
                                        filteredDocs.map((doc: any) => {
                                            return (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group"
                                                    onClick={() => handleConfirm({ type: "DOCUMENT", id: doc.id })}
                                                >
                                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="text-[13px] font-medium text-zinc-900 truncate flex-1">{doc.title}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>
            </PopoverContent>
        </Popover>
    );
}
