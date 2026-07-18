"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, X, Shield, Users, Lock, Search, ChevronDown, ChevronRight, Link as LinkIcon, Globe } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { permissionsService } from "@/services/permissions.service";
import { cn } from "@/lib/utils";

interface FolderPermissionsModalProps {
    workspaceId?: string | null;
    folderId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FolderPermissionsModal({ workspaceId, folderId, open, onOpenChange }: FolderPermissionsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [searchQuery, setSearchQuery] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [allowAdminsToManage, setAllowAdminsToManage] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        workspace: true,
        people: true,
        folder: true
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const { data: folder, isLoading } = trpc.folder.get.useQuery(
        { id: folderId || "" },
        { enabled: !!folderId && open }
    );

    useEffect(() => {
        if (folder) {
            const publicAccess = false; 
            setIsPublic(publicAccess);
            setAllowAdminsToManage(false);

            setExpandedSections(prev => ({
                ...prev,
                workspace: publicAccess
            }));
        }
    }, [folder]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        if (section === 'workspace' && !isPublic) return;
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVisibilityToggle = async (checked: boolean) => {
        if (!folderId) return;
        setIsUpdating(true);
        try {
            setIsPublic(checked);
            setExpandedSections(prev => ({ ...prev, workspace: checked }));
            if (!checked) setAllowAdminsToManage(false);

            toast({ title: checked ? "Folder is now shared" : "Folder is now private" });
            utils.folder.get.invalidate({ id: folderId });
        } catch (error: any) {
            toast({ title: "Failed to update visibility", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAdminToggle = async (checked: boolean) => {
        if (!folderId) return;
        setIsUpdating(true);
        try {
            setAllowAdminsToManage(checked);
            toast({ title: "Admin access updated" });
            utils.folder.get.invalidate({ id: folderId });
        } catch (error: any) {
            toast({ title: "Failed to update", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-white shadow-2xl rounded-xl">
                <DialogTitle className="sr-only">Share this Folder</DialogTitle>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-800">Share this Folder</h2>
                        {folder && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Sharing Folder details</span>
                                {!isPublic ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                <span className="font-medium text-slate-700">{folder.name}</span>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[400px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="relative mb-6">
                                <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-indigo-500">
                                    <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                                    <input
                                        placeholder="Share by name or email"
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
                                        onFocus={() => setIsSearching(true)}
                                        className="flex-1 h-full bg-transparent pl-2 pr-0 text-sm outline-none border-none placeholder:text-zinc-400"
                                    />
                                    {isSearching && (
                                        <button
                                            type="button"
                                            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full"
                                            onClick={() => { setSearchQuery(""); setIsSearching(false); }}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                            <LinkIcon className="h-4 w-4 text-slate-500" />
                                            Private link
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="h-7 w-20 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 border-zinc-200 rounded-sm hover:bg-zinc-100"
                                            onClick={() => {
                                                if (!folderId) return;
                                                const url = `${window.location.origin}/dashboard/folders/${folderId}`;
                                                navigator.clipboard.writeText(url);
                                                toast({ title: "Link copied to clipboard" });
                                            }}
                                        >
                                            Copy link
                                        </Button>
                                    </div>

                                    {!isPublic && (
                                        <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-blue-100 rounded-md">
                                                    <Users className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">Allow admins to manage this Folder</span>
                                            </div>
                                            <Switch
                                                checked={allowAdminsToManage}
                                                onCheckedChange={handleAdminToggle}
                                                disabled={isUpdating}
                                                className="data-[state=checked]:bg-blue-600"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">
                                    Share with
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn("p-1 h-6 w-6", !isPublic && "opacity-50 cursor-not-allowed")}
                                                onClick={() => toggleSection('workspace')}
                                                disabled={!isPublic}
                                            >
                                                {expandedSections.workspace ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>

                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 bg-indigo-500 flex items-center justify-center rounded-full">
                                                        <span className="text-white text-xs font-bold">W</span>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-slate-900">Workspace</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">Global</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Switch checked={isPublic} onCheckedChange={handleVisibilityToggle} disabled={isUpdating} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <Button
                        variant={isPublic ? "outline" : "primary"}
                        size="sm"
                        className={cn(
                            "transition-all",
                            isPublic && "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        )}
                        onClick={() => handleVisibilityToggle(!isPublic)}
                        disabled={isUpdating}
                    >
                        {isPublic ? "Make Private" : "Make Public"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
