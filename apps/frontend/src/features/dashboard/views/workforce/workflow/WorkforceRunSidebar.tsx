"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Search, Pencil, MoreHorizontal, Pin, Archive, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
  metadata?: any;
}

interface WorkforceRunSidebarProps {
  workforceName: string;
  conversations?: ConversationItem[];
  pendingConversation?: ConversationItem | null;
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const utils = trpc.useUtils();

  const renameMutation = trpc.chat.rename.useMutation({
    onSuccess: () => {
      utils.chat.listWorkforceConversations.invalidate();
      toast.success("Chat renamed");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to rename"),
  });

  const deleteMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      utils.chat.listWorkforceConversations.invalidate();
      toast.success("Chat deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const archiveMutation = trpc.chat.archive.useMutation({
    onSuccess: () => {
      utils.chat.listWorkforceConversations.invalidate();
      toast.success("Chat archived");
    },
    onError: () => toast.error("Failed to archive. Feature may not be supported yet."),
  });

  const pinMutation = trpc.chat.pin.useMutation({
    onSuccess: () => {
      utils.chat.listWorkforceConversations.invalidate();
    },
    onError: () => toast.error("Failed to update pin status"),
  });

  const handleRenameSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      renameMutation.mutate({ conversationId: id, title: editingTitle.trim() });
    } else {
      setEditingId(null);
    }
  };

  const handlePinToggle = (id: string, isCurrentlyPinned: boolean) => {
    pinMutation.mutate({ conversationId: id, isPinned: !isCurrentlyPinned });
    toast.success(isCurrentlyPinned ? "Chat unpinned" : "Chat pinned");
  };

  const allItems: ConversationItem[] = [
    ...(pendingConversation && !conversations.find(c => c.id === pendingConversation.id)
      ? [pendingConversation]
      : []),
    ...conversations,
  ];

  const filteredItems = allItems.filter(item => 
    (item.title || workforceName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="w-[60px] flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col items-center py-4 transition-all duration-300">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer mb-4"
          title="Open Sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          onClick={onNewTask}
          className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm mb-4"
          title="New run"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button 
          onClick={() => {
            setIsCollapsed(false);
            setIsSearchOpen(true);
          }}
          className="p-2 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer"
          title="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex-none p-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm cursor-pointer">
            <div className="h-6 w-6 relative">
              <Image
                src="/images/logo.png"
                alt="Agentflox logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            Agent Flox
          </div>
          <button 
            onClick={() => setIsCollapsed(true)}
            className="p-2 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewTask}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            New run
          </button>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn(
              "p-2 rounded-lg border border-zinc-200 transition-colors cursor-pointer",
              isSearchOpen ? "bg-zinc-100 text-zinc-900" : "bg-white text-zinc-600 hover:bg-zinc-50"
            )}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {isSearchOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 pt-1">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto border-t border-zinc-100">
        <div className="px-4 py-2 mt-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          Sessions
        </div>
        <div className="px-2 pb-4 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="text-xs text-zinc-500 px-2 py-4 text-center">
              {searchQuery ? "No matching sessions found." : "No sessions yet. Start a new run to begin."}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isPending = item.id === "pending";
              const isPinned = item.metadata?.isPinned === true;
              const timeAgo = item.lastMessageAt
                ? formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })
                : formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => !isPending && !editingId && onSelectConversation?.(item.id)}
                    disabled={isPending}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between",
                      isPending
                        ? "opacity-60 cursor-default bg-zinc-50"
                        : selectedConversationId === item.id
                          ? "bg-indigo-50 text-indigo-900 cursor-pointer"
                          : "hover:bg-zinc-50 text-zinc-800 cursor-pointer"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-8">
                      {editingId === item.id ? (
                        <form onSubmit={(e) => handleRenameSubmit(e, item.id)}>
                          <input 
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={(e) => handleRenameSubmit(e, item.id)}
                            className="w-full text-sm font-normal bg-white border border-indigo-200 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <div className="text-sm font-normal truncate">
                            {item.title || workforceName}
                            {isPending && (
                              <span className="ml-1.5 text-[10px] text-zinc-400 font-normal">creating…</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>{timeAgo}</span>
                        {item.messageCount > 0 && (
                          <span className="text-zinc-400">· {item.messageCount} msg{item.messageCount !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Pinned Icon Placeholder */}
                  {isPinned && !isPending && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 group-hover:opacity-0 transition-opacity pointer-events-none flex items-center justify-center">
                      <Pin className="h-4 w-4 text-indigo-500 fill-indigo-500" />
                    </div>
                  )}

                  {/* Actions Popover Trigger on Hover */}
                  {!isPending && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/80 transition-colors cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => {
                            setEditingId(item.id);
                            setEditingTitle(item.title || workforceName);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePinToggle(item.id, isPinned)}>
                            <Pin className={cn("mr-2 h-4 w-4", isPinned && "fill-current")} />
                            <span>{isPinned ? "Unpin chat" : "Pin chat"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => archiveMutation.mutate({ conversationId: item.id, archived: true })}>
                            <Archive className="mr-2 h-4 w-4" />
                            <span>Archive</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => deleteMutation.mutate({ conversationId: item.id })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

