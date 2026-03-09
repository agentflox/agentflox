'use client';

import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Button from '@/components/ui/button';
import { Loader2, Paperclip, Smile, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { type MediaFile } from '@/components/ui/media-upload';
import { storageUtils } from '@/utils/storage/storageUtils';
import { v4 as uuidv4 } from 'uuid';
import { useChannels } from '../hooks/useChannels';

interface Props {
  channelId: string;
}

export function ChannelMessageComposer({ channelId }: Props) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useChannels({ channelId });
  const [sending, setSending] = useState(false);

  const handleFilesChosen = async (fileList: FileList | null) => {
    if (!fileList) return;
    const selectedFiles = Array.from(fileList);
    if (!selectedFiles.length) return;

    const uploads = await Promise.all(
      selectedFiles.map(async (file) => {
        const path = storageUtils.generateUniquePath(file.name, `channels/${channelId}`);
        const result = await storageUtils.upload({ file, bucket: 'attachments', path });
        if (result.success && result.url) {
          return {
            id: path,
            name: file.name,
            url: result.url,
            path,
            size: file.size,
            type: file.type,
          } as MediaFile;
        }
        return null;
      })
    );
    const valid = uploads.filter(Boolean) as MediaFile[];
    if (valid.length) setMedia((prev) => [...prev, ...valid]);
  };

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      const newContent = content + emojiData.emoji;
      setContent(newContent);
      setShowEmojiPicker(false);
    },
    [content]
  );

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text && media.length === 0) return;
    setSending(true);
    try {
      await sendMessage({
        channelId,
        content: text || '',
        attachments: media.map((m) => m.url),
      });
      setContent('');
      setMedia([]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-white border-t">
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((m) => (
            <div key={m.id} className="text-xs px-2 py-1 rounded-md border bg-slate-50">
              {m.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative bg-slate-50 rounded-xl border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message the channel..."
            className="min-h-[48px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-500"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-0 shadow-2xl" align="end" sideOffset={8}>
                <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.LIGHT} previewConfig={{ showPreview: false }} />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500"
              title="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </button>
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
        </div>

        <Button
          onClick={handleSubmit}
          disabled={sending || (!content.trim() && media.length === 0)}
          className="max-w-12 h-11 px-4"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

