"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Hash, Plus, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { VerticalToolRail } from "@/features/dashboard/components/shared/VerticalToolRail";
import { useChannels } from "@/entities/channels/hooks/useChannels";
import { ChannelMessageComposer } from "@/entities/channels/components/ChannelMessageComposer";
import ChatCreationModal from "@/entities/channels/components/ChatCreationModal";
import ChannelList from "@/entities/channels/components/ChannelList";
import ChannelMessageList from "@/entities/channels/components/ChannelMessageList";
import ChannelMembersSidebar from "@/entities/channels/components/ChannelMembersSidebar";
import ChannelSettingsSidebar from "@/entities/channels/components/ChannelSettingsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatViewProps {
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    selectedChatId?: string;
    onChatSelect?: (chatId: string) => void;
}

type MemberSource = "workspace" | "project" | "team" | "space";

interface SelectedMember {
    id: string;
    name: string;
    email?: string;
    image?: string;
    source: MemberSource;
    sourceName?: string;
}

interface GroupOption {
    id: string;
    name: string;
    type: "project" | "team" | "space";
    members: SelectedMember[];
}

function dedupeMembers(list: SelectedMember[]): SelectedMember[] {
    const map = new Map<string, SelectedMember>();
    list.forEach((member) => {
        if (!map.has(member.id)) map.set(member.id, member);
    });
    return Array.from(map.values());
}

function ChatViewSkeleton() {
    return (
        <div className="flex h-full min-h-0 bg-slate-50">
            {/* Left sidebar skeleton */}
            <aside className="hidden lg:flex shrink-0 w-[256px] bg-white border-r border-slate-200 flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-slate-50/30">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-20 rounded-md" />
                        <Skeleton className="h-3 w-28 rounded-md" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                </div>

                {/* Channel list */}
                <div className="flex-1 overflow-hidden p-2 space-y-1">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
                            <Skeleton className={cn("h-3.5 rounded-md", i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-32" : "w-20")} />
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main chat area */}
            <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 bg-white border-x border-slate-200/60">
                    {/* Channel header */}
                    <div className="shrink-0 border-b border-slate-200/60 bg-white/80 px-6 py-4 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded-md" />
                            <Skeleton className="h-5 w-36 rounded-md" />
                        </div>
                        <Skeleton className="h-3 w-48 rounded-md ml-7" />
                    </div>

                    {/* Messages */}
                    <div className="flex-1 min-h-0 overflow-hidden px-6 py-4 bg-[#f8fafc] space-y-6">
                        {[...Array(5)].map((_, groupIdx) => (
                            <div key={groupIdx} className="space-y-3">
                                {/* Date divider */}
                                {groupIdx === 2 && (
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="flex-1 h-px bg-slate-200/80" />
                                        <Skeleton className="h-3 w-16 rounded-full" />
                                        <div className="flex-1 h-px bg-slate-200/80" />
                                    </div>
                                )}
                                {[...Array(groupIdx % 2 === 0 ? 2 : 3)].map((_, msgIdx) => (
                                    <div key={msgIdx} className="flex items-start gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-3.5 w-24 rounded-md" />
                                                <Skeleton className="h-3 w-12 rounded-md opacity-60" />
                                            </div>
                                            <Skeleton className={cn("h-3.5 rounded-md", msgIdx % 2 === 0 ? "w-[85%]" : "w-[60%]")} />
                                            {msgIdx % 3 === 0 && <Skeleton className="h-3.5 w-[45%] rounded-md" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Composer */}
                    <div className="shrink-0 border-t border-slate-200/60 bg-white px-4 py-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                            {/* Text area row */}
                            <div className="px-4 pt-3 pb-2">
                                <Skeleton className="h-4 w-48 rounded-md" />
                            </div>
                            {/* Toolbar row */}
                            <div className="flex items-center justify-between px-3 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                                    <Skeleton className="h-6 w-24 rounded-md" />
                                    <Skeleton className="h-4 w-px rounded-full mx-0.5" />
                                    {[...Array(7)].map((_, i) => (
                                        <Skeleton key={i} className="h-6 w-6 rounded-md shrink-0" />
                                    ))}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Skeleton className="h-7 w-8 rounded-l-md" />
                                    <Skeleton className="h-7 w-5 rounded-r-md" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ChatView({ workspaceId, spaceId, projectId, teamId, selectedChatId, onChatSelect }: ChatViewProps) {
    const { data: workspace, isLoading } = trpc.workspace.get.useQuery(
        { id: workspaceId! },
        { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const channelsQuery = trpc.channel.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, withCounts: false } as any,
        { staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const utils = trpc.useUtils();
    const createChannel = trpc.channel.create.useMutation();
    const updateChannel = trpc.channel.update.useMutation();
    const deleteChannel = trpc.channel.delete.useMutation();
    const favoriteChannel = trpc.channel.favorite.useMutation();
    const unfollowChannel = trpc.channel.unfollow.useMutation();
    const followChannel = trpc.channel.follow.useMutation();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(selectedChatId || null);
    const [membersSidebarOpen, setMembersSidebarOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [stagedMembers, setStagedMembers] = useState<SelectedMember[]>([]);
    const [chatMembers, setChatMembers] = useState<SelectedMember[]>([]);
    const [chatTitle, setChatTitle] = useState<string>("");
    const [chatTopic, setChatTopic] = useState<string>("");
    const [chatDescription, setChatDescription] = useState<string>("");
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchNavOpen, setIsSearchNavOpen] = useState(false);
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
    const [debouncedSidebarQuery, setDebouncedSidebarQuery] = useState("");

    // Debounce sidebar search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSidebarQuery(sidebarSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [sidebarSearchQuery]);

    // Filter channels
    const channels = channelsQuery.data ?? [];
    const filteredChannels = useMemo(() => {
        if (!debouncedSidebarQuery) return channels;
        const q = debouncedSidebarQuery.toLowerCase();
        return channels.filter(c => (c.name?.toLowerCase() ?? "").includes(q));
    }, [channels, debouncedSidebarQuery]);

    const {
        messages,
        isLoading: isLoadingMessages,
        sendMessage,
    } = useChannels({ channelId: activeChannelId ?? undefined });

    const handleCreateChat = useCallback(async (title: string, topic?: string, description?: string) => {
        setIsCreatingConversation(true);
        try {
            const created = await createChannel.mutateAsync({ workspaceId, spaceId, projectId, teamId, name: title, description });
            
            // Optimistic update
            (utils.channel.list.setData as any)({ workspaceId, spaceId, projectId, teamId, withCounts: false }, (old: any) => {
                const newChannel = { ...created, _count: { aiConversations: 0, members: 0, messages: 0, creator: 0, workspace: 0, space: 0, project: 0, team: 0, tasks: 0 }, members: [] };
                if (!old) return [newChannel];
                return [newChannel, ...old];
            });

            setActiveChannelId(created.id);
            setChatTitle(created.name ?? title);
            setChatDescription(created.description ?? description ?? "");
            setChatModalOpen(false);
            await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
        } finally {
            setIsCreatingConversation(false);
        }
    }, [createChannel, utils.channel.list, workspaceId, spaceId, projectId, teamId]);

    const handleRename = useCallback(async (name: string) => {
        if (!activeChannelId) return;
        await updateChannel.mutateAsync({ id: activeChannelId, name, description: chatDescription || undefined });
        setChatTitle(name);
        await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
        setSettingsSidebarOpen(false);
    }, [activeChannelId, updateChannel, chatDescription, utils.channel.list, workspaceId, spaceId, projectId, teamId]);

    const handleDeleteChannel = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this channel?")) return;
        
        // Optimistic update
        (utils.channel.list.setData as any)({ workspaceId, spaceId, projectId, teamId, withCounts: false }, (old: any) => {
            if (!old) return old;
            return old.filter((c: any) => c.id !== id);
        });

        await deleteChannel.mutateAsync({ id });
        await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
        if (activeChannelId === id) {
            setActiveChannelId(null);
            setChatTitle("");
        }
    }, [deleteChannel, utils.channel.list, activeChannelId, workspaceId, spaceId, projectId, teamId]);

    const handleFavoriteChannel = useCallback(async (id: string) => {
        await favoriteChannel.mutateAsync({ channelId: id, isFavorite: true });
        toast.success("Channel favorited");
    }, [favoriteChannel]);

    const handleUnfollowChannel = useCallback(async (id: string) => {
        await unfollowChannel.mutateAsync({ channelId: id });
        toast.success("Unfollowed channel");
        await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
    }, [unfollowChannel, utils.channel.list, workspaceId, spaceId, projectId, teamId]);

    const handleFollowChannel = useCallback(async (id: string) => {
        await followChannel.mutateAsync({ channelId: id });
        toast.success("Followed channel");
        await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
    }, [followChannel, utils.channel.list, workspaceId, spaceId, projectId, teamId]);

    const handleOpenRename = useCallback(async (id: string, newName: string) => {
        await updateChannel.mutateAsync({ id, name: newName });
        if (activeChannelId === id) setChatTitle(newName);
        await utils.channel.list.invalidate({ workspaceId, spaceId, projectId, teamId, withCounts: false } as any);
        toast.success("Channel renamed");
    }, [updateChannel, activeChannelId, utils.channel.list, workspaceId, spaceId, projectId, teamId]);

    useEffect(() => {
        if (selectedChatId) {
            setActiveChannelId(selectedChatId);
            const selectedChannel = channelsQuery.data?.find(c => c.id === selectedChatId);
            if (selectedChannel) {
                setChatTitle(selectedChannel.name ?? "Channel");
            }
        } else if (!activeChannelId && channelsQuery.data?.length) {
            setActiveChannelId(channelsQuery.data[0].id);
            setChatTitle(channelsQuery.data[0].name ?? "Channel");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelsQuery.data, selectedChatId]);

    // Notify parent component when active channel changes
    useEffect(() => {
        if (activeChannelId && onChatSelect) {
            onChatSelect(activeChannelId);
        }
    }, [activeChannelId, onChatSelect]);

    useEffect(() => {
        if (!chatMembers.length && workspace?.members?.length) {
            const owner = workspace.members.find((m: any) => m.role === "OWNER") || workspace.members[0];
            if (owner?.user?.id) {
                setChatMembers([
                    {
                        id: owner.user.id,
                        name: owner.user.name || "Owner",
                        email: owner.user.email || undefined,
                        image: owner.user.image || undefined,
                        source: "workspace",
                        sourceName: workspace.name,
                    },
                ]);
            }
        }
    }, [workspace, chatMembers.length]);

    const workspaceMembers = useMemo<SelectedMember[]>(() => {
        const members = (workspace?.members ?? [])
            .map((member: any) =>
                member?.user
                    ? {
                        id: member.user.id,
                        name: member.user.name || "Unknown",
                        email: member.user.email || undefined,
                        image: member.user.image || undefined,
                        source: "workspace" as MemberSource,
                        sourceName: workspace?.name,
                    }
                    : null
            )
            .filter(Boolean) as SelectedMember[];
        return dedupeMembers(members);
    }, [workspace]);

    const ownedProjects = trpc.project.list.useQuery({ scope: "owned", page: 1, pageSize: 50 }, { enabled: membersSidebarOpen || chatModalOpen, staleTime: 60_000, gcTime: 5 * 60_000 });
    const ownedTeams = trpc.team.list.useQuery({ scope: "owned", page: 1, pageSize: 50 }, { enabled: membersSidebarOpen || chatModalOpen, staleTime: 60_000, gcTime: 5 * 60_000 });
    const ownedSpaces = trpc.space.list.useQuery({ scope: "owned", page: 1, pageSize: 50 }, { enabled: membersSidebarOpen || chatModalOpen, staleTime: 60_000, gcTime: 5 * 60_000 });

    const projectGroups = useMemo(() => {
        return (ownedProjects.data?.items ?? []).map((p: any) => ({ id: p.id, name: p.name, type: "project" as const, members: [] as SelectedMember[] }));
    }, [ownedProjects.data?.items]);

    const teamGroups = useMemo(() => {
        return (ownedTeams.data?.items ?? []).map((t: any) => ({ id: t.id, name: t.name, type: "team" as const, members: [] as SelectedMember[] }));
    }, [ownedTeams.data?.items]);

    const spaceGroups = useMemo(() => {
        return (ownedSpaces.data?.items ?? []).map((s: any) => ({ id: s.id, name: s.name, type: "space" as const, members: [] as SelectedMember[] }));
    }, [ownedSpaces.data?.items]);

    const allIndividuals = useMemo(() => dedupeMembers([...workspaceMembers]), [workspaceMembers]);

    const filteredIndividuals = useMemo(() => {
        if (!searchQuery.trim()) return allIndividuals;
        const q = searchQuery.toLowerCase();
        return allIndividuals.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                m.email?.toLowerCase().includes(q) ||
                m.sourceName?.toLowerCase().includes(q)
        );
    }, [allIndividuals, searchQuery]);

    const alreadyInChat = useCallback(
        (id: string) => chatMembers.some((m) => m.id === id) || stagedMembers.some((m) => m.id === id),
        [chatMembers, stagedMembers]
    );

    const groupOptions = useMemo(() => {
        const base = [...projectGroups, ...teamGroups, ...spaceGroups];
        return base.map((group) => ({
            ...group,
            members: group.members.filter((m) => !alreadyInChat(m.id)),
        }));
    }, [projectGroups, teamGroups, spaceGroups, alreadyInChat]);

    const handleStageMember = (member: SelectedMember) => {
        if (alreadyInChat(member.id)) return;
        setStagedMembers((prev) => dedupeMembers([...prev, member]));
    };

    const handleStageGroup = (members: SelectedMember[]) => {
        if (!members.length) return;
        setStagedMembers((prev) => dedupeMembers([...prev, ...members.filter((m) => !alreadyInChat(m.id))]));
    };

    const onIncludeGroup = useCallback(async (group: { id: string; name: string; type: "project" | "team" | "space" }) => {
        if (group.type === "project") {
            const res = await utils.project.getParticipants.fetch({ projectId: group.id });
            const members: SelectedMember[] = (res.users ?? []).map((u: any) => ({
                id: u.id,
                name: u.name || "Unknown",
                email: u.email || undefined,
                source: "project",
                sourceName: group.name,
            }));
            handleStageGroup(members);
        } else if (group.type === "team") {
            const res = await utils.team.getParticipants.fetch({ teamId: group.id });
            const members: SelectedMember[] = (res.users ?? []).map((u: any) => ({
                id: u.id,
                name: u.name || "Unknown",
                email: u.email || undefined,
                source: "team",
                sourceName: group.name,
            }));
            handleStageGroup(members);
        } else {
            const space = await utils.space.get.fetch({ id: group.id });
            if (!space) return;
            const members: SelectedMember[] = (space.members ?? [])
                .map((m: any) => m.user ? ({
                    id: m.user.id,
                    name: m.user.name || "Unknown",
                    email: m.user.email || undefined,
                    image: m.user.image || undefined,
                    source: "space" as const,
                    sourceName: space.name,
                }) : null)
                .filter(Boolean) as SelectedMember[];
            handleStageGroup(members);
        }
    }, [utils]);

    const commitMembers = () => {
        if (!stagedMembers.length) return;
        setChatMembers((prev) => dedupeMembers([...prev, ...stagedMembers]));
        setStagedMembers([]);
    };

    const removeChatMember = (id: string) => {
        setChatMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const removeStagedMember = (id: string) => {
        setStagedMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const handleSendChannelMessage = useCallback(
        async (message: string, options?: { attachments?: any[]; contexts?: any[]; mentions?: any[] }) => {
            if (!activeChannelId) return;
            await sendMessage({
                channelId: activeChannelId,
                content: message,
                attachments: options?.attachments,
                contexts: options?.contexts,
                mentions: options?.mentions,
            });
        },
        [activeChannelId, sendMessage]
    );

    if (isLoading) return <ChatViewSkeleton />;

    return (
        <div className="flex h-full w-full min-h-0 bg-slate-50">
            {/* Left chat list */}
            <aside className={cn(
                "hidden lg:flex shrink-0 bg-white transition-all duration-300 ease-in-out flex-col h-full overflow-hidden border-x border-slate-200",
                isSidebarCollapsed ? "w-0 border-none" : "w-[256px]"
            )}>
                <div className="flex h-full flex-col overflow-hidden">
                    {/* Header */}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col border-b border-slate-200/60 bg-slate-50/30">
                            {isSearchNavOpen ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Input
                                        autoFocus
                                        placeholder="Search channels..."
                                        value={sidebarSearchQuery}
                                        onChange={(e) => setSidebarSearchQuery(e.target.value)}
                                        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/70"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 rounded-full hover:bg-slate-100"
                                        onClick={() => {
                                            setIsSearchNavOpen(false);
                                            setSidebarSearchQuery("");
                                        }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div>
                                        <p className="text-sm font-semibold tracking-tight text-slate-900">Channels</p>
                                        <p className="text-xs font-medium text-slate-500 truncate max-w-[120px]">{workspace?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setIsSearchNavOpen(true)}
                                                    >
                                                        <Search className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Search</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setIsSidebarCollapsed(true)}
                                                    >
                                                        <ChevronsLeft className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Collapse Sidebar</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setChatModalOpen(true)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Create Channel</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Channels List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto min-h-0 px-0 py-0">
                            {channelsQuery.isLoading ? (
                                <LoadingContainer
                                    label="Loading chats..."
                                    spinnerSize="md"
                                    padding="md"
                                />
                            ) : (
                                <div className="p-2">
                                    <ChannelList
                                        channels={filteredChannels.map((c: any) => ({
                                            id: c.id,
                                            name: c.name,
                                            description: c.description,
                                            isMember: c.members && c.members.length > 0,
                                            isFollowed: c.members && c.members.length > 0 ? c.members[0].isFollowed : false,
                                        }))}
                                        activeId={activeChannelId}
                                        onSelect={(id) => {
                                            const c = (channelsQuery.data ?? []).find((x) => x.id === id);
                                            setActiveChannelId(id);
                                            setChatTitle(c?.name ?? "Channel");
                                        }}
                                        onRename={handleOpenRename}
                                        onDelete={handleDeleteChannel}
                                        onFavorite={handleFavoriteChannel}
                                        onUnfollow={handleUnfollowChannel}
                                        onFollow={handleFollowChannel}
                                    />
                                    {filteredChannels.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-300">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4 shadow-sm border border-slate-200/50">
                                                <Hash className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900">No channels found</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-[160px]">Try adjusting your search or create a new one.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main chat area */}
            <div id="channel-post-modal-root" className="relative flex flex-1 flex-col min-h-0 overflow-hidden">
                {isSidebarCollapsed && (
                    <div className="absolute left-0 top-3 z-30 hidden lg:block">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-4 w-4 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
                            onClick={() => setIsSidebarCollapsed(false)}
                            title="Expand Sidebar"
                        >
                            <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <div className="flex-1 flex flex-col min-h-0 bg-white border-x border-slate-200/60 shadow-[0_0_15px_rgba(0,0,0,0.02)] relative z-0">

                    <div className="flex-1 min-h-0 px-6 py-4 bg-[#f8fafc] flex flex-col">
                        {isLoadingMessages ? (
                            <div className="space-y-6">
                                {[...Array(5)].map((_, groupIdx) => (
                                    <div key={groupIdx} className="flex items-start gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className={cn("h-3.5 rounded-md", groupIdx % 2 === 0 ? "w-24" : "w-20")} />
                                                <Skeleton className="h-3 w-10 rounded-md opacity-50" />
                                            </div>
                                            <Skeleton className={cn("h-3.5 rounded-md", groupIdx % 3 === 0 ? "w-[75%]" : groupIdx % 3 === 1 ? "w-[55%]" : "w-[85%]")} />
                                            {groupIdx % 2 === 0 && <Skeleton className={cn("h-3.5 rounded-md", groupIdx % 3 === 0 ? "w-[50%]" : "w-[40%]")} />}
                                            {groupIdx === 2 && <Skeleton className="h-24 w-[320px] rounded-xl mt-1" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ChannelMessageList channelId={activeChannelId ?? ''} messages={messages as any} onAddMembers={() => {
                                setMembersSidebarOpen(false);
                                setSettingsSidebarOpen(false);
                            }} />
                        )}
                    </div>
                    {activeChannelId && (
                        <div className="shrink-0">
                            {isLoadingMessages ? (
                                <div className="border-t border-slate-200/60 bg-white px-4 py-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                        <div className="px-4 pt-3 pb-2">
                                            <Skeleton className="h-4 w-48 rounded-md" />
                                        </div>
                                        <div className="flex items-center justify-between px-3 pb-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <Skeleton className="h-6 w-20 rounded-md" />
                                                <Skeleton className="h-4 w-px rounded-full mx-0.5" />
                                                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                                                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                                                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-0">
                                                <Skeleton className="h-8 w-9 rounded-l-md" />
                                                <Skeleton className="h-8 w-5 rounded-r-md" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ChannelMessageComposer channelId={activeChannelId} />
                            )}
                        </div>
                    )}
                </div>

                {!isLoadingMessages && (
                    <VerticalToolRail
                        onMembersClick={() => {
                            setMembersSidebarOpen(true);
                            setSettingsSidebarOpen(false);
                        }}
                        onSettingsClick={() => {
                            setSettingsSidebarOpen(true);
                            setMembersSidebarOpen(false);
                        }}
                        className={cn({ "right-0": membersSidebarOpen || settingsSidebarOpen })}
                    />
                )}

                <ChannelMembersSidebar
                    open={membersSidebarOpen}
                    onClose={() => setMembersSidebarOpen(false)}
                    chatMembers={chatMembers}
                    onAddMember={(member) => setChatMembers((prev) => dedupeMembers([...prev, member]))}
                    onRemoveMember={removeChatMember}
                    workspaceId={workspaceId}
                    channelId={activeChannelId!}
                />

                <ChannelSettingsSidebar
                    open={settingsSidebarOpen}
                    onClose={() => setSettingsSidebarOpen(false)}
                    chatTitle={chatTitle}
                    onChatTitle={setChatTitle}
                    chatTopic={chatTopic}
                    onChatTopic={setChatTopic}
                    chatDescription={chatDescription}
                    onChatDescription={setChatDescription}
                    onSave={() => handleRename(chatTitle)}
                />
            </div>

            <ChatCreationModal
                open={chatModalOpen}
                onOpenChange={setChatModalOpen}
                onCreate={handleCreateChat}
                isCreating={isCreatingConversation}
            />
        </div>
    );
}

