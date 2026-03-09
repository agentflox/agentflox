'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { SendHorizontal, Loader2, Paperclip, Search, X, Layers, CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ParsedFile } from '../utils/fileParser'
import { cn } from '@/lib/utils'

interface ChatComposerProps {
  onSend: (message: string, options?: { attachments?: ParsedFile[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }> }) => Promise<void> | void
  conversationId?: string
  isSending?: boolean
  disabled?: boolean
  onContextClick?: () => void
  contextCount?: number
  className?: string
  inputClassName?: string
}

export const ChatComposer = memo(function ChatComposer({
  onSend,
  conversationId,
  isSending,
  disabled,
  onContextClick,
  contextCount = 0,
  className,
  inputClassName
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ParsedFile[]>([])
  const [webSearch, setWebSearch] = useState(false)
  const [contexts, setContexts] = useState<Array<{ type: string; id: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }, [value])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        if (conversationId) {
          formData.append('conversationId', conversationId)
        }

        const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002';
        const response = await fetch(`${BACKEND_URL}/chat/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to upload file')
        }

        return response.json() as Promise<ParsedFile>
      })

      const uploadedFiles = await Promise.all(uploadPromises)
      setAttachments((prev) => [...prev, ...uploadedFiles])
    } catch (error) {
      console.error('File upload error:', error)
      alert('Failed to upload file(s)')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!value.trim() || isSending || disabled) return
    const message = value.trim()
    setValue('')
    const currentAttachments = [...attachments]
    const currentWebSearch = webSearch
    const currentContexts = contexts.length > 0 ? contexts : undefined
    setAttachments([])
    setWebSearch(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await onSend(message, { attachments: currentAttachments, webSearch: currentWebSearch, contexts: currentContexts })
  }

  // Update contexts when contextCount changes (from parent)
  useEffect(() => {
    // This allows parent to control contexts
  }, [contextCount])

  return (
    <div
      className={cn(
        'group relative w-full flex flex-col rounded-2xl border transition-all duration-300 ease-out',
        'bg-white/80 backdrop-blur-sm shadow-sm',
        className,
        isFocused
          ? 'border-zinc-400 ring-4 ring-zinc-900/5 shadow-md'
          : 'border-zinc-200'
      )}
    >
      {/* File Preview Area */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/50 pl-2.5 pr-1.5 py-1 transition-all hover:bg-white hover:shadow-sm"
            >
              <Paperclip className="h-3 w-3 text-zinc-400" />
              <span className="max-w-[150px] truncate text-[11px] font-medium text-zinc-600">
                {attachment.filename}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pt-4 pb-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message or drop files..."
          className={cn(
            'min-h-[44px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0',
            inputClassName
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={disabled || isSending}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            active={false}
            tooltip="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={onContextClick}
            active={contextCount > 0}
            tooltip="Project Context"
          >
            <Layers className="h-4 w-4" />
            {contextCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white ring-2 ring-white">
                {contextCount}
              </span>
            )}
          </ToolbarButton>

          <ToolbarButton
            onClick={() => setWebSearch(!webSearch)}
            active={webSearch}
            tooltip="Web Search"
          >
            <Search className="h-4 w-4" />
          </ToolbarButton>

          <div className="ml-2 hidden items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-zinc-400 sm:flex">
            <kbd className="flex h-5 items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Shift</kbd>
            <span>+</span>
            <kbd className="flex h-5 items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Enter</kbd>
            <span className="ml-1 opacity-60">to new line</span>
          </div>
        </div>

        {/* WORLD CLASS SEND BUTTON */}
        <Button
          onClick={handleSubmit}
          disabled={disabled || isSending || !value.trim()}
          className={cn(
            "relative max-w-24 h-9 rounded-lg px-4 font-semibold transition-all duration-200 overflow-hidden",
            "flex items-center justify-center gap-2 select-none active:scale-[0.96]",
            "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/10",
            "shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]",
            "disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none disabled:active:scale-100",
            isSending && "text-transparent pointer-events-none"
          )}
        >
          {isSending ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              <span className="text-sm tracking-tight">Send</span>
              <SendHorizontal className={cn(
                "h-3.5 w-3.5 transition-all duration-300 ease-out",
                value.trim() ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
              )} />
            </>
          )}
        </Button>
      </div>
    </div>
  )
})

// Sub-component for Toolbar Buttons to keep code DRY
function ToolbarButton({ children, onClick, active, tooltip }: { children: React.ReactNode, onClick?: () => void, active?: boolean, tooltip: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      title={tooltip}
      className={cn(
        "relative h-8 w-8 rounded-lg p-0 transition-all duration-200",
        active
          ? "bg-zinc-900 text-white hover:bg-zinc-800"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      {children}
    </Button>
  )
}
