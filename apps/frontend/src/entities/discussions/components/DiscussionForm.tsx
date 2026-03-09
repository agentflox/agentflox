'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  FaSmile, 
  FaHashtag, 
  FaTimes, 
  FaTag, 
  FaCheck,
  FaInfoCircle 
} from 'react-icons/fa';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { PostTopic } from '@agentflox/database/src/generated/prisma/client';
import { POST_TOPICS } from '../constants';
import { cn } from '@/lib/utils';

interface DiscussionFormProps {
  onSubmit: (args: { 
    title: string; 
    content: string; 
    topic?: PostTopic;
    tags?: string[];
    attachments?: string[] 
  }) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  availableTags?: string[];
  availableUsers?: Array<{ id: string; name: string; email?: string }>;
  feedId?: string;
  feedType?: 'global' | 'user' | 'project' | 'team';
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Team {
  name: string | null;
}

export function DiscussionForm({
  onSubmit,
  onCancel,
  placeholder = 'Share your thoughts, ideas, or questions...',
  autoFocus = false,
  availableTags = ['bug', 'feature', 'documentation', 'question', 'urgent', 'improvement'],
  availableUsers = [],
  feedType,
  feedId,
}: DiscussionFormProps) {
  const [topic, setTopic] = useState<PostTopic | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isFocused, setIsFocused] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load participants (project or team) for mentions
  const { data: projectParticipants } = trpc.project.getParticipants.useQuery(
    feedType === 'project' && feedId ? { projectId: feedId } : skipToken
  );
  
  const { data: teamParticipants } = trpc.team.getParticipants.useQuery(
    feedType === 'team' && feedId ? { teamId: feedId } : skipToken
  );

  const mentionOptions = useMemo<{ id: string; name: string; email?: string }[]>(() => {
    const base = availableUsers || [];
    const projectUsers = (projectParticipants?.users || []).map((u: User) => ({ 
      id: u.id, 
      name: u.name || u.email || 'User', 
      email: u.email || undefined 
    }));
    const teamUsers = (teamParticipants?.users || []).map((u: User) => ({ 
      id: u.id, 
      name: u.name || u.email || 'User', 
      email: u.email || undefined 
    }));
    const loaded = feedType === 'team' ? teamUsers : projectUsers;
    
    // De-duplicate by id
    const map = new Map<string, { id: string; name: string; email?: string }>();
    for (const u of [...base, ...loaded]) {
      map.set(u.id, u);
    }
    return Array.from(map.values());
  }, [availableUsers, feedType, projectParticipants, teamParticipants]);

  // Dynamic tags: include participants and teams based on feedtype
  const dynamicTags = useMemo<string[]>(() => {
    if (feedType === 'team') {
      const users = (teamParticipants?.users || []) as User[];
      return users.map((u) => (u.name || u.email || '').trim()).filter(Boolean);
    }
    const users = (projectParticipants?.users || []) as User[];
    const teams = (projectParticipants?.teams || []) as Team[];
    const userNames = users.map((u) => (u.name || u.email || '').trim()).filter(Boolean);
    const teamNames = teams.map((t) => (t.name || '').trim()).filter(Boolean);
    return [...userNames, ...teamNames];
  }, [feedType, projectParticipants, teamParticipants]);

  const tagPool = useMemo(() => 
    Array.from(new Set([...(availableTags || []), ...dynamicTags])), 
    [availableTags, dynamicTags]
  );

  const filteredTags = useMemo(() => 
    tagPool.filter((tag) =>
      tag.toLowerCase().includes(tagSearch.toLowerCase())
    ).slice(0, 8),
    [tagPool, tagSearch]
  );

  const filteredUsers = useMemo(() =>
    mentionOptions.filter((user) =>
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 8),
    [mentionOptions, userSearch]
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursor = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(cursor);

    // Check for hashtag trigger
    const textBeforeCursor = newContent.slice(0, cursor);
    
    // Update caret position for suggestion menus
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const posCoords = getTextareaCaretCoordinates(textareaRef.current, newContent, cursor);
        setCaretPos(posCoords);
      }
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
  }, []);

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

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  }, [tags]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSubmit({ 
      title: title.trim(), 
      content: content.trim(), 
      topic: topic || undefined,
      tags: tags.length > 0 ? tags : undefined
    });
    
    setContent('');
    setTitle('');
    setTopic('');
    setTags([]);
    setTagInput('');
  }, [title, content, topic, tags, onSubmit]);

  const contentCharCount = content.length;
  const titleCharCount = title.length;
  const isSubmitDisabled = !title.trim() || !content.trim();

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Discussion Title <span className="text-red-500">*</span>
            </Label>
            <span className={cn(
              "text-xs font-medium transition-colors",
              titleCharCount > 100 ? 'text-amber-600' : 'text-slate-400'
            )}>
              {titleCharCount}/120
            </span>
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your discussion a clear, descriptive title"
            className={cn(
              "text-base transition-all duration-200",
              isFocused && "ring-2 ring-blue-500/20 border-blue-400"
            )}
            maxLength={120}
            autoFocus={autoFocus}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>

        {/* Topic Category */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-slate-700">
              Topic Category
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                  <FaInfoCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Choose a category that best describes your discussion</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(POST_TOPICS).map(([key, value]) => {
              const isSelected = topic === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTopic(isSelected ? '' : (key as PostTopic))}
                  className={cn(
                    "group relative px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isSelected
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg shadow-blue-500/30"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{value.label}</span>
                    {isSelected && <FaCheck className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className="text-sm font-semibold text-slate-700">
              Content <span className="text-red-500">*</span>
            </Label>
            <span className={cn(
              "text-xs font-medium transition-colors",
              contentCharCount > 1800 
                ? 'text-red-500 font-semibold' 
                : contentCharCount > 1500 
                ? 'text-amber-500' 
                : 'text-slate-400'
            )}>
              {contentCharCount}/2000
            </span>
          </div>
          
          <div className="relative">
            <Textarea
              id="content"
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder={placeholder}
              className={cn(
                "min-h-[180px] resize-none pr-12 text-base leading-relaxed transition-all duration-200",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              )}
              maxLength={2000}
            />

            {/* Hashtag Suggestions */}
            {showTagSuggestions && filteredTags.length > 0 && (
              <div 
                className="absolute z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ 
                  left: Math.max(0, Math.min(caretPos.left - 8, window.innerWidth - 300)), 
                  top: Math.max(0, caretPos.top + 28) 
                }}
              >
                <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <FaHashtag className="text-blue-600" />
                    Suggested Tags
                  </p>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => selectTag(tag)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg text-sm flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <FaHashtag className="text-blue-600 text-xs" />
                        </div>
                        <span className="font-medium text-slate-800">{tag}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* User Mention Suggestions */}
            {showUserSuggestions && filteredUsers.length > 0 && (
              <div 
                className="absolute z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ 
                  left: Math.max(0, Math.min(caretPos.left - 8, window.innerWidth - 340)), 
                  top: Math.max(0, caretPos.top + 28) 
                }}
              >
                <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">Mention User</p>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full text-left px-3 py-2.5 hover:bg-purple-50 rounded-lg text-sm transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{user.name}</div>
                            {user.email && (
                              <div className="text-xs text-slate-500 truncate">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>💡 Use <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">#</kbd> for tags and <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">@</kbd> to mention users</span>
          </p>
        </div>

        {/* Tags Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="tags" className="text-sm font-semibold text-slate-700">
              Tags <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                  <FaInfoCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Add up to 5 tags to help others discover your discussion</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex gap-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a tag and press Enter"
              className="text-base flex-1"
              maxLength={20}
              disabled={tags.length >= 5}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 5}
              className="px-4 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              <FaTag className="h-4 w-4" />
            </Button>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="pl-3 pr-2 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 hover:from-blue-200 hover:to-indigo-200 transition-all"
                >
                  <FaHashtag className="inline mr-1.5 text-xs" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:bg-blue-300 rounded-full p-1 transition-colors"
                  >
                    <FaTimes className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span className={cn(
              "font-medium",
              tags.length >= 5 ? "text-blue-600" : "text-slate-600"
            )}>
              {tags.length}/5 tags
            </span>
            <span>•</span>
            <span>Tags help categorize and discover discussions</span>
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-3 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                >
                  <FaSmile className="h-4 w-4" />
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onCancel}
                className="hover:bg-slate-100 transition-colors"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitDisabled}
              className={cn(
                "px-6 font-semibold transition-all duration-200",
                "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                "disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed",
                "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40",
                "active:scale-95"
              )}
            >
              Publish Discussion
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}

// Utility function to get textarea caret coordinates
function getTextareaCaretCoordinates(
  el: HTMLTextAreaElement | null, 
  value: string, 
  pos: number
): { top: number; left: number } {
  if (!el) return { top: 0, left: 0 };
  
  const div = document.createElement('div');
  const style = window.getComputedStyle(el);
  const props = [
    'boxSizing', 'width', 'height', 'overflow', 
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 
    'fontFamily', 'lineHeight', 'textAlign', 'whiteSpace', 'letterSpacing', 'wordBreak'
  ] as const;
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  
  props.forEach((prop) => {
    const cssProperty = prop.replace(/[A-Z]/g, (m: string) => '-' + m.toLowerCase());
    const value = style.getPropertyValue(cssProperty);
    (div.style as any)[prop] = value;
  });
  
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
