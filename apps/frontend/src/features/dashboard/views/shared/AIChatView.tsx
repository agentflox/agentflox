"use client";
import { useState, useMemo, useEffect } from "react";
import { ChatView } from "./SharedAIChatView";
import { useWorkspaceDetail } from "@/entities/workspace";
import { ChatContextModal, type ContextEntity } from "@/features/dashboard/components/modals/ChatContextModal";
import type { ChatContextType } from "@/entities/chats/utils/context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AIChatViewProps {
  workspaceId: string;
  selectedAIChatId?: string;
  onAIChatSelect?: (aiChatId: string) => void;
}

function AIChatViewSkeleton() {
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex shrink-0 w-[256px] bg-white border-r border-slate-200 flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden p-2 space-y-0.5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className={cn("h-3.5 rounded-md", i % 3 === 0 ? "w-[80%]" : i % 3 === 1 ? "w-[65%]" : "w-[55%]")} />
                <Skeleton className={cn("h-3 rounded-md opacity-60", i % 2 === 0 ? "w-[50%]" : "w-[40%]")} />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ChatPanel header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden px-6 py-6 space-y-6 bg-[#f8fafc]">
          {/* AI message */}
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-[340px] rounded-md" />
              <Skeleton className="h-3.5 w-[280px] rounded-md" />
              <Skeleton className="h-3.5 w-[200px] rounded-md" />
            </div>
          </div>

          {/* User message */}
          <div className="flex items-start gap-3 justify-end">
            <div className="space-y-1.5 items-end flex flex-col max-w-[60%]">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-10 w-[220px] rounded-xl" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>

          {/* AI message with code block */}
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-[300px] rounded-md" />
              <Skeleton className="h-3.5 w-[260px] rounded-md" />
              <Skeleton className="h-28 w-[320px] rounded-xl mt-1" />
            </div>
          </div>

          {/* User message */}
          <div className="flex items-start gap-3 justify-end">
            <div className="space-y-1.5 items-end flex flex-col max-w-[60%]">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-10 w-[160px] rounded-xl" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>

          {/* AI typing */}
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded-md" />
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-100 w-fit">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full opacity-60" />
                <Skeleton className="h-2 w-2 rounded-full opacity-30" />
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200/60 bg-white px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <Skeleton className="h-4 w-4 rounded-md shrink-0" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIChatView({
  workspaceId,
  selectedAIChatId,
  onAIChatSelect,
}: AIChatViewProps) {
  const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<ContextEntity[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(selectedAIChatId);

  useEffect(() => {
    if (activeChatId && onAIChatSelect) onAIChatSelect(activeChatId);
  }, [activeChatId, onAIChatSelect]);

  useEffect(() => {
    if (selectedAIChatId) setActiveChatId(selectedAIChatId);
  }, [selectedAIChatId]);

  const chatContextOptions = useMemo(() => {
    if (!workspace) return [];
    const options: Array<{ label: string; value: ChatContextType; entityId: string; name?: string }> = [];
    options.push({ label: `${workspace.name} (Workspace)`, value: "workspace" as ChatContextType, entityId: workspace.id, name: workspace.name });
    (workspace.spaces ?? []).forEach((space) => options.push({ label: `${space.name} • Space`, value: "space" as ChatContextType, entityId: space.id, name: space.name }));
    (workspace.channels ?? []).forEach((channel) => options.push({ label: `${channel.name} • Channel`, value: "channel" as ChatContextType, entityId: channel.id, name: channel.name }));
    (workspace.projects ?? []).forEach((project) => options.push({ label: `${project.name} • Project`, value: "project" as ChatContextType, entityId: project.id, name: project.name }));
    (workspace.teams ?? []).forEach((team) => options.push({ label: `${team.name} • Team`, value: "team" as ChatContextType, entityId: team.id, name: team.name }));
    return options;
  }, [workspace]);

  if (isLoading) return <AIChatViewSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <ChatView
        contextType="WORKSPACE"
        contextId={workspace?.id}
        contextName={workspace?.name}
        contextOptions={chatContextOptions}
        onContextClick={() => setContextModalOpen(true)}
        contextCount={selectedContexts.length}
        selectedContexts={selectedContexts}
        chatId={activeChatId}
        onChatIdChange={(id) => setActiveChatId(id ?? undefined)}
      />
      <ChatContextModal
        workspaceId={workspaceId}
        open={contextModalOpen}
        onOpenChange={setContextModalOpen}
        selectedContexts={selectedContexts}
        onContextsChange={setSelectedContexts}
      />
    </div>
  );
}