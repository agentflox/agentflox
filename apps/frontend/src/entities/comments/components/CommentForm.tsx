'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FaSmile, FaHashtag } from 'react-icons/fa';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface CommentFormProps {
  postId: string;
  onSubmit: (content: string, attachments?: string[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  availableTags?: string[];
  availableUsers?: Array<{ id: string; name: string; email?: string }>;
  feedId?: string;
  feedType?: 'global' | 'user' | 'project' | 'team';
}

export function CommentForm({
  postId,
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
  availableTags = ['bug', 'feature', 'documentation', 'question', 'urgent', 'improvement'],
  availableUsers = [],
  feedType,
  feedId,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  // Removed media upload from comment form
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  // Load participants (project or team) for mentions
  const { data: projectParticipants } = trpc.project.getParticipants.useQuery(
    feedType === 'project' && feedId ? { projectId: feedId } : skipToken
  );
  const { data: teamParticipants } = trpc.team.getParticipants.useQuery(
    feedType === 'team' && feedId ? { teamId: feedId } : skipToken
  );

  const mentionOptions = useMemo<{ id: string; name: string; email?: string }[]>(() => {
    const base = availableUsers || [];
    const projectUsers = (projectParticipants?.users || []).map((u: { id: string; name: string | null; email: string | null }) => ({ id: u.id, name: (u.name || u.email || 'User') as string, email: u.email || undefined }));
    const teamUsers = (teamParticipants?.users || []).map((u: { id: string; name: string | null; email: string | null }) => ({ id: u.id, name: (u.name || u.email || 'User') as string, email: u.email || undefined }));
    const loaded = feedType === 'team' ? teamUsers : projectUsers;
    // de-duplicate by id
    const map = new Map<string, { id: string; name: string; email?: string }>();
    for (const u of [...base, ...loaded]) map.set(u.id, u as { id: string; name: string; email?: string });
    return Array.from(map.values());
  }, [availableUsers, feedType, feedId, projectParticipants, teamParticipants]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursor = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(cursor);

    // Check for hashtag trigger
    const textBeforeCursor = newContent.slice(0, cursor);
    // update caret position for suggestion menus
    requestAnimationFrame(() => {
      const posCoords = getTextareaCaretCoordinates(textareaRef.current, newContent, cursor);
      setCaretPos(posCoords);
    });
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      setTagSearch(hashtagMatch[1]);
      setShowTagSuggestions(true);
      setShowUserSuggestions(false);
    } else {
      setShowTagSuggestions(false);
    }

    // Check for mention trigger
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setUserSearch(mentionMatch[1]);
      setShowUserSuggestions(true);
      setShowTagSuggestions(false);
    } else {
      setShowUserSuggestions(false);
    }
  };

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.slice(0, start) + text + content.slice(end);
    
    setContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + text.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);
  }, [content]);

  const insertHashtag = useCallback(() => {
    insertAtCursor('#');
    setShowTagSuggestions(true);
  }, [insertAtCursor]);

  const insertMention = useCallback(() => {
    insertAtCursor('@');
    setShowUserSuggestions(true);
  }, [insertAtCursor]);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    insertAtCursor(emojiData.emoji);
    setShowEmojiPicker(false);
  }, [insertAtCursor]);

  const selectTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const beforeHashtag = textBeforeCursor.slice(0, -hashtagMatch[0].length);
      const newContent = beforeHashtag + `#${tag} ` + textAfterCursor;
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = beforeHashtag.length + tag.length + 2;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowTagSuggestions(false);
    setTagSearch('');
  }, [content, cursorPosition]);

  const selectUser = useCallback((user: { id: string; name: string }) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const newContent = beforeMention + `@${user.name} ` + textAfterCursor;
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = beforeMention.length + user.name.length + 2;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowUserSuggestions(false);
    setUserSearch('');
  }, [content, cursorPosition]);

  // Media upload is not available in comment form

  // Media upload is not available in comment form

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSubmit(content.trim());
    setContent('');
  };

  // Dynamic tags: include participants and teams based on feedtype
  const dynamicTags = useMemo<string[]>(() => {
    if (feedType === 'team') {
      const users = (teamParticipants?.users || []) as Array<{ name: string | null; email: string | null }>;
      return users.map((u) => (u.name || u.email || '').trim()).filter(Boolean);
    }
    const users = (projectParticipants?.users || []) as Array<{ name: string | null; email: string | null }>;
    const teams = (projectParticipants?.teams || []) as Array<{ name: string | null }>;
    const userNames = users.map((u) => (u.name || u.email || '').trim()).filter(Boolean);
    const teamNames = teams.map((t) => (t.name || '').trim()).filter(Boolean);
    return [...userNames, ...teamNames];
  }, [feedType, projectParticipants, teamParticipants]);

  const tagPool = useMemo(() => Array.from(new Set([...(availableTags || []), ...dynamicTags])), [availableTags, dynamicTags]);

  const filteredTags = tagPool.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const filteredUsers = mentionOptions.filter((user) =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-12"
          autoFocus={autoFocus}
          maxLength={2000}
        />

        {/* Hashtag Suggestions */}
        {showTagSuggestions && filteredTags.length > 0 && (
          <div className="absolute z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-lg mt-1"
               style={{ left: Math.max(0, caretPos.left - 8), top: Math.max(0, caretPos.top + 24) }}>
            <ScrollArea className="max-h-48">
              <div className="p-1">
                {filteredTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => selectTag(tag)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded text-sm flex items-center gap-2 transition-colors"
                  >
                    <FaHashtag className="text-slate-400 text-xs" />
                    <span className="font-medium">{tag}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* User Mention Suggestions */}
        {showUserSuggestions && filteredUsers.length > 0 && (
          <div className="absolute z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-lg mt-1"
               style={{ left: Math.max(0, caretPos.left - 8), top: Math.max(0, caretPos.top + 24) }}>
            <ScrollArea className="max-h-48">
              <div className="p-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded text-sm transition-colors"
                  >
                    <div className="font-medium text-slate-800">{user.name}</div>
                    {user.email && (
                      <div className="text-xs text-slate-500">{user.email}</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* No media upload in comment form */}

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1">

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                title="Add emoji"
                className="h-8 px-2.5 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
              >
                <FaSmile className="text-sm" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0" align="start">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.LIGHT}
                searchPlaceHolder="Search emoji..."
                width={350}
                height={400}
                previewConfig={{
                  showPreview: false
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Media upload removed in comment form */}
        </div>

        {/* Character Count and Actions */}
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium transition-colors ${
            content.length > 1800 
              ? 'text-red-500' 
              : content.length > 1500 
              ? 'text-amber-500' 
              : 'text-slate-400'
          }`}>
            {content.length}/2000
          </span>

          <div className="flex gap-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onCancel}
                className="hover:bg-slate-100"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={!content.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300"
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function renderStyledContent(text: string) {
  const parts = text.split(/([#@][\w-]+)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('#')) return <span key={i} className="text-blue-600 font-medium">{p}</span>;
        if (p.startsWith('@')) return <span key={i} className="text-purple-600 font-medium">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function getTextareaCaretCoordinates(el: HTMLTextAreaElement | null, value: string, pos: number): { top: number; left: number } {
  if (!el) return { top: 0, left: 0 };
  const div = document.createElement('div');
  const style = window.getComputedStyle(el);
  const props = [
    'boxSizing','width','height','overflow','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontFamily','lineHeight','textAlign','whiteSpace','letterSpacing','wordBreak'
  ] as const;
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  props.forEach((p: any) => (div.style[p] = style.getPropertyValue(p.replace(/[A-Z]/g, (m: string) => '-' + m.toLowerCase()))));
  div.textContent = value.substring(0, pos);
  const span = document.createElement('span');
  span.textContent = value.substring(pos) || '.';
  div.appendChild(span);
  el.parentElement?.appendChild(div);
  const rect = span.getBoundingClientRect();
  const parentRect = el.getBoundingClientRect();
  const top = rect.top - parentRect.top + el.scrollTop;
  const left = rect.left - parentRect.left + el.scrollLeft;
  div.remove();
  return { top, left };
}
