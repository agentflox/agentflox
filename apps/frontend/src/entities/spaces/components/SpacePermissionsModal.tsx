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

interface SpacePermissionsModalProps {
    workspaceId: string | null;
    spaceId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PERMISSION_LEVELS = [
    { value: "FULL", label: "Full edit", description: "Can edit and manage all content" },
    { value: "EDIT", label: "Can edit", description: "Can edit content but not settings" },
    { value: "COMMENT", label: "Can comment", description: "Can view and comment" },
    { value: "VIEW", label: "Can view", description: "View only access" },
];

export function SpacePermissionsModal({ workspaceId, spaceId, open, onOpenChange }: SpacePermissionsModalProps) {
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

    const updateSpace = trpc.space.update.useMutation();

    const { data: space, isLoading } = trpc.space.get.useQuery(
        { id: spaceId || "" },
        { enabled: !!spaceId && open }
    );

    // Initialize state from space data
    useEffect(() => {
        if (space) {
            const publicAccess = space.visibility === "MEMBERS" || space.visibility === "PUBLIC";
            setIsPublic(publicAccess);
            setAllowAdminsToManage(space.visibility === "OWNERS_ADMINS");

            // If private, collapse workspace section by default
            setExpandedSections(prev => ({
                ...prev,
                workspace: publicAccess
            }));
        }
    }, [space]);

    // Handlers
    const toggleSection = (section: keyof typeof expandedSections) => {
        if (section === 'workspace' && !isPublic) return; // Prevent expanding workspace if private
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVisibilityToggle = async (checked: boolean) => {
        if (!spaceId) return;
        setIsUpdating(true);
        // If turning public -> MEMBERS, if private -> OWNERS_ONLY (default) or keep current if separate logic needed?
        // Usually making public means accessible to workspace members.
        const newVisibility = checked ? "MEMBERS" : "OWNERS_ONLY";

        try {
            await updateSpace.mutateAsync({
                id: spaceId,
                visibility: newVisibility as "MEMBERS" | "OWNERS_ONLY" | "OWNERS_ADMINS" | "PUBLIC"
            });

            setIsPublic(checked);

            // Interaction logic: 
            // If turning ON (Public): Expand workspace section
            // If turning OFF (Private): Collapse workspace section and reset admin toggle
            setExpandedSections(prev => ({ ...prev, workspace: checked }));

            if (!checked) setAllowAdminsToManage(false);

            toast({ title: checked ? "Space is now shared with workspace" : "Space is now private" });
            utils.space.get.invalidate({ id: spaceId });
        } catch (error: any) {
            toast({ title: "Failed to update visibility", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAdminToggle = async (checked: boolean) => {
        if (!spaceId) return;
        setIsUpdating(true);
        const newVisibility = checked ? "OWNERS_ADMINS" : "OWNERS_ONLY";

        try {
            await updateSpace.mutateAsync({
                id: spaceId,
                visibility: newVisibility as "MEMBERS" | "OWNERS_ONLY" | "OWNERS_ADMINS" | "PUBLIC"
            });

            setAllowAdminsToManage(checked);
            toast({ title: "Admin access updated" });
            utils.space.get.invalidate({ id: spaceId });
        } catch (error: any) {
            toast({ title: "Failed to update", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBulkEdit = async (level: string, sectionMembers: any[]) => {
        if (!spaceId || sectionMembers.length === 0) return;

        // Don't modify owners or workspace owners in bulk
        const safeMembers = sectionMembers.filter(m => !m.isSpaceOwner && !m.isWorkspaceOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkGrant('space', spaceId, {
                userIds,
                teamIds,
                permission: level
            });
            toast({ title: "Permissions updated" });
            utils.space.get.invalidate({ id: spaceId });
        } catch (error) {
            toast({ title: "Failed to update permissions", variant: "destructive" });
        }
    };

    const handleBulkRemove = async (sectionMembers: any[]) => {
        if (!spaceId || sectionMembers.length === 0) return;

        const safeMembers = sectionMembers.filter(m => !m.isSpaceOwner && !m.isWorkspaceOwner);
        if (safeMembers.length === 0) return;

        const userIds = safeMembers.filter(m => m.type === 'user').map(m => m.id);
        const teamIds = safeMembers.filter(m => m.type === 'team').map(m => m.id);

        try {
            await permissionsService.permissions.bulkRevoke('space', spaceId, {
                userIds,
                teamIds
            });
            toast({ title: "Access removed" });
            utils.space.get.invalidate({ id: spaceId });
        } catch (error) {
            toast({ title: "Failed to remove access", variant: "destructive" });
        }
    };

    // Helper to process data for sections
    const { workspaceMembers, teams, people } = useMemo(() => {
        if (!space) return { workspaceMembers: [], teams: [], people: [] };

        const query = searchQuery.toLowerCase();
        const workspaceOwnerId = space.workspace?.ownerId;

        // 1. Workspace Level
        const wsMembers = (space.workspace?.members || [])
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                type: 'user',
                role: m.role,
                isWorkspaceOwner: workspaceOwnerId === m.user.id,
                isSpaceOwner: space.members.some((sm: any) => sm.userId === m.user.id && sm.role === 'OWNER'),
                // Check if they have specific space permission overrides
                permission: space.members.find((sm: any) => sm.userId === m.user.id)?.permission || "VIEW"
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        // 2. Teams (Only show if searching or if configured)
        // User requested: "only when search then show the teams+users"
        // But we'll process them anyway, and filter in render
        const teamList = (space.teams || [])
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

        // 3. People - Explicit space members (invited individuals + owners)
        const ppl = (space.members || [])
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                type: 'user',
                role: m.role,
                isWorkspaceOwner: workspaceOwnerId === m.user.id,
                isSpaceOwner: m.role === 'OWNER',
                permission: m.permission || (m.role === 'OWNER' ? 'FULL' : 'VIEW'),
                hasAccess: m.hasAccess !== false // default true
            }))
            .filter((m: any) => m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query));

        return {
            workspaceMembers: wsMembers,
            teams: teamList,
            people: ppl
        };
    }, [space, searchQuery]);

    // Permission Change Handlers
    const handlePermissionChange = async (userId: string, permission: string) => {
        if (!spaceId) return;
        try {
            await permissionsService.permissions.grant('space', spaceId, { userId, permission });
            utils.space.get.invalidate({ id: spaceId });
            toast({ title: "Permission updated" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleAccessToggle = async (userId: string, enabled: boolean) => {
        if (!spaceId) return;
        try {
            if (enabled) {
                await permissionsService.permissions.grant('space', spaceId, { userId, permission: 'VIEW' });
            } else {
                await permissionsService.permissions.revoke('space', spaceId, { userId });
            }
            utils.space.get.invalidate({ id: spaceId });
            toast({ title: enabled ? "Access granted" : "Access revoked" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleTeamPermissionChange = async (teamId: string, permission: string) => {
        if (!spaceId) return;
        try {
            await permissionsService.permissions.grant('space', spaceId, { teamId, permission });
            utils.space.get.invalidate({ id: spaceId });
            toast({ title: "Team permission updated" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    const handleTeamAccessToggle = async (teamId: string, enabled: boolean) => {
        if (!spaceId) return;
        try {
            if (enabled) {
                await permissionsService.permissions.grant('space', spaceId, { teamId, permission: 'VIEW' });
            } else {
                await permissionsService.permissions.revoke('space', spaceId, { teamId });
            }
            utils.space.get.invalidate({ id: spaceId });
            toast({ title: enabled ? "Team access granted" : "Team access revoked" });
        } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added showCloseButton={false} to potentially hide the duplicate X if the UI component supports it 
                Added DialogTitle for accessibility */}
            <DialogContent showCloseButton={false} className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-white shadow-2xl rounded-xl">
                <DialogTitle className="sr-only">Share this Space</DialogTitle>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-slate-800">Share this Space</h2>
                        {space && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Sharing Space with all views</span>
                                {space.visibility === "OWNERS_ONLY" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                <span className="font-medium text-slate-700">{space.name}</span>
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
                                            {/* Teams Section */}
                                            {teams.length > 0 && (
                                                <div className="space-y-3">
                                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teams</h3>
                                                    <div className="space-y-1">
                                                        {teams.map((t: any) => (
                                                            <div key={t.id} className="flex items-center justify-between py-2 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-8 w-8 rounded-lg">
                                                                        <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                                                                            {t.name[0]?.toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium text-slate-900">{t.name}</span>
                                                                            <span className="text-xs text-slate-500">({t.memberCount})</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <PermissionSelect
                                                                        value={t.permission}
                                                                        onChange={(v) => handleTeamPermissionChange(t.id, v)}
                                                                        disabled={!t.hasAccess && t.hasAccess !== undefined}
                                                                    />
                                                                    <Switch
                                                                        checked={t.hasAccess !== false}
                                                                        onCheckedChange={(c) => handleTeamAccessToggle(t.id, c)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

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

                                            {teams.length === 0 && workspaceMembers.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 text-sm">
                                                    No members or teams found matching "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    ) : (
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
                                                            if (!spaceId) return;
                                                            const url = `${window.location.origin}/dashboard/${spaceId}`;
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
                                                            <span className="text-sm font-medium text-slate-700">Allow admins to manage this Space</span>
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
                                                        {/* Collapsible Trigger */}
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
                                                                    <span className="text-white text-xs font-bold">{space?.workspace?.name?.[0].toUpperCase()}</span>
                                                                </Avatar>
                                                                <span className="text-sm font-medium text-slate-900">{space?.workspace?.name}</span>
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

                                            {/* People Level (Explicit Invitations) */}
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
                                                                {people.length} {people.length === 1 ? 'invited person' : 'invited people'}
                                                            </span>
                                                            <BulkActions
                                                                onEdit={(level) => handleBulkEdit(level, people)}
                                                                onRemove={() => handleBulkRemove(people)}
                                                            />
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
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
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
                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
                onClick={onRemove}
            >
                Remove all
            </Button>
        </div>
    )
}

function CollapsibleSection({
    title,
    count,
    expanded,
    onToggle,
    children,
    onBulkEdit,
    onBulkRemove
}: {
    title: string,
    count: number,
    expanded: boolean,
    onToggle: () => void,
    children: React.ReactNode,
    onBulkEdit: (level: string) => void,
    onBulkRemove: () => void
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between group">
                <button onClick={onToggle} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {title}
                </button>

                {/* Bulk Actions visible on hover or if expanded? UX usually prefers consistent access but we'll follow previous pattern roughly */}
                <div className={cn("transition-opacity flex items-center gap-2", expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <BulkActions onEdit={onBulkEdit} onRemove={onBulkRemove} />
                </div>
            </div>
            {expanded && (
                <div className="pl-0 mt-2">
                    {children}
                </div>
            )}
        </div>
    );
}

function MemberRow({ member, onPermissionChange, onAccessToggle }: { member: any, onPermissionChange: any, onAccessToggle: any }) {
    // Check if member is Workspace Owner to disable controls
    const isWorkspaceOwner = member.isWorkspaceOwner;

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
                        {isWorkspaceOwner && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                Workspace Owner
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <PermissionSelect
                    value={isWorkspaceOwner ? "FULL" : member.permission} // Force full for workspace owner visually
                    onChange={(v) => onPermissionChange(member.id, v)}
                    disabled={isWorkspaceOwner || (!member.hasAccess && member.hasAccess !== undefined)}
                />

                {/* Switch is disabled for workspace owner */}
                <Switch
                    checked={isWorkspaceOwner || member.hasAccess !== false}
                    onCheckedChange={(c) => onAccessToggle(member.id, c)}
                    disabled={isWorkspaceOwner}
                    className={cn(isWorkspaceOwner && "opacity-50")}
                />
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

