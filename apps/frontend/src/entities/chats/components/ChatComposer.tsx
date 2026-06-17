'use client'

import { useState, useRef, useEffect, memo, useImperativeHandle, forwardRef, useMemo } from 'react'
import { SendHorizontal, Loader2, Paperclip, Search, X, Layers, AtSign, Bot, BrainCircuit, Files, Sparkles, Command, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ParsedFile } from '../utils/fileParser'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface ChatComposerRef {
  insertMention: (name: string, type: 'agent' | 'task') => void
  focus: () => void
}

interface ChatComposerProps {
  onSend: (message: string, options?: { attachments?: ParsedFile[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }> }) => Promise<void> | void
  onStop?: () => void
  conversationId?: string
  isSending?: boolean
  disabled?: boolean
  onContextClick?: () => void
  contextCount?: number
  onMentionClick?: () => void
  onMentionSelect?: (mention: { id: string; name: string; type: 'agent' | 'task' }) => void
  mentionCount?: number
  selectedMentions?: any[]
  mentionsData?: {
    agents: any[]
    tasks: any[]
  }
  className?: string
  inputClassName?: string
  placeholder?: string
  hideMentions?: boolean
  hideContext?: boolean
  hideWebSearch?: boolean
}

export const ChatComposer = memo(forwardRef<ChatComposerRef, ChatComposerProps>(function ChatComposer({
  onSend,
  onStop,
  conversationId,
  isSending,
  disabled,
  onContextClick,
  contextCount = 0,
  onMentionClick,
  onMentionSelect,
  mentionCount = 0,
  selectedMentions = [],
  mentionsData = { agents: [], tasks: [] },
  className,
  inputClassName,
  placeholder,
  hideMentions,
  hideContext,
  hideWebSearch
}, ref) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ParsedFile[]>([])
  const [webSearch, setWebSearch] = useState(false)
  const [contexts, setContexts] = useState<Array<{ type: string; id: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const renderHighlightedText = () => {
    if (!value) return null

    // Match either the old bracket style or the new zero-width space style
    const regex = /(\[(?:@|#)[^\]]+\]|@[^\u200B]+\u200B|#[^\u200B]+\u200B)/g
    const parts = value.split(regex)

    const highlighted = parts.map((part, i) => {
      let isMention = false;
      let name = '';
      let prefix = '';

      if (part.startsWith('[@') && part.endsWith(']')) {
        isMention = true;
        prefix = '@';
        name = part.slice(2, -1);
      } else if (part.startsWith('[#') && part.endsWith(']')) {
        isMention = true;
        prefix = '#';
        name = part.slice(2, -1);
      } else if (part.startsWith('@') && part.endsWith('\u200B')) {
        isMention = true;
        prefix = '@';
        name = part.slice(1, -1);
      } else if (part.startsWith('#') && part.endsWith('\u200B')) {
        isMention = true;
        prefix = '#';
        name = part.slice(1, -1);
      }

      if (isMention) {
        return (
          <span
            key={i}
            className={prefix === '@' ? "text-purple-700" : "text-indigo-700"}
          >
            {prefix}{name}
          </span>
        )
      }
      return <span key={i} className="text-zinc-900">{part}</span>
    })

    if (value.endsWith('\n')) {
      highlighted.push(<br key="end-br" />)
    }

    return highlighted
  }

  useImperativeHandle(ref, () => ({
    insertMention: (name: string, type: 'agent' | 'task') => {
      const prefix = '@';
      const mentionStr = `${prefix}${name}\u200B `;
      setValue(prev => prev.endsWith('@') ? prev.slice(0, -1) + mentionStr : prev + mentionStr);
      textareaRef.current?.focus()
    },
    focus: () => {
      textareaRef.current?.focus()
    }
  }))

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const newHeight = `${Math.min(scrollHeight, 200)}px`
      textareaRef.current.style.height = newHeight
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
    if (!value.trim() || disabled) return
    let message = value.trim()

    // Parse the zero-width space format back into the bracket format the backend expects
    message = message.replace(/@([^\u200B]+)\u200B/g, '[@$1]')
    message = message.replace(/#([^\u200B]+)\u200B/g, '[#$1]')

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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    // Detect @ typing
    const lastChar = newValue[newValue.length - 1]
    if (lastChar === '@' && !hideMentions) {
      setMentionPopoverOpen(true)
      setMentionSearch('')
    }
  }

  const filteredTasks = useMemo(() => {
    return mentionsData.tasks.filter(t => {
      const title = (t.data?.label || t.data?.title || t.title || "Task").toLowerCase();
      return title.includes(mentionSearch.toLowerCase());
    });
  }, [mentionsData.tasks, mentionSearch]);

  const filteredAgents = useMemo(() => {
    return mentionsData.agents.filter(a => {
      const name = (a.data?.label || a.data?.name || a.name || "Agent").toLowerCase();
      return name.includes(mentionSearch.toLowerCase());
    });
  }, [mentionsData.agents, mentionSearch]);

  return (
    <div
      className={cn(
        'group relative w-full flex flex-col rounded-2xl border transition-all duration-500 ease-out',
        'bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className,
        isFocused
          ? 'border-zinc-300 ring-4 ring-zinc-900/5 shadow-[0_12px_40px_rgb(0,0,0,0.08)]'
          : 'border-zinc-200 hover:border-zinc-300',
        disabled && 'opacity-50 pointer-events-none bg-zinc-50/80 grayscale-[0.5]'
      )}
    >
      {/* File Preview Area */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/50 pl-2.5 pr-1.5 py-1 transition-all hover:bg-white hover:shadow-sm hover:border-zinc-300"
            >
              <Paperclip className="h-3 w-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
              <span className="max-w-[150px] truncate text-[11px] font-semibold text-zinc-600 group-hover:text-zinc-900 transition-colors">
                {attachment.filename}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pt-4 pb-2 relative">
        {/* Overlay for syntax highlighting - inset-0 is relative to outer edge, so we repeat parent padding */}
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 px-4 pt-4 pb-2 pointer-events-none whitespace-pre-wrap break-words overflow-hidden",
            "text-[15px] font-normal leading-relaxed",
            inputClassName
          )}
          aria-hidden="true"
        >
          {renderHighlightedText()}
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={(e) => {
            if (overlayRef.current) {
              overlayRef.current.scrollTop = e.currentTarget.scrollTop
            }
          }}
          placeholder={placeholder || "Type a message..."}
          className={cn(
            'min-h-[44px] w-full resize-none border-0 bg-transparent p-0 text-[15px] font-normal leading-relaxed placeholder:text-zinc-400 focus-visible:ring-0',
            'text-transparent caret-zinc-900 selection:bg-blue-200/50 selection:text-transparent',
            inputClassName
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
              return
            }

            // Smart mention deletion: delete the whole mention tag on Backspace
            if (e.key === 'Backspace' && textareaRef.current) {
              const textarea = textareaRef.current
              const cursorPos = textarea.selectionStart
              const selectionEnd = textarea.selectionEnd

              // Only intercept when no text is selected
              if (cursorPos === selectionEnd && cursorPos > 0) {
                const textBefore = value.slice(0, cursorPos)
                // Find if the cursor is right after a mention
                const mentionEndMatch = textBefore.match(/(.*?)(\[[@#][^\]]+\]|[@#][^\u200B]+\u200B)$/)
                if (mentionEndMatch) {
                  e.preventDefault()
                  const tagLength = mentionEndMatch[2].length
                  const newValue = value.slice(0, cursorPos - tagLength) + value.slice(cursorPos)
                  setValue(newValue)
                  // Restore cursor to where the tag started
                  const newCursorPos = cursorPos - tagLength
                  requestAnimationFrame(() => {
                    textarea.setSelectionRange(newCursorPos, newCursorPos)
                  })
                  return
                }
                // Handle cursor sitting inside an unclosed BRACKET tag like [@Name
                const openBracketMatch = textBefore.match(/(.*?)(\[[@#][^\]]*?)$/)
                if (openBracketMatch) {
                  e.preventDefault()
                  const tagLength = openBracketMatch[2].length
                  const newValue = value.slice(0, cursorPos - tagLength) + value.slice(cursorPos)
                  setValue(newValue)
                  const newCursorPos = cursorPos - tagLength
                  requestAnimationFrame(() => {
                    textarea.setSelectionRange(newCursorPos, newCursorPos)
                  })
                  return
                }
              }
            }
          }}
          disabled={disabled}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

          {!hideMentions && (
            <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
              <PopoverTrigger asChild>
                <ToolbarButton
                  onClick={() => {
                    setMentionPopoverOpen(true)
                  }}
                  active={false}
                  tooltip="Mention Agent or Task (@)"
                >
                  <AtSign className="h-4 w-4" />
                </ToolbarButton>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={12}
                className="w-80 p-0 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-zinc-200/50 bg-white/95 backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-col h-[420px]">
                  {/* Search Header */}
                  <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-2 px-2.5 h-9 rounded-xl bg-white border border-zinc-200 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/50 transition-all">
                      <Search className="h-3.5 w-3.5 text-zinc-400" />
                      <Input
                        variant="ghost"
                        placeholder="Search tasks or agents..."
                        value={mentionSearch}
                        onChange={(e) => setMentionSearch(e.target.value)}
                        className="w-full h-full border-0 bg-transparent p-0 text-[13px] font-normal focus:outline-none focus:ring-0 focus-visible:ring-0 placeholder:text-zinc-400"
                        autoFocus
                      />
                      <div className="flex items-center gap-1 opacity-40">
                        <Command className="h-3 w-3" />
                        <span className="text-[10px] font-bold">K</span>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0">
                    <div className="px-3 pt-3 pb-1">
                      <TabsList className="w-full grid grid-cols-2 rounded-xl bg-zinc-100/80 p-1 h-9 border-0 gap-1">
                        <TabsTrigger value="tasks" className="rounded-lg border-0 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-all cursor-pointer">
                          <Files className="h-3.5 w-3.5 mr-2" />
                          Tasks
                        </TabsTrigger>
                        <TabsTrigger value="agents" className="rounded-lg border-0 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-all cursor-pointer">
                          <Bot className="h-3.5 w-3.5 mr-2" />
                          Agents
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <TabsContent value="tasks" className="m-0 p-2">
                        {filteredTasks.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center opacity-40">
                            <Files className="h-8 w-8 mb-3" />
                            <div className="text-[12px] font-bold tracking-tight">No tasks found</div>
                            <div className="text-[10px] mt-1">Try a different search</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredTasks.map((task: any) => {
                              const title = task.data?.label || task.data?.title || task.title || "Task";
                              const taskId = task.data?.taskId || task.id;
                              return (
                                <button
                                  key={task.id}
                                  onClick={() => {
                                    const mentionStr = `[@${title}]\u200B `;
                                    setValue(prev => prev.endsWith('@') ? prev.slice(0, -1) + mentionStr.replace('[@', '@').replace(']', '') : prev + mentionStr.replace('[@', '@').replace(']', ''));
                                    setMentionPopoverOpen(false);
                                    textareaRef.current?.focus();
                                    onMentionSelect?.({ id: taskId, name: title, type: 'task' });
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 group transition-all text-left border border-transparent hover:border-indigo-100 shadow-none hover:shadow-sm cursor-pointer"
                                >
                                  <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                    <Files size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-medium text-zinc-800 group-hover:text-indigo-900 truncate">{title}</div>
                                    <div className="text-[10px] text-zinc-500 group-hover:text-indigo-600/70 truncate mt-0.5 flex items-center gap-1">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      Active Task
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="agents" className="m-0 p-2">
                        {filteredAgents.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center opacity-40">
                            <Bot className="h-8 w-8 mb-3" />
                            <div className="text-[12px] font-bold tracking-tight">No agents found</div>
                            <div className="text-[10px] mt-1">Try a different search</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filteredAgents.map((agent: any) => {
                              const name = agent.data?.label || agent.data?.name || agent.name || "Agent";
                              const agentId = agent.data?.agentId || agent.id;
                              const isCoordinator = agent.data?.isCoordinator || agent.agentType === 'WORKFLOW_MANAGER';
                              return (
                                <button
                                  key={agent.id}
                                  onClick={() => {
                                    const mentionStr = `[@${name}]\u200B `;
                                    setValue(prev => prev.endsWith('@') ? prev.slice(0, -1) + mentionStr.replace('[@', '@').replace(']', '') : prev + mentionStr.replace('[@', '@').replace(']', ''));
                                    setMentionPopoverOpen(false);
                                    textareaRef.current?.focus();
                                    onMentionSelect?.({ id: agentId, name, type: 'agent' });
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border border-transparent shadow-none hover:shadow-sm cursor-pointer",
                                    isCoordinator ? "hover:bg-purple-50 hover:border-purple-100 group" : "hover:bg-blue-50 hover:border-blue-100 group"
                                  )}
                                >
                                  <div className="relative">
                                    <Avatar className={cn('h-10 w-10 rounded-xl shadow-sm border shrink-0 transition-transform duration-300 group-hover:scale-105',
                                      isCoordinator ? 'border-purple-200 bg-purple-100' : 'border-zinc-200 bg-blue-50/50'
                                    )}>
                                      <AvatarImage src={agent.data?.avatar || agent.avatar} />
                                      <AvatarFallback className={cn('rounded-xl font-bold', isCoordinator ? 'bg-purple-100 text-purple-600' : 'bg-blue-50/50 text-blue-600')}>
                                        {isCoordinator ? <BrainCircuit className="h-5 w-5 opacity-80" /> : <Bot className="h-5 w-5 opacity-80" />}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white", isCoordinator ? "bg-purple-500" : "bg-emerald-500")} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn('text-[13px] font-medium truncate transition-colors',
                                      isCoordinator ? 'text-purple-900 group-hover:text-purple-700' : 'text-zinc-900 group-hover:text-blue-700'
                                    )}>{name}</div>
                                    <div className={cn('text-[10px] truncate mt-0.5 font-medium', isCoordinator ? 'text-purple-600/70' : 'text-zinc-500')}>
                                      {agent.data?.description || agent.description || (isCoordinator ? 'Swarm Coordinator' : 'Active Swarm Member')}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>

                  {/* Footer hint */}
                  <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-[9px] font-black text-zinc-400">ESC</div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">to close</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            active={false}
            tooltip="Attach files"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </ToolbarButton>

          {!hideContext && (
            <ToolbarButton
              onClick={onContextClick}
              active={contextCount > 0}
              tooltip="Project Context"
              disabled={disabled}
            >
              <Layers className="h-4 w-4" />
              {contextCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-black text-white ring-2 ring-white">
                  {contextCount}
                </span>
              )}
            </ToolbarButton>
          )}

          {!hideWebSearch && (
            <ToolbarButton
              onClick={() => setWebSearch(!webSearch)}
              active={webSearch}
              tooltip="Web Search"
              disabled={disabled}
            >
              <Search className="h-4 w-4" />
            </ToolbarButton>
          )}

          <div className="ml-2 hidden items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 sm:flex opacity-60">
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-sm">Shift</kbd>
            <span className="font-medium">+</span>
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-sm">Enter</kbd>
            <span className="ml-1 text-[9px] uppercase tracking-widest font-black">New Line</span>
          </div>
        </div>

        {/* WORLD CLASS SEND BUTTON */}
        <Button
          onClick={isSending ? onStop : handleSubmit}
          disabled={(disabled && !isSending) || (!isSending && !value.trim())}
          className={cn(
            "relative h-10 w-10 shrink-0 rounded-xl p-0 transition-all duration-300 overflow-hidden",
            "flex items-center justify-center select-none active:scale-[0.95] group/send",
            isSending
              ? "bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm"
              : "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 hover:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]",
            !isSending && "shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]",
            "disabled:bg-zinc-100 disabled:text-zinc-300 disabled:shadow-none disabled:active:scale-100"
          )}
        >
          {isSending ? (
            <div className="flex items-center justify-center text-red-600">
              <Square className="h-4 w-4 fill-current" />
            </div>
          ) : (
            <>
              <SendHorizontal className={cn(
                "h-4 w-4 transition-all duration-500 ease-out",
                value.trim() ? "translate-x-0 opacity-100 scale-100" : "opacity-70 scale-90"
              )} />

              {/* Inner highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity pointer-events-none" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}))

// Sub-component for Toolbar Buttons to keep code DRY
const ToolbarButton = forwardRef<HTMLButtonElement, { children: React.ReactNode, onClick?: () => void, active?: boolean, tooltip: string, disabled?: boolean }>(
  ({ children, onClick, active, tooltip, disabled }, ref) => {
    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        onClick={onClick}
        title={tooltip}
        disabled={disabled}
        className={cn(
          "relative h-9 w-9 rounded-xl p-0 transition-all duration-300 ease-in-out",
          active
            ? "bg-zinc-900 text-white shadow-md hover:bg-zinc-800 hover:shadow-lg"
            : "text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-transparent hover:border-zinc-200",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:border-transparent"
        )}
      >
        {children}
      </Button>
    )
  }
)
ToolbarButton.displayName = 'ToolbarButton'
