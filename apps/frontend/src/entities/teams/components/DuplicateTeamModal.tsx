"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Sliders } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";

interface DuplicateTeamModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string;
    teamName: string;
    teamIcon?: string;
    teamColor?: string;
    onSuccess?: (newTeamId: string) => void;
}

export function DuplicateTeamModal({
    open,
    onOpenChange,
    teamId,
    teamName,
    teamIcon = "",
    teamColor = "#8B5CF6",
    onSuccess
}: DuplicateTeamModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState(`${teamName} (copy)`);
    const [copyMode, setCopyMode] = useState<"everything" | "customize">("everything");
    const [icon, setIcon] = useState(teamIcon);
    const [color, setColor] = useState(teamColor);
    const [hasManualIcon, setHasManualIcon] = useState(false);

    // Customize options
    const [includeMembers, setIncludeMembers] = useState(true);
    const [includeSettings, setIncludeSettings] = useState(true);
    const [includePermissions, setIncludePermissions] = useState(true);

    const duplicateMutation = trpc.team.duplicate.useMutation({
        onMutate: async (variables) => {
            // Optimistic update - add the new team to the list immediately
            const tempId = `temp-${Date.now()}`;
            queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                const newTeam = {
                    id: tempId,
                    name: variables.newName,
                    icon: variables.icon,
                    color: variables.color,
                    isActive: true,
                };
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any, index: number) =>
                        index === 0 ? { ...page, items: [newTeam, ...page.items] } : page
                    )
                };
            });
        },
        onSuccess: (data) => {
            toast({ title: "Team duplicated successfully" });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.(data.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate team", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (open) {
            setNewName(`${teamName} (copy)`);
            setIcon(teamIcon);
            setColor(teamColor);
            setHasManualIcon(false);
        }
    }, [open, teamName, teamIcon, teamColor]);

    const handleDuplicate = async () => {
        if (!newName.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }

        await duplicateMutation.mutateAsync({
            teamId,
            newName: newName.trim(),
            icon,
            color,
            copyMode,
            includeMembers: copyMode === "everything" ? true : includeMembers,
            includeSettings: copyMode === "everything" ? true : includeSettings,
            includePermissions: copyMode === "everything" ? true : includePermissions,
        } as any);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-md font-semibold text-zinc-900">Duplicate Team</DialogTitle>
                    <DialogDescription className="sr-only">Create a copy of this team with your selected options</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-scroll px-4 -mx-4">
                    <div className="space-y-5 py-1">
                        {/* New Team Name */}
                        <div className="space-y-2">
                            <Label className="!text-xs text-zinc-800">New Team name</Label>
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
                                        <TeamIcon icon={icon} className="text-white" size={20} />
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
                                    placeholder="Team name"
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
                                            All members, settings and permissions will be duplicated exactly as is.
                                        </p>
                                    </div>
                                )}

                                {copyMode === "customize" && (
                                    <div className="">
                                        <p className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                                            Customize what will be duplicated
                                        </p>

                                        <div className="flex items-center justify-between px-6 py-3 border-b -mx-2">
                                            <Label htmlFor="members" className="cursor-pointer !font-normal">
                                                Members
                                            </Label>
                                            <Switch
                                                id="members"
                                                checked={includeMembers}
                                                onCheckedChange={setIncludeMembers}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between px-6 py-3 border-b -mx-2">
                                            <Label htmlFor="settings" className="cursor-pointer !font-normal">
                                                Settings
                                            </Label>
                                            <Switch
                                                id="settings"
                                                checked={includeSettings}
                                                onCheckedChange={setIncludeSettings}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between px-6 py-3 -mx-2">
                                            <Label htmlFor="permissions" className="cursor-pointer !font-normal">
                                                Permissions
                                            </Label>
                                            <Switch
                                                id="permissions"
                                                checked={includePermissions}
                                                onCheckedChange={setIncludePermissions}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
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
