"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Settings2 } from "lucide-react";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { useQueryClient } from "@tanstack/react-query";

interface WorkspaceGeneralSettingsModalProps {
    workspaceId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const VISIBILITY_OPTIONS = [
    {
        label: "Only Owners",
        value: "PRIVATE",
        description: "Only workspace owners can view and edit"
    },
    {
        label: "Owners & Admins",
        value: "ADMINS",
        description: "Owners and admins can view and edit"
    },
    {
        label: "Owners, Admins & Members",
        value: "MEMBERS",
        description: "All workspace members can view"
    },
    {
        label: "Anyone with Link",
        value: "PUBLIC",
        description: "Anyone with the link can view"
    },
];

export function WorkspaceGeneralSettingsModal({ workspaceId, open, onOpenChange }: WorkspaceGeneralSettingsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC">("PRIVATE");
    const [color, setColor] = useState("#3B82F6");
    const [icon, setIcon] = useState("");

    const { data: workspace, isLoading } = trpc.workspace.get.useQuery(
        { id: workspaceId || "" },
        { enabled: !!workspaceId }
    );

    // Owner info - get email from creator
    const ownerEmail = (workspace as any)?.owner?.email || "Unknown";
    const ownerName = (workspace as any)?.owner?.name || ownerEmail;
    const ownerAvatar = (workspace as any)?.owner?.avatar || null;

    useEffect(() => {
        if (workspace) {
            setName(workspace.name);
            setDescription(workspace.description || "");
            setVisibility((workspace.visibility as any) || "PRIVATE");
            setColor(workspace.color || "#3B82F6");
            setIcon(workspace.icon || "");
        }
    }, [workspace]);

    const updateWorkspace = trpc.workspace.update.useMutation({
        onSuccess: () => {
            toast({ title: "Workspace settings updated successfully" });

            // Immediate UI update for sidebar (updates all listInfinite caches)
            queryClient.setQueriesData({ queryKey: [['workspace', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                return {
                    ...oldData,
                    items: oldData.items.map((item: any) =>
                        item.id === workspaceId
                            ? { ...item, name, description, color, icon, visibility }
                            : item
                    )
                };
            });

            utils.workspace.get.invalidate({ id: workspaceId! });
            utils.workspace.list.invalidate();
            onOpenChange(false);
        },
        onError: (err) => toast({
            title: "Failed to update workspace",
            description: err.message,
            variant: "destructive"
        })
    });

    const [hasManualIcon, setHasManualIcon] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceId) return;
        if (!name.trim()) {
            toast({
                title: "Validation error",
                description: "Workspace name is required",
                variant: "destructive"
            });
            return;
        }

        updateWorkspace.mutate({
            id: workspaceId,
            name: name.trim(),
            description: description.trim(),
            visibility: visibility as any,
            color,
            icon
        });
    };

    if (!workspaceId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl gap-6">
                <div className="pb-2 min-w-0">
                    <div className="flex items-start gap-5">
                        <div className="mt-1 p-3 rounded-2xl border bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] transition-all duration-300">
                            <Settings2 className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-1 flex-1 min-w-0">
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95 truncate">
                                Workspace Settings
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm leading-relaxed truncate">
                                A Workspace represents your entire organization and holds spaces, teams, and projects.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <form className="flex flex-col gap-5 min-w-0" onSubmit={handleSubmit}>
                        {/* Icon & Name + Owner */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Icon & name</Label>
                                <div className="flex items-center gap-2">
                                    <IconColorSelector
                                        icon={icon}
                                        color={color}
                                        entityName={name}
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
                                            className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                                            style={{ backgroundColor: icon ? color : 'transparent' }}
                                        >
                                            <WorkspaceIcon icon={icon} className="text-white" size={20} fill />
                                        </Button>
                                    </IconColorSelector>
                                    <Input
                                        value={name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            setName(newName);
                                            if (!hasManualIcon) {
                                                const firstChar = newName.trim().charAt(0).toUpperCase();
                                                setIcon(firstChar || "W");
                                            }
                                        }}
                                        maxLength={50}
                                        placeholder="Workspace name"
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Owner */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Owner</Label>
                                <div className="flex items-center gap-2 h-10 px-3 border border-slate-200 rounded-xl bg-slate-50">
                                    {ownerAvatar ? (
                                        <img src={ownerAvatar} alt={ownerName} className="h-5 w-5 rounded-full" />
                                    ) : (
                                        <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium">
                                            {ownerEmail.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm text-slate-600 truncate">{ownerEmail}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">
                                Description <span className="text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Add a description for this workspace..."
                                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>

                        {/* Visibility */}
                        <div className="space-y-2.5">
                            <Label htmlFor="workspace-visibility" className="text-sm font-medium text-slate-700">
                                Visibility
                            </Label>
                            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                                <SelectTrigger id="workspace-visibility" className="h-11 bg-muted/30 border-input/60">
                                    <SelectValue placeholder="Select visibility">
                                        {VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {VISIBILITY_OPTIONS.map(({ value, label, description }) => (
                                        <SelectItem key={value} value={value} description={description}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
                                onClick={() => onOpenChange(false)}
                                disabled={updateWorkspace.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-2xl sm:w-auto"
                                disabled={updateWorkspace.isPending || !name.trim()}
                            >
                                {updateWorkspace.isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </span>
                                ) : (
                                    "Save changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
