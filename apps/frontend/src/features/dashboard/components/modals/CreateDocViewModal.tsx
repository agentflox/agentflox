"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CreateDocViewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (id: string) => void;
    workspaceId?: string;
    teamId?: string;
    spaceId?: string;
    projectId?: string;
}

export function CreateDocViewModal({
    open,
    onOpenChange,
    onSuccess,
    workspaceId,
    teamId,
    spaceId,
    projectId
}: CreateDocViewModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const utils = trpc.useUtils();

    const createView = trpc.view.create.useMutation({
        onSuccess: (data) => {
            if (onSuccess) onSuccess(data.id);
            onOpenChange(false);
            setName("");
            setDescription("");
            utils.view.list.invalidate();
        }
    });

    const handleCreate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        createView.mutate({
            name: name.trim() || "Untitled Document",
            description: description.trim() || undefined,
            type: "DOC",
            workspaceId,
            teamId,
            spaceId,
            projectId,
            sidebarView: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
                <div className="p-6 pb-2">
                    <div className="flex items-start gap-5">
                        <div className={cn(
                            "mt-1 p-3 rounded-2xl border transition-all duration-300",
                            "bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
                            "group-hover:scale-105"
                        )}>
                            <FileText className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-1">
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                                Create New Document
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                                Start writing your documentation.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <form className="flex flex-col" onSubmit={handleCreate}>
                    <div className="px-6 py-6 space-y-6">
                        <div className="space-y-2.5">
                            <Label
                                htmlFor="document-title"
                                className="text-sm font-medium text-slate-700"
                            >
                                Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="document-title"
                                name="title"
                                placeholder="e.g. Project Specs, Meeting Notes"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                disabled={createView.isPending}
                                autoFocus
                                className="flex-1 h-11 bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 shadow-sm"
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label
                                htmlFor="document-description"
                                className="text-sm font-medium text-slate-700"
                            >
                                Description <span className="text-[10px] font-normal lowercase">(optional)</span>
                            </Label>
                            <div className="relative">
                                <Textarea
                                    id="document-description"
                                    name="description"
                                    placeholder="Briefly describe what this document is about..."
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    maxLength={500}
                                    disabled={createView.isPending}
                                    className="min-h-[100px] resize-none bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed shadow-sm py-3 rounded-md"
                                />
                                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
                                    {description.length}/500
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-muted/20 flex items-center justify-end gap-3 border-t border-border/40">
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
                            onClick={() => {
                                onOpenChange(false);
                            }}
                            disabled={createView.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createView.isPending}
                            className={cn(
                                "w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto",
                                createView.isPending && "opacity-90"
                            )}
                        >
                            {createView.isPending ? (
                                <span className="flex items-center gap-2">
                                    <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                                    Creating...
                                </span>
                            ) : (
                                "Create Document"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
