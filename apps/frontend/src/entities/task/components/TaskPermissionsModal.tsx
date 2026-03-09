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

interface TaskPermissionsModalProps {
    workspaceId: string | null;
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PERMISSION_LEVELS = [
    { value: "FULL", label: "Full edit", description: "Can edit and manage all content" },
    { value: "EDIT", label: "Can edit", description: "Can edit content but not settings" },
    { value: "COMMENT", label: "Can comment", description: "Can view and comment" },
    { value: "VIEW", label: "Can view", description: "View only access" },
];

export function TaskPermissionsModal({ workspaceId, taskId, open, onOpenChange }: TaskPermissionsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [isPublic, setIsPublic] = useState(false); // Maps to WORKSPACE visibility
    const [expandedSections, setExpandedSections] = useState({
        workspace: true,
        people: true,
        team: true
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Permission Management State
    const [explicitPermissions, setExplicitPermissions] = useState<{
        userPermissions: any[];
        teamPermissions: any[];
    }>({ userPermissions: [], teamPermissions: [] });

    const updateTask = trpc.task.update.useMutation();

    const { data: task, isLoading: isTaskLoading } = trpc.task.get.useQuery(
        { id: taskId || "" },
        { enabled: !!taskId && open }
    );

    const { data: workspaceMembersData } = trpc.workspace.members.useQuery(
        { workspaceId: workspaceId || "" },
        { enabled: !!workspaceId && open }
    );

    // Fetch explicit permissions
    useEffect(() => {
        const fetchPermissions = async () => {
            if (!taskId || !open) return;
            try {
                const res = await permissionsService.permissions.list('task', taskId);
                if (res.ok) {
                    const data = await res.json();
                    setExplicitPermissions({
                        userPermissions: data.userPermissions || [],
                        teamPermissions: data.teamPermissions || []
                    });
                }
            } catch (error) {
                console.error("Failed to fetch permissions", error);
            }
        };
        fetchPermissions();
    }, [taskId, open]);

    // Initialize state from task data
    useEffect(() => {
        if (task) {
            const publicAccess = task.visibility === "WORKSPACE" || task.visibility === "PUBLIC";
            setIsPublic(publicAccess);

            // If private, collapse workspace section by default
            setExpandedSections(prev => ({
                ...prev,
                workspace: publicAccess
            }));
        }
    }, [task]);

    // Handlers
    const toggleSection = (section: keyof typeof expandedSections) => {
        if (section === 'workspace' && !isPublic) return; // Prevent expanding workspace if private
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVisibilityToggle = async (checked: boolean) => {
        if (!taskId) return;
        setIsUpdating(true);
        // Toggle between WORKSPACE (Public to workspace) and PRIVATE
        const newVisibility = checked ? "WORKSPACE" : "PRIVATE";

        try {
            await updateTask.mutateAsync({
                id: taskId,
                visibility: newVisibility
            });

            setIsPublic(checked);

            // Interaction logic
            setExpandedSections(prev => ({ ...prev, workspace: checked }));

            toast({ title: checked ? "Task is now shared with workspace" : "Task is now private" });
            utils.task.get.invalidate({ id: taskId });
        } catch (error: any) {
            toast({ title: "Failed to update visibility", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBulkEdit = async (level: string, sectionMembers: any[]) => {
        if (!taskId || sectionMembers.length === 0) return;

        const safeMembers = sectionMembers.filter(m => !m.isOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkGrant('task', taskId, {
                userIds,
                teamIds,
                permission: level
            });
            toast({ title: "Permissions updated" });
            utils.task.get.invalidate({ id: taskId });
            // Refresh permissions list
            const res = await permissionsService.permissions.list('task', taskId);
            if (res && res.ok) {
                const data = await res.json();
                setExplicitPermissions({
                    userPermissions: data.userPermissions || [],
                    teamPermissions: data.teamPermissions || []
                });
            }
        } catch (error) {
            toast({ title: "Failed to update permissions", variant: "destructive" });
        }
    };

    const handleBulkRemove = async (sectionMembers: any[]) => {
        if (!taskId || sectionMembers.length === 0) return;

        const safeMembers = sectionMembers.filter(m => !m.isOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkRevoke('task', taskId, {
                userIds,
                teamIds
            });
            toast({ title: "Access removed" });
            utils.task.get.invalidate({ id: taskId });
            // Refresh permissions list
            const res = await permissionsService.permissions.list('task', taskId);
            if (res && res.ok) {
                const data = await res.json();
                setExplicitPermissions({
                    userPermissions: data.userPermissions || [],
                    teamPermissions: data.teamPermissions || []
                });
            }
        } catch (error) {
            toast({ title: "Failed to remove access", variant: "destructive" });
        }
    };

    // Helper to process data for sections
    const { workspaceMembers, people } = useMemo(() => {
        if (!task || !workspaceMembersData) return { workspaceMembers: [], people: [] };

        const query = searchQuery.toLowerCase();

        // 1. Workspace Level
        const wsMembers = (workspaceMembersData || [])
            .map((m: any) => {
                // Check if there is an explicit permission override
                const explicit = explicitPermissions.userPermissions.find((p: any) => p.user.id === m.user.id);
                return {
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email,
                    image: m.user.image,
                    type: 'user',
                    role: m.role,
                    isOwner: task.createdBy === m.user.id,
                    // If shared with workspace, default is VIEW (or configured default), unless overridden
                    permission: explicit ? explicit.permission : 'VIEW',
                    hasAccess: true // workspace members have access if public
                };
            })
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        // 2. People - Explicit permissions (Guest or specific overrides)
        // We use explicitPermissions list to drive this
        const ppl = explicitPermissions.userPermissions
            .map((p: any) => ({
                id: p.user.id,
                name: p.user.name,
                email: p.user.email,
                image: p.user.avatar, // API returns avatar
                type: 'user',
                role: 'MEMBER', // unknown unless matched with workspace
                isOwner: task.createdBy === p.user.id,
                permission: p.permission,
                hasAccess: true
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        // Include owner in People if not already there? 
        // Typically Owner is always in the list.
        // If owner is not in explicit permissions (because they own it), we should add them purely for display?
        // But `task.createdBy` gives ID. We need their profile. 
        // Use workspace members to find owner profile if available.

        return {
            workspaceMembers: wsMembers,
            people: ppl
        };
    }, [task, workspaceMembersData, explicitPermissions, searchQuery]);

    // Permission Change Handlers
    const handlePermissionChange = async (userId: string, permission: string) => {
        if (!taskId) return;
        try {
            await permissionsService.permissions.grant('task', taskId, { userId, permission });
            toast({ title: "Permission updated" });
            // Refresh
            const res = await permissionsService.permissions.list('task', taskId);
            if (res && res.ok) {
                const data = await res.json();
                setExplicitPermissions({
                    userPermissions: data.userPermissions || [],
                    teamPermissions: data.teamPermissions || []
                });
            }
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleAccessToggle = async (userId: string, enabled: boolean) => {
        if (!taskId) return;
        try {
            if (enabled) {
                await permissionsService.permissions.grant('task', taskId, { userId, permission: 'VIEW' });
            } else {
                await permissionsService.permissions.revoke('task', taskId, { userId });
            }
            // Refresh
            const res = await permissionsService.permissions.list('task', taskId);
            if (res && res.ok) {
                const data = await res.json();
                setExplicitPermissions({
                    userPermissions: data.userPermissions || [],
                    teamPermissions: data.teamPermissions || []
                });
            }
            toast({ title: enabled ? "Access granted" : "Access revoked" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-white shadow-2xl rounded-xl">
                <DialogTitle className="sr-only">Share this Task</DialogTitle>
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-800">Share this Task</h2>
                        {task && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Sharing Task</span>
                                {task.visibility === "PRIVATE" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                <span className="font-medium text-slate-700 truncate max-w-[200px]">{task.title}</span>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[400px]">
                    {isTaskLoading ? (
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

                            {isSearching ? (
                                <div className="space-y-6">
                                    {/* Users Section */}
                                    {workspaceMembers.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</h3>
                                            <div className="space-y-1">
                                                {workspaceMembers.map((m: any) => (
                                                    <MemberRow
                                                        key={`search-user-${m.id}`}
                                                        member={m}
                                                        onPermissionChange={handlePermissionChange}
                                                        onAccessToggle={handleAccessToggle}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {workspaceMembers.length === 0 && (
                                        <div className="text-center py-10 text-slate-400 text-sm">
                                            No members found matching "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Links & Visibility */}
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
                                                    if (!taskId) return;
                                                    const url = `${window.location.origin}/task/${taskId}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast({ title: "Link copied to clipboard" });
                                                }}
                                            >
                                                Copy link
                                            </Button>
                                        </div>
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
                                                        <span className="text-sm font-medium text-slate-900">Workspace Members</span>
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">Workspace</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <AvatarStack members={workspaceMembers} />
                                                <Switch checked={isPublic} onCheckedChange={handleVisibilityToggle} disabled={isUpdating} />
                                            </div>
                                        </div>

                                        {expandedSections.workspace && isPublic && (
                                            <>
                                                <div className="pl-8 flex items-center justify-between py-1">
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {workspaceMembers.length} People
                                                    </span>
                                                    <BulkActions
                                                        onEdit={(level) => handleBulkEdit(level, workspaceMembers)}
                                                        onRemove={() => handleBulkRemove(workspaceMembers)}
                                                    />
                                                </div>
                                                <div className="pl-8 space-y-1">
                                                    {workspaceMembers.map((m: any) => (
                                                        <MemberRow
                                                            key={`ws-${m.id}`}
                                                            member={m}
                                                            onPermissionChange={handlePermissionChange}
                                                            onAccessToggle={handleAccessToggle}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* People Level (Explicit) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => toggleSection('people')}
                                                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                                            >
                                                {expandedSections.people ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                People
                                            </button>

                                            <div className="flex items-center gap-3">
                                                <AvatarStack members={people} />
                                            </div>
                                        </div>

                                        {expandedSections.people && (
                                            <>
                                                <div className="pl-8 flex items-center justify-between py-1">
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {people.length} {people.length === 1 ? 'person' : 'people'}
                                                    </span>
                                                </div>
                                                <div className="pl-8 space-y-1">
                                                    {people.map((m: any) => (
                                                        <MemberRow
                                                            key={`ppl-${m.id}`}
                                                            member={m}
                                                            onPermissionChange={handlePermissionChange}
                                                            onAccessToggle={handleAccessToggle}
                                                        />
                                                    ))}
                                                    {people.length === 0 && (
                                                        <div className="text-sm text-slate-400 italic">No explicit permissions</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
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

// Sub-components

function BulkActions({ onEdit, onRemove }: { onEdit: (l: string) => void, onRemove: () => void }) {
    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs text-slate-600 border-slate-200">
                        Edit all <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {PERMISSION_LEVELS.map(level => (
                        <DropdownMenuItem key={level.value} onClick={() => onEdit(level.value)}>
                            {level.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                onClick={onRemove}
            >
                Remove all
            </Button>
        </div>
    )
}

function MemberRow({ member, onPermissionChange, onAccessToggle }: { member: any, onPermissionChange: any, onAccessToggle: any }) {
    // Check if member is Owner
    const isOwner = member.isOwner;

    return (
        <div className="flex items-center justify-between py-2 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-3">
                <UserProfileHoverCard userId={member.id}>
                    <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                            {member.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </UserProfileHoverCard>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{member.name}</span>
                        {isOwner && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                Owner
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isOwner && (
                    <>
                        <PermissionSelect
                            value={member.permission}
                            onChange={(v) => onPermissionChange(member.id, v)}
                            disabled={!member.hasAccess && member.hasAccess !== undefined}
                        />

                        <Switch
                            checked={member.hasAccess !== false}
                            onCheckedChange={(c) => onAccessToggle(member.id, c)}
                        />
                    </>
                )}
                {isOwner && (
                    <span className="text-xs text-slate-500 font-medium px-2">Full Access</span>
                )}
            </div>
        </div>
    );
}

function PermissionSelect({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) {
    const label = PERMISSION_LEVELS.find(p => p.value === value)?.label || "View";
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button variant="outline" size="sm" className={cn("h-7 px-2 text-xs font-normal text-slate-600 border-slate-200", disabled && "opacity-50 bg-slate-50")}>
                    {label} <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {PERMISSION_LEVELS.map(level => (
                    <DropdownMenuItem
                        key={level.value}
                        onClick={() => onChange(level.value)}
                        className="flex items-center justify-between"
                    >
                        <span>{level.label}</span>
                        {value === level.value && <Check className="h-4 w-4 text-blue-600" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AvatarStack({ members }: { members: any[] }) {
    if (!members || members.length === 0) return null;
    const displayMembers = members.slice(0, 3);
    const count = members.length;

    return (
        <div className="flex items-center -space-x-2 mr-2">
            {displayMembers.map((m, i) => (
                <UserProfileHoverCard key={m.id || i} userId={m.id}>
                    <Avatar className="h-6 w-6 border-2 border-white bg-white cursor-pointer">
                        <AvatarImage src={m.image} />
                        <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">
                            {m.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </UserProfileHoverCard>
            ))}
            {count > 3 && (
                <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600 z-10 shadow-sm">
                    {count - 3}+
                </div>
            )}
        </div>
    );
}
