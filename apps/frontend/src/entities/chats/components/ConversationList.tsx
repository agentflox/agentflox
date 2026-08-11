'use client'

import { Plus, MoreHorizontal, Edit2, Archive, Trash2, Share2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { memo, useState } from 'react'
import { RenameConversationModal } from './RenameConversationModal'
import { ConfirmArchiveConversationModal } from './ConfirmArchiveConversationModal'
import { ConfirmDeleteConversationModal } from './ConfirmDeleteConversationModal'

export interface ConversationListItem {
  id: string
  title: string | null
  lastMessageAt?: string | Date | null
  messageCount: number
}

interface ConversationListProps {
  conversations: ConversationListItem[]
  activeConversationId?: string | null
  onSelect: (conversationId: string) => void
  onCreate: (title?: string, description?: string) => Promise<void> | void
  isCreating?: boolean
  onRename?: (conversationId: string, title: string) => Promise<void>
  onDelete?: (conversationId: string) => Promise<void>
  onArchive?: (conversationId: string) => Promise<void>

  onShare?: (conversationId: string) => void
  variant?: 'default' | 'clean'
  hideHeader?: boolean
}

// Memoize individual conversation items
const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onArchive,
  onShare,
  variant,
}: {
  conversation: ConversationListItem
  isActive: boolean
  onSelect: (id: string) => void
  onRename?: (id: string, title: string) => void
  onDelete?: (id: string, title: string) => void
  onArchive?: (id: string, title: string) => void
  onShare?: (id: string) => void
  variant?: 'default' | 'clean'
}) {
  const title = conversation.title?.trim() || 'Untitled chat'
  const isClean = variant === 'clean'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(conversation.id)
        }
      }}
      className={cn(
        'group relative flex w-full items-center gap-2 cursor-pointer rounded-xl px-3 py-2 transition-all',
        isClean
          ? 'hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          : 'hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isActive
          ? (isClean ? 'bg-slate-100 shadow-sm' : 'bg-slate-800/70 shadow-lg shadow-black/20')
          : 'bg-transparent'
      )}
    >
      <div className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
        isActive
          ? (isClean ? 'bg-primary/10 text-primary' : 'bg-primary text-white')
          : (isClean ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')
      )}>
        <MessageSquare className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-1 overflow-hidden text-left">
        <span
          className={cn(
            'truncate text-[13px] font-normal transition-colors',
            isActive
              ? (isClean ? 'text-slate-900' : 'text-white')
              : (isClean ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-300 group-hover:text-white')
          )}
        >
          {title}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-7 w-7 shrink-0 p-0 opacity-0 transition-all group-hover:opacity-100 sm:h-8 sm:w-8 cursor-pointer',
              isClean
                ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-900'
                : 'hover:bg-slate-700 text-slate-300 hover:text-white',
              isActive && 'opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onRename && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onRename(conversation.id, title)
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}
          {onShare && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onShare(conversation.id)
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onArchive(conversation.id, title)
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              {(onRename || onShare || onArchive) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(conversation.id, title)
                }}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

export const ConversationList = memo(function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  isCreating,
  onRename,
  onDelete,
  onArchive,
  onShare,
  variant = 'default',
  hideHeader = false,
}: ConversationListProps) {
  const isClean = variant === 'clean'

  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleRename = async (newTitle: string) => {
    if (!renameTarget || !onRename) return
    setIsActionLoading(true)
    try {
      await onRename(renameTarget.id, newTitle)
    } finally {
      setIsActionLoading(false)
      setRenameTarget(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget || !onArchive) return
    setIsActionLoading(true)
    try {
      await onArchive(archiveTarget.id)
    } finally {
      setIsActionLoading(false)
      setArchiveTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return
    setIsActionLoading(true)
    try {
      await onDelete(deleteTarget.id)
    } finally {
      setIsActionLoading(false)
      setDeleteTarget(null)
    }
  }

  const content = (
    <>
      {!hideHeader && (
        <div className={cn(
          "flex items-center justify-between border-b px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4",
          isClean ? "border-slate-200 bg-white/50" : "border-slate-800/50 bg-slate-900/50"
        )}>
          <h2 className={cn(
            "text-xs font-bold uppercase tracking-wider sm:text-sm",
            isClean ? "text-slate-500" : "text-slate-300"
          )}>Conversations</h2>
          <Button
            variant={isClean ? "outline" : "primary"}
            onClick={() => onCreate()}
            disabled={isCreating}
            className="h-8 gap-1.5 px-2.5 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">New chat</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {conversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id

            return (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={isActive}
                onSelect={onSelect}
                onRename={onRename ? (id, title) => setRenameTarget({ id, title }) : undefined}
                onDelete={onDelete ? (id, title) => setDeleteTarget({ id, title }) : undefined}
                onArchive={onArchive ? (id, title) => setArchiveTarget({ id, title }) : undefined}
                onShare={onShare}
                variant={variant}
              />
            )
          })}

          {conversations.length === 0 && (
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm sm:py-12",
              isClean ? "text-slate-500" : "text-white/60"
            )}>
              <MessageSquare className={cn(
                "mb-2 h-10 w-10 sm:h-12 sm:w-12",
                isClean ? "text-slate-300" : "text-white/30"
              )} />
              <p className="font-medium">No chats yet</p>
              <p className={cn(
                "text-xs sm:text-sm",
                isClean ? "text-slate-400" : "text-white/50"
              )}>
                Create a new chat to start collaborating with the AI assistant.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      {renameTarget && (
        <RenameConversationModal
          open={!!renameTarget}
          onOpenChange={(open) => !open && !isActionLoading && setRenameTarget(null)}
          currentTitle={renameTarget.title}
          onConfirm={handleRename}
          isLoading={isActionLoading}
        />
      )}
      {archiveTarget && (
        <ConfirmArchiveConversationModal
          open={!!archiveTarget}
          onOpenChange={(open) => !open && !isActionLoading && setArchiveTarget(null)}
          title={archiveTarget.title}
          onConfirm={handleArchive}
          isLoading={isActionLoading}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteConversationModal
          open={!!deleteTarget}
          onOpenChange={(open) => !open && !isActionLoading && setDeleteTarget(null)}
          title={deleteTarget.title}
          onConfirm={handleDelete}
          isLoading={isActionLoading}
        />
      )}
    </>
  )

  if (isClean) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        {content}
      </div>
    )
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-0 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-50 shadow-2xl">
      {content}
    </Card>
  )
})
