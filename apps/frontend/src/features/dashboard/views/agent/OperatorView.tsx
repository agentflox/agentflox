"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessageList,
  RenderedMessage,
  MessageFollowup,
  MessageAction,
} from '@/entities/chats/components/MessageList';
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { AgentChatEmptyState } from '@/entities/chats/components/AgentChatEmptyState';
import { trpc } from '@/lib/trpc';
import { agentService } from '@/services/agent.service';
import { toast } from 'sonner';
import { MessageRole } from '@agentflox/database/src/generated/prisma/client';
import { AgentProfile } from '@/entities/agents/components/AgentProfile';
import { StreamingMessage } from '@/entities/agents/components/StreamingMessage';
import { useOperatorStream } from '@/entities/agents/hooks/useOperatorStream';
import { AgentChatSkeleton } from '@/entities/agents/components/AgentChatSkeleton';
import type { QuickAction, AgentDraft, UserContext, ConversationState } from '@/entities/agents/types';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';
import { Button } from '@/components/ui/button';
import { CircleUser } from 'lucide-react';

interface OperatorViewProps {
  agentId?: string;
  agent?: any;
  /** When true (default), allow showing/hiding the agent profile side panel. */
  showProfileToggle?: boolean;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  agentId,
  agent,
  showProfileToggle = true,
}) => {
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [followupsMap, setFollowupsMap] = useState<Map<string, MessageFollowup[]>>(new Map());
  const [agentDraft, setAgentDraft] = useState<AgentDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const resolvedAgentId = agentId ?? agent?.id;
  const optimisticMessageIds = useRef<Set<string>>(new Set());

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 }
  );

  const { data: agentData, isLoading: isLoadingAgent, refetch: refetchAgent } = trpc.agent.get.useQuery(
    { id: resolvedAgentId!, conversationType: 'AGENT_OPERATOR' },
    { enabled: !!resolvedAgentId, initialData: agent }
  );

  const updateAgentModelMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      if (resolvedAgentId) void refetchAgent();
    },
    onError: (err) => toast.error(err.message || 'Failed to update agent model'),
  });

  const agentModelId =
    (agentData as any)?.modelId ??
    (agentData as any)?.aiModel?.id ??
    null;

  const buildDbMessages = useCallback((allMessages: any[]): RenderedMessage[] =>
    allMessages.map((msg, index) => {
      const followupsFromMetadata = (msg as any).followups;
      let followups: MessageFollowup[] | undefined;
      if (msg.role === 'ASSISTANT') {
        const metadata = (msg as any).metadata || {};
        const followupsConsumed = metadata.followupsConsumed === true;
        const hasUserMessageAfter = allMessages.slice(index + 1).some(m => m.role === 'USER');
        if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
          followups = followupsFromMetadata;
        }
      }
      return { id: msg.id, role: msg.role as MessageRole, content: msg.content, createdAt: msg.createdAt, followups };
    }), []);

  const handleMessageComplete = useCallback(async (data: any) => {
    if (data?.conversationState) setConversationState(data.conversationState);
    if (data?.agentDraft) setAgentDraft(data.agentDraft);

    if (resolvedAgentId) await refetchAgent();
    const result = await refetchMessages();

    if (result.data?.messages) {
      optimisticMessageIds.current.clear();
      const dbMessages = buildDbMessages(result.data.messages);

      // Batch: clear sending + show DB messages in one paint (zero blank gap)
      isSendingRef.current = false;
      setIsSending(false);
      setMessages(dbMessages);

      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach(msg => {
        if (msg.followups) newFollowupsMap.set(msg.id, msg.followups);
      });
      setFollowupsMap(newFollowupsMap);

      if (data?.followups?.length) {
        const assistantMessages = result.data.messages.filter(m => m.role === 'ASSISTANT');
        const latestAssistant = assistantMessages[assistantMessages.length - 1];
        if (latestAssistant) {
          const metadata = (latestAssistant as any).metadata || {};
          if (!metadata.followupsConsumed) {
            setFollowupsMap(prev => {
              const m = new Map(prev);
              m.set(latestAssistant.id, data.followups);
              return m;
            });
            setMessages(prev =>
              prev.map(msg => (msg.id === latestAssistant.id ? { ...msg, followups: data.followups } : msg))
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
  }, [resolvedAgentId, refetchAgent, refetchMessages, buildDbMessages, agentData, showAgentProfile]);

  const handleMessageError = useCallback((errorMessage: string) => {
    isSendingRef.current = false;
    setIsSending(false);
    setMessages(prev => prev.filter(msg => !optimisticMessageIds.current.has(msg.id)));
    optimisticMessageIds.current.clear();
    toast.error(errorMessage || 'Failed to process message');
    setMessages(prev => [...prev, {
      id: `error_${Date.now()}`,
      role: 'ASSISTANT' as MessageRole,
      content: `Error: ${errorMessage}. Please try again.`,
      createdAt: new Date(),
    }]);
  }, []);

  // SSE streaming hook
  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useOperatorStream({
    onComplete: handleMessageComplete,
    onError: handleMessageError,
  });

  const [isInitializingBuilder, setIsInitializingBuilder] = useState(false);
  // Prevent duplicate initialize calls (reset on failure so remount/retry can proceed)
  const hasInitialized = useRef(false);
  const initializeBuilder = async (params: { agentId: string; conversationId?: string; skipWelcome?: boolean }) => {
    try {
      setIsInitializingBuilder(true);
      const res = await agentService.agents.operator.initialize(params);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.userMessage || error.message || error.error || 'Failed to initialize conversation');
      }
      const data = await res.json();

      setConversationId(data.conversationId);
      setConversationState(data.conversationState);
      setUserContext(data.userContext);
      setAgentDraft(data.conversationState?.agentDraft);

      if (resolvedAgentId) {
        await refetchAgent();
      }

      const result = await refetchMessages();

      if (result.data?.messages) {
        const followupsMapFromDB = new Map<string, MessageFollowup[]>();
        result.data.messages.forEach(msg => {
          const f = (msg as any).followups;
          if (f && Array.isArray(f)) followupsMapFromDB.set(msg.id, f);
        });

        if (data.followups?.length) {
          const assistantMessages = result.data.messages.filter(m => m.role === 'ASSISTANT');
          const latestAssistant = assistantMessages[assistantMessages.length - 1];
          if (latestAssistant) followupsMapFromDB.set(latestAssistant.id, data.followups);
        }

        setFollowupsMap(followupsMapFromDB);
      }

      setIsInitializing(false);
    } catch (error: any) {
      hasInitialized.current = false;
      toast.error(error.message || 'Failed to initialize conversation');
      setIsInitializing(false);
    } finally {
      setIsInitializingBuilder(false);
    }
  };


  const [isLaunching, setIsLaunching] = useState(false);
  const launchBuilder = async (params: { conversationId: string; agentId: string }) => {
    try {
      setIsLaunching(true);
      const res = await agentService.agents.builder.launch(params);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.userMessage || error.message || error.error || 'Failed to launch agent');
      }
      await res.json();

      toast.success('Agent launched successfully!');

      if (resolvedAgentId) {
        await refetchAgent();
      }

      setShowAgentProfile(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch agent');
    } finally {
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    if (messagesData?.messages && conversationId && !isSendingRef.current) {
      const dbMessages = buildDbMessages(messagesData.messages);
      if (dbMessages.length > 0) {
        setMessages(dbMessages);
        optimisticMessageIds.current.clear();
        const newFollowupsMap = new Map<string, MessageFollowup[]>();
        dbMessages.forEach(msg => { if (msg.followups) newFollowupsMap.set(msg.id, msg.followups); });
        setFollowupsMap(newFollowupsMap);
      }
    }
  }, [messagesData, conversationId, buildDbMessages]);

  useEffect(() => {
    if (agentData && agentData.status === 'ACTIVE' && agentData.isActive && !showAgentProfile) {
      setShowAgentProfile(true);
    }
  }, [agentData, showAgentProfile]);

  useEffect(() => {
    if (conversationId || isInitializingBuilder || hasInitialized.current) return;
    if (resolvedAgentId) {
      if (isLoadingAgent) return;
      hasInitialized.current = true;
      initializeBuilder({ agentId: resolvedAgentId });
    } else {
      console.log('[OperatorView] No agent ID available, skipping initialization');
      setIsInitializing(false);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgentId, isLoadingAgent, conversationId]);

  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();

  const handleSendMessage = useCallback(async (message: string, options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }>; mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }> }) => {
    if (!message.trim() || isSending || !conversationId || !resolvedAgentId) return;

    const optimisticId = `optimistic_${Date.now()}`;
    optimisticMessageIds.current.add(optimisticId);
    isSendingRef.current = true;
    setMessages(prev => [
      ...prev.map(msg => ({ ...msg, followups: undefined })),
      { id: optimisticId, role: 'USER' as MessageRole, content: message, createdAt: new Date() }
    ]);
    setFollowupsMap(new Map());
    setIsSending(true);

    const consumePromises = messages
      .filter(msg => msg.role === 'ASSISTANT')
      .map(msg => markFollowupsConsumedMutation.mutateAsync({ messageId: msg.id }).catch(err => {
        console.error('Failed to mark follow-ups as consumed:', err);
      }));

    Promise.all(consumePromises).catch(() => { });

    await sendStreamMessage({ agentId: resolvedAgentId, conversationId, message, contexts: options?.contexts, mentions: options?.mentions, attachments: options?.attachments });
  }, [sendStreamMessage, conversationId, resolvedAgentId, isSending, messages, markFollowupsConsumedMutation]);

  const handleFollowupClick = useCallback(async (messageId: string, followup: MessageFollowup) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, followups: undefined } : msg));
    setFollowupsMap(prev => { const m = new Map(prev); m.delete(messageId); return m; });
    try { await markFollowupsConsumedMutation.mutateAsync({ messageId }); } catch (e) { /* ignore */ }
    handleSendMessage(followup.label);
  }, [handleSendMessage, markFollowupsConsumedMutation]);

  const handleActionClick = useCallback((messageId: string, action: MessageAction) => {
    if (action.id === 'launch-agent' && agentDraft?.status === 'ready' && conversationId && resolvedAgentId) {
      launchBuilder({ conversationId, agentId: resolvedAgentId });
      return;
    }
    if (action.label) handleSendMessage(action.label);
  }, [handleSendMessage, conversationId, agentDraft, resolvedAgentId]);

  if (isInitializing) {
    return <AgentChatSkeleton />;
  }

  const messagesWithFollowups = messages.map(msg => ({
    ...msg,
    followups: msg.followups || followupsMap.get(msg.id),
  }));

  const profileOpen = showAgentProfile && !!agentData;

  return (
    <div className="flex h-full w-full min-h-0">
      <ResizableSplitLayout
        mainPanelDefaultSize={60}
        mainPanelMinSize={50}
        sidePanelDefaultSize={40}
        sidePanelMinSize={40}
        MainContent={
          <div className="flex flex-col h-full min-h-0 w-full bg-white">
            {showProfileToggle && !profileOpen && agentData && (
              <div className="flex-none flex items-center justify-end px-4 py-2 border-b border-zinc-100 bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAgentProfile(true)}
                  className="h-8 gap-1.5 px-2.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                >
                  <CircleUser className="h-4 w-4" />
                  <span className="text-sm font-medium">Show profile</span>
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-hidden relative min-h-0">
              <ChatMessageList
                messages={messagesWithFollowups}
                label="Agentflox Agent Operator"
                pendingAssistantMessage={
                  isSending ? (
                    <StreamingMessage
                      thinkingSteps={thinkingSteps}
                      currentStep={thinkingStep}
                      currentNode={thinkingNode}
                      streamingContent={streamingContent}
                      isStreaming={isStreaming}
                      label="Agentflox Agent Operator"
                    />
                  ) : null
                }
                onFollowupClick={handleFollowupClick}
                onActionClick={handleActionClick}
                emptyState={
                  <AgentChatEmptyState
                    agentName={agentData?.name || agentDraft?.name || 'Agent'}
                    agentAvatar={agentData?.avatar || agentDraft?.avatar}
                    type="operator"
                  />
                }
              />
            </div>
            <div className="border-t bg-white px-4 py-3">
              <ChatComposer
                onSend={handleSendMessage}
                isSending={isSending}
                disabled={isSending || !conversationId}
                hideModelSelect
                modelId={agentModelId}
                onModelChange={(id) => {
                  if (!resolvedAgentId) return;
                  updateAgentModelMutation.mutate({ id: resolvedAgentId, modelId: id });
                }}
              />
            </div>
          </div>
        }
        SidePanelContent={
          profileOpen ? (
            <div className="h-full border-l bg-gradient-to-b from-background to-muted/20 overflow-hidden">
              <AgentProfile
                agent={{
                  id: agentData.id,
                  name: agentData.name || agentDraft?.name || 'Unnamed Agent',
                  description: agentData.description ?? agentDraft?.description ?? null,
                  avatar: agentData.avatar ?? agentDraft?.avatar ?? null,
                  status: (agentData.status === 'ACTIVE' ? 'ACTIVE' : agentData.status === 'DRAFT' ? 'DRAFT' : agentData.status === 'BUILDING' ? 'BUILDING' : agentData.status === 'RECONFIGURING' ? 'RECONFIGURING' : agentData.status === 'EXECUTING' ? 'EXECUTING' : 'INACTIVE') as "ACTIVE" | "DRAFT" | "INACTIVE" | "BUILDING" | "RECONFIGURING" | "EXECUTING",
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
                    id: t.id, triggerType: t.triggerType, triggerConfig: t.triggerConfig as any,
                    name: t.name, description: t.description, isActive: t.isActive, priority: t.priority, tags: t.tags,
                  })),
                  tools: ((agentData as any).tools || []).map((t: any) => ({
                    id: t.id, name: t.name, description: t.description,
                    category: t.category, toolType: t.toolType, isActive: t.isActive,
                  })),
                  schedules: ((agentData as any).schedules || []).map((s: any) => ({
                    id: s.id, name: s.name, description: s.description, repeatTime: s.repeatTime,
                    startTime: s.startTime, endTime: s.endTime, timezone: s.timezone,
                    instructions: s.instructions, isActive: s.isActive, priority: s.priority,
                  })),
                }}
                conversationType="AGENT_OPERATOR"
                isReconfiguring={agentData.status === 'RECONFIGURING' || (agentData.status === 'ACTIVE' && conversationState?.stage !== undefined && ['review', 'testing'].includes(conversationState.stage))}
                onEdit={() => toast.info('Edit agent configuration...')}
                onConfigure={() => setShowAgentProfile(false)}
              />
            </div>
          ) : null
        }
        isPanelOpen={profileOpen}
      />
    </div>
  );
};
