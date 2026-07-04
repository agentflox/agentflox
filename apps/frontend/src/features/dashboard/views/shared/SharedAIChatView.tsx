'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Loader2, Plus, Search, ChevronsLeft, ChevronsRight, X, MoreHorizontal } from 'lucide-react'
import { ConversationList } from '@/entities/chats/components/ConversationList'
import { ChatPanel } from '@/entities/chats/components/ChatPanel'
import { useChats } from '@/entities/chats/hooks/useChats'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChatContextType } from '@/entities/chats/utils/context'
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { trpc } from '@/lib/trpc'

type UpperContext = 'PROJECT' | 'PROFILE' | 'PROPOSAL' | 'TEAM' | 'WORKSPACE' | 'SPACE' | 'CHANNEL' | 'TASK' | 'LIST' | 'FOLDER'

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
  hideSidebar?: boolean
  chatId?: string | null
  onChatIdChange?: (chatId: string | null) => void
}

const STORAGE_KEY_PREFIX = 'agentflox_active_chat_'

export function ChatView({ contextType = 'PROJECT', contextId, contextName, contextOptions, onContextClick, contextCount = 0, selectedContexts = [], hideSidebar = false, chatId: controlledChatId, onChatIdChange }: ChatViewProps) {
  const initialType = (contextType ?? 'PROJECT').toLowerCase() as ChatContextType
  const initialId = contextId ?? contextOptions?.[0]?.entityId ?? ''
  const initialName = contextName ?? contextOptions?.find((o) => o.value === initialType)?.name ?? contextOptions?.[0]?.name

  const [selectedContext, setSelectedContext] = useState<{ type: ChatContextType; entityId: string; name?: string }>(
    { type: initialType, entityId: initialId, name: initialName }
  )

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!selectedContext.entityId && contextOptions && contextOptions.length > 0) {
      const next = contextOptions[0]
      setSelectedContext({ type: next.value, entityId: next.entityId, name: next.name ?? next.label })
    }
  }, [contextOptions, selectedContext.entityId])

  const storageKey = `${STORAGE_KEY_PREFIX}${selectedContext.type}_${selectedContext.entityId}`

  // Load active conversation from localStorage on mount
  const [internalActiveConversationId, setInternalActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && selectedContext.entityId) {
      const stored = localStorage.getItem(storageKey)
      return stored || null
    }
    return null
  })

  const activeConversationId = controlledChatId !== undefined ? controlledChatId : internalActiveConversationId
  const setActiveConversationId = useCallback((id: string | null) => {
    if (onChatIdChange) onChatIdChange(id)
    else setInternalActiveConversationId(id)
  }, [onChatIdChange])

  useEffect(() => {
    setSelectedContext({ type: initialType, entityId: initialId, name: initialName })
    setActiveConversationId(null)
  }, [initialType, initialId, initialName, setActiveConversationId])

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

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!debouncedQuery) return conversations
    return conversations.filter(c => (c.title?.toLowerCase() ?? "").includes(debouncedQuery.toLowerCase()))
  }, [conversations, debouncedQuery])

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
    options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }>; mentions?: Array<{ id: string; name: string; type: string }> }
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
      contexts: options?.contexts || selectedContexts.map(ctx => ({ type: ctx.type, id: ctx.id })),
      mentions: options?.mentions
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
    <div className="flex h-full gap-0 bg-background transition-all">
      <aside className={cn(
        "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
        (isSidebarCollapsed || hideSidebar) ? "w-0 border-none" : "w-[256px] border-r border-slate-200"
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          {!isSidebarCollapsed && (
            <div className="flex flex-col border-b border-slate-200">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                      setIsSearchOpen(false)
                      setSearchQuery("")
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">AI Chats</h2>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">{selectedContext.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setIsSearchOpen(true)}
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
                      onClick={handleCreateConversation}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="New Chat"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {isLoadingConversations ? (
              <LoadingContainer
                label="Loading chats..."
                spinnerSize="md"
                padding="md"
              />
            ) : (
              <ConversationList
                conversations={filteredConversations}
                activeConversationId={activeConversationId}
                onSelect={(id) => setActiveConversationId(id)}
                onCreate={handleCreateConversation}
                isCreating={isCreatingConversation}
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

      <div className="flex-1 overflow-hidden relative">
        {isSidebarCollapsed && !hideSidebar && (
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
        <div className="h-full">
          {isLoadingMessages && !pendingAssistantMessage ? (
            <div className="flex flex-col h-full bg-[#f8fafc]">
              {/* Fake header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
                <Skeleton className="h-5 w-40 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-28 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden px-6 py-6 space-y-6">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 max-w-[70%]">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="h-3.5 w-[340px] rounded-md" />
                    <Skeleton className="h-3.5 w-[280px] rounded-md" />
                    <Skeleton className="h-3.5 w-[200px] rounded-md" />
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="space-y-1.5 items-end flex flex-col max-w-[60%]">
                    <Skeleton className="h-3 w-12 rounded-md" />
                    <Skeleton className="h-10 w-[220px] rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                </div>

                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 max-w-[70%]">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="h-3.5 w-[300px] rounded-md" />
                    <Skeleton className="h-3.5 w-[260px] rounded-md" />
                    <Skeleton className="h-28 w-[320px] rounded-xl mt-1" />
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="space-y-1.5 items-end flex flex-col max-w-[60%]">
                    <Skeleton className="h-3 w-12 rounded-md" />
                    <Skeleton className="h-10 w-[160px] rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                </div>

                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-100 w-fit">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-2 w-2 rounded-full opacity-60" />
                      <Skeleton className="h-2 w-2 rounded-full opacity-30" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div className="border-t border-slate-200/60 bg-white px-4 py-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded-md shrink-0" />
                  <Skeleton className="h-4 flex-1 rounded-md" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
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
              className="lg:rounded-none lg:border-none lg:shadow-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}
