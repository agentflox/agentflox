'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Button from '@/components/ui/button';
import {
  Loader2, Paperclip, Smile, Send, AtSign,
  Megaphone, FileText, ChevronDown, Lightbulb, Bell, MessageCircle, Check
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { type MediaFile } from '@/components/ui/media-upload';
import { storageUtils } from '@/utils/storage/storageUtils';
import { useChannels } from '../hooks/useChannels';
import { trpc } from '@/lib/trpc';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { renderCommentText } from '@/utils/textRendering';

type MessageType = 'message' | 'announcement' | 'discussion' | 'idea' | 'update';

interface Props {
  channelId: string;
  mentionItems?: { title: string; type: string; status?: string }[];
  placeholder?: string;
  parentId?: string;
  /** Edit mode: hides type selector, shows Cancel/Save instead of Send */
  editMode?: boolean;
  initialContent?: string;
  onCancel?: () => void;
  onSave?: (content: string) => void;
  bottomSlot?: React.ReactNode;
  alsoSendToChannel?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<MessageType, { label: string; icon: React.ReactNode; placeholder: string }> = {
  message: {
    label: 'Message',
    icon: <Send className="h-4 w-4 text-zinc-500" />,
    placeholder: 'Message the channel...',
  },
  announcement: {
    label: 'Announcement',
    icon: <Megaphone className="h-4 w-4 text-red-500" />,
    placeholder: 'Share an announcement...',
  },
  discussion: {
    label: 'Discussion',
    icon: <MessageCircle className="h-4 w-4 text-pink-500" />,
    placeholder: 'Start a discussion...',
  },
  idea: {
    label: 'Idea',
    icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
    placeholder: 'Share an idea...',
  },
  update: {
    label: 'Update',
    icon: <Bell className="h-4 w-4 text-blue-500" />,
    placeholder: 'Share an update...',
  },
};

export function ChannelMessageComposer({ channelId, mentionItems: externalMentionItems, placeholder: placeholderProp, parentId, editMode, initialContent, onCancel, onSave, bottomSlot, alsoSendToChannel, className }: Props) {
  const [content, setContent] = useState(initialContent ?? '');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionTab, setMentionTab] = useState('people');
  const [messageType, setMessageType] = useState<MessageType>('message');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useChannels({ channelId });
  const [sending, setSending] = useState(false);

  // Auto-resize textarea; resets height when content is cleared after send
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    if (content) {
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [content]);

  // Fetch workspace members for mention popover
  const { data: channel } = trpc.channel.get.useQuery({ id: channelId }, { staleTime: 60_000 });
  const workspaceId = channel?.workspaceId || '';
  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );

  const { data: tasksData } = trpc.task.list.useQuery(
    { workspaceId, pageSize: 20, scope: "all", includeRelations: true },
    { enabled: !!workspaceId }
  );
  const { data: docsData } = trpc.document.list.useQuery(
    { workspaceId, pageSize: 20 },
    { enabled: !!workspaceId }
  );

  const scopedTasks = tasksData?.items || [];
  const scopedDocs = docsData?.items || [];

  const mentionItems = useMemo(() => {
    const items: { title: string, type: string, status?: string }[] = [];
    members.forEach(m => {
      if (m.user.name || m.user.email) items.push({ title: m.user.name || m.user.email || '', type: "user" });
    });
    scopedTasks.forEach(t => {
      if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name });
    });
    scopedDocs.forEach(d => {
      if (d.title) items.push({ title: d.title, type: "doc" });
    });
    return items.sort((a, b) => b.title.length - a.title.length);
  }, [members, scopedTasks, scopedDocs]);

  // Merge externally provided mentionItems (e.g. from parent modal) with internally fetched ones
  const mergedMentionItems = externalMentionItems ?? mentionItems;

  const filteredMembers = members.filter(m =>
    !mentionSearch ||
    m.user.name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.user.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const isRichType = messageType !== 'message';
  const cfg = TYPE_CONFIG[messageType];

  // ── File uploads ─────────────────────────────────────────────────
  const handleFilesChosen = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    const uploads = await Promise.all(
      files.map(async (file) => {
        const path = storageUtils.generateUniquePath(file.name, `channels/${channelId}`);
        const result = await storageUtils.upload({ file, bucket: 'attachments', path });
        if (result.success && result.url) {
          return { id: path, name: file.name, url: result.url, path, size: file.size, type: file.type } as MediaFile;
        }
        return null;
      })
    );
    const valid = uploads.filter(Boolean) as MediaFile[];
    if (valid.length) setMedia(prev => [...prev, ...valid]);
  };

  // ── Emoji ─────────────────────────────────────────────────────────
  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  }, []);

  // ── @Mention ──────────────────────────────────────────────────────
  const openMentionAtCursor = (insertAt = false) => {
    const ta = textareaRef.current;
    let next = content;
    let cursor = ta?.selectionStart ?? content.length;

    if (insertAt) {
      const end = ta?.selectionEnd ?? cursor;
      next = content.slice(0, cursor) + '@' + content.slice(end);
      cursor += 1;
      setContent(next);
    }

    setShowMentionModal(true);
    setMentionTab('people');
    setMentionSearch('');

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursor, cursor);
    });
  };

  const handleMentionSelect = (text: string) => {
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? content.length;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);
    const mentionMatch = before.match(/(@{1,3})(\w*)$/);
    const cleanedBefore = mentionMatch
      ? before.slice(0, -mentionMatch[0].length)
      : before.replace(/@+$/, '');
    const next = `${cleanedBefore}@${text} ${after}`;
    const nextCursor = cleanedBefore.length + text.length + 2;

    setContent(next);
    setShowMentionModal(false);
    setMentionSearch('');

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(val);

    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/(@{1,3})(\w*)$/);

    if (mentionMatch) {
      const ats = mentionMatch[1];
      setShowMentionModal(true);
      setMentionSearch(mentionMatch[2] || '');
      if (ats === '@@@') setMentionTab('docs');
      else if (ats === '@@') setMentionTab('tasks');
      else setMentionTab('people');
    } else {
      setShowMentionModal(false);
      setMentionSearch('');
    }
  };

  // ── Send ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const text = content.trim();
    if (!text && media.length === 0) return;
    setSending(true);
    try {
      const finalType = (parentId && alsoSendToChannel) ? 'THREAD_BROADCAST' : (isRichType ? messageType.toUpperCase() : 'MESSAGE');
      await sendMessage({
        channelId,
        content: text || '',
        type: finalType,
        title: isRichType ? (title.trim() || undefined) : undefined,
        attachments: media,
        parentId,
      });
      setContent('');
      setTitle('');
      setMedia([]);
      setMessageType('message');
      setShowMentionModal(false);
      setMentionSearch('');
    } catch {
      // Error already surfaced via toast in useChannels
    } finally {
      setSending(false);
    }
  };

  const handleTypeChange = (type: MessageType) => {
    setMessageType(type);
    if (type === 'message') setTitle('');
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={cn("flex flex-col p-4 bg-white border-t gap-3", className)}>
      {/* Attachment previews */}
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map(m => (
            <div key={m.id} className="text-xs px-2.5 py-1.5 rounded-lg border bg-slate-50 flex items-center gap-2 max-w-[200px]">
              <span className="truncate">{m.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Composer box — outer relative so mention popover isn't clipped by rounded overflow */}
      <div className="relative">
        {showMentionModal && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-50 flex flex-col">
            <div className="flex items-center px-2 pt-2 border-b border-zinc-100 overflow-x-auto no-scrollbar">
              {['People', 'Tasks', 'Docs'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMentionTab(tab.toLowerCase())}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer",
                    mentionTab === tab.toLowerCase() ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-0 max-h-[220px] overflow-y-auto">
              {mentionTab === "people" && (
                filteredMembers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-400">No members found</div>
                ) : filteredMembers.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => handleMentionSelect(m.user.name || m.user.email)}
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={m.user.image || ""} />
                      <AvatarFallback className="bg-slate-700 text-white text-[9px]">
                        {(m.user.name || m.user.email || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-700 truncate">{m.user.name || m.user.email}</p>
                    </div>
                  </div>
                ))
              )}
              {mentionTab === "tasks" && (
                scopedTasks.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-400">No tasks found</div>
                ) : scopedTasks.map((task: any) => {
                  const statusName = task.status?.name?.toLowerCase() || "";
                  let statusIcon = (
                    <div className="w-3 h-3 rounded-full border-[1.5px] border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                  );
                  if (statusName === "done" || statusName === "completed") {
                    statusIcon = (
                      <div className="w-3 h-3 rounded-full bg-[#10b981] relative shrink-0">
                        <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 text-white" strokeWidth={4} />
                      </div>
                    );
                  } else if (statusName === "in progress" || statusName === "doing") {
                    statusIcon = (
                      <div className="w-3 h-3 rounded-full bg-[#3b82f6] relative shrink-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white"></div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => handleMentionSelect(task.title)}
                    >
                      {statusIcon}
                      <span className="text-xs font-medium text-zinc-700 truncate flex-1">{task.title}</span>
                    </div>
                  );
                })
              )}
              {mentionTab === "docs" && (
                scopedDocs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-400">No docs found</div>
                ) : scopedDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => handleMentionSelect(doc.title)}
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

        <div className={cn(
          'border rounded-xl overflow-hidden shadow-sm transition-shadow',
          'focus-within:ring-2',
          isRichType
            ? messageType === 'announcement'
              ? 'bg-red-50/20 border-red-200 focus-within:ring-red-200'
              : 'bg-blue-50/20 border-blue-200 focus-within:ring-blue-200'
            : 'bg-slate-50 border-zinc-200 focus-within:ring-indigo-500/20 focus-within:border-indigo-400'
        )}>

          {/* Title input — shown for Post / Announcement */}
          {isRichType && (
            <div className="px-3 pt-3 pb-1 border-b border-dashed border-zinc-200">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Post topic"
                className="w-full bg-transparent text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 outline-none border-0 focus:ring-0"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); textareaRef.current?.focus(); }
                }}
              />
            </div>
          )}

          {/* Content area */}
          <div className="relative min-h-[40px]">
            {/* Styled mention overlay (same pattern as CommentsPanel) */}
            <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden px-3 py-2 text-sm leading-[1.5] text-zinc-900">
              {content
                ? renderCommentText(content, mergedMentionItems)
                : <span className="text-zinc-400">{placeholderProp ?? cfg.placeholder}</span>}
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder=""
              className="relative z-10 w-full min-h-[40px] resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 px-3 py-2 text-sm leading-[1.5]"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Escape' && showMentionModal) {
                  e.preventDefault();
                  setShowMentionModal(false);
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (showMentionModal) {
                    e.preventDefault();
                    return;
                  }
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>

          {bottomSlot}

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 pt-0 z-20">
            <div className="flex items-center gap-0.5">

              {/* Message type selector — hidden in edit mode */}
              {!editMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer">
                      {cfg.icon}
                      <span>{cfg.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 pb-2">
                    <DropdownMenuItem
                      onClick={() => handleTypeChange('message')}
                      className="gap-2 cursor-pointer py-2"
                    >
                      {TYPE_CONFIG.message.icon}
                      <span className="flex-1">{TYPE_CONFIG.message.label}</span>
                      {messageType === 'message' && <Check className="h-4 w-4 text-zinc-900" />}
                    </DropdownMenuItem>

                    <div className="px-2 py-1.5 text-xs text-zinc-500 font-medium">
                      Post Types
                    </div>

                    {(Object.entries(TYPE_CONFIG) as [MessageType, typeof TYPE_CONFIG[MessageType]][])
                      .filter(([key]) => key !== 'message')
                      .map(([key, c]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => handleTypeChange(key)}
                          className="gap-2 cursor-pointer py-2"
                        >
                          {c.icon}
                          <span className="flex-1">{c.label}</span>
                          {messageType === key && <Check className="h-4 w-4 text-zinc-900" />}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="h-4 w-px bg-zinc-300 mx-1" />

              {/* @ Mention */}
              <button
                type="button"
                title="Mention someone"
                className={cn("p-1.5 rounded-full transition-colors cursor-pointer", showMentionModal ? "bg-slate-200 text-slate-700" : "hover:bg-slate-200 text-slate-500")}
                onClick={() => {
                  if (showMentionModal) {
                    setShowMentionModal(false);
                    return;
                  }
                  openMentionAtCursor(true);
                }}
              >
                <AtSign className="h-4 w-4" />
              </button>

              {/* Emoji */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Add emoji"
                    className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-auto p-0 border-0 shadow-2xl">
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.LIGHT} previewConfig={{ showPreview: false }} />
                </PopoverContent>
              </Popover>

              {/* File attach */}
              <button
                type="button"
                title="Attach files"
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { void handleFilesChosen(e.target.files); e.currentTarget.value = ''; }}
              />
            </div>

            {/* Send / Edit actions */}
            {editMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-zinc-200 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSave?.(content.trim())}
                  disabled={!content.trim() || content.trim() === initialContent}
                  className="px-4 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : isRichType ? (
              <div className="flex items-center">
                <Button
                  onClick={handleSubmit}
                  disabled={sending || (!content.trim() && !title.trim() && media.length === 0)}
                  size="sm"
                  className="h-8 px-3 rounded-r-none border-r border-r-white/20 disabled:border-r-zinc-200 bg-zinc-900 hover:bg-zinc-800 text-white disabled:bg-slate-100 disabled:text-slate-400 font-medium text-xs shadow-none cursor-pointer"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Post
                </Button>
                <Button
                  disabled={sending || (!content.trim() && !title.trim() && media.length === 0)}
                  size="sm"
                  className="h-8 px-1.5 rounded-l-none bg-zinc-900 hover:bg-zinc-800 text-white disabled:bg-slate-100 disabled:text-slate-400 shadow-none cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <Button
                  onClick={handleSubmit}
                  disabled={sending || (!content.trim() && media.length === 0)}
                  size="sm"
                  className="h-8 px-3 rounded-r-none border-r border-r-white/20 disabled:border-r-zinc-200 bg-zinc-600 hover:bg-zinc-700 text-white disabled:bg-slate-100 disabled:text-slate-400 font-medium shadow-none cursor-pointer"
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" fill="currentColor" strokeWidth={1} />
                  }
                </Button>
                <Button
                  disabled={sending || (!content.trim() && media.length === 0)}
                  size="sm"
                  className="h-8 px-1.5 rounded-l-none bg-zinc-600 hover:bg-zinc-700 text-white disabled:bg-slate-100 disabled:text-slate-400 shadow-none cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
