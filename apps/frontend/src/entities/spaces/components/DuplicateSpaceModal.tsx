"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Sliders } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";

interface DuplicateSpaceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    spaceId: string;
    spaceName: string;
    spaceIcon?: string;
    spaceColor?: string;
    onSuccess?: (newSpaceId: string) => void;
}

// Left / right columns mirror the two-column layout in the design.
const TASK_PROPERTY_COLUMNS: { key: string; label: string }[][] = [
    [
        { key: "dueDates", label: "Due dates" },
        { key: "startDate", label: "Start date" },
        { key: "followers", label: "Followers" },
        { key: "currentTaskStatuses", label: "Current task statuses" },
        { key: "recurringSettings", label: "Recurring settings" },
        { key: "tags", label: "Tags" },
        { key: "priority", label: "Priority" },
        { key: "customFields", label: "Custom Fields" },
        { key: "subtasks", label: "Subtasks" },
        { key: "keepCheckedItems", label: "Keep checked items" },
    ],
    [
        { key: "assignees", label: "Assignees" },
        { key: "attachments", label: "Attachments" },
        { key: "commentAttachments", label: "Comment attachments" },
        { key: "relationships", label: "Relationships" },
        { key: "dependencies", label: "Dependencies" },
        { key: "description", label: "Description" },
        { key: "copySettingsOfStatuses", label: "Copy settings of statuses" },
        { key: "timeEstimates", label: "Time estimates" },
        { key: "checklists", label: "Checklists" },
        { key: "taskTypes", label: "Task types" },
    ],
];

const DEFAULT_TASK_PROPERTIES: Record<string, boolean> = {
    dueDates: true,
    startDate: true,
    followers: true,
    currentTaskStatuses: true,
    recurringSettings: true,
    tags: true,
    priority: true,
    customFields: true,
    subtasks: true,
    keepCheckedItems: false,
    assignees: true,
    attachments: true,
    commentAttachments: true,
    relationships: true,
    dependencies: true,
    description: true,
    copySettingsOfStatuses: true,
    timeEstimates: true,
    checklists: true,
    taskTypes: true,
};

export function DuplicateSpaceModal({
    open,
    onOpenChange,
    spaceId,
    spaceName,
    spaceIcon = "",
    spaceColor = "#3B82F6",
    onSuccess
}: DuplicateSpaceModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState(`${spaceName} (copy)`);
    const [copyMode, setCopyMode] = useState<"everything" | "customize">("everything");
    const [archivedTasks, setArchivedTasks] = useState<"no" | "include" | "unarchive">("no");
    const [icon, setIcon] = useState(spaceIcon);
    const [color, setColor] = useState(spaceColor);
    const [hasManualIcon, setHasManualIcon] = useState(false);

    // Customize options
    const [includeAutomations, setIncludeAutomations] = useState(true);
    const [includeViews, setIncludeViews] = useState(true);
    const [includeTasks, setIncludeTasks] = useState(true);
    const [taskProperties, setTaskProperties] = useState<Record<string, boolean>>(DEFAULT_TASK_PROPERTIES);

    const duplicateMutation = trpc.space.duplicate.useMutation({
        onMutate: async (variables) => {
            // Optimistic update - add the new space to the list immediately
            const tempId = `temp-${Date.now()}`;
            queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                const newSpace = {
                    id: tempId,
                    name: variables.newName,
                    icon: variables.icon,
                    color: variables.color,
                    isActive: true,
                };
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any, index: number) =>
                        index === 0 ? { ...page, items: [newSpace, ...page.items] } : page
                    )
                };
            });
        },
        onSuccess: (data) => {
            toast({ title: "Space duplicated successfully" });
            utils.space.list.invalidate();
            utils.space.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.(data.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate space", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (open) {
            setNewName(`${spaceName} (copy)`);
            setIcon(spaceIcon);
            setColor(spaceColor);
            setHasManualIcon(false);
        }
    }, [open, spaceName, spaceIcon, spaceColor]);

    const handleDuplicate = async () => {
        if (!newName.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }

        await duplicateMutation.mutateAsync({
            spaceId,
            newName: newName.trim(),
            icon,
            color,
            copyMode,
            includeAutomations: copyMode === "everything" ? true : includeAutomations,
            includeViews: copyMode === "everything" ? true : includeViews,
            includeTasks: copyMode === "everything" ? true : includeTasks,
            taskProperties: copyMode === "everything" ? {} : taskProperties,
            archivedTasks
        } as any);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-md font-semibold text-zinc-900">Duplicate Space</DialogTitle>
                    <DialogDescription className="sr-only">Create a copy of this space with your selected options</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-scroll px-4 -mx-4">
                    <div className="space-y-5 py-1">
                        {/* New Space Name */}
                        <div className="space-y-2">
                            <Label className="!text-xs text-zinc-800">New Space name</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewName(value);
                                        if (!hasManualIcon) {
                                            const firstChar = value.trim().charAt(0).toUpperCase();
                                            setIcon(firstChar || "");
                                        }
                                    }}
                                    maxLength={50}
                                    placeholder="Space name"
                                    className="flex-1 h-9 text-sm rounded-md border border-zinc-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                                />
                            </div>
                        </div>

                        {/* What to copy */}
                        <div className="space-y-3">
                            <Label className="!text-xs text-zinc-800">What would you like to copy?</Label>
                            <div className="rounded-lg border p-2">
                                <Tabs value={copyMode} onValueChange={(v) => setCopyMode(v as any)}>
                                    <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg bg-muted p-1">
                                        <TabsTrigger
                                            value="everything"
                                            className="flex items-center gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer"
                                        >
                                            <Sparkles className="h-4 w-4" /> Everything
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="customize"
                                            className="flex items-center gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer"
                                        >
                                            <Sliders className="h-4 w-4" /> Customize
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {copyMode === "everything" && (
                                    <div className="p-4">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            All properties, fields, tasks and settings will be duplicated exactly as is.
                                        </p>
                                    </div>
                                )}

                                {copyMode === "customize" && (
                                    <div className="">
                                        <p className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                                            Customize what will be duplicated
                                        </p>

                                        <div className="flex items-center justify-between px-6 py-3 border-b -mx-2">
                                            <Label htmlFor="automations" className="cursor-pointer !font-normal">
                                                Automations
                                            </Label>
                                            <Switch
                                                id="automations"
                                                checked={includeAutomations}
                                                onCheckedChange={setIncludeAutomations}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between px-6 py-3 border-b -mx-2">
                                            <Label htmlFor="views" className="cursor-pointer !font-normal">
                                                Views
                                            </Label>
                                            <Switch
                                                id="views"
                                                checked={includeViews}
                                                onCheckedChange={setIncludeViews}
                                            />
                                        </div>

                                        <div className="px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="tasks" className="cursor-pointer !font-normal">
                                                    Tasks
                                                </Label>
                                                <Switch
                                                    id="tasks"
                                                    checked={includeTasks}
                                                    onCheckedChange={setIncludeTasks}
                                                />
                                            </div>

                                            {includeTasks && (
                                                <div className="space-y-3 pt-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Customize task properties that you want to include below.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                        {TASK_PROPERTY_COLUMNS.map((column, colIndex) => (
                                                            <div key={colIndex} className="space-y-2">
                                                                {column.map(({ key, label }) => {
                                                                    const isKeepCheckedItems = key === "keepCheckedItems";
                                                                    return (
                                                                        <div key={key} className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={key}
                                                                                checked={taskProperties[key]}
                                                                                disabled={isKeepCheckedItems}
                                                                                onCheckedChange={(c) =>
                                                                                    setTaskProperties(prev => ({ ...prev, [key]: !!c }))
                                                                                }
                                                                                className="cursor-pointer"
                                                                            />
                                                                            <Label
                                                                                htmlFor={key}
                                                                                className={`text-sm !font-normal ${
                                                                                    isKeepCheckedItems
                                                                                        ? "text-muted-foreground/60 cursor-not-allowed"
                                                                                        : "cursor-pointer"
                                                                                }`}
                                                                            >
                                                                                {label}
                                                                            </Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Archived Tasks */}
                        <div className="space-y-3">
                            <Label className="!text-xs text-zinc-800">Do you want to include archived tasks?</Label>
                            <RadioGroup value={archivedTasks} onValueChange={(v: any) => setArchivedTasks(v)} className="rounded-lg border p-4 gap-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="no" />
                                    <Label htmlFor="no" className="cursor-pointer !font-normal">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="include" id="include" />
                                    <Label htmlFor="include" className="cursor-pointer !font-normal">Yes, include archived tasks</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="unarchive" id="unarchive" />
                                    <Label htmlFor="unarchive" className="cursor-pointer !font-normal">Yes, include and unarchive tasks</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" className="border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50" onClick={() => onOpenChange(false)} disabled={duplicateMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleDuplicate} disabled={duplicateMutation.isPending || !newName.trim()}>
                        {duplicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Duplicate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}