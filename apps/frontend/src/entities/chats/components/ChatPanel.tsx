'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { ChatMessageList, RenderedMessage, MessageFollowup } from './MessageList'
import { ChatComposer } from './ChatComposer'
import { ChatHeader } from './ChatHeader'
import { ChatThinkingIndicator } from './ChatThinkingIndicator'
import { QuickActionsBar } from './QuickActionsBar'
import { Sparkles, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConversationList, ConversationListItem } from './ConversationList'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  label: string
  action: string
  icon?: string
  variant?: 'default' | 'primary' | 'secondary' | 'destructive'
}

interface ChatPanelProps {
  title?: string | null
  messages: RenderedMessage[]
  onSendMessage: (message: string, options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }> }) => Promise<void>
  conversationId?: string | null
  isSending: boolean
  disabled?: boolean
  pendingAssistantMessage?: string | React.ReactNode | null
  contextType: 'project' | 'profile' | 'proposal' | 'team' | 'workspace' | 'space' | 'channel' | 'task' | 'list' | 'folder'
  entityId: string
  onRename?: (title: string) => Promise<void>
  onDelete?: () => Promise<void>
  onArchive?: () => Promise<void>
  onShare?: () => void
  onContextClick?: () => void
  contextCount?: number
  // New props for enhanced features
  onFollowupClick?: (messageId: string, followup: MessageFollowup) => void
  quickActions?: QuickAction[]
  onQuickActionClick?: (action: QuickAction) => void
  // Conversation list props
  conversations?: ConversationListItem[]
  onSelectConversation?: (conversationId: string) => void
  onCreateConversation?: () => Promise<void>
  isCreatingConversation?: boolean
  onRenameConversation?: (conversationId: string, title: string) => Promise<void>
  onDeleteConversation?: (conversationId: string) => Promise<void>
  onArchiveConversation?: (conversationId: string) => Promise<void>
  onShareConversation?: (conversationId: string) => void
}

export function ChatPanel({
  title,
  messages,
  onSendMessage,
  conversationId,
  isSending,
  disabled,
  pendingAssistantMessage,
  contextType,
  entityId,
  onRename,
  onDelete,
  onArchive,
  onShare,
  onContextClick,
  contextCount = 0,
  onFollowupClick,
  quickActions = [],
  onQuickActionClick,
  conversations = [],
  onSelectConversation,
  onCreateConversation,
  isCreatingConversation,
  onRenameConversation,
  onDeleteConversation,
  onArchiveConversation,
  onShareConversation,
}: ChatPanelProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const hasConversation = messages.length > 0 || pendingAssistantMessage

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Chat Area */}
      <div className="flex h-full w-full flex-col">
        <Card className="flex h-full flex-col overflow-hidden border-0 bg-white shadow-none lg:rounded-2xl lg:border lg:shadow-2xl">
          {/* Header with mobile menu button */}
          <div className="relative">
            <ChatHeader
              title={title || 'Chat with Agentflox AI'}
              onRename={onRename}
              onDelete={onDelete}
              onArchive={onArchive}
              onShare={onShare}
            />
            {/* Mobile menu button */}
            {onSelectConversation && onCreateConversation && (
              <Button
                variant="ghost"
                onClick={toggleSidebar}
                className="absolute right-16 top-3.5 h-8 w-8 p-0 sm:right-20 sm:top-4 sm:h-9 sm:w-9 lg:hidden"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>

          {/* Messages Area */}
          <div className="relative flex-1 overflow-hidden">
            {hasConversation ? (
              <div className="h-full">
                <ChatMessageList
                  messages={messages}
                  pendingAssistantMessage={
                    (isSending ? <ChatThinkingIndicator contextType={contextType} /> : pendingAssistantMessage) as string | ReactNode | null | undefined
                  }
                  onFollowupClick={onFollowupClick}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center sm:gap-8 sm:px-8">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-2xl shadow-primary/30 sm:h-24 sm:w-24">
                    <Sparkles className="h-8 w-8 animate-pulse text-white sm:h-12 sm:w-12" />
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary sm:px-4">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    AI Assistant Ready
                  </div>

                  <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                    Your intelligent project copilot
                  </h2>

                  <p className="max-w-xl text-sm text-slate-600 sm:text-base">
                    Brainstorm ideas, plan roadmaps, analyze data, and generate content with AI-powered assistance.
                  </p>
                </div>

                <div className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                  {[
                    { icon: '💡', title: 'Brainstorm ideas', desc: 'Generate creative solutions' },
                    { icon: '📊', title: 'Analyze data', desc: 'Get insights from your files' },
                    { icon: '✍️', title: 'Draft content', desc: 'Create documents & reports' },
                    { icon: '🗺️', title: 'Plan roadmaps', desc: 'Organize your projects' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 sm:p-4"
                    >
                      <div className="mb-1.5 text-xl transition-transform group-hover:scale-110 sm:mb-2 sm:text-2xl">
                        {item.icon}
                      </div>
                      <h3 className="mb-0.5 text-sm font-semibold text-slate-900 sm:mb-1 sm:text-base">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 sm:text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          {quickActions.length > 0 && onQuickActionClick && (
            <QuickActionsBar
              actions={quickActions}
              onActionClick={onQuickActionClick}
            />
          )}

          {/* Composer Area */}
          <div className="border-t border-slate-200/80 bg-white/95 p-4 backdrop-blur-sm sm:px-6 sm:py-5">
            <ChatComposer
              onSend={onSendMessage}
              conversationId={conversationId ?? undefined}
              isSending={isSending}
              disabled={disabled}
              onContextClick={onContextClick}
              contextCount={contextCount}
            />
          </div>
        </Card>
      </div>

      {/* Right Sidebar - Desktop */}
      {onSelectConversation && onCreateConversation && (
        <div className="hidden lg:fixed lg:right-0 lg:top-0 lg:flex lg:h-full lg:w-80 lg:flex-col lg:p-4">
          <ConversationList
            conversations={conversations}
            activeConversationId={conversationId}
            onSelect={(id) => {
              onSelectConversation(id)
            }}
            onCreate={onCreateConversation}
            isCreating={isCreatingConversation}
            onRename={onRenameConversation}
            onDelete={onDeleteConversation}
            onArchive={onArchiveConversation}
            onShare={onShareConversation}
          />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {onSelectConversation && onCreateConversation && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
              isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
            onClick={closeSidebar}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <div
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-full transform transition-transform duration-300 ease-in-out sm:w-80 lg:hidden',
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="relative flex h-full flex-col bg-slate-900 shadow-2xl">
              {/* Close button */}
              <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900/50 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 sm:text-sm">
                  Conversations
                </h2>
                <Button
                  variant="ghost"
                  onClick={closeSidebar}
                  className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                <ConversationList
                  conversations={conversations}
                  activeConversationId={conversationId}
                  onSelect={(id) => {
                    onSelectConversation(id)
                    closeSidebar()
                  }}
                  onCreate={() => {
                    onCreateConversation()
                    closeSidebar()
                  }}
                  isCreating={isCreatingConversation}
                  onRename={onRenameConversation}
                  onDelete={onDeleteConversation}
                  onArchive={onArchiveConversation}
                  onShare={onShareConversation}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
