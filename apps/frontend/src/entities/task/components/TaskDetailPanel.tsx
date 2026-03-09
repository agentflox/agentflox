"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, CheckSquare, Calendar as CalendarIcon, Flag, User as UserIcon, Loader2, Maximize2, LayoutTemplate, Sidebar, Monitor } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type TaskLayoutMode = 'modal' | 'fullscreen' | 'sidebar';

interface TaskDetailPanelProps {
    taskId: string;
    onClose: () => void;
    layoutMode?: TaskLayoutMode;
    onLayoutChange?: (mode: TaskLayoutMode) => void;
}

export function TaskDetailPanel({ taskId, onClose, layoutMode = 'sidebar', onLayoutChange }: TaskDetailPanelProps) {
    const { data: task, isLoading } = trpc.task.get.useQuery(
        { id: taskId },
        { enabled: !!taskId }
    );

    const utils = trpc.useUtils();

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success("Task updated");
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-900">Task not found</h3>
                <p className="text-sm text-zinc-500">The task you are looking for does not exist or you don't have permission to view it.</p>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Badge variant="outline" className="font-mono text-[10px] text-zinc-500">
                        {task.id.substring(0, 8)}
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    {onLayoutChange && (
                        <div className="flex items-center bg-zinc-100 rounded-md p-0.5 mr-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-6 w-6 rounded-sm", layoutMode === 'modal' && "bg-white shadow-sm text-zinc-900")}
                                onClick={() => onLayoutChange('modal')}
                                title="Modal"
                            >
                                <LayoutTemplate className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-6 w-6 rounded-sm", layoutMode === 'fullscreen' && "bg-white shadow-sm text-zinc-900")}
                                onClick={() => onLayoutChange('fullscreen')}
                                title="Full screen"
                            >
                                <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-6 w-6 rounded-sm", layoutMode === 'sidebar' && "bg-white shadow-sm text-zinc-900")}
                                onClick={() => onLayoutChange('sidebar')}
                                title="Sidebar"
                            >
                                <Sidebar className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    {/* Title & Status */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "mt-1.5 h-4 w-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors",
                                task.status?.name === 'Done' ? "bg-emerald-500 border-emerald-500" : "border-zinc-300 hover:border-zinc-400"
                            )} />
                            <h1 className="text-xl font-bold text-zinc-900 leading-tight">
                                {task.title}
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-7">
                            <Badge variant="secondary" className={cn(
                                "rounded-sm px-2 py-0.5 text-xs font-medium",
                                task.status?.name === 'Done' ? "bg-emerald-50 text-emerald-700" :
                                    task.status?.name === 'In Progress' ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-700"
                            )}>
                                {task.status?.name || "To Do"}
                            </Badge>
                            {task.priority && (
                                <Badge variant="outline" className={cn(
                                    "rounded-sm px-2 py-0.5 text-xs border-transparent",
                                    task.priority === 'URGENT' ? "bg-red-50 text-red-700" :
                                        task.priority === 'HIGH' ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"
                                )}>
                                    <Flag className="mr-1 h-3 w-3" />
                                    {task.priority}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Properties */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                <UserIcon className="h-3.5 w-3.5" /> Assignees
                            </label>
                            <div className="flex items-center gap-1">
                                {task.assignees?.length > 0 ? (
                                    <div className="flex -space-x-2">
                                        {task.assignees.map((a: any) => (
                                            <Avatar key={a.id} className="h-6 w-6 border-2 border-white">
                                                <AvatarImage src={a.user?.image} />
                                                <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600">
                                                    {a.user?.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-zinc-400">Unassigned</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5" /> Due Date
                            </label>
                            <div className="text-sm text-zinc-700">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-8 px-2 -ml-2 w-full justify-start text-sm font-normal",
                                                !task.dueDate && "text-zinc-500"
                                            )}
                                        >
                                            {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "Set due date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                            onSelect={(date) => {
                                                updateTask.mutate({
                                                    id: task.id,
                                                    dueDate: date || null
                                                });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-zinc-900">Description</h3>
                        <div className="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                            {task.description || <span className="text-zinc-400 italic">No description provided.</span>}
                        </div>
                    </div>

                    {/* Subtasks Preview */}
                    {/* Add more sections as needed */}
                </div>
            </ScrollArea>
        </div>
    );
}
