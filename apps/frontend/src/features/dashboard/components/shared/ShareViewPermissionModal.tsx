"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, X, Shield, Users, Lock, Search, ChevronDown, ChevronRight, Check, Link as LinkIcon, Globe, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { permissionsService } from "@/services/permissions.service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";

interface ShareViewPermissionModalProps {
    workspaceId: string | null;
    viewId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PERMISSION_LEVELS = [
    { value: "FULL", label: "Full edit", description: "Can edit and manage all content" },
    { value: "EDIT", label: "Can edit", description: "Can edit content but not settings" },
    { value: "COMMENT", label: "Can comment", description: "Can view and comment" },
    { value: "VIEW", label: "Can view", description: "View only access" },
];

export function ShareViewPermissionModal({ workspaceId, viewId, open, onOpenChange }: ShareViewPermissionModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        workspace: true,
        people: true,
        team: true
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const updateView = trpc.view.update.useMutation();

    const { data: view, isLoading } = trpc.view.get.useQuery(
        { id: viewId || "" },
        { enabled: !!viewId && open }
    );

    // Fetch workspace members for suggestions
    const { data: workspace } = trpc.workspace.get.useQuery(
        { id: workspaceId || "" },
        { enabled: !!workspaceId && open }
    );

    // Initialize state from view data
    useEffect(() => {
        if (view) {
            setIsPublic(view.isShared);
            // If private, collapse workspace section by default
            setExpandedSections(prev => ({
                ...prev,
                workspace: view.isShared
            }));
        }
    }, [view]);

    // Handlers
    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVisibilityToggle = async (checked: boolean) => {
        if (!viewId) return;
        setIsUpdating(true);
        try {
            await updateView.mutateAsync({
                id: viewId,
                isShared: checked
            });

            setIsPublic(checked);
            setExpandedSections(prev => ({ ...prev, workspace: checked }));

            toast({ title: checked ? "View is now shared with workspace" : "View is now private" });
            utils.view.get.invalidate({ id: viewId });
        } catch (error: any) {
            toast({ title: "Failed to update visibility", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBulkEdit = async (level: string, sectionMembers: any[]) => {
        if (!viewId || sectionMembers.length === 0) return;

        const safeMembers = sectionMembers.filter(m => !m.isOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkGrant('view', viewId, {
                userIds,
                teamIds,
                permission: level
            });
            toast({ title: "Permissions updated" });
            utils.view.get.invalidate({ id: viewId });
        } catch (error) {
            toast({ title: "Failed to update permissions", variant: "destructive" });
        }
    };

    const handleBulkRemove = async (sectionMembers: any[]) => {
        if (!viewId || sectionMembers.length === 0) return;

        const safeMembers = sectionMembers.filter(m => !m.isOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkRevoke('view', viewId, {
                userIds,
                teamIds
            });
            toast({ title: "Access removed" });
            utils.view.get.invalidate({ id: viewId });
        } catch (error) {
            toast({ title: "Failed to remove access", variant: "destructive" });
        }
    };

    // Helper to process data for sections
    const { workspaceMembers, teams, people } = useMemo(() => {
        if (!view || !workspace) return { workspaceMembers: [], teams: [], people: [] };

        const query = searchQuery.toLowerCase();
        const creatorId = view.createdBy;

        // 1. Workspace Level (everyone in workspace)
        const wsMembers = (workspace.members || [])
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                type: 'user',
                isOwner: m.user.id === creatorId,
                permission: view.shares?.find((s: any) => s.userId === m.user.id)?.permission || "VIEW",
                hasAccess: !!view.shares?.some((s: any) => s.userId === m.user.id) || view.isShared
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        // 2. Explicitly Shared People
        const ppl = (view.shares || [])
            .filter((s: any) => s.userId)
            .map((s: any) => ({
                id: s.user.id,
                name: s.user.name,
                email: s.user.email,
                image: s.user.image,
                type: 'user',
                isOwner: s.user.id === creatorId,
                permission: s.permission,
                hasAccess: true
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        // 3. Explicitly Shared Teams
        const sharedTeams = (view.shares || [])
            .filter((s: any) => s.teamId)
            .map((s: any) => ({
                id: s.team.id,
                name: s.team.name,
                type: 'team',
                permission: s.permission,
                hasAccess: true
            }))
            .filter((t: any) => t.name.toLowerCase().includes(query));

        return {
            workspaceMembers: wsMembers,
            teams: sharedTeams,
            people: ppl
        };
    }, [view, workspace, searchQuery]);

    const handlePermissionChange = async (userId: string, permission: string) => {
        if (!viewId) return;
        try {
            await permissionsService.permissions.grant('view', viewId, { userId, permission });
            utils.view.get.invalidate({ id: viewId });
            toast({ title: "Permission updated" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleAccessToggle = async (userId: string, enabled: boolean) => {
        if (!viewId) return;
        try {
            if (enabled) {
                await permissionsService.permissions.grant('view', viewId, { userId, permission: 'VIEW' });
            } else {
                await permissionsService.permissions.revoke('view', viewId, { userId });
            }
            utils.view.get.invalidate({ id: viewId });
            toast({ title: enabled ? "Access granted" : "Access revoked" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-white shadow-2xl rounded-xl">
                <DialogTitle className="sr-only">Share View Permissions</DialogTitle>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-800">Share View</h2>
                        {view && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Modify who can access this view</span>
                                {view.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                <span className="font-medium text-slate-700">{view.name}</span>
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

                            {isSearching ? (
                                <div className="space-y-6">
                                    {workspaceMembers.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workspace Members</h3>
                                            <div className="space-y-1">
                                                {workspaceMembers.map((m: any) => (
                                                    <MemberRow
                                                        key={`search-${m.id}`}
                                                        member={m}
                                                        onPermissionChange={handlePermissionChange}
                                                        onAccessToggle={handleAccessToggle}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Link and Visibility */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                <LinkIcon className="h-4 w-4 text-slate-500" />
                                                View link
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="h-7 px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
                                                onClick={() => {
                                                    const url = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast({ title: "Link copied to clipboard" });
                                                }}
                                            >
                                                Copy link
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-blue-100 rounded-md">
                                                    <Users className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">Share with Workspace</span>
                                                    <span className="text-[11px] text-slate-500">Anyone in the workspace can view this view</span>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={isPublic}
                                                onCheckedChange={handleVisibilityToggle}
                                                disabled={isUpdating}
                                                className="data-[state=checked]:bg-blue-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Workspace Section */}
                                    <CollapsibleSection
                                        title="Workspace Access"
                                        count={workspaceMembers.length}
                                        expanded={expandedSections.workspace}
                                        onToggle={() => toggleSection('workspace')}
                                        onBulkEdit={(l) => handleBulkEdit(l, workspaceMembers)}
                                        onBulkRemove={() => handleBulkRemove(workspaceMembers)}
                                    >
                                        <div className="space-y-1 mt-2 pl-6">
                                            {workspaceMembers.slice(0, expandedSections.workspace ? undefined : 0).map((m: any) => (
                                                <MemberRow
                                                    key={`ws-${m.id}`}
                                                    member={m}
                                                    onPermissionChange={handlePermissionChange}
                                                    onAccessToggle={handleAccessToggle}
                                                />
                                            ))}
                                        </div>
                                    </CollapsibleSection>

                                    {/* People Section */}
                                    {people.length > 0 && (
                                        <CollapsibleSection
                                            title="Explicit Members"
                                            count={people.length}
                                            expanded={expandedSections.people}
                                            onToggle={() => toggleSection('people')}
                                            onBulkEdit={(l) => handleBulkEdit(l, people)}
                                            onBulkRemove={() => handleBulkRemove(people)}
                                        >
                                            <div className="space-y-1 mt-2 pl-6">
                                                {people.map((m: any) => (
                                                    <MemberRow
                                                        key={`ppl-${m.id}`}
                                                        member={m}
                                                        onPermissionChange={handlePermissionChange}
                                                        onAccessToggle={handleAccessToggle}
                                                    />
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    )}
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
                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={onRemove}
            >
                Remove all
            </Button>
        </div>
    )
}

function CollapsibleSection({ title, count, expanded, onToggle, children, onBulkEdit, onBulkRemove }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between group">
                <button onClick={onToggle} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {title} <span className="text-slate-400 font-normal ml-1">({count})</span>
                </button>
                <div className={cn("transition-opacity flex items-center gap-2", expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <BulkActions onEdit={onBulkEdit} onRemove={onBulkRemove} />
                </div>
            </div>
            {expanded && children}
        </div>
    );
}

function MemberRow({ member, onPermissionChange, onAccessToggle }: any) {
    return (
        <div className="flex items-center justify-between py-2 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image} />
                    <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                        {member.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{member.name}</span>
                        {member.isOwner && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                Creator
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-slate-500">{member.email}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <PermissionSelect
                    value={member.permission}
                    onChange={(v: string) => onPermissionChange(member.id, v)}
                    disabled={member.isOwner || (!member.hasAccess && member.hasAccess !== undefined)}
                />
                <Switch
                    checked={member.hasAccess !== false}
                    onCheckedChange={(c) => onAccessToggle(member.id, c)}
                    disabled={member.isOwner}
                    className={cn(member.isOwner && "opacity-50")}
                />
            </div>
        </div>
    );
}

function PermissionSelect({ value, onChange, disabled }: any) {
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
