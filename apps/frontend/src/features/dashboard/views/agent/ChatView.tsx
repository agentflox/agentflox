"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessageList,
  RenderedMessage,
  MessageFollowup,
  MessageAction,
} from '@/entities/chats/components/MessageList';
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MessageRole } from '@agentflox/database/src/generated/prisma/client';
import { AgentProfile } from '@/entities/agents/components/AgentProfile';
import { StreamingMessage } from '@/entities/agents/components/StreamingMessage';
import { useExecutorStream } from '@/entities/agents/hooks/useExecutorStream';
import { AgentChatSkeleton } from '@/entities/agents/components/AgentChatSkeleton';
import type { QuickAction, AgentDraft, UserContext, ConversationState } from '@/entities/agents/types';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';

interface ChatViewProps {
  agentId?: string;
  agent?: any;
}

export const ChatView: React.FC<ChatViewProps> = ({
  agentId,
  agent,
}) => {
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [followupsMap, setFollowupsMap] = useState<Map<string, MessageFollowup[]>>(new Map());
  const [agentDraft, setAgentDraft] = useState<AgentDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const resolvedAgentId = agentId ?? agent?.id;
  const optimisticMessageIds = useRef<Set<string>>(new Set());

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 }
  );

  const { data: agentData, isLoading: isLoadingAgent, refetch: refetchAgent } = trpc.agent.get.useQuery(
    { id: resolvedAgentId!, conversationType: 'AGENT_EXECUTOR' },
    { enabled: !!resolvedAgentId, initialData: agent }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Followup helpers (shared with original component)
  // ──────────────────────────────────────────────────────────────────────────
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

  // Complete callback — receives metadata from SSE `complete` event
  const handleMessageComplete = useCallback(async (data: any) => {
    setIsSending(false);
    if (data?.conversationState) setConversationState(data.conversationState);
    if (data?.agentDraft) setAgentDraft(data.agentDraft);

    if (resolvedAgentId) await refetchAgent();

    const result = await refetchMessages();
    if (result.data?.messages) {
      optimisticMessageIds.current.clear();
      const dbMessages = buildDbMessages(result.data.messages);
      setMessages(dbMessages);
      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach(msg => { if (msg.followups) newFollowupsMap.set(msg.id, msg.followups); });
      setFollowupsMap(newFollowupsMap);

      if (data?.followups?.length) {
        const assistantMessages = result.data.messages.filter(m => m.role === 'ASSISTANT');
        const latestAssistant = assistantMessages[assistantMessages.length - 1];
        if (latestAssistant) {
          const metadata = (latestAssistant as any).metadata || {};
          if (!metadata.followupsConsumed) {
            setFollowupsMap(prev => { const m = new Map(prev); m.set(latestAssistant.id, data.followups); return m; });
            setMessages(prev => prev.map(msg => msg.id === latestAssistant.id ? { ...msg, followups: data.followups } : msg));
          }
        }
      }
    }

    const isReady = data?.agentDraft?.status === 'ready';
    const isActive = agentData?.status === 'ACTIVE' && agentData?.isActive;
    if ((isReady || isActive) && !showAgentProfile) setTimeout(() => setShowAgentProfile(true), 500);
  }, [resolvedAgentId, refetchAgent, refetchMessages, buildDbMessages, agentData, showAgentProfile]);

  const handleMessageError = useCallback((errorMessage: string) => {
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
  } = useExecutorStream({
    onComplete: handleMessageComplete,
    onError: handleMessageError,
  });

  const initializeMutation = trpc.agent.executor.initialize.useMutation({
    onSuccess: async (data) => {
      setConversationId(data.conversationId);
      setConversationState(data.conversationState);
      setUserContext(data.userContext);
      setAgentDraft(data.conversationState.agentDraft);
      if (resolvedAgentId) await refetchAgent();
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
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to initialize conversation');
      setIsInitializing(false);
    },
  });

  const launchMutation = trpc.agent.operator.launch.useMutation({
    onSuccess: async () => {
      toast.success('Agent launched successfully!');
      if (resolvedAgentId) await refetchAgent();
      setShowAgentProfile(true);
    },
    onError: (error) => { toast.error(error.message || 'Failed to launch agent'); },
  });

  useEffect(() => {
    if (messagesData?.messages && conversationId && !isSending) {
      const dbMessages = buildDbMessages(messagesData.messages);
      if (dbMessages.length > 0) {
        setMessages(dbMessages);
        optimisticMessageIds.current.clear();
        const newFollowupsMap = new Map<string, MessageFollowup[]>();
        dbMessages.forEach(msg => { if (msg.followups) newFollowupsMap.set(msg.id, msg.followups); });
        setFollowupsMap(newFollowupsMap);
      }
    }
  }, [messagesData, conversationId, isSending, buildDbMessages]);

  useEffect(() => {
    if (agentData && agentData.status === 'ACTIVE' && agentData.isActive && !showAgentProfile) {
      setShowAgentProfile(true);
    }
  }, [agentData, showAgentProfile]);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (conversationId || initializeMutation.isPending || hasInitialized.current) return;
    if (resolvedAgentId) {
      if (isLoadingAgent) return;
      const storedConversationId = agentData?.conversations?.[0]?.id;
      hasInitialized.current = true;
      if (storedConversationId) {
        initializeMutation.mutate({ conversationId: storedConversationId, agentId: resolvedAgentId });
      } else {
        initializeMutation.mutate({ agentId: resolvedAgentId });
      }
    } else {
      hasInitialized.current = true;
      initializeMutation.mutate({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgentId, agentData, isLoadingAgent, conversationId]);

  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isSending || !conversationId || !resolvedAgentId) return;

    setMessages(prev => prev.map(msg => ({ ...msg, followups: undefined })));
    setFollowupsMap(new Map());

    const consumePromises = messages
      .filter(msg => msg.role === 'ASSISTANT')
      .map(msg => markFollowupsConsumedMutation.mutateAsync({ messageId: msg.id }).catch(err => {
        console.error('Failed to mark follow-ups as consumed:', err);
      }));
    await Promise.all(consumePromises);

    const optimisticId = `optimistic_${Date.now()}`;
    optimisticMessageIds.current.add(optimisticId);
    setMessages(prev => [...prev, { id: optimisticId, role: 'USER' as MessageRole, content: message, createdAt: new Date() }]);
    setIsSending(true);
    await sendStreamMessage({ agentId: resolvedAgentId, conversationId, message });
  }, [sendStreamMessage, conversationId, resolvedAgentId, isSending, messages, markFollowupsConsumedMutation]);

  const handleFollowupClick = useCallback(async (messageId: string, followup: MessageFollowup) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, followups: undefined } : msg));
    setFollowupsMap(prev => { const m = new Map(prev); m.delete(messageId); return m; });
    try { await markFollowupsConsumedMutation.mutateAsync({ messageId }); } catch (e) { /* ignore */ }
    handleSendMessage(followup.label);
  }, [handleSendMessage, markFollowupsConsumedMutation]);

  const handleActionClick = useCallback((messageId: string, action: MessageAction) => {
    if (action.id === 'launch-agent' && agentDraft?.status === 'ready' && conversationId) {
      launchMutation.mutate({ conversationId });
      return;
    }
    if (action.label) handleSendMessage(action.label);
  }, [handleSendMessage, launchMutation, conversationId, agentDraft]);

  if (isInitializing) {
    return <AgentChatSkeleton />;
  }

  const messagesWithFollowups = messages.map(msg => ({
    ...msg,
    followups: msg.followups || followupsMap.get(msg.id),
  }));

  return (
    <div className="flex h-full w-full">
      <ResizableSplitLayout
        mainPanelDefaultSize="60%"
        mainPanelMinSize="50%"
        sidePanelDefaultSize="40%"
        sidePanelMinSize="40%"
        MainContent={
          <div className="flex flex-col h-full bg-white">
            <div className="flex-1 overflow-hidden relative">
              <ChatMessageList
                messages={messagesWithFollowups}
                agentLabel="Agentflox Agent Executor"
                pendingAssistantMessage={
                  isSending ? (
                    <StreamingMessage
                      thinkingSteps={thinkingSteps}
                      currentStep={thinkingStep}
                      currentNode={thinkingNode}
                      streamingContent={streamingContent}
                      isStreaming={isStreaming}
                      agentLabel="Agentflox Agent Executor"
                    />
                  ) : null
                }
                onFollowupClick={handleFollowupClick}
                onActionClick={handleActionClick}
              />
            </div>
            <div className="border-t bg-white px-4 py-3">
              <ChatComposer onSend={handleSendMessage} isSending={isSending} disabled={isSending || !conversationId} />
            </div>
          </div>
        }
        SidePanelContent={
          <div className="h-full border-l bg-gradient-to-b from-background to-muted/20 overflow-hidden">
            <AgentProfile
              agent={{
                id: agentData.id,
                name: agentData.name || agentDraft?.name || 'Unnamed Agent',
                description: agentData.description ?? agentDraft?.description ?? null,
                avatar: agentData.avatar ?? agentDraft?.avatar ?? null,
                status: (agentData.status === 'ACTIVE' ? 'ACTIVE' : agentData.status === 'DRAFT' ? 'DRAFT' : agentData.status === 'BUILDING' ? 'BUILDING' : agentData.status === 'RECONFIGURING' ? 'RECONFIGURING' : agentData.status === 'EXECUTING' ? 'EXECUTING' : 'INACTIVE') as "ACTIVE" | "DRAFT" | "INACTIVE" | "BUILDING" | "RECONFIGURING" | "EXECUTING",
                isActive: agentData.isActive ?? false,
                agentType: agentData.agentType ?? agentDraft?.agentType ?? null,
                systemPrompt: agentData.systemPrompt ?? agentDraft?.systemPrompt ?? null,
                capabilities: agentData.capabilities ?? agentDraft?.capabilities ?? null,
                constraints: agentData.constraints ?? agentDraft?.constraints ?? null,
                createdAt: agentData.createdAt ?? new Date(),
                updatedAt: agentData.updatedAt ?? new Date(),
                metadata: (agentData.metadata as any) ?? {},
                triggers: (agentData.triggers || []).map(t => ({
                  id: t.id, triggerType: t.triggerType, triggerConfig: t.triggerConfig as any,
                  name: t.name, description: t.description, isActive: t.isActive, priority: t.priority, tags: t.tags,
                })),
                tools: (agentData.tools || []).map(t => ({
                  id: t.id, name: t.name, description: t.description,
                  category: t.category, toolType: t.toolType, isActive: t.isActive,
                })),
                schedules: (agentData.schedules || []).map(s => ({
                  id: s.id, name: s.name, description: s.description, repeatTime: s.repeatTime,
                  startTime: s.startTime, endTime: s.endTime, timezone: s.timezone,
                  instructions: s.instructions, isActive: s.isActive, priority: s.priority,
                })),
              }}
              conversationType="AGENT_EXECUTOR"
              isReconfiguring={agentData.status === 'RECONFIGURING' || (agentData.status === 'ACTIVE' && conversationState?.stage !== undefined && ['review', 'testing'].includes(conversationState.stage))}
              onEdit={() => toast.info('Edit agent configuration...')}
              onConfigure={() => setShowAgentProfile(false)}
            />
          </div>
        }
        isPanelOpen={true}
      />
    </div>
  );
};
