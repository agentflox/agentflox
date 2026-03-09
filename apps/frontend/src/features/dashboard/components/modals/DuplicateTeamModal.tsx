"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Duplicate Team</DialogTitle>
                    <DialogDescription>Create a copy of this team with your selected options</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 py-2">
                        {/* New Team Name */}
                        <div className="space-y-2">
                            <Label>New Team name</Label>
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
                                    All members, settings and permissions will be duplicated exactly as is.
                                </p>
                            )}

                            {copyMode === "customize" && (
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="members"
                                                checked={includeMembers}
                                                onCheckedChange={(c) => setIncludeMembers(!!c)}
                                            />
                                            <Label htmlFor="members" className="cursor-pointer">Members</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="settings"
                                                checked={includeSettings}
                                                onCheckedChange={(c) => setIncludeSettings(!!c)}
                                            />
                                            <Label htmlFor="settings" className="cursor-pointer">Settings</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="permissions"
                                                checked={includePermissions}
                                                onCheckedChange={(c) => setIncludePermissions(!!c)}
                                            />
                                            <Label htmlFor="permissions" className="cursor-pointer">Permissions</Label>
                                        </div>
                                    </div>
                                </div>
                            )}
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
