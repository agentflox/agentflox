"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, UserPlus, Hash, Plus, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
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
import { VerticalToolRail } from "@/features/dashboard/components/VerticalToolRail";
import { useChannels } from "@/entities/channels/hooks/useChannels";
import { ChannelMessageComposer } from "@/entities/channels/components/ChannelMessageComposer";
import ChatCreationModal from "@/entities/channels/components/ChatCreationModal";
import ChannelList from "@/entities/channels/components/ChannelList";
import ChannelMessageList from "@/entities/channels/components/ChannelMessageList";
import ChannelAddMembersSidebar from "@/entities/channels/components/ChannelAddMembersSidebar";
import ChannelMembersSidebar from "@/entities/channels/components/ChannelMembersSidebar";
import ChannelSettingsSidebar from "@/entities/channels/components/ChannelSettingsSidebar";

interface WorkspaceChatViewProps {
    workspaceId: string;
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


export default function WorkspaceChatView({ workspaceId, selectedChatId, onChatSelect }: WorkspaceChatViewProps) {
    const { data: workspace, isLoading } = trpc.workspace.get.useQuery({ id: workspaceId });
    const channelsQuery = trpc.channel.list.useQuery({ workspaceId, withCounts: false });
    const utils = trpc.useUtils();
    const createChannel = trpc.channel.create.useMutation();
    const updateChannel = trpc.channel.update.useMutation();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(selectedChatId || null);
    const [addSidebarOpen, setAddSidebarOpen] = useState(false);
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
            const created = await createChannel.mutateAsync({ workspaceId, name: title, description });
            setActiveChannelId(created.id);
            setChatTitle(created.name ?? title);
            setChatDescription(created.description ?? description ?? "");
            setChatModalOpen(false);
            await utils.channel.list.invalidate({ workspaceId, withCounts: false });
        } finally {
            setIsCreatingConversation(false);
        }
    }, [createChannel, utils.channel.list, workspaceId]);

    const handleRename = useCallback(async (name: string) => {
        if (!activeChannelId) return;
        await updateChannel.mutateAsync({ id: activeChannelId, name, description: chatDescription || undefined });
        setChatTitle(name);
        await utils.channel.list.invalidate({ workspaceId, withCounts: false });
        setSettingsSidebarOpen(false);
    }, [activeChannelId, updateChannel, chatDescription, utils.channel.list, workspaceId]);

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
    }, [activeChannelId, channelsQuery.data, selectedChatId]);

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

    const ownedProjects = trpc.project.list.useQuery({ scope: "owned", page: 1, pageSize: 50 });
    const ownedTeams = trpc.team.list.useQuery({ scope: "owned", page: 1, pageSize: 50 });
    const ownedSpaces = trpc.space.list.useQuery({ scope: "owned", page: 1, pageSize: 50 });

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
        setAddSidebarOpen(false);
    };

    const removeChatMember = (id: string) => {
        setChatMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const removeStagedMember = (id: string) => {
        setStagedMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const handleSendChannelMessage = useCallback(
        async (message: string, options?: { attachments?: any[] }) => {
            if (!activeChannelId) return;
            await sendMessage({
                channelId: activeChannelId,
                content: message,
                attachments: options?.attachments,
            });
        },
        [activeChannelId, sendMessage]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left chat list */}
            {/* Left chat list */}
            <aside className={cn(
                "hidden lg:flex shrink-0 bg-white transition-all duration-300 ease-in-out flex-col h-full overflow-hidden border-r border-slate-200",
                isSidebarCollapsed ? "w-0 border-none" : "w-80"
            )}>
                <div className="flex h-full flex-col overflow-hidden">
                    {/* Header */}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col border-b border-slate-200">
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
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Channels</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{workspace?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem onClick={() => setChatModalOpen(true)}>
                                                    <Plus className="mr-2 h-4 w-4" /> Create Channel
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setIsSearchNavOpen(true)}
                                            title="Search"
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setIsSidebarCollapsed(true)}
                                            title="Collapse Sidebar"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setChatModalOpen(true)}
                                            title="Create Channel"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Channels List */}
                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-0 py-0">
                            {channelsQuery.isLoading ? (
                                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                            ) : (
                                <div className="p-2">
                                    <ChannelList
                                        channels={filteredChannels.map((c) => ({ id: c.id, name: c.name, description: c.description }))}
                                        activeId={activeChannelId}
                                        onSelect={(id) => {
                                            const c = (channelsQuery.data ?? []).find((x) => x.id === id);
                                            setActiveChannelId(id);
                                            setChatTitle(c?.name ?? "Channel");
                                        }}
                                    />
                                    {filteredChannels.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                            <Hash className="mb-4 h-12 w-12 text-muted-foreground/50" />
                                            <p className="text-sm font-medium text-foreground">No channels found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main chat area */}
            <div className={cn("relative flex flex-1 flex-col overflow-hidden", {
                'lg:pr-[22rem]': addSidebarOpen || membersSidebarOpen || settingsSidebarOpen,
                'lg:pr-16': !addSidebarOpen && !membersSidebarOpen && !settingsSidebarOpen,
            })}
            >
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
                <div className="flex-1 flex flex-col bg-white border-x">
                    <div className="border-b px-4 py-3">
                        <p className="text-lg font-semibold">{chatTitle || "Channel"}</p>
                        <p className="text-xs text-muted-foreground">Workspace channel messages</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
                        {isLoadingMessages ? (
                            <p className="text-sm text-muted-foreground">Loading messages...</p>
                        ) : (
                            <ChannelMessageList messages={messages as any} onAddMembers={() => setAddSidebarOpen(true)} />
                        )}
                    </div>
                    {activeChannelId && (
                        <ChannelMessageComposer channelId={activeChannelId} />
                    )}
                </div>

                <div className="flex items-center gap-2 border-t bg-white px-4 py-3 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{chatMembers.length} member{chatMembers.length === 1 ? "" : "s"}</span>
                </div>

                <VerticalToolRail
                    onAddClick={() => setAddSidebarOpen(true)}
                    onMembersClick={() => setMembersSidebarOpen(true)}
                    onSettingsClick={() => setSettingsSidebarOpen(true)}
                    className={cn({ "right-0": addSidebarOpen || membersSidebarOpen || settingsSidebarOpen })}
                />

                <ChannelAddMembersSidebar
                    open={addSidebarOpen}
                    onClose={() => setAddSidebarOpen(false)}
                    searchQuery={searchQuery}
                    onSearchQuery={setSearchQuery}
                    stagedMembers={stagedMembers}
                    onRemoveStaged={removeStagedMember}
                    filteredIndividuals={filteredIndividuals}
                    alreadyInChat={alreadyInChat}
                    onStageMember={handleStageMember}
                    groupOptions={groupOptions.map((g) => ({ id: g.id, name: g.name, type: g.type, memberCount: undefined }))}
                    onIncludeGroup={onIncludeGroup}
                    onCommit={commitMembers}
                />

                <ChannelMembersSidebar
                    open={membersSidebarOpen}
                    onClose={() => setMembersSidebarOpen(false)}
                    chatMembers={chatMembers}
                    onRemoveMember={removeChatMember}
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

