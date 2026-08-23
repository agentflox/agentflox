"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ChatMessageList,
  RenderedMessage,
  MessageFollowup,
  MessageAction,
} from '@/entities/chats/components/MessageList';
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { ConversationList } from '@/entities/chats/components/ConversationList';
import { AgentChatEmptyState } from '@/entities/chats/components/AgentChatEmptyState';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MessageRole } from '@agentflox/database/src/generated/prisma/client';
import { AgentProfile } from '@/entities/agents/components/AgentProfile';
import { StreamingMessage } from '@/entities/agents/components/StreamingMessage';
import { useExecutorStream } from '@/entities/agents/hooks/useExecutorStream';
import type { AgentDraft, ConversationState } from '@/entities/agents/types';
import { useDefaultModel } from '@/entities/models/hooks/useModels';
import { formatModelErrorMessage } from '@/entities/models/utils/formatModelError';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingContainer } from '@/components/ui/loading';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  ChevronsLeft,
  ChevronsRight,
  X,
  MoreHorizontal,
  MessageSquare,
  FileText,
  CircleUser,
} from 'lucide-react';
import { ArtifactViewer, coerceArtifacts, type ExecutionArtifact } from '@/features/artifacts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatViewProps {
  agentId?: string;
  agent?: any;
  conversationType?: 'AGENT_EXECUTOR' | 'AGENT_OPERATOR' | 'AGENT_BUILDER';
  chatId?: string | null;
  onChatIdChange?: (chatId: string | null) => void;
  /** When true (default), show a button to toggle the agent profile side panel. */
  showProfileToggle?: boolean;
  presentation?: 'split' | 'tabs';
}

const STORAGE_KEY_PREFIX = 'agentflox_active_agent_chat_';

export const ChatView: React.FC<ChatViewProps> = ({
  agentId,
  agent,
  conversationType = 'AGENT_EXECUTOR',
  chatId: controlledChatId,
  onChatIdChange,
  showProfileToggle = true,
  presentation = 'split',
}) => {
  const resolvedAgentId = agentId ?? agent?.id;
  const storageKey = resolvedAgentId
    ? `${STORAGE_KEY_PREFIX}${conversationType}_${resolvedAgentId}`
    : '';

  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [internalActiveConversationId, setInternalActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && resolvedAgentId) {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}${conversationType}_${resolvedAgentId}`) || null;
    }
    return null;
  });

  const onChatIdChangeRef = useRef(onChatIdChange);
  useEffect(() => {
    onChatIdChangeRef.current = onChatIdChange;
  }, [onChatIdChange]);

  const activeConversationId =
    controlledChatId !== undefined ? controlledChatId : internalActiveConversationId;

  const setActiveConversationId = useCallback((id: string | null) => {
    setInternalActiveConversationId(id);
    onChatIdChangeRef.current?.(id);
  }, []);

  const listQueryInput = useMemo(
    () => ({ agentId: resolvedAgentId!, conversationType }),
    [resolvedAgentId, conversationType]
  );
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [followupsMap, setFollowupsMap] = useState<Map<string, MessageFollowup[]>>(new Map());
  const [agentDraft, setAgentDraft] = useState<AgentDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [showAgentProfile, setShowAgentProfile] = useState(true);
  const optimisticMessageIds = useRef<Set<string>>(new Set());
  const [chatPaneTab, setChatPaneTab] = useState<'chat' | 'log'>('chat');
  const [activeArtifact, setActiveArtifact] = useState<ExecutionArtifact | null>(null);

  // Sidebar UI state (mirrors AIChatView)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const hasAutoCreated = useRef(false);

  const utils = trpc.useUtils();

  // Sync internal ID to URL on mount when URL has no chat but we have a stored one
  useEffect(() => {
    if (controlledChatId === undefined && internalActiveConversationId) {
      onChatIdChangeRef.current?.(internalActiveConversationId);
    }
  }, [controlledChatId, internalActiveConversationId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeConversationId && resolvedAgentId) {
      localStorage.setItem(storageKey, activeConversationId);
    } else if (!activeConversationId && resolvedAgentId) {
      localStorage.removeItem(storageKey);
    }
  }, [activeConversationId, storageKey, resolvedAgentId]);

  // Clear local message state when switching chats
  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevActiveIdRef.current !== activeConversationId) {
      prevActiveIdRef.current = activeConversationId;
      setMessages([]);
      setFollowupsMap(new Map());
      setConversationState(null);
      isSendingRef.current = false;
      setIsSending(false);
      optimisticMessageIds.current.clear();
    }
  }, [activeConversationId]);

  const { data: conversations = [], isLoading: isLoadingConversations } =
    trpc.chat.listAgentConversations.useQuery(listQueryInput, {
      enabled: !!resolvedAgentId,
    });

  const createConversationMutation = trpc.chat.createAgentConversation.useMutation();
  const renameMutation = trpc.chat.rename.useMutation();
  const deleteMutation = trpc.chat.delete.useMutation();
  const archiveMutation = trpc.chat.archive.useMutation();
  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();

  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } =
    trpc.chat.getMessages.useQuery(
      { conversationId: activeConversationId! },
      {
        enabled: !!activeConversationId,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  const { data: agentData, refetch: refetchAgent } = trpc.agent.get.useQuery(
    { id: resolvedAgentId!, conversationType },
    { enabled: !!resolvedAgentId, initialData: agent }
  );

  const updateAgentModelMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      if (resolvedAgentId) void refetchAgent();
    },
    onError: (err) => toast.error(err.message || 'Failed to update agent model'),
  });

  const { data: defaultModel } = useDefaultModel();
  // Dropdown selection is sent per-message; display falls back agent → platform default
  const agentModelId =
    (agentData as any)?.modelId ??
    (agentData as any)?.aiModel?.id ??
    defaultModel?.id ??
    null;

  const buildDbMessages = useCallback((allMessages: any[]): RenderedMessage[] =>
    allMessages.map((msg, index) => {
      const followupsFromMetadata = (msg as any).followups;
      let followups: MessageFollowup[] | undefined;
      const metadata = (msg as any).metadata || (msg as any).meta || {};
      if (msg.role === 'ASSISTANT') {
        const followupsConsumed = metadata.followupsConsumed === true;
        const hasUserMessageAfter = allMessages.slice(index + 1).some((m: any) => m.role === 'USER');
        if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
          followups = followupsFromMetadata;
        }
      }
      const artifacts =
        msg.role === 'ASSISTANT'
          ? coerceArtifacts(metadata.artifacts)
          : undefined;
      return {
        id: msg.id,
        role: msg.role as MessageRole,
        content: msg.content,
        createdAt: msg.createdAt,
        followups,
        ...(artifacts?.length ? { artifacts } : {}),
      };
    }), []);

  const handleMessageComplete = useCallback(async (data: any) => {
    if (data?.conversationState) setConversationState(data.conversationState);
    if (data?.agentDraft) setAgentDraft(data.agentDraft);

    if (resolvedAgentId) {
      await refetchAgent();
      await utils.chat.listAgentConversations.invalidate(listQueryInput);
    }
    const result = await refetchMessages();
    if (result.data?.messages) {
      optimisticMessageIds.current.clear();
      const dbMessages = buildDbMessages(result.data.messages);
      isSendingRef.current = false;
      setIsSending(false);
      setMessages(dbMessages);

      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach((msg) => {
        if (msg.followups) newFollowupsMap.set(msg.id, msg.followups);
      });
      setFollowupsMap(newFollowupsMap);

      if (data?.followups?.length) {
        const assistantMessages = result.data.messages.filter((m: any) => m.role === 'ASSISTANT');
        const latestAssistant = assistantMessages[assistantMessages.length - 1];
        if (latestAssistant) {
          const metadata = (latestAssistant as any).metadata || {};
          if (!metadata.followupsConsumed) {
            setFollowupsMap((prev) => {
              const m = new Map(prev);
              m.set(latestAssistant.id, data.followups);
              return m;
            });
            setMessages((prev) =>
              prev.map((msg) => (msg.id === latestAssistant.id ? { ...msg, followups: data.followups } : msg))
            );
          }
        }
      }
    } else {
      isSendingRef.current = false;
      setIsSending(false);
    }

    const isReady = data?.agentDraft?.status === 'ready';
    const isActive = agentData?.status === 'ACTIVE' && agentData?.isActive;
    if ((isReady || isActive) && !showAgentProfile) {
      setTimeout(() => setShowAgentProfile(true), 500);
    }
  }, [resolvedAgentId, refetchAgent, refetchMessages, buildDbMessages, agentData, showAgentProfile, utils, listQueryInput]);

  const handleMessageError = useCallback((errorMessage: string) => {
    isSendingRef.current = false;
    setIsSending(false);
    setMessages((prev) => prev.filter((msg) => !optimisticMessageIds.current.has(msg.id)));
    optimisticMessageIds.current.clear();
    const friendly = formatModelErrorMessage(errorMessage, 'Failed to process message');
    toast.error(friendly);
    setMessages((prev) => [...prev, {
      id: `error_${Date.now()}`,
      role: 'ASSISTANT' as MessageRole,
      content: `Error: ${friendly}`,
      createdAt: new Date(),
    }]);
  }, []);

  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useExecutorStream({
    onComplete: handleMessageComplete,
    onError: handleMessageError,
  });

  // Sync messages from DB when conversation changes / refetches
  useEffect(() => {
    if (messagesData?.messages && activeConversationId && !isSendingRef.current) {
      const dbMessages = buildDbMessages(messagesData.messages);
      setMessages(dbMessages);
      optimisticMessageIds.current.clear();
      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach((msg) => {
        if (msg.followups) newFollowupsMap.set(msg.id, msg.followups);
      });
      setFollowupsMap(newFollowupsMap);
    } else if (!activeConversationId) {
      setMessages([]);
      setFollowupsMap(new Map());
    }
  }, [messagesData, activeConversationId, buildDbMessages]);

  useEffect(() => {
    if (agentData && agentData.status === 'ACTIVE' && agentData.isActive && !showAgentProfile) {
      setShowAgentProfile(true);
    }
  }, [agentData, showAgentProfile]);

  // Prefer URL chatId if valid; otherwise first non-archived conversation
  useEffect(() => {
    if (isLoadingConversations || conversations.length === 0) return;

    const activeList = showArchived
      ? conversations
      : conversations.filter((c) => !(c as any).isArchived);
    const pool = activeList.length > 0 ? activeList : conversations;

    if (activeConversationId) {
      const exists = conversations.some((c) => c.id === activeConversationId);
      if (exists) return;
      // URL/stored id is gone — fall back to first
      setActiveConversationId(pool[0]?.id ?? null);
      return;
    }

    const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    const preferred = stored && pool.find((c) => c.id === stored);
    setActiveConversationId(preferred ? preferred.id : pool[0].id);
  }, [
    activeConversationId,
    conversations,
    storageKey,
    isLoadingConversations,
    showArchived,
    setActiveConversationId,
  ]);

  // Auto-create first empty conversation when none exist
  useEffect(() => {
    if (
      !resolvedAgentId ||
      isLoadingConversations ||
      createConversationMutation.isPending ||
      conversations.length > 0 ||
      hasAutoCreated.current
    ) {
      return;
    }
    hasAutoCreated.current = true;
    createConversationMutation
      .mutateAsync({
        agentId: resolvedAgentId,
        conversationType,
        title: 'Untitled chat',
      })
      .then((conversation) => {
        utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
          old ? [conversation as any, ...old] : [conversation as any]
        );
        setActiveConversationId(conversation.id);
      })
      .catch(() => {
        hasAutoCreated.current = false;
        toast.error('Failed to create conversation');
      });
  }, [
    resolvedAgentId,
    conversationType,
    listQueryInput,
    isLoadingConversations,
    conversations.length,
    createConversationMutation,
    utils,
    setActiveConversationId,
  ]);

  const filteredConversations = useMemo(() => {
    const base = showArchived
      ? conversations
      : conversations.filter((c) => !(c as any).isArchived);
    if (!debouncedQuery) return base;
    return base.filter((c) =>
      (c.title?.toLowerCase() ?? '').includes(debouncedQuery.toLowerCase())
    );
  }, [conversations, debouncedQuery, showArchived]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const selectNextConversation = useCallback(
    (removedId: string) => {
      const remaining = conversations.filter(
        (c) => c.id !== removedId && (showArchived || !(c as any).isArchived)
      );
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    },
    [conversations, showArchived, setActiveConversationId]
  );

  const handleCreateConversation = useCallback(async () => {
    if (!resolvedAgentId) return;
    try {
      const conversation = await createConversationMutation.mutateAsync({
        agentId: resolvedAgentId,
        conversationType,
        title: 'Untitled chat',
      });
      utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
        old ? [conversation as any, ...old] : [conversation as any]
      );
      setActiveConversationId(conversation.id);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create chat');
    }
  }, [
    resolvedAgentId,
    conversationType,
    listQueryInput,
    createConversationMutation,
    utils,
    setActiveConversationId,
  ]);

  const handleRename = useCallback(async (title: string) => {
    if (!activeConversationId || !resolvedAgentId) return;
    await renameMutation.mutateAsync({ conversationId: activeConversationId, title });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [activeConversationId, resolvedAgentId, renameMutation, utils, listQueryInput]);

  const handleDelete = useCallback(async () => {
    if (!activeConversationId || !resolvedAgentId) return;
    const deletedId = activeConversationId;
    utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
      old?.filter((c) => c.id !== deletedId) ?? []
    );
    selectNextConversation(deletedId);
    await deleteMutation.mutateAsync({ conversationId: deletedId });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [
    activeConversationId,
    resolvedAgentId,
    deleteMutation,
    utils,
    listQueryInput,
    selectNextConversation,
  ]);

  const handleArchive = useCallback(async () => {
    if (!activeConversationId || !resolvedAgentId) return;
    const archivedId = activeConversationId;
    utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
      old?.filter((c) => c.id !== archivedId) ?? []
    );
    selectNextConversation(archivedId);
    await archiveMutation.mutateAsync({ conversationId: archivedId, archived: true });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [
    activeConversationId,
    resolvedAgentId,
    archiveMutation,
    utils,
    listQueryInput,
    selectNextConversation,
  ]);

  const handleShare = useCallback(() => {
    if (!activeConversationId) return;
    const params = new URLSearchParams(window.location.search);
    params.set('chat', activeConversationId);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success('Chat link copied');
  }, [activeConversationId]);

  const handleConversationRename = useCallback(async (conversationId: string, title: string) => {
    if (!resolvedAgentId) return;
    await renameMutation.mutateAsync({ conversationId, title });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [resolvedAgentId, renameMutation, utils, listQueryInput]);

  const handleConversationDelete = useCallback(async (conversationId: string) => {
    if (!resolvedAgentId) return;
    utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
      old?.filter((c) => c.id !== conversationId) ?? []
    );
    if (activeConversationId === conversationId) {
      selectNextConversation(conversationId);
    }
    await deleteMutation.mutateAsync({ conversationId });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [
    resolvedAgentId,
    deleteMutation,
    activeConversationId,
    utils,
    listQueryInput,
    selectNextConversation,
  ]);

  const handleConversationArchive = useCallback(async (conversationId: string) => {
    if (!resolvedAgentId) return;
    utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
      old?.filter((c) => c.id !== conversationId) ?? []
    );
    if (activeConversationId === conversationId) {
      selectNextConversation(conversationId);
    }
    await archiveMutation.mutateAsync({ conversationId, archived: true });
    await utils.chat.listAgentConversations.invalidate(listQueryInput);
  }, [
    resolvedAgentId,
    archiveMutation,
    activeConversationId,
    utils,
    listQueryInput,
    selectNextConversation,
  ]);

  const handleConversationShare = useCallback((conversationId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('chat', conversationId);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success('Chat link copied');
  }, []);

  const handleSendMessage = useCallback(async (
    message: string,
    options?: {
      attachments?: any[];
      webSearch?: boolean;
      contexts?: Array<{ type: string; id: string }>;
      mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }>;
      modelId?: string;
    }
  ) => {
    if (!message.trim() || isSending || !resolvedAgentId) return;

    let conversationId: string;
    if (activeConversationId) {
      conversationId = activeConversationId;
    } else {
      const conversation = await createConversationMutation.mutateAsync({
        agentId: resolvedAgentId,
        conversationType,
        title: 'Untitled chat',
      });
      conversationId = conversation.id;
      setActiveConversationId(conversation.id);
      utils.chat.listAgentConversations.setData(listQueryInput, (old) =>
        old ? [conversation as any, ...old] : [conversation as any]
      );
    }

    const optimisticId = `optimistic_${Date.now()}`;
    optimisticMessageIds.current.add(optimisticId);
    isSendingRef.current = true;
    setMessages((prev) => [
      ...prev.map((msg) => ({ ...msg, followups: undefined })),
      { id: optimisticId, role: 'USER' as MessageRole, content: message, createdAt: new Date() },
    ]);
    setFollowupsMap(new Map());
    setIsSending(true);

    const consumePromises = messages
      .filter((msg) => msg.role === 'ASSISTANT')
      .map((msg) =>
        markFollowupsConsumedMutation.mutateAsync({ messageId: msg.id }).catch((err) => {
          console.error('Failed to mark follow-ups as consumed:', err);
        })
      );
    Promise.all(consumePromises).catch(() => {});

    await sendStreamMessage({
      agentId: resolvedAgentId,
      conversationId,
      message,
      modelId: options?.modelId ?? agentModelId,
      contexts: options?.contexts,
      mentions: options?.mentions,
      attachments: options?.attachments,
    });
  }, [
    sendStreamMessage,
    activeConversationId,
    resolvedAgentId,
    conversationType,
    listQueryInput,
    isSending,
    messages,
    markFollowupsConsumedMutation,
    createConversationMutation,
    utils,
    setActiveConversationId,
    agentModelId,
  ]);

  const handleFollowupClick = useCallback(async (messageId: string, followup: MessageFollowup) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, followups: undefined } : msg)));
    setFollowupsMap((prev) => {
      const m = new Map(prev);
      m.delete(messageId);
      return m;
    });
    try {
      await markFollowupsConsumedMutation.mutateAsync({ messageId });
    } catch {
      /* ignore */
    }
    handleSendMessage(followup.label);
  }, [handleSendMessage, markFollowupsConsumedMutation]);

  const handleActionClick = useCallback((_messageId: string, action: MessageAction) => {
    if (action.label) handleSendMessage(action.label);
  }, [handleSendMessage]);

  if (!resolvedAgentId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select an agent to start chatting.
      </div>
    );
  }

  const messagesWithFollowups = messages.map((msg) => ({
    ...msg,
    followups: msg.followups || followupsMap.get(msg.id),
  }));

  // Clear viewer when conversation changes
  useEffect(() => {
    setActiveArtifact(null);
  }, [activeConversationId]);

  const showMessageSkeleton = !!activeConversationId && isLoadingMessages && !isSending && messages.length === 0;
  const isTabs = presentation === 'tabs';

  return (
    <div className="flex h-full w-full min-h-0 gap-0 bg-background transition-all">
      {/* Conversation sidebar — same pattern as AIChatView */}
      {!isTabs && (
      <aside
        className={cn(
          'shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden',
          isSidebarCollapsed ? 'w-0 border-none' : 'w-[256px] border-x border-slate-200'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {!isSidebarCollapsed && (
            <div className="flex flex-col justify-center border-b border-slate-200 h-[57px] shrink-0">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 px-3 h-full animate-in fade-in slide-in-from-top-2 duration-200">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    autoFocus
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/70"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded-full hover:bg-slate-100"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 h-full">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Agent Chats</h2>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {agentData?.name || 'Executor'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => handleCreateConversation()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Chat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setShowArchived((prev) => !prev);
                            }}
                            className="flex items-center justify-between"
                          >
                            <span className="flex-1">{showArchived ? 'Hide archived' : 'Show archived'}</span>
                            <Switch
                              checked={showArchived}
                              onCheckedChange={setShowArchived}
                              onClick={(e) => e.stopPropagation()}
                              className="ml-2 scale-90"
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsSearchOpen(true)}
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
                            onClick={() => handleCreateConversation()}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={createConversationMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Chat</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-hidden min-h-0">
            {isLoadingConversations ? (
              <LoadingContainer label="Loading chats..." spinnerSize="md" padding="md" />
            ) : (
              <ConversationList
                conversations={filteredConversations as any}
                activeConversationId={activeConversationId}
                onSelect={(id) => {
                  if (id === activeConversationId) return;
                  setActiveConversationId(id);
                }}
                onCreate={handleCreateConversation}
                isCreating={createConversationMutation.isPending}
                onRename={handleConversationRename}
                onDelete={handleConversationDelete}
                onArchive={handleConversationArchive}
                onShare={handleConversationShare}
                variant="clean"
                hideHeader={true}
              />
            )}
          </div>
        </div>
      </aside>
      )}

      <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
        {!isTabs && isSidebarCollapsed && (
          <div className="absolute left-0 top-3 z-30">
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

        <ResizableSplitLayout
          mainPanelDefaultSize={60}
          mainPanelMinSize={50}
          sidePanelDefaultSize={40}
          sidePanelMinSize={40}
          MainContent={
            <div className="flex flex-col h-full bg-white min-h-0">
              {showMessageSkeleton ? (
                <div className="flex flex-col h-full bg-[#f8fafc]">
                  <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-28 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden px-6 py-6 space-y-6">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 max-w-[70%]">
                        <Skeleton className="h-3 w-16 rounded-md" />
                        <Skeleton className="h-3.5 w-[340px] rounded-md" />
                        <Skeleton className="h-3.5 w-[280px] rounded-md" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="space-y-1.5 items-end flex flex-col max-w-[60%]">
                        <Skeleton className="h-3 w-12 rounded-md" />
                        <Skeleton className="h-10 w-[220px] rounded-xl" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    </div>
                  </div>
                  <div className="border-t border-slate-200/60 bg-white px-4 py-3">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <Skeleton className="h-4 flex-1 rounded-md" />
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-none flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-200 bg-white">
                    <div className="flex items-center gap-0.5">
                      {([
                        { id: 'chat' as const, label: 'Chat', Icon: MessageSquare },
                        { id: 'log' as const, label: 'Log', Icon: FileText },
                      ]).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setChatPaneTab(id)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                            chatPaneTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                    {showProfileToggle && !isTabs && !showAgentProfile && agentData && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowAgentProfile(true)}
                        className="h-8 gap-1.5 px-2.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                      >
                        <CircleUser className="h-4 w-4" />
                        <span className="text-sm font-medium">Show profile</span>
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden relative min-h-0 flex">
                    {chatPaneTab === 'log' ? (
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {messages.length === 0 ? (
                          <p className="text-sm text-zinc-400 text-center py-12">No execution log yet</p>
                        ) : (
                          messages.map((m) => (
                            <div key={m.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
                              <span className="font-bold uppercase text-zinc-500">{m.role}</span>
                              <pre className="mt-1 whitespace-pre-wrap text-[11px] text-zinc-600 max-h-32 overflow-auto">
                                {(m.content || '').slice(0, 1500)}
                              </pre>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <ChatMessageList
                        messages={messagesWithFollowups}
                        label="Agentflox Agent Executor"
                        pendingAssistantMessage={
                          isSending ? (
                            <StreamingMessage
                              thinkingSteps={thinkingSteps}
                              currentStep={thinkingStep}
                              currentNode={thinkingNode}
                              streamingContent={streamingContent}
                              isStreaming={isStreaming}
                              label="Agentflox Agent Executor"
                            />
                          ) : null
                        }
                        onFollowupClick={handleFollowupClick}
                        onActionClick={handleActionClick}
                        onArtifactOpen={(a) => setActiveArtifact(a)}
                        emptyState={
                          <AgentChatEmptyState
                            agentName={agentData?.name || agentDraft?.name || 'Agent'}
                            agentAvatar={agentData?.avatar || agentDraft?.avatar}
                            type="executor"
                          />
                        }
                      />
                    )}
                    {activeArtifact && (
                      <ArtifactViewer artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />
                    )}
                  </div>
                  {chatPaneTab === 'chat' && (
                  <div className="border-t bg-white px-4 py-3">
                    <ChatComposer
                      onSend={handleSendMessage}
                      isSending={isSending}
                      disabled={isSending || !activeConversationId}
                      modelId={agentModelId}
                      onModelChange={(id) => {
                        if (!resolvedAgentId) return;
                        updateAgentModelMutation.mutate({ id: resolvedAgentId, modelId: id });
                      }}
                    />
                  </div>
                  )}
                </>
              )}
            </div>
          }
          SidePanelContent={
            showAgentProfile && agentData ? (
            <div className="h-full border-l bg-gradient-to-b from-background to-muted/20 overflow-hidden">
              <AgentProfile
                  agent={{
                    id: agentData.id,
                    name: agentData.name || agentDraft?.name || 'Unnamed Agent',
                    description: agentData.description ?? agentDraft?.description ?? null,
                    avatar: agentData.avatar ?? agentDraft?.avatar ?? null,
                    status: (agentData.status === 'ACTIVE'
                      ? 'ACTIVE'
                      : agentData.status === 'DRAFT'
                        ? 'DRAFT'
                        : agentData.status === 'BUILDING'
                          ? 'BUILDING'
                          : agentData.status === 'RECONFIGURING'
                            ? 'RECONFIGURING'
                            : agentData.status === 'EXECUTING'
                              ? 'EXECUTING'
                              : 'INACTIVE') as
                      | 'ACTIVE'
                      | 'DRAFT'
                      | 'INACTIVE'
                      | 'BUILDING'
                      | 'RECONFIGURING'
                      | 'EXECUTING',
                    isActive: agentData.isActive ?? false,
                    modelId: (agentData as any).modelId ?? (agentData as any).aiModel?.id ?? null,
                    aiModel: (agentData as any).aiModel ?? null,
                    agentType: agentData.agentType ?? agentDraft?.agentType ?? null,
                    systemPrompt: agentData.systemPrompt ?? agentDraft?.systemPrompt ?? null,
                    capabilities: agentData.capabilities ?? agentDraft?.capabilities ?? null,
                    constraints: agentData.constraints ?? agentDraft?.constraints ?? null,
                    createdAt: agentData.createdAt ?? new Date(),
                    updatedAt: agentData.updatedAt ?? new Date(),
                    metadata: (agentData.metadata as any) ?? {},
                    viewerIsOwner: (agentData as any).viewerIsOwner === true,
                    ownerId: (agentData as any).ownerId,
                    triggers: ((agentData as any).triggers || []).map((t: any) => ({
                      id: t.id,
                      triggerType: t.triggerType,
                      triggerConfig: t.triggerConfig as any,
                      name: t.name,
                      description: t.description,
                      isActive: t.isActive,
                      priority: t.priority,
                      tags: t.tags,
                    })),
                    tools: ((agentData as any).tools || []).map((t: any) => ({
                      id: t.id,
                      name: t.name,
                      description: t.description,
                      category: t.category,
                      toolType: t.toolType,
                      isActive: t.isActive,
                    })),
                    schedules: ((agentData as any).schedules || []).map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      description: s.description,
                      repeatTime: s.repeatTime,
                      startTime: s.startTime,
                      endTime: s.endTime,
                      timezone: s.timezone,
                      instructions: s.instructions,
                      isActive: s.isActive,
                      priority: s.priority,
                    })),
                  }}
                  conversationType={conversationType}
                  isReconfiguring={
                    agentData.status === 'RECONFIGURING' ||
                    (agentData.status === 'ACTIVE' &&
                      conversationState?.stage !== undefined &&
                      ['review', 'testing'].includes(conversationState.stage))
                  }
                  onEdit={() => toast.info('Edit agent configuration...')}
                  onConfigure={() => setShowAgentProfile(false)}
                />
            </div>
            ) : null
          }
          isPanelOpen={!isTabs && showAgentProfile && !!agentData}
        />
      </div>
    </div>
  );
};
