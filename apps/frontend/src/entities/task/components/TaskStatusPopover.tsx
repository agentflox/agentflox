import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Check, CircleDashed, CircleDot, CheckCircle2, Settings } from "lucide-react";
import { TaskTypeIcon } from "./TaskTypeIcon";
import { cn } from "@/lib/utils";

export interface TaskStatusPopoverProps {
    task: any;
    availableStatuses: any[];
    availableTaskTypes: any[];
    onUpdateTask: (id: string, data: any) => void;
    hideTaskTypeTab?: boolean;
    hideStatusTab?: boolean;
    children: React.ReactNode;
}

export function TaskStatusPopover({
    task,
    availableStatuses,
    availableTaskTypes,
    onUpdateTask,
    hideTaskTypeTab,
    hideStatusTab,
    children
}: TaskStatusPopoverProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredStatuses = availableStatuses.filter((s: any) => s.name?.toLowerCase().includes(search.toLowerCase()));
    
    // Group statuses by type roughly based on color/status name for the UI
    const notStartedStatuses = filteredStatuses.filter((s: any) => ["#94A3B8", "slate"].some(c => s.color?.includes(c)) || s.name?.toLowerCase() === "to do" || s.name?.toLowerCase() === "open");
    const activeStatuses = filteredStatuses.filter((s: any) => ["#3B82F6", "blue", "yellow", "orange"].some(c => s.color?.includes(c)) || s.name?.toLowerCase() === "in progress");
    const closedStatuses = filteredStatuses.filter((s: any) => ["#10B981", "green", "emerald"].some(c => s.color?.includes(c)) || s.name?.toLowerCase() === "done" || s.name?.toLowerCase() === "complete");

    const taskType = task.taskType || availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
    const isDefaultType = !taskType || taskType.name?.toLowerCase() === "task" || taskType.isDefault;

    const renderStatusItem = (status: any, fallbackIcon: React.ReactNode) => {
        const isSelected = task.statusId === status.id || task.status?.id === status.id || task.status?.name === status.name;
        
        // As per requirements, if a task type is chosen (non-default), the status icon is the TaskTypeIcon
        // If it's the default task type, use the fallbackIcon (circle, circle-dot, etc)
        const icon = isDefaultType ? fallbackIcon : <TaskTypeIcon type={taskType} className="h-4 w-4" color={status.color || "#64748b"} />;

        return (
            <div
                key={status.id}
                onClick={() => {
                    onUpdateTask(task.id, { statusId: status.id });
                    setOpen(false);
                }}
                className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm mb-1",
                    isSelected ? "bg-zinc-100" : "hover:bg-zinc-100"
                )}
            >
                <div className="flex items-center gap-2">
                    <span style={{ color: status.color || "#64748b" }} className="flex items-center justify-center shrink-0">
                        {icon}
                    </span>
                    <span className="font-medium text-zinc-800 text-[13px]">{status.name?.toUpperCase()}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-zinc-900" />}
            </div>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[240px] p-2 bg-white shadow-xl rounded-xl border border-zinc-200">
                <Tabs defaultValue={hideStatusTab ? "taskType" : "status"} className="w-full">
                    {(!hideTaskTypeTab && !hideStatusTab) && (
                        <TabsList className="w-full grid grid-cols-2 mb-2 p-0.5 bg-zinc-100/80 rounded-lg h-8">
                            <TabsTrigger value="status" className="text-xs font-medium rounded-md cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">Status</TabsTrigger>
                            <TabsTrigger value="taskType" className="text-xs font-medium rounded-md cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm">Task Type</TabsTrigger>
                        </TabsList>
                    )}
                    
                    <div className="px-1 mb-2">
                        <Input 
                            placeholder="Search..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-7 text-xs bg-white focus-visible:ring-1 focus-visible:ring-indigo-500 rounded border-zinc-200 shadow-sm"
                        />
                    </div>

                    {!hideStatusTab && (
                        <TabsContent value="status" className="m-0 max-h-[300px] overflow-y-auto">
                            <div className="px-1 pb-1">
                            {notStartedStatuses.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-[11px] font-semibold text-zinc-500 mb-1 flex items-center justify-between px-1">
                                        <span>Not started</span>
                                        <span className="opacity-50">...</span>
                                    </div>
                                    {notStartedStatuses.map((s: any) => renderStatusItem(s, <CircleDashed className="h-4 w-4" />))}
                                </div>
                            )}
                            
                            {activeStatuses.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-[11px] font-semibold text-zinc-500 mb-1 px-1">Active</div>
                                    {activeStatuses.map((s: any) => renderStatusItem(s, <CircleDot className="h-4 w-4" />))}
                                </div>
                            )}

                            {closedStatuses.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-[11px] font-semibold text-zinc-500 mb-1 px-1">Closed</div>
                                    {closedStatuses.map((s: any) => renderStatusItem(s, <CheckCircle2 className="h-4 w-4" />))}
                                </div>
                            )}

                        </div>
                    </TabsContent>
                    )}

                    {!hideTaskTypeTab && (
                        <TabsContent value="taskType" className="m-0 max-h-[300px] overflow-y-auto">
                        <div className="px-1 pb-1">
                            <div className="text-[11px] font-semibold text-zinc-500 mb-2 px-1">
                                Task Types
                            </div>
                            
                            {availableTaskTypes.map((type: any) => {
                                const isSelected = task.taskType?.id ? task.taskType.id === type.id : type.isDefault;
                                return (
                                    <div
                                        key={type.id}
                                        onClick={() => {
                                            onUpdateTask(task.id, { taskTypeId: type.id });
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm mb-1",
                                            isSelected ? "bg-zinc-100" : "hover:bg-zinc-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <TaskTypeIcon type={type} className="h-4 w-4 text-zinc-500" />
                                            <span className="font-medium text-zinc-800 text-[13px]">
                                                {type.name} {type.isDefault && <span className="text-zinc-400 font-normal">(default)</span>}
                                            </span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-zinc-900" />}
                                    </div>
                                );
                            })}
                            
                        </div>
                    </TabsContent>
                    )}
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
