"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelMessageItem } from "./ChannelMessageItem";
import { ChannelMessageComposer } from "./ChannelMessageComposer";
import { useChannels } from "../hooks/useChannels";
import { createPortal } from "react-dom";

interface ChannelThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: any;
  mentionItems: any[];
  channelName: string;
  allMessages?: any[];
}

export default function ChannelThreadModal({ isOpen, onClose, message, mentionItems, channelName, allMessages }: ChannelThreadModalProps) {
  const [alsoSend, setAlsoSend] = useState(false);
  const { messages: threadMessages } = useChannels({ channelId: message.channelId, skipSubscription: !isOpen || Boolean(allMessages) });
  const messageSource = allMessages ?? threadMessages;
  const replies = (messageSource || []).filter(m => m.parentId === message.id);

  const displayLabel = message.user?.name || message.user?.email || "Member";
  const initials = displayLabel.slice(0, 2).toUpperCase();

  const modalRoot = typeof document !== 'undefined' ? document.getElementById("channel-post-modal-root") : null;

  const modalContent = (
    <div className={cn(
      "absolute inset-y-4 rounded-md right-0 z-[60] w-[450px] transform bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 border border-slate-200/60 flex flex-col overflow-hidden",
      isOpen ? "-translate-x-14" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4 shrink-0">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{displayLabel.split(' ')[0]}'s Thread</h2>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Thread Content */}
      <div className="flex-1 overflow-y-auto bg-white p-5">
        {/* Original Message */}
        <div className="flex gap-3 mb-6">
          <Avatar className="h-9 w-9">
            <AvatarImage src={message.user?.image || undefined} />
            <AvatarFallback className="bg-slate-800 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-slate-900 text-[15px]">{displayLabel}</span>
              <span className="text-xs text-slate-400">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-semibold text-slate-500 shrink-0">{replies.length > 0 ? `${replies.length} replies` : 'No replies'}</span>
          <div className="h-px bg-slate-100 flex-1"></div>
        </div>

        {/* List of Replies */}
        <div className="flex flex-col gap-4 mb-6">
          {replies.map((reply: any) => (
            <ChannelMessageItem key={reply.id} message={reply} mentionItems={mentionItems} channelName={channelName} />
          ))}
        </div>

        {/* Composer */}
        <ChannelMessageComposer
          className="w-full p-0 pt-6"
          channelId={message.channelId}
          mentionItems={mentionItems}
          placeholder="Reply, press 'space' for AI, '/' for commands"
          parentId={message.id}
          alsoSendToChannel={alsoSend}
          bottomSlot={
            <div className="px-3 pb-2 flex items-center gap-2">
              <input type="checkbox" id="thread-also-send" checked={alsoSend} onChange={e => setAlsoSend(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <label htmlFor="thread-also-send" className="text-xs text-slate-600 font-normal cursor-pointer">Also send to #{channelName}</label>
            </div>
          }
        />
      </div>
    </div>
  );

  if (modalRoot) {
    return createPortal(modalContent, modalRoot);
  }

  return modalContent;
}
