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
import { Loader2 } from "lucide-react";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { useQueryClient } from "@tanstack/react-query";

interface TeamGeneralSettingsModalProps {
    teamId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const VISIBILITY_OPTIONS = [
    {
        label: "Only Owners",
        value: "OWNERS_ONLY",
        description: "Only team owners can view and edit"
    },
    {
        label: "Owners & Admins",
        value: "OWNERS_ADMINS",
        description: "Owners and admins can view and edit"
    },
    {
        label: "Owners, Admins & Members",
        value: "MEMBERS",
        description: "All team members can view"
    },
    {
        label: "Anyone with Link",
        value: "PUBLIC",
        description: "Anyone with the link can view"
    },
];

export function TeamGeneralSettingsModal({ teamId, open, onOpenChange }: TeamGeneralSettingsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"OWNERS_ONLY" | "OWNERS_ADMINS" | "MEMBERS" | "PUBLIC">("PRIVATE");
    const [color, setColor] = useState("#8B5CF6");
    const [icon, setIcon] = useState("");

    const { data: team, isLoading } = trpc.team.get.useQuery(
        { id: teamId || "" },
        { enabled: !!teamId }
    );

    const ownerEmail = (team as any)?.creator?.email || "Unknown";
    const ownerName = (team as any)?.creator?.name || ownerEmail;
    const ownerAvatar = (team as any)?.creator?.avatar || null;

    useEffect(() => {
        if (team) {
            setName(team.name);
            setDescription(team.description || "");
            setVisibility((team.visibility as any) || "PRIVATE");
            setColor(team.color || "#8B5CF6");
            setIcon(team.icon || "");
        }
    }, [team]);

    const updateTeam = trpc.team.update.useMutation({
        onSuccess: () => {
            toast({ title: "Team settings updated successfully" });

            queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === teamId
                                ? { ...item, name, description, color, icon, visibility }
                                : item
                        )
                    }))
                };
            });

            utils.team.get.invalidate({ id: teamId! });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            if ((team as any)?.workspaceId) {
                utils.workspace.get.invalidate({ id: (team as any).workspaceId });
            }
            onOpenChange(false);
        },
        onError: (err) => toast({
            title: "Failed to update team",
            description: err.message,
            variant: "destructive"
        })
    });

    const [hasManualIcon, setHasManualIcon] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamId) return;
        if (!name.trim()) {
            toast({
                title: "Validation error",
                description: "Team name is required",
                variant: "destructive"
            });
            return;
        }

        updateTeam.mutate({
            id: teamId,
            name: name.trim(),
            description: description.trim(),
            visibility,
            color,
            icon
        });
    };

    if (!teamId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl gap-6">
                <DialogHeader className="gap-1.5">
                    <DialogTitle className="text-2xl font-semibold tracking-tight">Edit Team settings</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        A Team represents a group of people working together, with shared access and permissions.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
                                            <TeamIcon icon={icon} className="text-white" size={20} />
                                        </Button>
                                    </IconColorSelector>
                                    <Input
                                        value={name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            setName(newName);
                                            if (!hasManualIcon) {
                                                const firstChar = newName.trim().charAt(0).toUpperCase();
                                                setIcon(firstChar || "T");
                                            }
                                        }}
                                        maxLength={50}
                                        placeholder="Team name"
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                                        required
                                    />
                                </div>
                            </div>

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

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">
                                Description <span className="text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Add a description for this team..."
                                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Visibility</Label>
                            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                                <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-xs focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border border-slate-100 shadow-xl">
                                    {VISIBILITY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg px-3 py-2.5">
                                            {opt.label}
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
                                disabled={updateTeam.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-2xl sm:w-auto"
                                disabled={updateTeam.isPending || !name.trim()}
                            >
                                {updateTeam.isPending ? (
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
