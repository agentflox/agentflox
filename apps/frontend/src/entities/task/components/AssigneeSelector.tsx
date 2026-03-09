import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { UserIcon, X, Plus, Check, Mail, Globe, Users, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublishTaskToMarketplaceModal } from '@/components/marketplace/PublishTaskToMarketplaceModal';
import { ShareModal } from '@/components/permissions/ShareModal';
import { type Task } from '@/entities/tasks/types';

interface SelectOption {
    id: string;
    name: string;
    image?: string | null;
    type?: string;
    email?: string | null;
}

interface AssigneeSelectorProps {
    users: SelectOption[];
    teams?: SelectOption[];
    agents?: SelectOption[];
    workspaceId?: string;
    className?: string;
    variant?: "default" | "compact";
    value?: string[];
    onChange?: (value: string[]) => void;
    trigger?: React.ReactNode;
    projectId?: string;
    task?: Task;
    showMarketplaceActions?: boolean;
    align?: "start" | "center" | "end";
    sideOffset?: number;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hidePopover?: boolean;
}

export function AssigneeSelector({
    users = [],
    teams = [],
    agents = [],
    className,
    variant = "default",
    value,
    onChange,
    trigger,
    projectId,
    task,
    workspaceId,
    showMarketplaceActions = false,
    align = "start",
    sideOffset = 4,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    hidePopover = false
}: AssigneeSelectorProps) {
    const formContext = useFormContext();
    const [internalOpen, setInternalOpen] = React.useState(false);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
    const [showPublishModal, setShowPublishModal] = React.useState(false);
    const [showInviteModal, setShowInviteModal] = React.useState(false);

    // Determine current value and setter
    // If value/onChange provided, use them (controlled)
    // Else try form context
    const isControlled = value !== undefined && onChange !== undefined;

    const assigneeIds = (isControlled
        ? value
        : (formContext ? (formContext.watch('assigneeIds') || []) : [])) as string[];

    // Legacy support for form context
    const legacyAssigneeId = formContext ? formContext.watch('assigneeId') : null;

    React.useEffect(() => {
        if (!isControlled && formContext) {
            if (legacyAssigneeId && (!assigneeIds || assigneeIds.length === 0)) {
                formContext.setValue('assigneeIds', [legacyAssigneeId]);
            }
        }
    }, [legacyAssigneeId, assigneeIds?.length, formContext, isControlled]);

    const handleValueChange = (newIds: string[]) => {
        if (isControlled && onChange) {
            onChange(newIds);
        } else if (formContext) {
            formContext.setValue('assigneeIds', newIds, { shouldDirty: true });
            // Sync legacy - only with user IDs (strip user: prefix if present)
            const firstUserId = newIds.find(id => id.startsWith('user:') || !id.includes(':'));
            if (firstUserId) {
                const cleanUserId = firstUserId.startsWith('user:') ? firstUserId.replace('user:', '') : firstUserId;
                formContext.setValue('assigneeId', cleanUserId, { shouldDirty: true });
            } else {
                formContext.setValue('assigneeId', null, { shouldDirty: true });
            }
        }
    };

    const toggleId = (id: string, type: 'user' | 'team' | 'agent') => {
        // Add prefix based on type
        const prefixedId = type === 'user' ? `user:${id}` : type === 'team' ? `team:${id}` : `agent:${id}`;

        const set = new Set(assigneeIds);
        let removed = false;

        // Check for prefixed ID
        if (set.has(prefixedId)) {
            set.delete(prefixedId);
            removed = true;
        }

        // For users, also check/remove legacy ID (raw ID)
        if (type === 'user' && set.has(id)) {
            set.delete(id);
            removed = true;
        }

        if (!removed) {
            set.add(prefixedId);
        }
        handleValueChange(Array.from(set));
    };

    const removeId = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const set = new Set(assigneeIds);
        set.delete(id);

        // Also remove legacy format if we're removing a user prefixed ID
        if (id.startsWith('user:')) {
            const rawId = id.replace('user:', '');
            if (set.has(rawId)) set.delete(rawId);
        }

        handleValueChange(Array.from(set));
    };

    // Helper to parse prefixed IDs
    const parseAssigneeId = (id: string): { type: 'user' | 'team' | 'agent', actualId: string } => {
        if (id.startsWith('team:')) {
            return { type: 'team', actualId: id.replace('team:', '') };
        } else if (id.startsWith('agent:')) {
            return { type: 'agent', actualId: id.replace('agent:', '') };
        } else if (id.startsWith('user:')) {
            return { type: 'user', actualId: id.replace('user:', '') };
        } else {
            return { type: 'user', actualId: id };
        }
    };

    // Create option maps for each type
    const userMap = new Map(users.map(u => [u.id, u]));
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const agentMap = new Map(agents.map(a => [a.id, a]));

    // Derived lists - include the original ID (with prefix) for removal
    const selectedOptions = assigneeIds
        .map(id => {
            const { type, actualId } = parseAssigneeId(id);
            let option;
            if (type === 'user') option = userMap.get(actualId);
            if (type === 'team') option = teamMap.get(actualId);
            if (type === 'agent') option = agentMap.get(actualId);

            // Add the prefixed ID to the option for removal
            return option ? { ...option, _prefixedId: id } : undefined;
        })
        .filter(Boolean) as (SelectOption & { _prefixedId: string })[];

    const unselectedUsers = users.filter(u => !assigneeIds.includes(`user:${u.id}`) && !assigneeIds.includes(u.id));
    const unselectedTeams = teams.filter(t => !assigneeIds.includes(`team:${t.id}`));
    const unselectedAgents = agents.filter(a => !assigneeIds.includes(`agent:${a.id}`));

    const content = (
        <Command className={cn(hidePopover && "border-none shadow-none")}>
            <CommandInput placeholder="Search or enter email..." className="h-9 text-xs" />
            <CommandList className="max-h-[350px] overflow-y-auto">
                <CommandEmpty>No results found.</CommandEmpty>

                {/* 1. Selected Assignees Section - Top */}
                {selectedOptions.length > 0 && (
                    <CommandGroup heading="Assignees">
                        {selectedOptions.map((option, idx) => {
                            // Colorful avatar backgrounds cycling through colors
                            const colorClasses = [
                                { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
                                { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200" },
                                { bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-200" },
                                { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-200" },
                                { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
                            ];
                            const colorSet = colorClasses[idx % colorClasses.length];

                            return (
                                <CommandItem
                                    key={option.id}
                                    value={`${option.name} ${option.email || ''} ${option.id}`}
                                    onSelect={() => { }}
                                    className="flex items-center justify-between px-3 py-2 cursor-default hover:bg-zinc-50 group"
                                >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className="relative">
                                            <Avatar className={cn("h-7 w-7 ring-2", colorSet.ring)}>
                                                <AvatarImage src={option.image || undefined} />
                                                <AvatarFallback className={cn("text-[10px] font-semibold", colorSet.bg, colorSet.text)}>
                                                    {option.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                onClick={(e) => removeId(option._prefixedId, e)}
                                                className="absolute -bottom-1.5 -right-2 bg-red-500 text-white hover:bg-red-600 rounded-full p-[1px] transition-all cursor-pointer shadow-sm opacity-0 group-hover:opacity-100"
                                                title="Remove assignee"
                                            >
                                                <X className="h-2 w-2 text-white" />
                                            </button>
                                        </div>
                                        <span className="text-sm font-medium text-zinc-900 truncate">{option.name}</span>
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}

                {/* 2. Super Agents Section */}
                {unselectedAgents.length > 0 && (
                    <CommandGroup heading="Super Agents">
                        {unselectedAgents.map(agent => (
                            <CommandItem
                                key={agent.id}
                                value={`${agent.name} ${agent.email || ''} ${agent.id}`}
                                onSelect={() => toggleId(agent.id, 'agent')}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={agent.image || undefined} />
                                        <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                                            <Bot className="h-3.5 w-3.5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <span>{agent.name}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 3. Teams Section */}
                {unselectedTeams.length > 0 && (
                    <CommandGroup heading="Teams">
                        {unselectedTeams.map(team => (
                            <CommandItem
                                key={team.id}
                                value={`${team.name} ${team.email || ''} ${team.id}`}
                                onSelect={() => toggleId(team.id, 'team')}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 rounded-md">
                                        <AvatarImage src={team.image || undefined} />
                                        <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-700 rounded-md">
                                            <Users className="h-3.5 w-3.5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{team.name}</span>
                                        <span className="text-[10px] text-zinc-400">Team • {team.type || "General"}</span>
                                    </div>

                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 4. People Section */}
                {unselectedUsers.length > 0 && (
                    <CommandGroup heading="People">
                        {unselectedUsers.map(user => (
                            <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email || ''} ${user.id}`}
                                onSelect={() => toggleId(user.id, 'user')}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.image || undefined} />
                                        <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-700">
                                            {user.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        {user.email && <span className="text-[10px] text-zinc-400">{user.email}</span>}
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {showMarketplaceActions && (
                    <>
                        <CommandSeparator />

                        {/* 5. Footer Actions */}
                        <CommandGroup>
                            <CommandItem onSelect={() => { setShowInviteModal(true); setOpen(false); }} className="cursor-pointer text-zinc-600">
                                <Mail className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                                Invite people via email
                            </CommandItem>
                            <CommandItem onSelect={() => { setShowPublishModal(true); setOpen(false); }} className="cursor-pointer text-zinc-600">
                                <Globe className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                                Publish to marketplace
                            </CommandItem>
                        </CommandGroup>
                    </>
                )}

            </CommandList>
        </Command>
    );

    const modals = (
        <>
            <PublishTaskToMarketplaceModal
                open={showPublishModal}
                onOpenChange={setShowPublishModal}
                task={task}
                projectId={projectId}
            />

            <ShareModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                workspaceId={workspaceId}
                itemType={projectId ? 'project' : 'workspace'}
                itemId={projectId || workspaceId}
                itemName={projectId ? 'Project' : 'Workspace'}
            />
        </>
    );

    if (hidePopover) {
        return (
            <>
                {content}
                {modals}
            </>
        );
    }

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {trigger ? (
                        trigger
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-7 border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all text-zinc-700",
                                assigneeIds.length === 0 && "text-zinc-500 dashed border-zinc-300",
                                className
                            )}
                            type="button"
                        >
                            <div className="flex items-center gap-1.5">
                                {selectedOptions.length === 0 ? (
                                    <>
                                        <UserIcon className="h-3 w-3 opacity-50" />
                                        <span>Assignee</span>
                                    </>
                                ) : selectedOptions.length === 1 ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1.5">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarImage src={selectedOptions[0].image || undefined} />
                                                        <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                                                            {selectedOptions[0].name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="max-w-[80px] truncate">{selectedOptions[0].name}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                <p>{selectedOptions[0].name}</p>
                                                {selectedOptions[0].type && <p className="text-xs text-muted-foreground capitalize">{selectedOptions[0].type}</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <>
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {selectedOptions.slice(0, 3).map(u => (
                                                <TooltipProvider key={u.id}>
                                                    <Tooltip delayDuration={300}>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="inline-block h-4 w-4 ring-1 ring-white cursor-help">
                                                                <AvatarImage src={u.image || undefined} />
                                                                <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                                                                    {u.name?.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">
                                                            <p>{u.name}</p>
                                                            {u.type && <p className="text-xs text-muted-foreground capitalize">{u.type}</p>}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                        <span>{selectedOptions.length} Assignees</span>
                                    </>
                                )}
                            </div>
                        </Button>
                    )}
                </PopoverTrigger>
                <PopoverContent align={align} sideOffset={sideOffset} className="w-[280px] p-0 shadow-2xl border-zinc-200 overflow-hidden rounded-2xl">
                    {content}
                </PopoverContent>
            </Popover>
            {modals}
        </>
    );

}

export const formatAssigneeIdsForSelector = (assignees: any[]): string[] => {
    if (!assignees) return [];
    return assignees.map((a: any) => {
        if (a.userId) return `user:${a.userId}`;
        if (a.user?.id) return `user:${a.user.id}`;
        if (a.teamId) return `team:${a.teamId}`;
        if (a.team?.id) return `team:${a.team.id}`;
        if (a.agentId) return `agent:${a.agentId}`;
        if (a.agent?.id) return `agent:${a.agent.id}`;
        return null;
    }).filter(Boolean) as string[];
};

export const cleanAssigneeIdsFromSelector = (ids: string[]): string[] => {
    if (!ids) return [];
    return ids.map(id => id.includes(':') ? id.split(':')[1] : id);
};

