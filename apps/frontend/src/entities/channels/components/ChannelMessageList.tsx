"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChannelMessageItem from "./ChannelMessageItem";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import type { ChannelMessage } from "../hooks/useChannels";

interface ChannelMessageListProps {
  channelId: string;
  messages: ChannelMessage[];
  onAddMembers?: () => void;
  toggleReaction: (messageId: string, emoji: string) => void | Promise<unknown>;
  editMessage: (messageId: string, content: string, title?: string) => void | Promise<void>;
  mentionItems?: { title: string; type: string; status?: string }[];
}

export default function ChannelMessageList({
  channelId,
  messages,
  onAddMembers,
  toggleReaction,
  editMessage,
  mentionItems: externalMentionItems,
}: ChannelMessageListProps) {
  const { data: channel } = trpc.channel.get.useQuery(
    { id: channelId },
    { enabled: !!channelId, staleTime: 60_000, gcTime: 5 * 60_000 }
  );
  const workspaceId = channel?.workspaceId || "";
  const fetchMentions = !externalMentionItems && !!workspaceId;

  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: workspaceId },
    { enabled: fetchMentions, staleTime: 60_000, gcTime: 5 * 60_000 }
  );
  const { data: tasksData } = trpc.task.list.useQuery(
    { workspaceId, pageSize: 20, scope: "all", includeRelations: false },
    { enabled: fetchMentions, staleTime: 60_000, gcTime: 5 * 60_000 }
  );
  const { data: docsData } = trpc.document.list.useQuery(
    { workspaceId, pageSize: 20 },
    { enabled: fetchMentions, staleTime: 60_000, gcTime: 5 * 60_000 }
  );

  const mentionItems = useMemo(() => {
    if (externalMentionItems) return externalMentionItems;
    const items: { title: string; type: string; status?: string }[] = [];
    members.forEach((m) => {
      if (m.user.name || m.user.email) items.push({ title: m.user.name || m.user.email || "", type: "user" });
    });
    (tasksData?.items || []).forEach((t) => {
      if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name });
    });
    (docsData?.items || []).forEach((d) => {
      if (d.title) items.push({ title: d.title, type: "doc" });
    });
    return items.sort((a, b) => b.title.length - a.title.length);
  }, [externalMentionItems, members, tasksData, docsData]);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ChannelMessage[]>();
    for (const m of messages) {
      if (!m.parentId) continue;
      const list = map.get(m.parentId);
      if (list) list.push(m);
      else map.set(m.parentId, [m]);
    }
    return map;
  }, [messages]);

  const rootMessages = useMemo(
    () => messages.filter((m) => !m.parentId || m.type === "THREAD_BROADCAST"),
    [messages]
  );

  const hasMessages = rootMessages.length > 0;

  if (!hasMessages) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 sm:p-6 mb-2 text-center">
        <div className="space-y-2.5 max-w-lg">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Chat in #{channel?.name || "channel"}
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Collaborate seamlessly across tasks and conversations. Start chatting with your team or connect tasks to stay on top of your work.
          </p>
          {onAddMembers && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="rounded-lg h-9 px-10 border-slate-200/80 text-slate-800 hover:bg-slate-50 font-medium shadow-sm"
                onClick={onAddMembers}
              >
                + Add People
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3">
        {rootMessages.map((m) => (
          <ChannelMessageItem
            key={m.id}
            message={m as any}
            mentionItems={mentionItems}
            channelName={channel?.name || "General"}
            replies={repliesByParent.get(m.id) ?? []}
            toggleReaction={toggleReaction}
            editMessage={editMessage}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
