'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { usePosts } from '../hooks/usePosts';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { MediaUpload, type MediaFile } from '@/components/ui/media-upload';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FaHashtag, FaSmile as FaSmileIcon } from 'react-icons/fa';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { PostType } from '@agentflox/database/src/generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface PostComposerProps {
  feedType: 'global' | 'user' | 'project' | 'team';
  feedId?: string;
  placeholder?: string;
  availableTags?: string[];
}

export function PostComposer({
  feedType,
  feedId,
  availableTags = ['bug', 'feature', 'documentation', 'question', 'urgent', 'improvement'],
  placeholder = "What's on your mind?",
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { createPost } = usePosts(feedType, feedId);
  const notifyUsers = trpc.notification.createForUserIds.useMutation();

  const { data: projectParticipants } = trpc.project.getParticipants.useQuery(
    feedType === 'project' && feedId ? { projectId: feedId } : skipToken
  );
  const { data: teamParticipants } = trpc.team.getParticipants.useQuery(
    feedType === 'team' && feedId ? { teamId: feedId } : skipToken
  );

  const mentionOptions = useMemo(() => {
    const users = feedType === 'team' ? (teamParticipants?.users || []) : (projectParticipants?.users || []);
    return users.map(u => ({ id: u.id, name: u.name || u.email || 'User', email: u.email || undefined }));
  }, [feedType, teamParticipants, projectParticipants]);

  // Dynamic tags similar to CommentForm
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(newContent);
    setCursorPosition(cursor);

    // Get caret position for suggestion menus
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = getTextareaCaretCoordinates(textareaRef.current, cursor);
        setCaretPos(pos);
      }
    });

    const textBeforeCursor = newContent.slice(0, cursor);

    // Check for hashtag
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    if (hashtagMatch) {
      setShowTagSuggestions(true);
      setTagSearch(hashtagMatch[1]);
    } else {
      setShowTagSuggestions(false);
      setTagSearch('');
    }

    // Check for mention
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setShowUserSuggestions(true);
      setUserSearch(mentionMatch[1]);
    } else {
      setShowUserSuggestions(false);
      setUserSearch('');
    }
  };

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.slice(0, start) + text + content.slice(end);
    setContent(newContent);
    const newPosition = start + text.length;
    setCursorPosition(newPosition);
    
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    });
  }, [content]);

  const handleEmojiClick = useCallback((emojiData: { emoji: string }) => {
    insertAtCursor(emojiData.emoji);
    setShowEmojiPicker(false);
  }, [insertAtCursor]);

  const selectUser = useCallback((user: { id: string; name: string }) => {
    if (!textareaRef.current) return;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const newContent = beforeMention + `@${user.name} ` + textAfterCursor;
      setContent(newContent);
      setMentionedUserIds((prev) => Array.from(new Set([...prev, user.id])));
      
      const newPosition = beforeMention.length + user.name.length + 2;
      setCursorPosition(newPosition);
      
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      });
    }
    
    setShowUserSuggestions(false);
    setUserSearch('');
  }, [content, cursorPosition]);

  const selectTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const beforeHashtag = textBeforeCursor.slice(0, -hashtagMatch[0].length);
      const newContent = beforeHashtag + `#${tag} ` + textAfterCursor;
      setContent(newContent);
      
      const newPosition = beforeHashtag.length + tag.length + 2;
      setCursorPosition(newPosition);
      
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      });
    }
    
    setShowTagSuggestions(false);
    setTagSearch('');
  }, [content, cursorPosition]);

  const removeMedia = useCallback((mediaId: string) => {
    setMedia(prev => prev.filter(m => m.id !== mediaId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const resp = await createPost.mutateAsync({
        id: uuidv4(),
        content: content.trim(),
        ...(media.length ? { attachments: media } : {}),
        ...(feedType === 'project' ? { projectId: feedId } : {}),
        ...(feedType === 'team' ? { teamId: feedId } : {}),
        type: PostType.POST,
      } as any);

      if (mentionedUserIds.length > 0) {
        try {
          await notifyUsers.mutateAsync({
            userIds: mentionedUserIds,
            title: 'You were mentioned',
            content: 'You were mentioned in a post.',
            relatedId: (resp as any)?.post?.id as string | undefined,
            relatedType: 'POST',
          });
        } catch {}
      }

      setContent('');
      setMedia([]);
      setMentionedUserIds([]);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  // Filter suggestions
  const filteredUsers = useMemo(() => {
    return (mentionOptions || [])
      .filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
      )
      .slice(0, 8);
  }, [mentionOptions, userSearch]);

  const filteredTags = useMemo(() => {
    return tagPool.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 8);
  }, [tagPool, tagSearch]);

  // Dynamic grid classes based on media count
  const getMediaGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4 relative">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            maxLength={5000}
          />

          {/* User mention suggestions */}
          {showUserSuggestions && filteredUsers.length > 0 && (
            <div
              className="fixed z-[100] w-64 bg-white border border-slate-200 rounded-lg shadow-xl"
              style={{ 
                left: `${caretPos.left}px`, 
                top: `${caretPos.top + 20}px` 
              }}
            >
              <ScrollArea className="max-h-48">
                <div className="p-1 text-sm">
                  {filteredUsers.map(u => (
                    <button 
                      key={u.id} 
                      type="button" 
                      onClick={() => selectUser({ id: u.id, name: u.name })} 
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded transition-colors"
                    >
                      <div className="font-medium text-slate-800">@{u.name}</div>
                      {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Hashtag suggestions */}
          {showTagSuggestions && filteredTags.length > 0 && (
            <div
              className="fixed z-[100] w-64 bg-white border border-slate-200 rounded-lg shadow-xl"
              style={{ 
                left: `${caretPos.left}px`, 
                top: `${caretPos.top + 20}px` 
              }}
            >
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
        </div>

        {/* Media previews with dynamic grid */}
        {media.length > 0 && (
          <div className={`grid ${getMediaGridClass(media.length)} gap-3`}>
            {media.map((m) => (
              <div key={m.id} className="relative group border rounded-md overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => removeMedia(m.id)}
                  className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove media"
                >
                  <X className="h-4 w-4" />
                </button>
                {m.type.startsWith('image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={m.url} 
                    alt={m.name} 
                    className={`w-full object-cover ${media.length === 1 ? 'h-96' : 'h-48'}`}
                  />
                ) : (
                  <video 
                    src={m.url} 
                    className={`w-full object-cover ${media.length === 1 ? 'h-96' : 'h-48'}`}
                    controls
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" className="h-9 px-3" title="Add emoji">
                  <FaSmileIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0" align="start" sideOffset={5}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  searchPlaceHolder="Search emoji..."
                  width={350}
                  height={400}
                  previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>

            <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" className="h-9 px-3" title="Upload media">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Upload media</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <MediaUpload
                    bucket="attachments"
                    pathPrefix={`posts/${feedType}/${feedId || 'global'}`}
                    onChange={setMedia}
                    initialMedia={media}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowMediaDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setShowMediaDialog(false)}>
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {content.length}/5000
            </span>
            <Button type="submit" disabled={!content.trim() || createPost.isPending}>
              {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

// Get caret coordinates relative to viewport for fixed positioning
function getTextareaCaretCoordinates(el: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = document.createElement('div');
  const style = window.getComputedStyle(el);
  
  // Copy all relevant styles
  const properties = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
    'lineHeight', 'textAlign', 'textTransform', 'textIndent', 'textDecoration',
    'letterSpacing', 'wordSpacing', 'whiteSpace', 'wordBreak'
  ];
  
  properties.forEach(prop => {
    div.style.setProperty(prop, style.getPropertyValue(prop));
  });
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '0';
  
  document.body.appendChild(div);
  
  const textContent = el.value.substring(0, position);
  div.textContent = textContent;
  
  const span = document.createElement('span');
  span.textContent = el.value.substring(position) || '.';
  div.appendChild(span);
  
  const textareaRect = el.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  
  const top = textareaRect.top + (spanRect.top - divRect.top) + window.scrollY;
  const left = textareaRect.left + (spanRect.left - divRect.left) + window.scrollX;
  
  document.body.removeChild(div);
  
  return { top, left };
}
