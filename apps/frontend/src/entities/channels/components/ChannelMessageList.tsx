"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChannelMessageItem from "./ChannelMessageItem";
import { MessageSquarePlus, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface ChannelMessageListProps {
  channelId: string;
  messages: Array<{
    id: string;
    channelId: string;
    content: string;
    type?: string;
    title?: string | null;
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

export default function ChannelMessageList({ channelId, messages, onAddMembers }: ChannelMessageListProps) {
  // Fetch members ONCE at list level, pass down — avoids N queries per message
  const { data: channel } = trpc.channel.get.useQuery({ id: channelId }, { staleTime: 60_000 });
  const workspaceId = channel?.workspaceId || '';
  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: workspaceId },
    { enabled: !!workspaceId, staleTime: 60_000 }
  );

  const { data: tasksData } = trpc.task.list.useQuery(
    { workspaceId, pageSize: 20, scope: "all", includeRelations: true },
    { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
  );
  const { data: docsData } = trpc.document.list.useQuery(
    { workspaceId, pageSize: 20 },
    { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
  );

  const mentionItems = useMemo(() => {
    const items: { title: string, type: string, status?: string }[] = [];
    members.forEach(m => {
      if (m.user.name || m.user.email) items.push({ title: m.user.name || m.user.email || '', type: "user" });
    });
    const scopedTasks = tasksData?.items || [];
    scopedTasks.forEach(t => {
      if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name });
    });
    const scopedDocs = docsData?.items || [];
    scopedDocs.forEach(d => {
      if (d.title) items.push({ title: d.title, type: "doc" });
    });
    return items.sort((a, b) => b.title.length - a.title.length);
  }, [members, tasksData, docsData]);

  const replyMap = useMemo(() => {
    const map = new Map<string, { count: number; lastReply: (typeof messages)[number] | null }>();
    if (!messages) return map;
    for (const m of messages) {
      if (m.parentId) {
        const existing = map.get(m.parentId);
        if (existing) {
          existing.count += 1;
          existing.lastReply = m;
        } else {
          map.set(m.parentId, { count: 1, lastReply: m });
        }
      }
    }
    return map;
  }, [messages]);

  const hasMessages = messages && messages.length > 0;

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
        {messages.filter(m => !m.parentId || m.type === 'THREAD_BROADCAST').map((m) => {
          const replyInfo = replyMap.get(m.id);
          return (
            <ChannelMessageItem
              key={m.id}
              message={m as any}
              mentionItems={mentionItems}
              channelName={channel?.name || "General"}
              replyCount={replyInfo?.count ?? 0}
              lastReply={replyInfo?.lastReply ?? null}
              allMessages={messages}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
