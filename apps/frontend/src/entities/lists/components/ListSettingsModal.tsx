"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { ListIcon } from "lucide-react";

interface ListSettingsModalProps {
    workspaceId: string;
    spaceId?: string;
    listId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ListSettingsModal({ workspaceId, spaceId, listId, open, onOpenChange }: ListSettingsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#3B82F6");
    const [icon, setIcon] = useState("");
    const [hasManualIcon, setHasManualIcon] = useState(false);

    // Fetch list details via byContext since we don't have list.get
    const { data: listsData, isLoading } = trpc.list.byContext.useQuery(
        { workspaceId, spaceId },
        { enabled: !!open && !!(workspaceId || spaceId) }
    );

    const list = listsData?.items?.find((l: any) => l.id === listId);

    useEffect(() => {
        if (list) {
            setName(list.name);
            setDescription(list.description || "");
            setColor(list.color || "#3B82F6");
            setIcon(list.icon || "");
        }
    }, [list]);

    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            toast({ title: "List settings updated successfully" });
            utils.list.byContext.invalidate();
            onOpenChange(false);
        },
        onError: (err) => toast({
            title: "Failed to update list",
            description: err.message,
            variant: "destructive"
        })
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!listId) return;
        if (!name.trim()) {
            toast({
                title: "Validation error",
                description: "List name is required",
                variant: "destructive"
            });
            return;
        }

        updateList.mutate({
            id: listId,
            name: name.trim(),
            description: description.trim(),
            color,
            icon
        });
    };

    if (!listId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl gap-6">
                <DialogHeader className="gap-1.5">
                    <DialogTitle className="text-2xl font-semibold tracking-tight">Edit List settings</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Manage your list details and appearance.
                    </DialogDescription>
                </DialogHeader>

                {isLoading && !list ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        {/* Icon & Name */}
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
                                        {/* Fallback icon handling if EntityIcon not available */}
                                        <ListIcon className={icon ? "text-white" : "text-slate-500"} size={20} />
                                    </Button>
                                </IconColorSelector>
                                <Input
                                    value={name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setName(newName);
                                        if (!hasManualIcon) {
                                            const firstChar = newName.trim().charAt(0).toUpperCase();
                                            // Optional: Auto-set icon logic to first char? 
                                            // For lists, we often default to a List icon, but can set char if desired.
                                            // setIcon(firstChar || "L"); 
                                        }
                                    }}
                                    maxLength={50}
                                    placeholder="List name"
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                                    required
                                />
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
                                placeholder="Add a description for this list..."
                                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>

                        <DialogFooter className="gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
                                onClick={() => onOpenChange(false)}
                                disabled={updateList.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-2xl sm:w-auto"
                                disabled={updateList.isPending || !name.trim()}
                            >
                                {updateList.isPending ? (
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
