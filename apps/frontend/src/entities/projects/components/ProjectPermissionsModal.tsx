"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, X, Shield, Users, Crown, Lock, Building2, Search, ChevronDown, ChevronRight, Check, Link as LinkIcon, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { permissionsService } from "@/services/permissions.service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";

interface ProjectPermissionsModalProps {
    workspaceId: string | null;
    projectId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PERMISSION_LEVELS = [
    { value: "FULL", label: "Full edit", description: "Can edit and manage all content" },
    { value: "EDIT", label: "Can edit", description: "Can edit content but not settings" },
    { value: "COMMENT", label: "Can comment", description: "Can view and comment" },
    { value: "VIEW", label: "Can view", description: "View only access" },
];

export function ProjectPermissionsModal({ workspaceId, projectId, open, onOpenChange }: ProjectPermissionsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [allowAdminsToManage, setAllowAdminsToManage] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        workspace: true,
        people: true,
        team: true
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const updateProject = trpc.project.update.useMutation();

    const { data: project, isLoading } = trpc.project.get.useQuery(
        { id: projectId || "" },
        { enabled: !!projectId && open }
    );

    // Initialize state from project data
    useEffect(() => {
        if (project) {
            const publicAccess = project.visibility === "MEMBERS" || project.visibility === "PUBLIC";
            setIsPublic(publicAccess);
            setAllowAdminsToManage(project.visibility === "OWNERS_ADMINS");

            setExpandedSections(prev => ({
                ...prev,
                workspace: publicAccess
            }));
        }
    }, [project]);

    // Handlers
    const toggleSection = (section: keyof typeof expandedSections) => {
        if (section === 'workspace' && !isPublic) return;
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVisibilityToggle = async (checked: boolean) => {
        if (!projectId) return;
        setIsUpdating(true);
        const newVisibility = checked ? "MEMBERS" : "OWNERS_ONLY";

        try {
            await updateProject.mutateAsync({
                id: projectId,
                visibility: newVisibility as "MEMBERS" | "OWNERS_ONLY" | "OWNERS_ADMINS" | "PUBLIC"
            });

            setIsPublic(checked);
            setExpandedSections(prev => ({ ...prev, workspace: checked }));

            if (!checked) setAllowAdminsToManage(false);

            toast({ title: checked ? "Project is now shared with workspace" : "Project is now private" });
            utils.project.get.invalidate({ id: projectId });
        } catch (error: any) {
            toast({ title: "Failed to update visibility", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAdminToggle = async (checked: boolean) => {
        if (!projectId) return;
        setIsUpdating(true);
        const newVisibility = checked ? "OWNERS_ADMINS" : "OWNERS_ONLY";

        try {
            await updateProject.mutateAsync({
                id: projectId,
                visibility: newVisibility as "MEMBERS" | "OWNERS_ONLY" | "OWNERS_ADMINS" | "PUBLIC"
            });

            setAllowAdminsToManage(checked);
            toast({ title: "Admin access updated" });
            utils.project.get.invalidate({ id: projectId });
        } catch (error: any) {
            toast({ title: "Failed to update", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    // Helper to process data for sections
    const { workspaceMembers, teams, people } = useMemo(() => {
        if (!project) return { workspaceMembers: [], teams: [], people: [] };

        const query = searchQuery.toLowerCase();
        const workspaceOwnerId = project.workspace?.ownerId;

        const wsMembers = (project.workspace?.members || [])
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                type: 'user',
                role: m.role,
                isWorkspaceOwner: workspaceOwnerId === m.user.id,
                isProjectOwner: project.members.some((sm: any) => sm.userId === m.user.id && sm.role === 'OWNER'),
                permission: project.members.find((sm: any) => sm.userId === m.user.id)?.permission || "VIEW"
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        const teamList = (project.teams || [])
            .map((t: any) => {
                const teamPerm = t.locationPermissions?.[0]?.permission;
                return {
                    id: t.id,
                    name: t.name,
                    memberCount: t.members?.length || 0,
                    type: 'team',
                    permission: teamPerm || 'VIEW',
                    hasAccess: !!teamPerm,
                    members: t.members?.map((tm: any) => ({
                        id: tm.user.id,
                        name: tm.user.name,
                        image: tm.user.image,
                        permission: tm.user.locationPermissions?.[0]?.permission
                    })) || []
                };
            })
            .filter((t: any) => t.name.toLowerCase().includes(query));

        const ppl = (project.members || [])
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                type: 'user',
                role: m.role,
                isWorkspaceOwner: workspaceOwnerId === m.user.id,
                isProjectOwner: m.role === 'OWNER',
                permission: m.permission || (m.role === 'OWNER' ? 'FULL' : 'VIEW'),
                hasAccess: m.hasAccess !== false
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        return {
            workspaceMembers: wsMembers,
            teams: teamList,
            people: ppl
        };
    }, [project, searchQuery]);

    // Permission Change Handlers
    const handlePermissionChange = async (userId: string, permission: string) => {
        if (!projectId) return;
        try {
            await permissionsService.permissions.grant('project', projectId, { userId, permission });
            utils.project.get.invalidate({ id: projectId });
            toast({ title: "Permission updated" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleAccessToggle = async (userId: string, enabled: boolean) => {
        if (!projectId) return;
        try {
            if (enabled) {
                await permissionsService.permissions.grant('project', projectId, { userId, permission: 'VIEW' });
            } else {
                await permissionsService.permissions.revoke('project', projectId, { userId });
            }
            utils.project.get.invalidate({ id: projectId });
            toast({ title: enabled ? "Access granted" : "Access revoked" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-white shadow-2xl rounded-xl">
                <DialogTitle className="sr-only">Share this Project</DialogTitle>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-800">Share this Project</h2>
                        {project && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Sharing Project with all views</span>
                                {project.visibility === "OWNERS_ONLY" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                <span className="font-medium text-slate-700">{project.name}</span>
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
                            {/* Search */}
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Share by name or email"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearching(true)}
                                    className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
                                />
                                {isSearching && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setIsSearching(false);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Links & Default Permission */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                            <LinkIcon className="h-4 w-4 text-slate-500" />
                                            Private link
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="h-7 w-20 px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
                                            onClick={() => {
                                                if (!projectId) return;
                                                const url = `${window.location.origin}/dashboard/${projectId}`;
                                                navigator.clipboard.writeText(url);
                                                toast({ title: "Link copied to clipboard" });
                                            }}
                                        >
                                            Copy link
                                        </Button>
                                    </div>

                                    {/* Allow Admins to Manage Toggle (Only when Private) */}
                                    {!isPublic && (
                                        <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-blue-100 rounded-md">
                                                    <Users className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">Allow admins to manage this Project</span>
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

                                {/* Workspace Level */}
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
                                                    <Avatar className="h-6 w-6 bg-green-500 flex items-center justify-center rounded-full">
                                                        <span className="text-white text-xs font-bold">{project?.workspace?.name?.[0].toUpperCase()}</span>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-slate-900">{project?.workspace?.name}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">Workspace</span>
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
