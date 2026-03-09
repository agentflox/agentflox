'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { ConversationList } from '@/entities/chats/components/ConversationList'
import { ChatPanel } from '@/entities/chats/components/ChatPanel'
import { useChats } from '@/entities/chats/hooks/useChats'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ChatContextType } from '@/entities/chats/utils/context'
import { trpc } from '@/lib/trpc'

type UpperContext = 'PROJECT' | 'PROFILE' | 'PROPOSAL' | 'TEAM' | 'WORKSPACE' | 'SPACE' | 'CHANNEL'

interface ContextOption {
  label: string
  value: ChatContextType
  entityId: string
  name?: string
}

interface ChatViewProps {
  contextType?: UpperContext
  contextId?: string
  contextName?: string
  contextOptions?: ContextOption[]
  onContextClick?: () => void
  contextCount?: number
  selectedContexts?: Array<{ type: string; id: string; name: string }>
}

const STORAGE_KEY_PREFIX = 'agentflox_active_chat_'

export function ChatView({ contextType = 'TEAM', contextId, contextName, contextOptions, onContextClick, contextCount = 0, selectedContexts = [] }: ChatViewProps) {
  const initialType = (contextType ?? 'TEAM').toLowerCase() as ChatContextType
  const initialId = contextId ?? contextOptions?.[0]?.entityId ?? ''
  const initialName = contextName ?? contextOptions?.find((o) => o.value === initialType)?.name ?? contextOptions?.[0]?.name

  const [selectedContext, setSelectedContext] = useState<{ type: ChatContextType; entityId: string; name?: string }>(
    { type: initialType, entityId: initialId, name: initialName }
  )

  useEffect(() => {
    if (!selectedContext.entityId && contextOptions && contextOptions.length > 0) {
      const next = contextOptions[0]
      setSelectedContext({ type: next.value, entityId: next.entityId, name: next.name ?? next.label })
    }
  }, [contextOptions, selectedContext.entityId])

  const storageKey = `${STORAGE_KEY_PREFIX}${selectedContext.type}_${selectedContext.entityId}`
  
  // Load active conversation from localStorage on mount
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && selectedContext.entityId) {
      const stored = localStorage.getItem(storageKey)
      return stored || null
    }
    return null
  })

  useEffect(() => {
    setSelectedContext({ type: initialType, entityId: initialId, name: initialName })
    setActiveConversationId(null)
  }, [initialType, initialId, initialName])

  const {
    conversations,
    isLoadingConversations,
    messages,
    isLoadingMessages,
    createConversation,
    sendMessage,
    renameConversation,
    isSending,
    pendingAssistantMessage,
    isCreatingConversation,
  } = useChats({
    contextType: selectedContext.type,
    entityId: selectedContext.entityId,
    activeConversationId,
  })

  const utils = trpc.useUtils()
  const deleteMutation = trpc.chat.delete.useMutation()
  const archiveMutation = trpc.chat.archive.useMutation()

  // Save active conversation to localStorage whenever it changes
  useEffect(() => {
    if (activeConversationId && selectedContext.entityId) {
      localStorage.setItem(storageKey, activeConversationId)
    } else if (!activeConversationId && selectedContext.entityId) {
      localStorage.removeItem(storageKey)
    }
  }, [activeConversationId, storageKey, selectedContext.entityId])

  // Set first conversation as active if none is selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversations])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  )

  if (!selectedContext.entityId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a {selectedContext.type} to start chatting with the AI assistant.</p>
        </div>
      </div>
    )
  }

  const handleCreateConversation = async () => {
    const conversation = await createConversation({
      title: `${selectedContext.name || contextType} chat ${conversations.length + 1}`,
    })
    setActiveConversationId(conversation.id)
  }

  const handleSendMessage = async (
    message: string,
    options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }> }
  ) => {
    const convId = activeConversationId || (await createConversation({
      title: `${selectedContext.name || contextType} chat ${conversations.length + 1}`,
    })).id

    if (!activeConversationId) {
      setActiveConversationId(convId)
    }

    // Include selected contexts from parent if provided
    const finalOptions = {
      ...options,
      contexts: options?.contexts || selectedContexts.map(ctx => ({ type: ctx.type, id: ctx.id }))
    }

    await sendMessage(convId, message, finalOptions)
  }

  const handleRename = async (title: string) => {
    if (!activeConversationId) return
    await renameConversation(activeConversationId, title)
  }

  const handleDelete = async () => {
    if (!activeConversationId) return
    await deleteMutation.mutateAsync({ conversationId: activeConversationId })
    setActiveConversationId(null)
    await utils.chat.list.invalidate({
      contextType: selectedContext.type,
      entityId: selectedContext.entityId,
    })
  }

  const handleArchive = async () => {
    if (!activeConversationId) return
    await archiveMutation.mutateAsync({ conversationId: activeConversationId, archived: true })
    setActiveConversationId(null)
    await utils.chat.list.invalidate({
      contextType: selectedContext.type,
      entityId: selectedContext.entityId,
    })
  }

  const handleShare = () => {
    if (!activeConversationId) return
    const url = `${window.location.origin}${window.location.pathname}?chat=${activeConversationId}`
    navigator.clipboard.writeText(url)
    // You can add a toast notification here
  }

  const handleConversationRename = async (conversationId: string, title: string) => {
    await renameConversation(conversationId, title)
  }

  const handleConversationDelete = async (conversationId: string) => {
    await deleteMutation.mutateAsync({ conversationId })
    if (activeConversationId === conversationId) {
      setActiveConversationId(null)
    }
    await utils.chat.list.invalidate({
      contextType: selectedContext.type,
      entityId: selectedContext.entityId,
    })
  }

  const handleConversationArchive = async (conversationId: string) => {
    await archiveMutation.mutateAsync({ conversationId, archived: true })
    if (activeConversationId === conversationId) {
      setActiveConversationId(null)
    }
    await utils.chat.list.invalidate({
      contextType: selectedContext.type,
      entityId: selectedContext.entityId,
    })
  }

  const handleConversationShare = (conversationId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?chat=${conversationId}`
    navigator.clipboard.writeText(url)
    // You can add a toast notification here
  }

  return (
    <div className="flex h-[calc(100vh-18rem)] flex-col gap-4">
      <div className="grid flex-1 grid-cols-[320px_1fr] gap-6">
        <div className="h-full">
          {isLoadingConversations ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chats...
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelect={(id) => setActiveConversationId(id)}
              onCreate={handleCreateConversation}
              isCreating={isCreatingConversation}
              onRename={handleConversationRename}
              onDelete={handleConversationDelete}
              onArchive={handleConversationArchive}
              onShare={handleConversationShare}
            />
          )}
        </div>
 
        <div className="h-full">
          {isLoadingMessages && !pendingAssistantMessage ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation...
            </div>
          ) : (
            <ChatPanel
            title={activeConversation?.title ?? selectedContext.name ?? 'AI Chat'}
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            pendingAssistantMessage={pendingAssistantMessage}
            onRename={handleRename}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onShare={handleShare}
            onContextClick={onContextClick}
            contextCount={contextCount}
            contextType={selectedContext.type as any}
            entityId={selectedContext.entityId}
          />
          )}
        </div>
      </div>
    </div>
  )
}
