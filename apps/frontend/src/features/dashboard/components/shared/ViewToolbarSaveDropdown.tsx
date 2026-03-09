"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Save, ChevronDown, ToggleLeft, CopyPlus, Undo } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewToolbarSaveDropdownProps {
    /** Show the Save dropdown when view has id or has unsaved changes (and autosave off) */
    show: boolean;
    isViewDirty: boolean;
    viewAutosave: boolean;
    isPending: boolean;
    onSave: () => void | Promise<void>;
    onToggleAutosave: (enabled: boolean) => void | Promise<void>;
    onSaveAsNewView: (name?: string) => void | Promise<void>;
    onRevertChanges: () => void;
    isSaveAsNewPending?: boolean;
}

export function ViewToolbarSaveDropdown({
    show,
    isViewDirty,
    viewAutosave,
    isPending,
    onSave,
    onToggleAutosave,
    onSaveAsNewView,
    onRevertChanges,
    isSaveAsNewPending = false,
}: ViewToolbarSaveDropdownProps) {
    if (!show) return null;

    return (
        <div className="flex items-center gap-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void onSave()}
                        disabled={isPending || !isViewDirty}
                        className={cn(
                            "h-8 text-xs font-medium gap-1.5 rounded-r-none border-r-0",
                            isViewDirty
                                ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                : "text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                        )}
                    >
                        <Save className="h-3 w-3" />
                        <span className="hidden sm:inline">Save view</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save this view</TooltipContent>
            </Tooltip>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 px-1.5 rounded-l-none",
                            isViewDirty
                                ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                : "text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                        )}
                    >
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                        className="text-sm py-2 cursor-pointer"
                        onClick={() => void onSave()}
                        disabled={isPending || !isViewDirty}
                    >
                        <Save className="h-4 w-4 mr-2.5 text-zinc-500" />
                        <span>Save view</span>
                        <span className="ml-auto text-xs text-zinc-400">Ctrl ⏎</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-sm py-2 cursor-pointer"
                        onClick={() => void onToggleAutosave(!viewAutosave)}
                    >
                        <ToggleLeft className="h-4 w-4 mr-2.5 text-zinc-500" />
                        <span>Enable Autosave</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-sm py-2 cursor-pointer"
                        onClick={() => void onSaveAsNewView()}
                        disabled={isSaveAsNewPending}
                    >
                        <CopyPlus className="h-4 w-4 mr-2.5 text-zinc-500" />
                        <span>Save as new view</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-sm py-2 cursor-pointer"
                        onClick={onRevertChanges}
                        disabled={!isViewDirty}
                    >
                        <Undo className="h-4 w-4 mr-2.5 text-zinc-500" />
                        <span>Revert changes</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
