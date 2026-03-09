"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewToolbarClosedPopoverProps {
    showCompleted: boolean;
    showCompletedSubtasks: boolean;
    onShowCompletedChange: (v: boolean) => void;
    onShowCompletedSubtasksChange: (v: boolean) => void;
}

export function ViewToolbarClosedPopover({
    showCompleted,
    showCompletedSubtasks,
    onShowCompletedChange,
    onShowCompletedSubtasksChange,
}: ViewToolbarClosedPopoverProps) {
    const hasClosed = showCompleted || showCompletedSubtasks;

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative group/closed inline-flex">
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium pr-7",
                                    hasClosed ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                )}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Closed</span>
                            </Button>
                        </PopoverTrigger>
                        {hasClosed && (
                            <button
                                type="button"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-violet-600 hover:bg-violet-100 hover:text-violet-800 opacity-0 group-hover/closed:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onShowCompletedChange(false);
                                    onShowCompletedSubtasksChange(false);
                                }}
                                aria-label="Hide all closed tasks"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    {hasClosed ? "Show closed tasks. Click × to hide all." : "Show closed tasks"}
                </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-800">Tasks</span>
                        <Switch checked={showCompleted} onCheckedChange={onShowCompletedChange} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-800">Subtasks</span>
                        <Switch checked={showCompletedSubtasks} onCheckedChange={onShowCompletedSubtasksChange} />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
