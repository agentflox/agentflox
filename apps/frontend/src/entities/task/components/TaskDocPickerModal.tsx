'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, FileText, Check, ArrowLeftRight, Plus } from 'lucide-react';
import { TaskCreationModal } from './TaskCreationModal';
import { DocumentCreationModal } from '@/entities/documents/components/DocumentCreationModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export type RelationshipDependencyType = 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';

interface TaskDocPickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId: string;
    dependencyType?: RelationshipDependencyType;
    onSelect: (selected: { type: "TASK" | "DOCUMENT", id: string }) => void;
}

export function TaskDocPickerModal({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    dependencyType,
    onSelect,
}: TaskDocPickerModalProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState<{ type: "TASK" | "DOCUMENT", id: string } | null>(null);
    const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
    const [createDocOpen, setCreateDocOpen] = React.useState(false);

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
        t.id !== taskId && (!searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filteredDocs = documents.filter((d: any) => 
        !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = () => {
        if (selectedItem) {
            onSelect(selectedItem);
            onOpenChange(false);
            setSelectedItem(null);
            setSearchQuery('');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white [&>button]:hidden shadow-lg">
                <DialogTitle className="sr-only">Select task or doc</DialogTitle>
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
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="relative mb-3 flex items-center justify-center w-12 h-12">
                                                <div className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center bg-white shadow-sm">
                                                    <ArrowLeftRight className="h-5 w-5 text-zinc-400" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-zinc-400 flex items-center justify-center">
                                                    <Search className="h-3 w-3 text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div className="text-[13px] text-zinc-500 mb-3">
                                                No results found.
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCreateTaskOpen(true)}
                                                className="h-8 text-xs px-4 gap-1.5 font-medium text-zinc-600 bg-white hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] rounded-md group"
                                            >
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                                Create task
                                            </Button>
                                        </div>
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
                                            
                                            const isSelected = selectedItem?.type === "TASK" && selectedItem?.id === t.id;
                                            
                                            return (
                                                <div
                                                    key={t.id}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group",
                                                        isSelected && "bg-zinc-100"
                                                    )}
                                                    onClick={() => setSelectedItem({ type: "TASK", id: t.id })}
                                                    onDoubleClick={() => {
                                                        setSelectedItem({ type: "TASK", id: t.id });
                                                        setTimeout(handleConfirm, 0);
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                                                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-zinc-300"
                                                        )}
                                                    >
                                                        {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                                    </div>
                                                    {statusIcon}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-zinc-900 truncate">
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
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="relative mb-3 flex items-center justify-center w-12 h-12">
                                                <div className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center bg-white shadow-sm">
                                                    <FileText className="h-5 w-5 text-zinc-400" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-zinc-400 flex items-center justify-center">
                                                    <Search className="h-3 w-3 text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div className="text-[13px] text-zinc-500 mb-3">
                                                No results found.
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCreateDocOpen(true)}
                                                className="h-8 text-xs px-4 gap-1.5 font-medium text-zinc-600 bg-white hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] rounded-md group"
                                            >
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                                Create doc
                                            </Button>
                                        </div>
                                    ) : (
                                        filteredDocs.map((doc: any) => {
                                            const isSelected = selectedItem?.type === "DOCUMENT" && selectedItem?.id === doc.id;
                                            
                                            return (
                                                <div
                                                    key={doc.id}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group",
                                                        isSelected && "bg-zinc-100"
                                                    )}
                                                    onClick={() => setSelectedItem({ type: "DOCUMENT", id: doc.id })}
                                                    onDoubleClick={() => {
                                                        setSelectedItem({ type: "DOCUMENT", id: doc.id });
                                                        setTimeout(handleConfirm, 0);
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                                                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-zinc-300"
                                                        )}
                                                    >
                                                        {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                                    </div>
                                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="text-sm font-medium text-zinc-900 truncate flex-1">{doc.title}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-end gap-2 p-3 border-t border-zinc-100 bg-zinc-50/50">
                        <Button variant="ghost" className="h-8 text-xs font-medium rounded-md" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="h-8 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700"
                            disabled={!selectedItem}
                            onClick={handleConfirm}
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
            {createTaskOpen && (
                <TaskCreationModal
                    context="GENERAL"
                    open={createTaskOpen}
                    onOpenChange={setCreateTaskOpen}
                    workspaceId={workspaceId}
                    onSuccess={(task) => {
                        onSelect({ type: "TASK", id: task.id });
                        onOpenChange(false);
                        setCreateTaskOpen(false);
                    }}
                />
            )}
            {createDocOpen && (
                <DocumentCreationModal
                    open={createDocOpen}
                    onOpenChange={setCreateDocOpen}
                    workspaceId={workspaceId}
                    onSuccess={(docId) => {
                        onSelect({ type: "DOCUMENT", id: docId });
                        onOpenChange(false);
                        setCreateDocOpen(false);
                    }}
                />
            )}
        </>
    );
}
