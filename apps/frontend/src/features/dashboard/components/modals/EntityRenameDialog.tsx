"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LayoutDashboard, Briefcase, Users, ListTodo, FileText, TextCursorInput } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityRenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    entityType: "space" | "project" | "team" | "list" | "doc";
    onSave: (newName: string) => void;
    isSaving?: boolean;
}

const IconMap = {
    space: LayoutDashboard,
    project: Briefcase,
    team: Users,
    list: ListTodo,
    doc: FileText,
};

export function EntityRenameDialog({ open, onOpenChange, currentName, entityType, onSave, isSaving }: EntityRenameDialogProps) {
    const [name, setName] = useState(currentName);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (open) {
            setName(currentName);
        }
    }, [open, currentName]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== currentName) {
            onSave(name.trim());
        }
    };

    const typeLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    const EntityIcon = IconMap[entityType] || TextCursorInput;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-zinc-200/60 shadow-2xl rounded-xl">
                <div className="px-6 pt-8 pb-6">
                    <DialogHeader className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 shadow-inner">
                                <EntityIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900">
                                    Rename {typeLabel}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-zinc-500">
                                    Enter a new name for this {entityType}.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="mt-8 space-y-2">
                        <div className="relative group">
                            <Input
                                id="entity-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={`Enter ${entityType} name`}
                                className={cn(
                                    "h-11 px-4 bg-zinc-50/50 border-zinc-200 shadow-sm transition-all duration-200",
                                    "focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500",
                                    "hover:border-zinc-300"
                                )}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSave();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100/80 sm:justify-between flex-row-reverse">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="h-10 px-4 font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || name.trim() === currentName || isSaving}
                        className={cn(
                            "h-10 px-6 font-medium shadow-md transition-all duration-200",
                            (!name.trim() || name.trim() === currentName)
                                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed hover:bg-zinc-100"
                                : "bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
