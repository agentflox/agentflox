"use client";

import React, { useState } from "react";
import { Search, Filter, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkforceConversation {
  id: string;
  title: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
}

interface WorkforceRunSidebarProps {
  workforceName: string;
  conversations: WorkforceConversation[];
  pendingConversation?: WorkforceConversation | null;
  selectedConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewTask?: () => void;
}

export default function WorkforceRunSidebar({
  workforceName,
  conversations = [],
  pendingConversation,
  selectedConversationId,
  onSelectConversation,
  onNewTask,
}: WorkforceRunSidebarProps) {
  const [filterTab, setFilterTab] = useState<"all" | "to_review">("all");

  const activeCount = 0;
  const queueCount = 0;

  const formatDate = (d: Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="w-[280px] flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col overflow-hidden">
      <div className="flex-none p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <Search className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onNewTask}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          New task
          <span className="opacity-80">▼</span>
        </button>
        <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-100">
          <button
            onClick={() => setFilterTab("all")}
            className={cn(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              filterTab === "all"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab("to_review")}
            className={cn(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              filterTab === "to_review"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            To Review
          </button>
        </div>
      </div>

      <div className="flex-none px-3 pb-2">
        <div className="text-xs font-medium text-zinc-500 mb-1">View workforce queues</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activeCount} active
          </span>
          <span className="text-zinc-400">•</span>
          <span>{queueCount} in queue</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto border-t border-zinc-100">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Today
        </div>
        <div className="px-2 pb-4 space-y-0.5">
          {pendingConversation && (
            <div
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2",
                selectedConversationId === "pending"
                  ? "bg-indigo-50 text-indigo-900"
                  : "bg-zinc-50 text-zinc-600"
              )}
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {pendingConversation.title || "New run"}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Creating…</div>
              </div>
            </div>
          )}
          {conversations.length === 0 && !pendingConversation ? (
            <div className="text-xs text-zinc-500 px-1 py-2">
              No runs yet. Run a task to see history here.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation?.(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                  selectedConversationId === conv.id
                    ? "bg-indigo-50 text-indigo-900"
                    : "hover:bg-zinc-50 text-zinc-800"
                )}
              >
                <div className="text-sm font-medium truncate">
                  {conv.title || `Run (${conv.messageCount} msgs)`}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {formatDate(conv.lastMessageAt ?? conv.createdAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
