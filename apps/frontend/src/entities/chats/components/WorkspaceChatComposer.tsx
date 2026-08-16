'use client'

import { useState, useRef, useEffect, memo, useImperativeHandle, forwardRef, useMemo } from 'react'
import { SendHorizontal, Paperclip, Search, X, AtSign, Square, Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ParsedFile } from '../utils/fileParser'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { trpc } from '@/lib/trpc'
import { useSession } from 'next-auth/react'
import { ModelSelectDropdown } from '@/entities/models/components/ModelSelectDropdown'
import type { AiModelView } from '@agentflox/types'
import { renderCommentText } from '@/utils/textRendering'

export interface ChatComposerRef {
  insertMention: (name: string, type: 'agent' | 'task') => void
  focus: () => void
}

interface ChatComposerProps {
  onSend: (message: string, options?: { attachments?: ParsedFile[]; webSearch?: boolean; mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' | 'doc' | 'user' }>; modelId?: string }) => Promise<void> | void
  onStop?: () => void
  conversationId?: string
  isSending?: boolean
  disabled?: boolean
  contextType?: 'PROJECT' | 'TEAM' | 'WORKSPACE' | 'SPACE' | 'TASK' | 'LIST' | 'FOLDER'
  contextId?: string
  className?: string
  inputClassName?: string
  placeholder?: string
  hideMentions?: boolean
  hideWebSearch?: boolean
  minHeight?: number | string
  modelId?: string | null
  onModelChange?: (modelId: string, model: AiModelView) => void
}

export const ChatComposer = memo(forwardRef<ChatComposerRef, ChatComposerProps>(function ChatComposer({
  onSend,
  onStop,
  conversationId,
  isSending,
  disabled,
  className,
  inputClassName,
  placeholder,
  hideMentions,
  hideWebSearch,
  minHeight,
  contextType,
  contextId,
  modelId,
  onModelChange,
}, ref) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ParsedFile[]>([])
  const [webSearch, setWebSearch] = useState(false)
  const [selectedMentions, setSelectedMentions] = useState<Array<{ id: string; name: string; type: 'agent' | 'task' | 'doc' | 'user' }>>([])
  const [uploading, setUploading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionTab, setMentionTab] = useState('people')
  const [internalModelId, setInternalModelId] = useState<string | null>(modelId ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const normalizedCtx = contextType?.toUpperCase();
  const { data: workspace } = trpc.workspace.get.useQuery({ id: contextId || "" }, { enabled: normalizedCtx === "WORKSPACE" && !!contextId })
  const { data: space } = trpc.space.get.useQuery({ id: contextId || "" }, { enabled: normalizedCtx === "SPACE" && !!contextId })
  const { data: project } = trpc.project.get.useQuery({ id: contextId || "" }, { enabled: normalizedCtx === "PROJECT" && !!contextId })
  const { data: team } = trpc.team.get.useQuery({ id: contextId || "" }, { enabled: normalizedCtx === "TEAM" && !!contextId })

  const scopedMembers = useMemo(() => {
    const usersMap = new Map();
    const normalizedContextType = contextType?.toUpperCase();

    if (normalizedContextType === "WORKSPACE" && workspace) {
      if (workspace.owner) {
        usersMap.set(workspace.owner.id, { id: workspace.owner.id, name: workspace.owner.name, image: (workspace.owner as any).image || null });
      }
      workspace.members?.forEach((m: any) => {
        if (m.user) usersMap.set(m.user.id, { id: m.user.id, name: m.user.name, image: m.user.image });
      });
    } else if (normalizedContextType === "SPACE" && space) {
      space.members?.forEach((m: any) => {
        if (m.user) usersMap.set(m.user.id, { id: m.user.id, name: m.user.name, image: m.user.image });
      });
    } else if (normalizedContextType === "PROJECT" && project) {
      if (project.owner) {
        usersMap.set(project.owner.id, { id: project.owner.id, name: project.owner.name, image: project.owner.image });
      }
      project.members?.forEach((m: any) => {
        if (m.user) usersMap.set(m.user.id, { id: m.user.id, name: m.user.name, image: m.user.image });
      });
    } else if (normalizedContextType === "TEAM" && team) {
      if (team.owner) {
        usersMap.set(team.owner.id, { id: team.owner.id, name: team.owner.name, image: (team.owner as any).image });
      }
      team.members?.forEach((m: any) => {
        if (m.user) usersMap.set(m.user.id, { id: m.user.id, name: m.user.name, image: m.user.image });
      });
    } else {
      console.log("No matching contextType or data is missing.", { contextType, hasWorkspace: !!workspace, hasSpace: !!space, hasProject: !!project, hasTeam: !!team });
    }

    const result = Array.from(usersMap.values());
    return result;
  }, [contextType, workspace, space, project, team])

  const { data: tasksData } = trpc.task.list.useQuery(
    { contextId, contextType, pageSize: 20, scope: "all", includeRelations: true },
    { enabled: !!(contextId) }
  )

  const { data: docsData } = trpc.document.list.useQuery(
    { contextId, contextType, pageSize: 20 },
    { enabled: !!(contextId) }
  )

  const scopedTasks = useMemo(() => {
    const allTasksMap = new Map()
      ; (tasksData?.items || []).forEach((t: any) => allTasksMap.set(t.id, t))
    return Array.from(allTasksMap.values())
  }, [tasksData])

  const scopedDocs = useMemo(() => {
    const allDocsMap = new Map()
      ; (docsData?.items || []).forEach((d: any) => allDocsMap.set(d.id, d))
    return Array.from(allDocsMap.values())
  }, [docsData])

  const mentionItems = useMemo(() => {
    const items: { title: string; type: string; status?: string }[] = []
    scopedMembers.forEach((m: any) => {
      if (m.name) items.push({ title: m.name, type: "user" })
    })
    scopedTasks.forEach((t: any) => {
      if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name })
    })
    scopedDocs.forEach((d: any) => {
      if (d.title) items.push({ title: d.title, type: "doc" })
    })
    return items.sort((a, b) => b.title.length - a.title.length)
  }, [scopedMembers, scopedTasks, scopedDocs])

  const renderHighlightedText = () => {
    if (!value) return null
    const result = renderCommentText(value, mentionItems)
    if (value.endsWith('\n')) {
      // @ts-ignore - renderCommentText returns an array of ReactNodes
      return [...(Array.isArray(result) ? result : [result]), <br key="end-br" />]
    }
    return result
  }

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

        const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002'
        const { fetchAuthToken } = await import('@/utils/backend-request')
        const token = await fetchAuthToken()
        const response = await fetch(`${BACKEND_URL}/chat/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
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
    setAttachments([])
    setWebSearch(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const activeMentions = selectedMentions.filter(m => message.includes(`[@${m.name}]`) || message.includes(`[#${m.name}]`))
    const currentMentions = activeMentions.length > 0 ? activeMentions : undefined

    setSelectedMentions([])

    await onSend(message, {
      attachments: currentAttachments,
      webSearch: currentWebSearch,
      mentions: currentMentions,
      modelId: (modelId ?? internalModelId) || undefined,
    })
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    const lastChar = newValue[newValue.length - 1]
    if (lastChar === '@' && !hideMentions) {
      setMentionPopoverOpen(true)
      setMentionTab('people')
      setMentionSearch('')
    } else if (newValue.endsWith('@@') && !hideMentions) {
      setMentionPopoverOpen(true)
      setMentionTab('tasks')
      setMentionSearch('')
    } else if (newValue.endsWith('@@@') && !hideMentions) {
      setMentionPopoverOpen(true)
      setMentionTab('docs')
      setMentionSearch('')
    } else if (newValue === '' || !newValue.includes('@')) {
      setMentionPopoverOpen(false)
    }
  }

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
      {/* CommentsPanel-style mention dropdown */}
      {!hideMentions && mentionPopoverOpen && (
        <div className="absolute bottom-[100%] left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-20 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Tabs header */}
          <div className="flex items-center px-2 pt-2 border-b border-zinc-100 overflow-x-auto no-scrollbar">
            {['People', 'Tasks', 'Docs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setMentionTab(tab.toLowerCase())}
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer',
                  mentionTab === tab.toLowerCase()
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* List */}
          <div className="max-h-[220px] overflow-y-auto p-0">
            {mentionTab === 'people' && (
              scopedMembers.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-400">No members found</div>
              ) : scopedMembers.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setValue(prev => prev.replace(/@+$/, '') + `@${m.name}\u200B `)
                    setMentionPopoverOpen(false)
                    textareaRef.current?.focus()
                    setSelectedMentions(prev => {
                      if (prev.find(x => x.id === m.id)) return prev
                      return [...prev, { id: m.id, name: m.name, type: 'user' }]
                    })
                  }}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={m.image || ""} />
                    <AvatarFallback className="bg-slate-600 text-white text-[9px]">{(m.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-zinc-700 truncate flex-1">
                    {m.id === currentUserId ? 'Me' : m.name}
                  </span>
                </div>
              ))
            )}
            {mentionTab === 'tasks' && (
              scopedTasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-400">No tasks found</div>
              ) : scopedTasks.map((task: any) => {
                const statusName = task.status?.name?.toLowerCase() || ""
                let statusIcon = (
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                )
                if (statusName === "done" || statusName === "completed") {
                  statusIcon = (
                    <div className="w-3 h-3 rounded-full bg-[#10b981] relative shrink-0">
                      <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 text-white" strokeWidth={4} />
                    </div>
                  )
                } else if (statusName === "in progress" || statusName === "doing") {
                  statusIcon = (
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6] relative shrink-0">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white"></div>
                    </div>
                  )
                }

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setValue(prev => prev.replace(/@+$/, '') + `@${task.title}\u200B `)
                      setMentionPopoverOpen(false)
                      textareaRef.current?.focus()
                      setSelectedMentions(prev => {
                        if (prev.find(x => x.id === task.id)) return prev
                        return [...prev, { id: task.id, name: task.title, type: 'task' }]
                      })
                    }}
                  >
                    {statusIcon}
                    <span className="text-xs font-medium text-zinc-700 truncate flex-1">{task.title}</span>
                  </div>
                )
              })
            )}
            {mentionTab === 'docs' && (
              scopedDocs.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-400">No docs found</div>
              ) : scopedDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setValue(prev => prev.replace(/@+$/, '') + `@${doc.title}\u200B `)
                    setMentionPopoverOpen(false)
                    textareaRef.current?.focus()
                    setSelectedMentions(prev => {
                      if (prev.find(x => x.id === doc.id)) return prev
                      return [...prev, { id: doc.id, name: doc.title, type: 'doc' }]
                    })
                  }}
                >
                  <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-700 truncate flex-1">{doc.title}</span>
                </div>
              ))
            )}
          </div>
          <div className="bg-zinc-50 p-2 text-[10px] text-zinc-400 border-t border-zinc-100 text-center">
            '@' People | '@@' Tasks | '@@@' Docs
          </div>
        </div>
      )}

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
        {/* Overlay for syntax highlighting */}
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
          style={minHeight !== undefined ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight } : undefined}
          className={cn(
            'min-h-[44px] w-full resize-none border-0 bg-transparent p-0 text-[15px] font-normal leading-relaxed placeholder:text-zinc-400 focus-visible:ring-0',
            'text-transparent caret-zinc-900 selection:bg-blue-200/50 selection:text-transparent relative z-10',
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

          <ToolbarButton
            onClick={() => {
              setMentionTab('people')
              setMentionSearch('')
              setMentionPopoverOpen(true)
            }}
            active={mentionPopoverOpen}
            tooltip="Mention (@)"
          >
            <AtSign className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            active={false}
            tooltip="Attach files"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </ToolbarButton>

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

          <div className="ml-1">
            <ModelSelectDropdown
              modelId={modelId ?? internalModelId}
              onModelChange={(id, m) => {
                setInternalModelId(id)
                onModelChange?.(id, m)
              }}
            />
          </div>

          <div className="ml-2 hidden items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 sm:flex opacity-60">
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-sm">Shift</kbd>
            <span className="font-medium">+</span>
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-white px-1 shadow-sm">Enter</kbd>
            <span className="ml-1 text-[9px] uppercase tracking-widest font-black">New Line</span>
          </div>
        </div>

        {/* Send / Stop Button */}
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
const ToolbarButton = forwardRef<HTMLButtonElement, { children: React.ReactNode; onClick?: () => void; active?: boolean; tooltip: string; disabled?: boolean }>(
  ({ children, onClick, active, tooltip, disabled }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="ghost"
            onClick={onClick}
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
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }
)

ToolbarButton.displayName = 'ToolbarButton'
