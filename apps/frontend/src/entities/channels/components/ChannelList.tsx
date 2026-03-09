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
    <div className="flex flex-col gap-1">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelect(channel.id)}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition",
            activeId === channel.id ? "bg-slate-100" : "hover:bg-slate-50"
          )}
        >
          <Hash className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground truncate">{channel.name || "Channel"}</p>
            {channel.description && (
              <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
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

