/**
 * Universal Share Modal
 * Supports sharing Spaces, Projects, Teams, Folders, Lists, and Tasks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mail, Users, Search, Check, Shield, User, Copy, Globe, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { permissionsService } from '@/services/permissions.service';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/useToast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSocket } from '@/components/providers/SocketProvider';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemType: 'space' | 'project' | 'team' | 'folder' | 'list' | 'task' | 'view' | 'workspace';
    itemId: string;
    itemName: string;
    workspaceId: string;
}

type InviteRole = 'MEMBER' | 'LIMITED_MEMBER' | 'LIMITED_MEMBER_VIEW_ONLY' | 'ADMIN' | 'GUEST';
type PermissionLevel = 'VIEW' | 'COMMENT' | 'EDIT' | 'FULL';


interface PendingInvite {
    type: 'email' | 'user' | 'team';
    id?: string; // for user or team
    email?: string; // for email or user
    name?: string; // for display
    avatar?: string; // for display
    role: InviteRole;
    permission: PermissionLevel;
}

interface UserPermission {
    user: { id: string; name: string; email: string; avatar: string };
    permission: PermissionLevel;
    role?: string; // For workspace roles like 'OWNER'
}

interface TeamPermission {
    team: { id: string; name: string; avatar: string };
    permission: PermissionLevel;
}

export function ShareModal({
    isOpen,
    onClose,
    itemType,
    itemId,
    itemName,
    workspaceId,
}: ShareModalProps) {
    const { toast } = useToast();
    const [emailInput, setEmailInput] = useState('');
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [selectedRole, setSelectedRole] = useState<InviteRole>('MEMBER');
    const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('FULL');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Permission Management State
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [teamPermissions, setTeamPermissions] = useState<TeamPermission[]>([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

    // Fetch workspace data for search
    const { data: workspace } = trpc.workspace.get.useQuery(
        { id: workspaceId },
        { enabled: !!workspaceId && (isOpen || !!emailInput) }
    );

    const { data: teamsData } = trpc.team.list.useQuery(
        { workspaceId, scope: 'all' },
        { enabled: !!workspaceId && (isOpen || !!emailInput) }
    );

    // Fetch permissions on open
    const fetchPermissions = useCallback(async () => {
        if (!isOpen) return;
        setIsLoadingPermissions(true);
        try {
            const res = await permissionsService.permissions.list(itemType, itemId);
            if (res.ok) {
                const data = await res.json();
                setUserPermissions(data.userPermissions || []);
                setTeamPermissions(data.teamPermissions || []);
            }
        } catch (error) {
            console.error("Failed to fetch permissions", error);
        } finally {
            setIsLoadingPermissions(false);
        }
    }, [isOpen, itemType, itemId]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);


    // Determine if this is a guest invitation (item-specific)
    const isGuestInvite = itemType !== 'space' && selectedRole === 'GUEST';

    // Role descriptions
    const roleDescriptions: Record<InviteRole, string> = {
        MEMBER: 'Can access available public items in Workspace.',
        LIMITED_MEMBER: 'Can only access items shared with them.',
        LIMITED_MEMBER_VIEW_ONLY: 'Can only access items shared with them (read-only).',
        ADMIN: 'Can manage Workspace settings and items.',
        GUEST: `External access to this ${itemType} only.`,
    };

    // Add email to pending invites
    const handleAddEmail = () => {
        const email = emailInput.trim();
        if (!email) return;

        // Basic email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
            return;
        }

        if (pendingInvites.some((invite) => invite.email === email && invite.type === 'email')) {
            toast({ title: 'Already added', description: 'Email already in list', variant: 'destructive' });
            return;
        }

        setPendingInvites([...pendingInvites, {
            type: 'email',
            email,
            name: email,
            role: selectedRole,
            permission: selectedPermission
        }]);
        setEmailInput('');
        setShowSuggestions(false);
    };

    const handleAddUser = (user: any) => {
        if (pendingInvites.some(invite => invite.type === 'user' && invite.id === user.id)) return;
        setPendingInvites([...pendingInvites, {
            type: 'user',
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.image,
            role: selectedRole,
            permission: selectedPermission
        }]);
        setEmailInput('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleAddTeam = (team: any) => {
        if (pendingInvites.some(invite => invite.type === 'team' && invite.id === team.id)) return;
        setPendingInvites([...pendingInvites, {
            type: 'team',
            id: team.id,
            name: team.name,
            role: selectedRole,
            permission: selectedPermission
        }]);
        setEmailInput('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleRemoveInvite = (index: number) => {
        setPendingInvites(pendingInvites.filter((_, i) => i !== index));
    };

    const handleUpdateInviteRole = (index: number, role: InviteRole) => {
        setPendingInvites(prev => prev.map((invite, i) =>
            i === index ? { ...invite, role } : invite
        ));
    };

    const handleUpdateInvitePermission = (index: number, permission: PermissionLevel) => {
        setPendingInvites(prev => prev.map((invite, i) =>
            i === index ? { ...invite, permission } : invite
        ));
    };

    // Filter suggestions
    const filteredUsers = workspace?.members?.filter(m =>
        !userPermissions.some(up => up.user.id === m.user.id) && // Not already in permissions
        !pendingInvites.some(pi => pi.type === 'user' && pi.id === m.user.id) && // Not pending
        (m.user.name?.toLowerCase().includes(emailInput.toLowerCase()) || m.user.email?.toLowerCase().includes(emailInput.toLowerCase()))
    ) || [];

    const filteredTeams = teamsData?.items?.filter(t =>
        !teamPermissions.some(tp => tp.team.id === t.id) && // Not already in permissions
        !pendingInvites.some(pi => pi.type === 'team' && pi.id === t.id) && // Not pending
        t.name.toLowerCase().includes(emailInput.toLowerCase())
    ) || [];

    const hasSuggestions = filteredUsers.length > 0 || filteredTeams.length > 0;



    // Send invitations
    const handleSendInvites = async () => {
        if (pendingInvites.length === 0) return;
        setIsLoading(true);

        try {
            await Promise.all(pendingInvites.map(async (invite) => {
                if (invite.type === 'team' && invite.id) {
                    await permissionsService.permissions.grant(itemType, itemId, {
                        teamId: invite.id,
                        permission: invite.permission
                    });
                } else if ((invite.type === 'user' || invite.type === 'email') && invite.email) {
                    const body = invite.role === 'GUEST'
                        ? { workspaceId, email: invite.email, targetType: itemType, targetId: itemId, permission: invite.permission }
                        : { workspaceId, email: invite.email, role: invite.role };

                    // We can use permissionsService for invitations too if refactored fully, 
                    // but sticking to existing logic pattern for consistency or refactoring if desired.
                    // Let's use the Service which we imported.
                    if (invite.role === 'GUEST') {
                        await permissionsService.invitations.inviteGuest({
                            itemType,
                            itemId,
                            email: invite.email,
                            permission: invite.permission
                        });
                    } else {
                        // For member invites, we usually just add them to the space/project if they are already workspace members
                        // If they are strictly emails (not users), we invite.
                        // But for "Member" role in a Space/Project, it's often permissionsService.invitations.inviteMember
                        // Wait, inviteMember takes workspaceId, spaceId?
                        // The original code used /api/invitations/member.
                        // Let's stick to the service.
                        await permissionsService.invitations.inviteMember({
                            workspaceId,
                            email: invite.email,
                            role: invite.role,
                            // spaceId? - inviteMember signature in service has spaceId optional
                            spaceId: itemType === 'space' ? itemId : undefined
                        });
                    }
                }
            }));

            toast({ title: 'Invitations sent!', description: `Processed ${pendingInvites.length} invites.` });
            setPendingInvites([]);
            fetchPermissions();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: 'Failed to send invitations', description: 'Please try again', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/dashboard/${itemType.charAt(0)}/${itemId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied" });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        Share this {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                        <Badge variant="outline" className="ml-2 font-normal text-zinc-500">
                            {itemType === 'space' ? 'Space' : 'Private'}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-5 bg-zinc-50/50">
                    {/* Invite Section */}
                    <div className="relative">
                        <div className="bg-white p-1 rounded-xl border shadow-sm ring-1 ring-zinc-900/5 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                            <div className="flex flex-wrap gap-1 p-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Invite by name or email"
                                    className="flex-1 min-w-[150px] outline-none border-none bg-transparent px-2 h-7 text-sm"
                                    value={emailInput}
                                    onChange={(e) => {
                                        setEmailInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddEmail();
                                        }
                                    }}
                                />
                                {/* Role Selector inside input area */}
                                <div className="ml-auto flex items-center border-l pl-2 gap-2">
                                    <Select value={selectedRole} onValueChange={(r: any) => setSelectedRole(r)}>
                                        <SelectTrigger className="h-7 border-none shadow-none text-xs font-medium bg-transparent hover:bg-zinc-100 w-[110px] gap-1 px-2 text-zinc-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Workspace Roles</div>
                                            <SelectItem value="MEMBER">Member</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">External</div>
                                            <SelectItem value="GUEST">Guest</SelectItem>
                                            <SelectItem value="LIMITED_MEMBER">Limited</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedPermission} onValueChange={(p: any) => setSelectedPermission(p)}>
                                        <SelectTrigger className="h-7 border-none shadow-none text-xs font-medium bg-transparent hover:bg-zinc-100 w-[90px] gap-1 px-2 text-zinc-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="VIEW">View</SelectItem>
                                            <SelectItem value="COMMENT">Comment</SelectItem>
                                            <SelectItem value="EDIT">Edit</SelectItem>
                                            <SelectItem value="FULL">Full</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && emailInput.trim().length > 0 && hasSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border overflow-hidden z-50">
                                <ScrollArea className="max-h-[300px]">
                                    <div className="py-2">
                                        {filteredTeams.length > 0 && (
                                            <>
                                                <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase">Teams</div>
                                                {filteredTeams.map(team => (
                                                    <div
                                                        key={team.id}
                                                        className="px-3 py-2 hover:bg-zinc-50 cursor-pointer flex items-center gap-3"
                                                        onClick={() => handleAddTeam(team)}
                                                    >
                                                        <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                            <Users className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-zinc-900">{team.name}</span>
                                                            <span className="text-xs text-zinc-500">{team._count?.members || 0} members</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {filteredUsers.length > 0 && (
                                            <>
                                                {filteredTeams.length > 0 && <Separator className="my-1" />}
                                                <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase mt-1">Users</div>
                                                {filteredUsers.map(member => (
                                                    <div
                                                        key={member.user.id}
                                                        className="px-3 py-2 hover:bg-zinc-50 cursor-pointer flex items-center gap-3"
                                                        onClick={() => handleAddUser(member.user)}
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={member.user.image || undefined} />
                                                            <AvatarFallback className="text-xs">{member.user.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-zinc-900">{member.user.name}</span>
                                                            <span className="text-xs text-zinc-500">{member.user.email}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {/* Pending Invites List */}
                    {pendingInvites.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div className="text-xs font-semibold text-zinc-600 px-1">
                                Pending Invites ({pendingInvites.length})
                            </div>
                            {pendingInvites.map((invite, idx) => (
                                <div key={idx} className="bg-white rounded-lg border p-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {invite.type === 'team' ? (
                                            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                                <Users className="h-4 w-4" />
                                            </div>
                                        ) : (
                                            <Avatar className="h-9 w-9 flex-shrink-0">
                                                <AvatarImage src={invite.avatar} />
                                                <AvatarFallback className="text-xs">
                                                    {invite.name?.charAt(0) || invite.email?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-zinc-900 truncate">
                                                {invite.name || invite.email}
                                            </div>
                                            {invite.email && invite.name !== invite.email && (
                                                <div className="text-xs text-zinc-500 truncate">{invite.email}</div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Role Selector */}
                                            <Select
                                                value={invite.role}
                                                onValueChange={(r: any) => handleUpdateInviteRole(idx, r)}
                                            >
                                                <SelectTrigger className="h-8 w-[110px] text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Workspace Roles</div>
                                                    <SelectItem value="MEMBER">Member</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">External</div>
                                                    <SelectItem value="GUEST">Guest</SelectItem>
                                                    <SelectItem value="LIMITED_MEMBER">Limited</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* Permission Selector */}
                                            <Select
                                                value={invite.permission}
                                                onValueChange={(p: any) => handleUpdateInvitePermission(idx, p)}
                                            >
                                                <SelectTrigger className="h-8 w-[100px] text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="VIEW">View</SelectItem>
                                                    <SelectItem value="COMMENT">Comment</SelectItem>
                                                    <SelectItem value="EDIT">Edit</SelectItem>
                                                    <SelectItem value="FULL">Full</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* Remove Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600"
                                                onClick={() => handleRemoveInvite(idx)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Helper text */}
                    <div className="mt-3 flex items-start text-xs text-zinc-500 px-1">
                        <div className="bg-zinc-100 p-1 rounded mr-2">
                            {selectedRole === 'MEMBER' && <Users className="h-3 w-3" />}
                            {selectedRole === 'ADMIN' && <Shield className="h-3 w-3" />}
                            {selectedRole === 'GUEST' && <Globe className="h-3 w-3" />}
                        </div>
                        {roleDescriptions[selectedRole]}
                    </div>

                    {pendingInvites.length > 0 && (
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleSendInvites} disabled={isLoading} size="sm">
                                {isLoading ? "Sending..." : `Send ${pendingInvites.length} Invite${pendingInvites.length > 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="px-6 py-2 border-t border-b bg-zinc-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Globe className="h-4 w-4" />
                        Public link
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={handleCopyLink}>
                            <Copy className="mr-1.5 h-3 w-3" />
                            Copy link
                        </Button>
                        <Switch id="public-link" />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

