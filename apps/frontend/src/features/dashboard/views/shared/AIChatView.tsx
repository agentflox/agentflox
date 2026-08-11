'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import type { ChatContextType } from '@/entities/chats/utils/context'
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingContainer, LoadingPage } from "@/components/ui/loading";
import { trpc } from '@/lib/trpc'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type UpperContext = 'PROJECT' | 'TEAM' | 'WORKSPACE' | 'SPACE' | 'TASK' | 'LIST' | 'FOLDER'

interface ChatViewProps {
  contextType?: UpperContext
  contextId?: string
  contextName?: string
  hideSidebar?: boolean
  chatId?: string | null
  onChatIdChange?: (chatId: string | null) => void
  hideMentions?: boolean;
}

const STORAGE_KEY_PREFIX = 'agentflox_active_chat_'

export function AIChatView({ contextType = 'PROJECT', contextId = '', contextName, hideSidebar = false, chatId: controlledChatId, onChatIdChange, hideMentions }: ChatViewProps) {
  const ctxType = (contextType ?? 'PROJECT').toLowerCase() as ChatContextType

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const storageKey = `${STORAGE_KEY_PREFIX}${ctxType}_${contextId}`

  // Load active conversation from localStorage on mount
  const [internalActiveConversationId, setInternalActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && contextId) {
      const stored = localStorage.getItem(storageKey)
      return stored || null
    }
    return null
  })

  const onChatIdChangeRef = useRef(onChatIdChange)
  useEffect(() => {
    onChatIdChangeRef.current = onChatIdChange
  }, [onChatIdChange])

  const activeConversationId = controlledChatId !== undefined ? controlledChatId : internalActiveConversationId
  const setActiveConversationId = useCallback((id: string | null) => {
    setInternalActiveConversationId(id)
    if (onChatIdChangeRef.current) onChatIdChangeRef.current(id)
  }, [])

  // Reset active conversation when context changes (but not on mount if we already have one)
  const prevContextRef = useRef({ ctxType, contextId })
  useEffect(() => {
    if (prevContextRef.current.ctxType !== ctxType || prevContextRef.current.contextId !== contextId) {
      setActiveConversationId(null)
      prevContextRef.current = { ctxType, contextId }
    }
  }, [ctxType, contextId, setActiveConversationId])

  // Sync internal ID to external URL on mount if we have a stored conversation
  useEffect(() => {
    if (controlledChatId === undefined && internalActiveConversationId) {
      if (onChatIdChangeRef.current) onChatIdChangeRef.current(internalActiveConversationId)
    }
  }, [controlledChatId, internalActiveConversationId])

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
    contextType: ctxType,
    entityId: contextId,
    activeConversationId,
  })

  const utils = trpc.useUtils()
  const deleteMutation = trpc.chat.delete.useMutation()
  const archiveMutation = trpc.chat.archive.useMutation()

  // Save active conversation to localStorage whenever it changes
  useEffect(() => {
    if (activeConversationId && contextId) {
      localStorage.setItem(storageKey, activeConversationId)
    } else if (!activeConversationId && contextId) {
      localStorage.removeItem(storageKey)
    }
  }, [activeConversationId, storageKey, contextId])

  // Auto-create a default conversation for new contexts that have none
  useEffect(() => {
    if (!isLoadingConversations && !isCreatingConversation && conversations.length === 0 && contextId) {
      createConversation({
        title: `${contextName || contextType} Chat`,
      }).then((conversation) => {
        setActiveConversationId(conversation.id)
      })
    }
  }, [isLoadingConversations, isCreatingConversation, conversations.length, contextId])

  // Set active conversation if none is selected — prefer the localStorage-stored one for this context
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      const preferred = stored && conversations.find(c => c.id === stored)
      setActiveConversationId(preferred ? preferred.id : conversations[0].id)
    }
  }, [activeConversationId, conversations, storageKey])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  )

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const base = showArchived ? conversations : conversations.filter(c => !(c as any).isArchived)
    if (!debouncedQuery) return base
    return base.filter(c => (c.title?.toLowerCase() ?? "").includes(debouncedQuery.toLowerCase()))
  }, [conversations, debouncedQuery, showArchived])

  if (!contextId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a {ctxType} to start chatting with the AI assistant.</p>
        </div>
      </div>
    )
  }

  const handleCreateConversation = async (title?: string, description?: string) => {
    const conversation = await createConversation({
      title: title || 'Untitled chat',
      systemPrompt: description,
    })

    // Optimistic update
    utils.chat.list.setData({ contextType: ctxType, entityId: contextId }, (oldData) => {
      if (!oldData) return [conversation]
      return [conversation, ...oldData]
    })

    setActiveConversationId(conversation.id)
  }

  const handleSendMessage = async (
    message: string,
    options?: { attachments?: any[]; webSearch?: boolean; mentions?: Array<{ id: string; name: string; type: string }> }
  ) => {
    const convId = activeConversationId || (await createConversation({
      title: `${contextName || contextType} chat ${conversations.length + 1}`,
    })).id

    if (!activeConversationId) {
      setActiveConversationId(convId)
    }

    await sendMessage(convId, message, options)
  }

  const handleRename = async (title: string) => {
    if (!activeConversationId) return
    await renameConversation(activeConversationId, title)
  }

  const handleDelete = async () => {
    if (!activeConversationId) return

    // Optimistic update
    utils.chat.list.setData(
      { contextType: ctxType, entityId: contextId },
      (oldData) => oldData?.filter(c => c.id !== activeConversationId) ?? []
    )

    await deleteMutation.mutateAsync({ conversationId: activeConversationId })
    const remaining = conversations.filter(c => c.id !== activeConversationId)
    setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
    await utils.chat.list.invalidate({
      contextType: ctxType,
      entityId: contextId,
    })
  }

  const handleArchive = async () => {
    if (!activeConversationId) return

    // Optimistic update
    utils.chat.list.setData(
      { contextType: ctxType, entityId: contextId },
      (oldData) => oldData?.filter(c => c.id !== activeConversationId) ?? []
    )

    await archiveMutation.mutateAsync({ conversationId: activeConversationId, archived: true })
    const remaining = conversations.filter(c => c.id !== activeConversationId)
    setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
    await utils.chat.list.invalidate({
      contextType: ctxType,
      entityId: contextId,
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
    // Optimistic update
    utils.chat.list.setData(
      { contextType: ctxType, entityId: contextId },
      (oldData) => oldData?.filter(c => c.id !== conversationId) ?? []
    )

    await deleteMutation.mutateAsync({ conversationId })
    if (activeConversationId === conversationId) {
      const remaining = conversations.filter(c => c.id !== conversationId)
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
    }
    await utils.chat.list.invalidate({
      contextType: ctxType,
      entityId: contextId,
    })
  }

  const handleConversationArchive = async (conversationId: string) => {
    // Optimistic update
    utils.chat.list.setData(
      { contextType: ctxType, entityId: contextId },
      (oldData) => oldData?.filter(c => c.id !== conversationId) ?? []
    )

    await archiveMutation.mutateAsync({ conversationId, archived: true })
    if (activeConversationId === conversationId) {
      const remaining = conversations.filter(c => c.id !== conversationId)
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
    }
    await utils.chat.list.invalidate({
      contextType: ctxType,
      entityId: contextId,
    })
  }

  const handleConversationShare = (conversationId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?chat=${conversationId}`
    navigator.clipboard.writeText(url)
    // You can add a toast notification here
  }

  return (
    <div className="flex h-full w-full min-h-0 gap-0 bg-background transition-all">
      <aside className={cn(
        "shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
        (isSidebarCollapsed || hideSidebar) ? "w-0 border-none" : "w-[256px] border-x border-slate-200"
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
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">{contextName}</p>
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
                          <DropdownMenuItem onClick={() => setIsCreationModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Chat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setShowArchived(prev => !prev)
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
                            disabled={isCreatingConversation}
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

      <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
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
        <div className="flex flex-1 flex-col min-h-0">
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
              title={activeConversation?.title ?? contextName ?? 'AI Chat'}
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSending}
              pendingAssistantMessage={pendingAssistantMessage}
              onRename={handleRename}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onShare={handleShare}
              contextType={ctxType as any}
              contextId={contextId}
              className="lg:rounded-none lg:border-none lg:shadow-none"
              hideHeader
              hideMentions={hideMentions}
            />
          )}
        </div>
      </div>
    </div>
  )
}
