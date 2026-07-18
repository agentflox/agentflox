"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ListChecks, Check, X, Search, User, Network, Briefcase, Building2, Folder as FolderIconLucide, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DuplicateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: any;
    taskIds?: string[];
    workspaceId: string;
}

export function DuplicateTaskModal({ open, onOpenChange, task, taskIds = [], workspaceId }: DuplicateTaskModalProps) {
    const [newName, setNewName] = useState("");
    const [selectedListId, setSelectedListId] = useState<string>("");
    
    // Copy options
    const [copyMode, setCopyMode] = useState<"everything" | "customize">("everything");
    const [options, setOptions] = useState({
        attachments: true, checklists: true, keepCheckedItems: false, customFields: true,
        dueDate: true, recurringSettings: true, taskTypes: true, followers: true,
        assignees: true, comments: true, onlyAssignedComments: false, commentAttachments: true,
        dependencies: true, keepTaskStatus: true, tags: true, relationships: true
    });
    
    const [copyActivity, setCopyActivity] = useState(false);
    const [sendNotifications, setSendNotifications] = useState(true);

    // List picker state
    const [listPickerOpen, setListPickerOpen] = useState(false);
    const [listSearch, setListSearch] = useState("");

    const { data: personalList } = trpc.list.getPersonal.useQuery(undefined, { enabled: open });
    const { data: listsResponse } = trpc.list.byContext.useQuery({ workspaceId }, { enabled: open });

    const targetTaskIds = useMemo(() => {
        if (taskIds.length > 0) return taskIds;
        if (task) return [task.id];
        return [];
    }, [task, taskIds]);

    const isBulk = targetTaskIds.length > 1;

    useEffect(() => {
        if (open) {
            if (task && !isBulk) {
                setNewName(task.title || "");
                setSelectedListId(task.listId || "");
            }
        }
    }, [task, open, isBulk]);

    const utils = trpc.useContext();

    const bulkDuplicateMutation = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            toast.success(isBulk ? `${targetTaskIds.length} tasks duplicated` : "Task duplicated");
            utils.task.list.invalidate();
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to duplicate")
    });

    const handleDuplicate = () => {
        if (!selectedListId) {
            toast.error("Please select a destination list");
            return;
        }

        bulkDuplicateMutation.mutate({
            taskIds: targetTaskIds,
            targetListId: selectedListId,
            options: {
                includeSubtasks: true, // simplified backend params
                includeAttachments: options.attachments,
                includeAssignees: options.assignees,
                includeDependencies: options.dependencies,
                copyActivity
            }
        });
    };

    const handleToggleAll = (val: boolean) => {
        setOptions({
            attachments: val, checklists: val, keepCheckedItems: val, customFields: val,
            dueDate: val, recurringSettings: val, taskTypes: val, followers: val,
            assignees: val, comments: val, onlyAssignedComments: val, commentAttachments: val,
            dependencies: val, keepTaskStatus: val, tags: val, relationships: val
        });
    };

    const isAllUnselected = Object.values(options).every(v => !v);

    const selectedListName = useMemo(() => {
        if (selectedListId === personalList?.id) return "Personal List";
        return listsResponse?.items?.find((l: any) => l.id === selectedListId)?.name || "Select List";
    }, [selectedListId, listsResponse, personalList]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden bg-white border-zinc-200 shadow-2xl rounded-2xl" showCloseButton={false}>
                <div className="flex items-center justify-between p-4 px-5">
                    <DialogTitle className="text-[17px] font-semibold text-zinc-900">
                        {isBulk ? `Duplicate ${targetTaskIds.length} tasks` : "Duplicate task"}
                    </DialogTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-100" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="max-h-[80vh]">
                    <div className="px-5 space-y-6 pb-6">
                        {!isBulk && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[13px] font-medium text-zinc-700">New task name</label>
                                <div className="relative flex items-center">
                                    <CheckCircle2 className="absolute left-3 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        style={{ paddingLeft: "2.25rem" }}
                                        className="h-10 border-zinc-200 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg text-[14px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-[13px] font-medium text-zinc-700">Where should this task be created?</label>
                            <Popover open={listPickerOpen} onOpenChange={setListPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-10 font-normal border-zinc-200 hover:bg-zinc-50/50">
                                        <span className="flex items-center gap-2">
                                            <ListChecks className="h-4 w-4 text-zinc-500" />
                                            {selectedListName}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[490px] p-0" align="start">
                                    <div className="p-2 border-b border-zinc-100">
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-50 rounded-md border border-zinc-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                            <input
                                                className="w-full bg-transparent border-none outline-none text-[13px] placeholder:text-zinc-400"
                                                placeholder="Search lists..."
                                                value={listSearch}
                                                onChange={(e) => setListSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[280px]">
                                        <div className="py-1">
                                            {(!listSearch || "personal list".includes(listSearch.toLowerCase())) && personalList && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedListId(personalList.id); setListPickerOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-2 px-3 text-left text-[13px] cursor-pointer hover:bg-zinc-50",
                                                        selectedListId === personalList.id && "bg-indigo-50 text-indigo-700"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        <span className="font-medium">Personal List</span>
                                                    </span>
                                                    {selectedListId === personalList.id && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                                                </button>
                                            )}
                                            
                                            {listsResponse?.items?.filter((l: any) => !listSearch || l.name.toLowerCase().includes(listSearch.toLowerCase())).map((list: any) => (
                                                <button
                                                    key={list.id}
                                                    type="button"
                                                    onClick={() => { setSelectedListId(list.id); setListPickerOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-2 px-3 text-left text-[13px] cursor-pointer hover:bg-zinc-50",
                                                        selectedListId === list.id && "bg-indigo-50 text-indigo-700"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <ListChecks className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        <span className="font-medium">{list.name}</span>
                                                    </span>
                                                    {selectedListId === list.id && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[13px] font-medium text-zinc-700">What would you like to copy?</label>
                            
                            <div className="p-1.5 bg-zinc-100/50 border border-zinc-200 rounded-lg">
                                <div className="grid grid-cols-2 gap-1 mb-1">
                                    <button
                                        type="button"
                                        onClick={() => setCopyMode("everything")}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 text-[13px] font-medium rounded-md transition-all cursor-pointer",
                                            copyMode === "everything" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                                        )}
                                    >
                                        <Boxes className="h-4 w-4" /> Everything
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCopyMode("customize")}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 text-[13px] font-medium rounded-md transition-all cursor-pointer",
                                            copyMode === "customize" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                                        )}
                                    >
                                        <ListChecks className="h-4 w-4" /> Customize
                                    </button>
                                </div>

                                <div className="p-4 bg-white rounded-md border border-transparent mt-1.5">
                                    {copyMode === "everything" ? (
                                        <p className="text-[13px] text-zinc-600">
                                            All comments, fields, and settings will be duplicated exactly as is.
                                        </p>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] text-zinc-600 font-medium">Customize what will be duplicated</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAll(isAllUnselected)}
                                                    className="text-[13px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                                                >
                                                    {isAllUnselected ? "Select all" : "Unselect all"} <CheckCircle2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                                {/* Left Column */}
                                                <div className="space-y-3">
                                                    <CustomCheck id="attachments" label="Attachments" checked={options.attachments} onChange={(v) => setOptions(p => ({...p, attachments: v}))} />
                                                    <CustomCheck id="checklists" label="Checklists" checked={options.checklists} onChange={(v) => setOptions(p => ({...p, checklists: v}))} />
                                                    <CustomCheck id="keepCheckedItems" label="Keep checked items" checked={options.keepCheckedItems} onChange={(v) => setOptions(p => ({...p, keepCheckedItems: v}))} />
                                                    <CustomCheck id="customFields" label="Custom Fields" checked={options.customFields} onChange={(v) => setOptions(p => ({...p, customFields: v}))} />
                                                    <CustomCheck id="dueDate" label="Due date" checked={options.dueDate} onChange={(v) => setOptions(p => ({...p, dueDate: v}))} />
                                                    <CustomCheck id="recurringSettings" label="Recurring Settings" checked={options.recurringSettings} onChange={(v) => setOptions(p => ({...p, recurringSettings: v}))} />
                                                    <CustomCheck id="taskTypes" label="Task Types" checked={options.taskTypes} onChange={(v) => setOptions(p => ({...p, taskTypes: v}))} />
                                                    <CustomCheck id="followers" label="Followers" checked={options.followers} onChange={(v) => setOptions(p => ({...p, followers: v}))} />
                                                </div>
                                                
                                                {/* Right Column */}
                                                <div className="space-y-3">
                                                    <CustomCheck id="assignees" label="Assignees" checked={options.assignees} onChange={(v) => setOptions(p => ({...p, assignees: v}))} />
                                                    <CustomCheck id="comments" label="Comments" checked={options.comments} onChange={(v) => setOptions(p => ({...p, comments: v}))} />
                                                    <CustomCheck id="onlyAssignedComments" label="Only Assigned Comments" checked={options.onlyAssignedComments} onChange={(v) => setOptions(p => ({...p, onlyAssignedComments: v}))} />
                                                    <CustomCheck id="commentAttachments" label="Comment attachments" checked={options.commentAttachments} onChange={(v) => setOptions(p => ({...p, commentAttachments: v}))} />
                                                    <CustomCheck id="dependencies" label="Dependencies" checked={options.dependencies} onChange={(v) => setOptions(p => ({...p, dependencies: v}))} />
                                                    <CustomCheck id="keepTaskStatus" label="Keep Task Status" checked={options.keepTaskStatus} onChange={(v) => setOptions(p => ({...p, keepTaskStatus: v}))} />
                                                    <CustomCheck id="tags" label="Tags" checked={options.tags} onChange={(v) => setOptions(p => ({...p, tags: v}))} />
                                                    <CustomCheck id="relationships" label="Relationships" checked={options.relationships} onChange={(v) => setOptions(p => ({...p, relationships: v}))} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 pt-2 border-t border-zinc-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-medium text-zinc-700">Copy the task activity</p>
                                    <p className="text-[13px] text-zinc-500">Include the full history and activity on the task in the new task.</p>
                                </div>
                                <Switch checked={copyActivity} onCheckedChange={setCopyActivity} className="data-[state=checked]:bg-[#6B46C1]" />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-medium text-zinc-700">Send notifications</p>
                                    <p className="text-[13px] text-zinc-500">Notify all watchers of the task creation.</p>
                                </div>
                                <Switch checked={sendNotifications} onCheckedChange={setSendNotifications} className="data-[state=checked]:bg-[#6B46C1]" />
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-4 bg-white border-t border-zinc-100 flex items-center justify-end gap-3 z-10">
                    <Button variant="ghost" className="h-10 text-[13px] font-medium border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        className="bg-[#6B46C1] hover:bg-[#5A38A3] text-white h-10 px-6 text-[13px] font-medium shadow-sm"
                        onClick={handleDuplicate}
                        disabled={bulkDuplicateMutation.isPending || !selectedListId}
                    >
                        {bulkDuplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CustomCheck({ id, label, checked, onChange, disabled }: { id: string, label: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    return (
        <div
            className={cn(
                "flex items-center gap-2.5",
                disabled ? "cursor-not-allowed" : "cursor-pointer"
            )}
            onClick={() => !disabled && onChange(!checked)}
        >
            <Checkbox
                id={id}
                checked={checked && !disabled}
                onCheckedChange={onChange}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "data-[state=checked]:bg-[#6B46C1] data-[state=checked]:border-[#6B46C1] rounded-sm transition-all",
                    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                )}
            />
            <label
                htmlFor={id}
                className={cn(
                    "text-[13.5px] leading-none select-none",
                    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    checked && !disabled ? "text-zinc-800" : "text-zinc-600"
                )}
            >
                {label}
            </label>
        </div>
    );
}

