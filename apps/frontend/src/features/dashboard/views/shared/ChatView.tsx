"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Plus, Search, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LoadingContainer } from "@/components/ui/loading";

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
            <aside className="hidden lg:flex shrink-0 w-[256px] bg-white border-r border-slate-200 flex-col h-full overflow-hidden">
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
                <div className="flex-1 overflow-hidden p-2 space-y-1">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
                            <Skeleton className={cn("h-3.5 rounded-md", i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-32" : "w-20")} />
                        </div>
                    ))}
                </div>
            </aside>
            <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 bg-white border-x border-slate-200/60">
                    <div className="shrink-0 border-b border-slate-200/60 bg-white/80 px-6 py-4 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded-md" />
                            <Skeleton className="h-5 w-36 rounded-md" />
                        </div>
                        <Skeleton className="h-3 w-48 rounded-md ml-7" />
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden px-6 py-4 bg-[#f8fafc] space-y-6">
                        {[...Array(5)].map((_, groupIdx) => (
                            <div key={groupIdx} className="space-y-3">
                                {[...Array(groupIdx % 2 === 0 ? 2 : 3)].map((_, msgIdx) => (
                                    <div key={msgIdx} className="flex items-start gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-3.5 w-24 rounded-md" />
                                                <Skeleton className="h-3 w-12 rounded-md opacity-60" />
                                            </div>
                                            <Skeleton className={cn("h-3.5 rounded-md", msgIdx % 2 === 0 ? "w-[85%]" : "w-[60%]")} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="shrink-0 border-t border-slate-200/60 bg-white px-4 py-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                            <div className="px-4 pt-3 pb-2">
                                <Skeleton className="h-4 w-48 rounded-md" />
                            </div>
                            <div className="flex items-center justify-between px-3 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                                    <Skeleton className="h-6 w-24 rounded-md" />
                                </div>
                                <Skeleton className="h-7 w-14 rounded-md" />
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
    const [activeChannelId, setActiveChannelId] = useState<string | null>(selectedChatId || null);
    const [membersSidebarOpen, setMembersSidebarOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
    const [chatMembers, setChatMembers] = useState<SelectedMember[]>([]);
    const [chatTitle, setChatTitle] = useState<string>("");
    const [chatTopic, setChatTopic] = useState<string>("");
    const [chatDescription, setChatDescription] = useState<string>("");
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchNavOpen, setIsSearchNavOpen] = useState(false);
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
    const [debouncedSidebarQuery, setDebouncedSidebarQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSidebarQuery(sidebarSearchQuery), 300);
        return () => clearTimeout(timer);
    }, [sidebarSearchQuery]);

    const channels = channelsQuery.data ?? [];
    const filteredChannels = useMemo(() => {
        if (!debouncedSidebarQuery) return channels;
        const q = debouncedSidebarQuery.toLowerCase();
        return channels.filter((c) => (c.name?.toLowerCase() ?? "").includes(q));
    }, [channels, debouncedSidebarQuery]);

    const {
        messages,
        isLoading: isLoadingMessages,
        toggleReaction,
        editMessage,
    } = useChannels({ channelId: activeChannelId ?? undefined });

    // Shared mention catalog for message rendering (composer fetches picker data separately; RQ cache shared)
    const { data: mentionMembers = [] } = trpc.workspace.getMembers.useQuery(
        { id: workspaceId! },
        { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const { data: mentionTasks } = trpc.task.list.useQuery(
        { workspaceId: workspaceId!, pageSize: 20, scope: "all", includeRelations: false },
        { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const { data: mentionDocs } = trpc.document.list.useQuery(
        { workspaceId: workspaceId!, pageSize: 20 },
        { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const mentionItems = useMemo(() => {
        const items: { title: string; type: string; status?: string }[] = [];
        mentionMembers.forEach((m) => {
            if (m.user.name || m.user.email) items.push({ title: m.user.name || m.user.email || "", type: "user" });
        });
        (mentionTasks?.items || []).forEach((t) => {
            if (t.title) items.push({ title: t.title, type: "task" });
        });
        (mentionDocs?.items || []).forEach((d) => {
            if (d.title) items.push({ title: d.title, type: "doc" });
        });
        return items.sort((a, b) => b.title.length - a.title.length);
    }, [mentionMembers, mentionTasks, mentionDocs]);

    const handleCreateChat = useCallback(async (title: string, topic?: string, description?: string) => {
        setIsCreatingConversation(true);
        try {
            const created = await createChannel.mutateAsync({ workspaceId, spaceId, projectId, teamId, name: title, description });
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

    useEffect(() => {
        if (selectedChatId) {
            setActiveChannelId(selectedChatId);
            const selectedChannel = channelsQuery.data?.find((c) => c.id === selectedChatId);
            if (selectedChannel) {
                setChatTitle(selectedChannel.name ?? "Channel");
            }
        } else if (!activeChannelId && channelsQuery.data?.length) {
            setActiveChannelId(channelsQuery.data[0].id);
            setChatTitle(channelsQuery.data[0].name ?? "Channel");
        }
    }, [activeChannelId, channelsQuery.data, selectedChatId]);

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

    const removeChatMember = (id: string) => {
        setChatMembers((prev) => prev.filter((m) => m.id !== id));
    };

    if (isLoading) return <ChatViewSkeleton />;

    return (
        <div className="flex h-full min-h-0 bg-slate-50">
            <aside className={cn(
                "hidden lg:flex shrink-0 bg-white transition-all duration-300 ease-in-out flex-col h-full overflow-hidden border-r border-slate-200",
                isSidebarCollapsed ? "w-0 border-none" : "w-[256px]"
            )}>
                <div className="flex h-full flex-col overflow-hidden">
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

                    {!isSidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto px-0 py-0">
                            {channelsQuery.isLoading ? (
                                <LoadingContainer label="Loading chats..." spinnerSize="md" padding="md" />
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
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#f8fafc]">
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ChannelMessageList
                                channelId={activeChannelId ?? ""}
                                messages={messages as any}
                                toggleReaction={toggleReaction}
                                editMessage={editMessage}
                                mentionItems={mentionItems}
                                onAddMembers={() => {
                                    setMembersSidebarOpen(false);
                                    setSettingsSidebarOpen(false);
                                }}
                            />
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
                                            <Skeleton className="h-6 w-20 rounded-md" />
                                            <Skeleton className="h-8 w-14 rounded-md" />
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
