'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { ChatMessageList, RenderedMessage, MessageFollowup } from './MessageList'
import { ChatComposer } from './WorkspaceChatComposer'
import { ChatHeader } from './ChatHeader'
import { ChatThinkingIndicator } from './ChatThinkingIndicator'
import { QuickActionsBar } from './QuickActionsBar'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  onSendMessage: (message: string, options?: { attachments?: any[]; webSearch?: boolean }) => Promise<void>
  conversationId?: string | null
  isSending: boolean
  disabled?: boolean
  pendingAssistantMessage?: string | React.ReactNode | null
  contextId?: string;
  contextType: 'PROJECT' | 'TEAM' | 'WORKSPACE' | 'SPACE' | 'TASK' | 'LIST' | 'FOLDER'
  onRename?: (title: string) => Promise<void>
  onDelete?: () => Promise<void>
  onArchive?: () => Promise<void>
  onShare?: () => void
  // New props for enhanced features
  onFollowupClick?: (messageId: string, followup: MessageFollowup) => void
  quickActions?: QuickAction[]
  onQuickActionClick?: (action: QuickAction) => void
  className?: string | null
  hideHeader?: boolean
  hideMentions?: boolean
  hideWebSearch?: boolean
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
  onRename,
  onDelete,
  onArchive,
  onShare,
  onFollowupClick,
  quickActions = [],
  onQuickActionClick,
  className,
  hideHeader = false,
  hideMentions,
  hideWebSearch,
  contextId
}: ChatPanelProps) {
  const hasConversation = messages.length > 0 || pendingAssistantMessage

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Chat Area */}
      <div className="flex h-full w-full flex-col min-h-0">
        <Card className={cn("flex h-full flex-col overflow-hidden min-h-0 border-0 bg-white shadow-none lg:rounded-2xl lg:border lg:shadow-2xl", className)}>
          {/* Header with mobile menu button */}
          {!hideHeader && (
            <div className="relative">
              <ChatHeader
                title={title || 'Chat with Agentflox AI'}
                onRename={onRename}
                onDelete={onDelete}
                onArchive={onArchive}
                onShare={onShare}
              />
            </div>
          )}

          {/* Messages Area */}
          <div className="relative flex-1 overflow-hidden min-h-0">
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
              <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8 text-center sm:gap-8 sm:px-8">
                <div className="space-y-3 sm:space-y-4">

                  <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900">
                    Your intelligent project copilot
                  </h2>

                  <p className="max-w-xl text-sm text-slate-600 sm:text-base text-justify">
                    Brainstorm ideas, plan roadmaps, analyze data, and generate content with AI-powered assistance.
                  </p>
                </div>

                <div className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                  {[
                    { icon: '💡', title: 'Brainstorm ideas', desc: 'Generate creative solutions', hoverBorder: 'hover:border-amber-400', hoverShadow: 'hover:shadow-amber-100' },
                    { icon: '📊', title: 'Analyze data', desc: 'Get insights from your files', hoverBorder: 'hover:border-blue-400', hoverShadow: 'hover:shadow-blue-100' },
                    { icon: '✍️', title: 'Draft content', desc: 'Create documents & reports', hoverBorder: 'hover:border-violet-400', hoverShadow: 'hover:shadow-violet-100' },
                    { icon: '🗺️', title: 'Plan roadmaps', desc: 'Organize your projects', hoverBorder: 'hover:border-emerald-400', hoverShadow: 'hover:shadow-emerald-100' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`group rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:shadow-lg sm:p-4 ${item.hoverBorder} ${item.hoverShadow}`}
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
              hideMentions={hideMentions}
              hideWebSearch={hideWebSearch}
              contextType={contextType}
              contextId={contextId}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
