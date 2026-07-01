"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChannelMessageItem from "./ChannelMessageItem";
import { MessageSquarePlus, Users } from "lucide-react";

interface ChannelMessageListProps {
  messages: Array<{
    id: string;
    channelId: string;
    content: string;
    createdAt: string | Date;
    userId: string;
    attachments?: any[];
    reactions?: Array<{ userId: string; emoji: string }> | any[];
    parentId?: string | null;
    parent?: { id: string; content: string; userId: string; user?: { id: string; name: string | null; image: string | null } } | null;
    user?: { id: string; name: string | null; image: string | null } | null;
    isPending?: boolean;
  }>;
  onAddMembers?: () => void;
}

export default function ChannelMessageList({ messages, onAddMembers }: ChannelMessageListProps) {
  const hasMessages = messages && messages.length > 0;

  if (!hasMessages) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-50 to-blue-50 shadow-sm border border-indigo-100/50 mb-5">
          <MessageSquarePlus className="h-8 w-8 text-indigo-600" strokeWidth={1.5} />
        </div>
        <div className="space-y-2 max-w-[320px] mb-6">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Start the conversation</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            This is the beginning of this channel's history. Invite your team members to kick off the discussion.
          </p>
        </div>
        {onAddMembers && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all gap-2"
            onClick={onAddMembers}
          >
            <Users className="h-4 w-4" />
            Invite Members
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <ChannelMessageItem key={m.id} message={m as any} />
        ))}
      </div>
    </ScrollArea>
  );
}

