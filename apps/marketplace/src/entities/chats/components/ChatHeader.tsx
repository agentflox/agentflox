'use client'

import { useState } from 'react'
import { Edit2, Share2, MoreVertical, Archive, Trash2, Flag, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  title: string
  onRename?: (title: string) => Promise<void>
  onDelete?: () => Promise<void>
  onArchive?: () => Promise<void>
  onShare?: () => void
}

export function ChatHeader({ title, onRename, onDelete, onArchive, onShare }: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = () => {
    setEditValue(title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!onRename || !editValue.trim()) return
    setIsSaving(true)
    try {
      await onRename(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(title)
    setIsEditing(false)
  }

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {isEditing ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave()
                  } else if (e.key === 'Escape') {
                    handleCancel()
                  }
                }}
                className="h-8 flex-1 text-sm sm:text-base"
                autoFocus
                disabled={isSaving}
              />
              <Button
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving || !editValue.trim()}
                className="h-7 w-7 shrink-0 p-0 sm:h-8 sm:w-8"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-7 w-7 shrink-0 p-0 sm:h-8 sm:w-8"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          ) : (
            <div className="group relative flex min-w-0 flex-1 items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
              {onRename && (
                <Button
                  variant="ghost"
                  onClick={handleStartEdit}
                  className={cn(
                    'h-6 w-6 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 sm:h-7 sm:w-7',
                    'hover:bg-slate-100'
                  )}
                  title="Edit title"
                >
                  <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {onShare && (
            <Button
              variant="ghost"
              onClick={onShare}
              className="hidden h-8 px-2 text-sm sm:flex sm:px-3"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Mobile-only share option */}
              {onShare && (
                <>
                  <DropdownMenuItem onClick={onShare} className="sm:hidden">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="sm:hidden" />
                </>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  {onArchive && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onDelete} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <p className="mt-1 hidden text-sm text-slate-500 sm:block">
        Ask questions, ideate, and plan with an AI teammate.
      </p>
    </header>
  )
}
