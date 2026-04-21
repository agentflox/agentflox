'use client';

import React from 'react';
import { Reply } from 'lucide-react';

interface MessageReplyToProps {
  replyTo: { id: string; content: string; senderId: string; senderName?: string };
  isOwnMessage: boolean;
  currentSenderName?: string;
  repliedToName?: string;
}

export function MessageReplyTo({ replyTo, isOwnMessage, currentSenderName, repliedToName }: MessageReplyToProps) {
  return (
    <div className={`flex flex-col -mb-3 relative z-0 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      {/* Header: "Jane replied to Jasmine" */}
      <div className={`flex items-center gap-1.5 mb-1 px-1 text-[12px] font-medium text-zinc-500 dark:text-zinc-400 ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      }`}>
        <Reply className={`h-3 w-3 ${isOwnMessage ? '-scale-x-100' : ''}`} />
        <span>
          <span className="font-semibold">{currentSenderName}</span> replied to <span className="font-semibold">{repliedToName}</span>
        </span>
      </div>

      {/* Replied-to Bubble */}
      {/* Added pb-5 to pad the bottom where it overlaps, and removed border to make it seamlessly sit behind */}
      <div
        className={`px-4 pt-3 pb-5 rounded-2xl max-w-full text-[13px] leading-relaxed shadow-sm
          bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50
          ${isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm'}
        `}
      >
        <div className="line-clamp-2" title={replyTo.content}>
          {replyTo.content}
        </div>
      </div>
    </div>
  );
}
