'use client';

import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FaSmile } from 'react-icons/fa';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { EmojiClickData } from 'emoji-picker-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

interface CommentFormProps {
  postId: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitting?: boolean;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
  submitting = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.slice(0, start) + text + content.slice(end);

    setContent(newContent);

    // Focus and position cursor after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + text.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  }, [content]);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    insertAtCursor(emojiData.emoji);
    setShowEmojiPicker(false);
  }, [insertAtCursor]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || submitting) return;

    onSubmit(content.trim());
    setContent('');
    setShowEmojiPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            // Submit on Enter (but not Shift+Enter)
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="min-h-[85px] resize-none pr-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 transition-all text-[14px]"
          autoFocus={autoFocus}
          maxLength={2000}
        />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {/* Toolbar */}
        <div className="flex items-center gap-1">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                title="Add emoji"
                className="h-8 px-2.5 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 transition-colors"
              >
                <FaSmile className="text-sm" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0 shadow-2xl" align="start">
              {showEmojiPicker && (
                <Suspense fallback={<div className="h-[400px] w-[320px] animate-pulse bg-zinc-50" />}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={"auto" as any}
                    searchPlaceHolder="Search emoji..."
                    width={320}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </Suspense>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-mono transition-colors ${content.length > 1800 ? 'text-red-500' : 'text-zinc-400'
            }`}>
            {content.length}/2000
          </span>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="rounded-full px-4 h-9 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded-full px-6 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 text-xs font-semibold text-white shadow-sm transition-all"
            >
              {submitting ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}