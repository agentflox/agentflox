"use client";

import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChannelSummary {
  id: string;
  name?: string | null;
  description?: string | null;
}

export function ChannelList({
  channels,
  activeId,
  onSelect,
}: {
  channels: ChannelSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-1 mt-2">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelect(channel.id)}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left transition-all duration-200 group outline-none",
            activeId === channel.id 
              ? "bg-indigo-50/80 text-indigo-900 shadow-sm ring-1 ring-indigo-200/50" 
              : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
          )}
        >
          <Hash className={cn("h-4 w-4 shrink-0 transition-colors", activeId === channel.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500")} />
          <div className="flex-1 overflow-hidden">
            <p className={cn("text-sm truncate transition-colors", activeId === channel.id ? "font-semibold" : "font-medium")}>{channel.name || "Channel"}</p>
            {channel.description && (
              <p className={cn("text-[11px] truncate mt-0.5", activeId === channel.id ? "text-indigo-600/70" : "text-slate-500")}>{channel.description}</p>
            )}
          </div>
        </button>
      ))}
      {channels.length === 0 && (
        <p className="text-xs text-muted-foreground p-3 text-center">No channels yet.</p>
      )}
    </div>
  );
}

export default ChannelList;

