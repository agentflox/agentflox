'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Button from '@/components/ui/button';
import { Loader2, Paperclip, Smile, Folder, X, Image, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { type MediaFile } from '@/components/ui/media-upload';
import { storageUtils } from '@/utils/storage/storageUtils';
import { useMessages } from '../hooks/useMessages';
import { v4 as uuidv4 } from 'uuid';

interface MessageComposerProps {
  toUserId: string;
  onSent?: () => void;
  replyTo?: { id: string; content: string; senderId: string };
  onCancelReply?: () => void;
  placeholder?: string;
}

export function MessageComposer({
  toUserId,
  onSent,
  replyTo,
  onCancelReply,
  placeholder = 'Type a message...',
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [showMediaChooser, setShowMediaChooser] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useMessages({ userId: toUserId });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
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
    await sendMessage.mutateAsync({
      id: uuidv4(),
      toUserId,
      content: text || '',
      attachments,
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
  };

  const removeMediaItem = (id: string) => {
    setMedia(media.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 overflow-x-hidden">
      {(replyTo || internalReply) && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Replying to message</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate pl-3">{(replyTo || internalReply)!.content}</p>
          </div>
          <button
            type="button"
            onClick={() => { onCancelReply?.(); setInternalReply(undefined); }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-3 p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {media.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {media.map((m) => (
            <div key={m.id} className="relative flex-shrink-0 group">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                {m.type.startsWith('image') ? (
                  <img
                    src={m.url}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                    <Paperclip className="h-6 w-6 text-gray-500 dark:text-gray-400 mb-1" />
                    <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium px-1 text-center truncate w-full">
                      {m.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeMediaItem(m.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all duration-200 overflow-x-hidden">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[48px] max-h-[180px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-28 py-3 px-4 text-[15px] placeholder:text-gray-400 dark:placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Popover open={showMediaChooser} onOpenChange={setShowMediaChooser}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-110"
                  title="Attach files"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 shadow-xl border border-gray-200 dark:border-gray-700" align="end" sideOffset={8}>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowMediaChooser(false);
                    }}
                  >
                    <Image className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Photos & Files</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors"
                    onClick={() => {
                      folderInputRef.current?.click();
                      setShowMediaChooser(false);
                    }}
                  >
                    <Folder className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Folder</span>
                  </button>
                  {media.length > 0 && (
                    <>
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                      <button
                        type="button"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 transition-colors"
                        onClick={() => {
                          setMedia([]);
                          setShowMediaChooser(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                        <span className="font-medium">Clear all</span>
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-110"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0 shadow-2xl" align="end" sideOffset={8}>
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

        <button
          type="button"
          onClick={handleSubmit}
          disabled={sendMessage.isPending || (!content.trim() && media.length === 0)}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
          title="Send message"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
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
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void handleFilesChosen(e.target.files);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
