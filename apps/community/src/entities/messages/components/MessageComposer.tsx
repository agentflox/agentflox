'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Smile, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { type MediaFile } from '@/components/ui/media-upload';
import { storageUtils } from '@/utils/storage/storageUtils';
import { useMessages } from '../hooks/useMessages';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/useToast';

interface MessageComposerProps {
  toUserId: string;
  conversationId?: string | null;
  marketplaceListingId?: string;
  onSent?: () => void;
  replyTo?: { id: string; content: string; senderId: string };
  onCancelReply?: () => void;
  placeholder?: string;
}

export function MessageComposer({
  toUserId,
  conversationId,
  marketplaceListingId,
  onSent,
  replyTo,
  onCancelReply,
  placeholder = 'Type a message...',
}: MessageComposerProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useMessages({
    userId: toUserId,
    conversationId,
    marketplaceListingId,
    fetchConversations: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalReply, setInternalReply] = useState<{ id: string; content: string; senderId: string } | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ userId: string; message: { id: string; content: string; senderId: string } }>;
      if (ce.detail?.userId === toUserId) {
        setInternalReply(ce.detail.message);
      }
    };
    window.addEventListener('messages:reply', handler as EventListener);
    return () => window.removeEventListener('messages:reply', handler as EventListener);
  }, [toUserId]);

  const handleFilesChosen = async (fileList: FileList | null) => {
    if (!fileList) return;
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    const uploads = await Promise.all(
      selectedFiles.map(async (file) => {
        const path = storageUtils.generateUniquePath(file.name, `messages/${toUserId}`);
        const result = await storageUtils.upload({ file, bucket: 'attachments', path });
        if (result.success && result.url) {
          const media: MediaFile = {
            id: path,
            name: file.name,
            url: result.url,
            path,
            size: file.size,
            type: file.type,
          };
          return media;
        }
        return null;
      })
    );

    const valid = uploads.filter((u): u is MediaFile => Boolean(u));
    if (valid.length > 0) {
      setMedia((prev) => [...prev, ...valid]);
    }
  };

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.slice(0, start) + emojiData.emoji + content.slice(end);
    setContent(newContent);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPosition = start + emojiData.emoji.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    });
  }, [content]);

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text && media.length === 0) return;

    const attachments = media.map((m) => m.url);
    try {
      await sendMessage.mutateAsync({
        id: uuidv4(),
        toUserId,
        content: text || '',
        attachments,
        marketplaceListingId,
        replyTo: (replyTo || internalReply) ? {
          id: (replyTo || internalReply)!.id,
          content: (replyTo || internalReply)!.content,
          senderId: (replyTo || internalReply)!.senderId,
        } : undefined,
      });

      setContent('');
      setMedia([]);
      onCancelReply?.();
      setInternalReply(undefined);
      onSent?.();
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'SYSTEM_DEGRADED') {
        toast({
          title: 'Messages temporarily unavailable',
          description: 'System is in degraded mode. Please try again shortly.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Failed to send message',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const removeMediaItem = (id: string) => {
    setMedia(media.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 overflow-x-hidden transition-all">
      {(replyTo || internalReply) && (
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20 backdrop-blur-md">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-3.5 bg-indigo-500 rounded-full"></div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Replying to message</span>
            </div>
            <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate pl-3 leading-snug">{(replyTo || internalReply)!.content}</p>
          </div>
          <button
            type="button"
            onClick={() => { onCancelReply?.(); setInternalReply(undefined); }}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-4 p-1.5 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {media.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pt-3 pb-2 px-3 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {media.map((m) => (
            <div key={m.id} className="relative flex-shrink-0 group/media-preview">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm transition-transform duration-300 group-hover/media-preview:scale-105">
                {m.type.startsWith('image') ? (
                  <img
                    src={m.url}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 cursor-pointer">
                    <Paperclip className="h-6 w-6 text-zinc-400 dark:text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold px-1 text-center truncate w-full tracking-wider uppercase">
                      {m.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/media-preview:opacity-100 transition-opacity"></div>
              </div>
              <button
                type="button"
                onClick={() => removeMediaItem(m.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/media-preview:opacity-100 transition-all duration-300 hover:scale-110 z-10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 relative bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[28px] border border-zinc-200/60 dark:border-zinc-800/60 focus-within:border-indigo-400 dark:focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/10 transition-all duration-300 overflow-x-hidden shadow-inner min-h-[56px] flex flex-col justify-center">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-28 py-[16px] px-6 text-[15px] font-normal placeholder:text-zinc-400 dark:placeholder:text-zinc-600 leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="absolute bottom-[6px] right-2 flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 font-medium mr-2 hidden sm:inline-block pointer-events-none">
              Press Enter to send
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all duration-200 hover:scale-105 cursor-pointer"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2.5 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all duration-200 hover:scale-105 cursor-pointer"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0 shadow-2xl rounded-2xl overflow-hidden" align="end" sideOffset={12}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  searchPlaceHolder="Search emoji..."
                  width={340}
                  height={420}
                  previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>

          </div>
        </div>

      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFilesChosen(e.target.files);
          e.currentTarget.value = '';
        }}
      />


    </div>
  );
}
