"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChannelMessageItem from "./ChannelMessageItem";

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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">No messages yet</p>
        {onAddMembers && (
          <Button variant="outline" size="sm" onClick={onAddMembers}>
            Add members
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

