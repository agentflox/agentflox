"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Sliders } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";

interface DuplicateProjectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectName: string;
    projectIcon?: string;
    projectColor?: string;
    onSuccess?: (newProjectId: string) => void;
}

export function DuplicateProjectModal({
    open,
    onOpenChange,
    projectId,
    projectName,
    projectIcon = "",
    projectColor = "#4F46E5",
    onSuccess
}: DuplicateProjectModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState(`${projectName} (copy)`);
    const [copyMode, setCopyMode] = useState<"everything" | "customize">("everything");
    const [archivedTasks, setArchivedTasks] = useState<"no" | "include" | "unarchive">("no");
    const [icon, setIcon] = useState(projectIcon);
    const [color, setColor] = useState(projectColor);
    const [hasManualIcon, setHasManualIcon] = useState(false);

    // Customize options
    const [includeAutomations, setIncludeAutomations] = useState(true);
    const [includeViews, setIncludeViews] = useState(true);
    const [includeTasks, setIncludeTasks] = useState(true);
    const [taskProperties, setTaskProperties] = useState({
        dueDates: true,
        startDate: true,
        followers: true,
        statuses: true,
        recurring: true,
        tags: true,
        assignees: true,
        attachments: true,
        commentAttachments: true,
        relationships: true,
        dependencies: true,
        description: true
    });

    const duplicateMutation = trpc.project.duplicate.useMutation({
        onMutate: async (variables) => {
            // Optimistic update - add the new project to the list immediately
            const tempId = `temp-${Date.now()}`;
            queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                const newProject = {
                    id: tempId,
                    name: variables.newName,
                    icon: variables.icon,
                    color: variables.color,
                    isActive: true,
                };
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any, index: number) =>
                        index === 0 ? { ...page, items: [newProject, ...page.items] } : page
                    )
                };
            });
        },
        onSuccess: (data) => {
            toast({ title: "Project duplicated successfully" });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.(data.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate project", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (open) {
            setNewName(`${projectName} (copy)`);
            setIcon(projectIcon);
            setColor(projectColor);
            setHasManualIcon(false);
        }
    }, [open, projectName, projectIcon, projectColor]);

    const handleDuplicate = async () => {
        if (!newName.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }

        await duplicateMutation.mutateAsync({
            projectId,
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Duplicate Project</DialogTitle>
                    <DialogDescription>Create a copy of this project with your selected options</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 py-2">
                        {/* New Project Name */}
                        <div className="space-y-2">
                            <Label>New Project name</Label>
                            <div className="flex items-center gap-2">
                                <IconColorSelector
                                    icon={icon}
                                    color={color}
                                    entityName={newName}
                                    onIconChange={(newIcon) => {
                                        setIcon(newIcon);
                                        setHasManualIcon(true);
                                    }}
                                    onColorChange={setColor}
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-lg"
                                        style={{ backgroundColor: color }}
                                    >
                                        <ProjectIcon icon={icon} className="text-white" size={20} />
                                    </Button>
                                </IconColorSelector>
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
                                    placeholder="Project name"
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* What to copy */}
                        <div className="space-y-3">
                            <Label>What would you like to copy?</Label>
                            <Tabs value={copyMode} onValueChange={(v) => setCopyMode(v as any)}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="everything" className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" /> Everything
                                    </TabsTrigger>
                                    <TabsTrigger value="customize" className="flex items-center gap-2">
                                        <Sliders className="h-4 w-4" /> Customize
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {copyMode === "everything" && (
                                <p className="text-sm text-muted-foreground">
                                    All properties, fields, tasks and settings will be duplicated exactly as is.
                                </p>
                            )}

                            {copyMode === "customize" && (
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="automations"
                                                checked={includeAutomations}
                                                onCheckedChange={(c) => setIncludeAutomations(!!c)}
                                            />
                                            <Label htmlFor="automations" className="cursor-pointer">Automations</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="views"
                                                checked={includeViews}
                                                onCheckedChange={(c) => setIncludeViews(!!c)}
                                            />
                                            <Label htmlFor="views" className="cursor-pointer">Views</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="tasks"
                                                checked={includeTasks}
                                                onCheckedChange={(c) => setIncludeTasks(!!c)}
                                            />
                                            <Label htmlFor="tasks" className="cursor-pointer">Tasks</Label>
                                        </div>
                                    </div>

                                    {includeTasks && (
                                        <div className="space-y-3 pl-6 border-l-2">
                                            <p className="text-sm text-muted-foreground">
                                                Customize task properties that you want to include below.
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(taskProperties).map(([key, value]) => (
                                                    <div key={key} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={key}
                                                            checked={value}
                                                            onCheckedChange={(c) =>
                                                                setTaskProperties(prev => ({ ...prev, [key]: !!c }))
                                                            }
                                                        />
                                                        <Label htmlFor={key} className="text-sm cursor-pointer capitalize">
                                                            {key.replace(/([A-Z])/g, " $1").trim()}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Archived Tasks */}
                        <div className="space-y-3">
                            <Label>Do you want to include archived tasks?</Label>
                            <RadioGroup value={archivedTasks} onValueChange={(v: any) => setArchivedTasks(v)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="no" />
                                    <Label htmlFor="no" className="cursor-pointer">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="include" id="include" />
                                    <Label htmlFor="include" className="cursor-pointer">Yes, include archived tasks</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="unarchive" id="unarchive" />
                                    <Label htmlFor="unarchive" className="cursor-pointer">Yes, include and unarchive tasks</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={duplicateMutation.isPending}>
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
