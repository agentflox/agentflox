'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc'
import { sendChatMessage as sendChatMessageService } from '@/services/chat.service'
import type { RenderedMessage } from '../components/MessageList'
import type { ChatContextType } from '../utils/context'
import { MessageRole } from '@agentflox/database/src/generated/prisma/client'
import { toast } from 'sonner'
import { formatModelErrorMessage } from '@/entities/models/utils/formatModelError'

interface UseChatsParams {
  contextType?: ChatContextType
  entityId?: string
  activeConversationId?: string | null
}

export function useChats({ contextType, entityId, activeConversationId }: UseChatsParams) {
  const utils = trpc.useUtils()

  const conversationsQuery = trpc.chat.list.useQuery(
    {
      contextType: contextType ?? 'project',
      entityId: entityId ?? '',
    },
    {
      enabled: Boolean(contextType && entityId),
      placeholderData: keepPreviousData
    }
  )

  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: activeConversationId ?? '' },
    {
      enabled: Boolean(activeConversationId),
      // Prevent showing loading state when refetching
      notifyOnChangeProps: ['data', 'error'],
      // Reduce refetch frequency
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Use stale time to prevent unnecessary refetches
      staleTime: 1000,
      // Light polling to keep chat feeling realtime for multi-user scenarios
      refetchInterval: 3000,
      placeholderData: keepPreviousData
    }
  )

  const createMutation = trpc.chat.create.useMutation()
  const renameMutation = trpc.chat.rename.useMutation()
  const { data: model } = trpc.chat.getModel.useQuery()
  const { data: config } = trpc.chat.getModelConfig.useQuery()
  const [isSending, setIsSending] = useState(false)
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<string | null>(null)
  const pendingUserMessageRef = useRef<RenderedMessage | null>(null)

  const sendMessage = useCallback(
    async (conversationId: string, message: string, options?: { attachments?: any[]; webSearch?: boolean; contexts?: any[]; mentions?: any[]; modelId?: string }) => {
      if (!entityId || !contextType) {
        throw new Error('Entity ID and context type are required to send a message')
      }

      setIsSending(true)
      // Set to empty string to show typing indicator
      setPendingAssistantMessage('')

      // Optimistically add user message to show it immediately
      const optimisticUserMessage: RenderedMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'USER' as MessageRole,
        content: message,
        createdAt: new Date(),
      }

      // Store in ref so it survives refetch cycles
      pendingUserMessageRef.current = optimisticUserMessage

      try {
        const assistantMessage = await sendChatMessageService(
          {
            conversationId,
            contextType,
            entityId,
            message,
            modelId: options?.modelId,
            attachments: options?.attachments,
            webSearch: options?.webSearch,
            contexts: options?.contexts,
            mentions: options?.mentions,
            config: {
              RPM: config?.maxRPM ?? 0,
              RPD: config?.maxRPD ?? 0,
            },
          },
          {
            onChunk: (chunk) => setPendingAssistantMessage(chunk),
          }
        )

        // Clear pending state — the refetch will bring real data from the DB
        pendingUserMessageRef.current = null
        setPendingAssistantMessage(null)

        // Invalidate so the real messages come in from the DB
        await Promise.all([
          utils.chat.getMessages.invalidate({ conversationId }),
          utils.chat.list.invalidate({ contextType, entityId }),
        ])
      } catch (error) {
        pendingUserMessageRef.current = null
        setPendingAssistantMessage(null)
        // On error, refetch to ensure consistency
        await utils.chat.getMessages.invalidate({ conversationId })
        const msg = formatModelErrorMessage(error, 'Failed to send chat message')
        toast.error(msg)
        throw new Error(msg)
      } finally {
        setIsSending(false)
      }
    },
    [entityId, contextType, config, utils]
  )

  const createConversation = useCallback(
    async (options?: { title?: string; systemPrompt?: string; modelId?: string }) => {
      if (!entityId || !contextType) {
        throw new Error('Entity ID and context type are required to create a chat')
      }

      const conversation = await createMutation.mutateAsync({
        contextType,
        entityId,
        modelId: options?.modelId || model?.id || undefined,
        title: options?.title,
        systemPrompt: options?.systemPrompt,
      })

      await utils.chat.list.invalidate({ contextType, entityId })
      return conversation
    },
    [createMutation, entityId, contextType, model, utils]
  )

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      await renameMutation.mutateAsync({ conversationId, title })
      if (entityId && contextType) {
        await utils.chat.list.invalidate({ contextType, entityId })
      }
    },
    [entityId, contextType, renameMutation, utils]
  )

  // Memoize messages with stable reference
  const renderedMessages = useMemo<RenderedMessage[]>(() => {
    const dbMessages = messagesQuery.data?.messages ?? []

    const mapped = dbMessages.map((message: any, index: number) => {
      // Extract follow-ups from metadata (only for assistant messages)
      let followups: Array<{ id: string; label: string }> | undefined;

      if (message.role === 'ASSISTANT' && message.metadata) {
        const metadata = typeof message.metadata === 'object' ? message.metadata : {};
        const followupsConsumed = metadata.followupsConsumed === true;

        // Check if there are user messages after this assistant message
        const hasUserMessageAfter = dbMessages.slice(index + 1).some((m: any) => m.role === 'USER');

        // Only show follow-ups if not consumed AND no user message after
        if (!followupsConsumed && !hasUserMessageAfter && metadata.followups && Array.isArray(metadata.followups)) {
          followups = metadata.followups;
        }
      }

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        feedback: message.feedback || null,
        followups,
      };
    })

    // While sending, pin the optimistic user message at the end so it is always
    // visible even when the polling refetch replaces the cache with DB data.
    const pending = pendingUserMessageRef.current
    if (pending && !mapped.some((m) => m.id === pending.id || (m.role === 'USER' && m.content === pending.content && mapped.indexOf(m) === mapped.length - 1))) {
      return [...mapped, pending]
    }

    return mapped
  }, [messagesQuery.data?.messages, isSending])

  // Mutation for marking follow-ups as consumed
  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation()

  // Handler for follow-up clicks
  const handleFollowupClick = useCallback(
    async (messageId: string, followup: { id: string; label: string }) => {
      if (!activeConversationId) return;

      // Mark follow-ups as consumed in backend
      try {
        await markFollowupsConsumedMutation.mutateAsync({ messageId });
      } catch (error) {
        console.error('Failed to mark follow-ups as consumed:', error);
      }

      // Send the follow-up label as a new message
      await sendMessage(activeConversationId, followup.label);
    },
    [activeConversationId, markFollowupsConsumedMutation, sendMessage]
  );

  // Extract quick actions from latest assistant message metadata
  const quickActions = useMemo(() => {
    if (!messagesQuery.data?.messages) return [];

    const assistantMessages = messagesQuery.data.messages.filter((m: any) => m.role === 'ASSISTANT');
    const latestAssistant = assistantMessages[assistantMessages.length - 1];

    if (latestAssistant && latestAssistant.metadata) {
      const metadata = typeof latestAssistant.metadata === 'object' ? latestAssistant.metadata : {};
      if (metadata.quickActions && Array.isArray(metadata.quickActions)) {
        return metadata.quickActions;
      }
    }

    return [];
  }, [messagesQuery.data?.messages]);

  return {
    conversations: conversationsQuery.data ?? [],
    isLoadingConversations: conversationsQuery.isLoading,
    messages: renderedMessages,
    // Only show loading on initial fetch, not on refetch
    isLoadingMessages: messagesQuery.isLoading && !messagesQuery.data,
    createConversation,
    isCreatingConversation: createMutation.isPending,
    renameConversation,
    sendMessage,
    isSending,
    pendingAssistantMessage,
    handleFollowupClick,
    quickActions,
  }
}

