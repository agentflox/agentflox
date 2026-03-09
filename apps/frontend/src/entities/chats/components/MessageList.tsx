'use client'

import { useEffect, useMemo, useRef, memo, useState } from 'react'
import { MessagePart } from '@llamaindex/chat-ui'
import { MessageRole } from '@agentflox/database/src/generated/prisma/client'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageDisplay } from './ChatDisplay'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Copy, Check, CornerDownRight } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/useToast'

export interface MessageFollowup {
  id: string
  label: string
  description?: string
}

export type MessageActionVariant = 'primary' | 'secondary' | 'ghost'

export interface MessageAction {
  id: string
  label: string
  variant?: MessageActionVariant
}

export interface RenderedMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string | Date
  parts?: MessagePart[]
  followups?: MessageFollowup[]
  actions?: MessageAction[]
  feedback?: {
    isHelpful: boolean | null
  } | null
}

interface ChatMessageListProps {
  messages: RenderedMessage[]
  pendingAssistantMessage?: string | React.ReactNode | null
  onFollowupClick?: (messageId: string, followup: MessageFollowup) => void
  onActionClick?: (messageId: string, action: MessageAction) => void
  onFeedbackChange?: (messageId: string, isHelpful: boolean | null) => void
  /** Label shown on all agent response headers (e.g. "Agentflox Agent Builder") */
  agentLabel?: string
}

/** Colorful multi-petal sparkle SVG matching the brand header style */
const AgentfloxSparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="msg-sparkle-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
      <linearGradient id="msg-sparkle-b" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path d="M12 2C12 2 13.5 6.5 12 9C10.5 6.5 12 2 12 2Z" fill="url(#msg-sparkle-a)" />
    <path d="M12 22C12 22 10.5 17.5 12 15C13.5 17.5 12 22 12 22Z" fill="url(#msg-sparkle-a)" />
    <path d="M2 12C2 12 6.5 10.5 9 12C6.5 13.5 2 12 2 12Z" fill="url(#msg-sparkle-b)" />
    <path d="M22 12C22 12 17.5 13.5 15 12C17.5 10.5 22 12 22 12Z" fill="url(#msg-sparkle-b)" />
    <path d="M5.636 5.636C5.636 5.636 9.172 8.343 8.485 11C5.829 10.313 5.636 5.636 5.636 5.636Z" fill="url(#msg-sparkle-a)" />
    <path d="M18.364 18.364C18.364 18.364 14.828 15.657 15.515 13C18.171 13.687 18.364 18.364 18.364 18.364Z" fill="url(#msg-sparkle-a)" />
    <path d="M18.364 5.636C18.364 5.636 15.657 9.172 13 8.485C13.687 5.829 18.364 5.636 18.364 5.636Z" fill="url(#msg-sparkle-b)" />
    <path d="M5.636 18.364C5.636 18.364 8.343 14.828 11 15.515C10.313 18.171 5.636 18.364 5.636 18.364Z" fill="url(#msg-sparkle-b)" />
    <circle cx="12" cy="12" r="2.5" fill="url(#msg-sparkle-a)" />
  </svg>
)

// Memoize individual message component to prevent unnecessary rerenders
const MessageItem = memo(function MessageItem({
  message,
  isUser,
  isLast,
  agentLabel,
  onFollowupClick,
  onActionClick,
  onFeedbackChange,
}: {
  message: RenderedMessage
  isUser: boolean
  isLast: boolean
  agentLabel?: string
  onFollowupClick?: (messageId: string, followup: MessageFollowup) => void
  onActionClick?: (messageId: string, action: MessageAction) => void
  onFeedbackChange?: (messageId: string, isHelpful: boolean | null) => void
}) {
  const parts = message.parts ?? [{ type: 'text', text: message.content } satisfies MessagePart]
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const utils = trpc.useUtils()

  const feedbackMutation = trpc.chat.toggleMessageFeedback.useMutation({
    onSuccess: (data) => {
      onFeedbackChange?.(message.id, data.isHelpful)
      utils.chat.getMessages.invalidate()
    },
  })

  const showFollowups = !isUser && message.followups && message.followups.length > 0
  const showActions = !isUser && message.actions && message.actions.length > 0
  const showFeedbackButtons = !isUser && !message.id.startsWith('pending-') && !message.id.startsWith('temp-')

  const currentFeedback = message.feedback?.isHelpful ?? null
  const isLiked = currentFeedback === true
  const isDisliked = currentFeedback === false

  const handleLike = async () => {
    try {
      await feedbackMutation.mutateAsync({ messageId: message.id, isHelpful: true })
    } catch {
      toast({ title: 'Error', description: 'Failed to update feedback', variant: 'destructive' })
    }
  }

  const handleDislike = async () => {
    try {
      await feedbackMutation.mutateAsync({ messageId: message.id, isHelpful: false })
    } catch {
      toast({ title: 'Error', description: 'Failed to update feedback', variant: 'destructive' })
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast({ title: 'Copied!', description: 'Message copied to clipboard' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Error', description: 'Failed to copy message', variant: 'destructive' })
    }
  }

  // ── USER message ─────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end px-4 sm:px-6 md:px-8">
        <div className="max-w-[72%] rounded-[20px] bg-slate-100 px-5 py-3 text-[15px] leading-relaxed text-slate-800">
          {message.content}
        </div>
      </div>
    )
  }

  // ── ASSISTANT message (flat / document style) ─────────────────────────────
  return (
    <div className="px-4 sm:px-6 md:px-8 py-1 group">
      {/* Agent name header */}
      <div className="mb-2 flex items-center gap-2">
        <AgentfloxSparkleIcon className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground/90 tracking-tight">
          {agentLabel ?? 'Agentflox Agent'}
        </span>
      </div>

      {/* Content */}
      <div className="text-[15px] leading-relaxed text-slate-800">
        <MessageDisplay
          parts={parts}
          role="assistant"
          isLast={isLast}
          messageId={message.id}
        />
      </div>

      {/* Follow-ups */}
      {showFollowups && (
        <div className="mt-5 flex flex-col gap-2 max-w-2xl">
          <span className="text-[11px] font-medium text-muted-foreground/70 ml-1 mb-0.5">
            Follow ups
          </span>
          {message.followups?.map((followup) => (
            <button
              key={followup.id}
              onClick={() => onFollowupClick?.(message.id, followup)}
              className="group/fu flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-all hover:bg-slate-50 hover:border-black/10 active:scale-[0.99]"
            >
              <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 group-hover/fu:text-primary" />
              <span className="text-[14px] leading-relaxed text-slate-700">{followup.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.actions!.map((action) => {
            const buttonVariant =
              action.variant === 'secondary' ? 'outline' : action.variant === 'ghost' ? 'ghost' : 'default'
            return (
              <Button
                key={action.id}
                size="sm"
                variant={buttonVariant as any}
                onClick={() => onActionClick?.(message.id, action)}
                className="rounded-full px-4"
              >
                {action.label}
              </Button>
            )
          })}
        </div>
      )}

      {/* Feedback toolbar — visible on hover */}
      {showFeedbackButtons && (
        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={handleLike}
            disabled={feedbackMutation.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all hover:bg-slate-100 disabled:opacity-50',
              isLiked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-500'
            )}
          >
            <ThumbsUp className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={handleDislike}
            disabled={feedbackMutation.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all hover:bg-slate-100 disabled:opacity-50',
              isDisliked ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-slate-500'
            )}
          >
            <ThumbsDown className={cn('h-3.5 w-3.5', isDisliked && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-all hover:bg-slate-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
})

// Pending streaming node wrapper — same flat style as assistant messages
const PendingMessageWrapper = memo(function PendingMessageWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="px-4 sm:px-6 md:px-8 py-1">
      {children}
    </div>
  )
})

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  pendingAssistantMessage,
  onFollowupClick,
  onActionClick,
  onFeedbackChange,
  agentLabel,
}: ChatMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const prevMessagesLengthRef = useRef(messages.length)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const isPendingReactNode =
    pendingAssistantMessage !== null &&
    pendingAssistantMessage !== undefined &&
    typeof pendingAssistantMessage === 'object'

  const renderedMessages = useMemo(() => {
    if (pendingAssistantMessage === null || isPendingReactNode || pendingAssistantMessage === '') {
      return messages
    }
    const content = String(pendingAssistantMessage)
    return [
      ...messages,
      {
        id: 'pending-assistant',
        role: MessageRole.ASSISTANT,
        content,
        createdAt: new Date().toISOString(),
        parts: [{ type: 'text', text: content } satisfies MessagePart],
      },
    ]
  }, [messages, pendingAssistantMessage, isPendingReactNode])

  const showPendingReactNode = isPendingReactNode && !!pendingAssistantMessage

  // Auto-scroll when new messages arrive or streaming
  useEffect(() => {
    const hasNewMessage = messages.length > prevMessagesLengthRef.current
    const isStreaming = pendingAssistantMessage !== null

    if (hasNewMessage || isStreaming) {
      const scrollToBottom = () => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector(
            '[data-slot="scroll-area-viewport"]'
          ) as HTMLElement
          if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: hasNewMessage ? 'smooth' : 'auto' })
            return
          }
        }
        bottomRef.current?.scrollIntoView({ behavior: hasNewMessage ? 'smooth' : 'auto', block: 'end' })
      }
      requestAnimationFrame(() => setTimeout(scrollToBottom, 50))
    }

    prevMessagesLengthRef.current = messages.length
  }, [messages.length, pendingAssistantMessage, renderedMessages.length])

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="flex flex-col gap-5 py-6">
        {renderedMessages.map((message, index) => {
          const isUser = message.role === MessageRole.USER
          const isLast = index === renderedMessages.length - 1 && !showPendingReactNode

          return (
            <MessageItem
              key={message.id}
              message={message}
              isUser={isUser}
              isLast={isLast}
              agentLabel={agentLabel}
              onFollowupClick={onFollowupClick}
              onActionClick={onActionClick}
              onFeedbackChange={onFeedbackChange}
            />
          )
        })}

        {showPendingReactNode && (
          <PendingMessageWrapper>
            {pendingAssistantMessage as React.ReactNode}
          </PendingMessageWrapper>
        )}

        {renderedMessages.length === 0 && !showPendingReactNode && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground px-8">
            <AgentfloxSparkleIcon className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-medium text-slate-600">How can I help you today?</p>
            <p className="max-w-md text-xs text-slate-400">
              Start the conversation by typing a message below.
            </p>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  )
})
