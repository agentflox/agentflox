"use client";

import { useState } from "react";
import { Hash, MoreHorizontal, Pencil, Link, Star, BellOff, Bell, Trash, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ChannelSummary {
  id: string;
  name?: string | null;
  description?: string | null;
  isMember?: boolean;
  isFollowed?: boolean;
}

export function ChannelList({
  channels,
  activeId,
  onSelect,
  onRename,
  onFavorite,
  onUnfollow,
  onFollow,
  onDelete,
}: {
  channels: ChannelSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onFavorite?: (id: string) => void;
  onUnfollow?: (id: string) => void;
  onFollow?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const openRenameModal = (channel: ChannelSummary) => {
    setRenameTarget({ id: channel.id, name: channel.name ?? "Channel" });
    setRenameValue(channel.name ?? "");
  };

  const handleConfirmRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    onRename?.(renameTarget.id, renameValue.trim());
    setRenameTarget(null);
  };

  const handleCopyLink = (channelId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("channelId", channelId);
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <div className="flex flex-col gap-1 px-1 mt-2">
        {channels.map((channel) => (
          <div key={channel.id} className="relative group w-full">
            <button
              onClick={() => onSelect(channel.id)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left transition-all duration-200 outline-none cursor-pointer",
                activeId === channel.id
                  ? "bg-slate-200/80 text-slate-900"
                  : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Hash className={cn("h-4 w-4 shrink-0 transition-colors", activeId === channel.id ? "text-slate-800" : "text-slate-400 group-hover:text-slate-500")} />
              <div className="flex-1 overflow-hidden pr-6">
                <p className={cn("text-sm truncate transition-colors", activeId === channel.id ? "font-semibold" : "font-medium")}>{channel.name || "Channel"}</p>
                {channel.description && (
                  <p className={cn("text-[11px] truncate mt-0.5", activeId === channel.id ? "text-slate-600" : "text-slate-500")}>{channel.description}</p>
                )}
              </div>
            </button>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[100]" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal(channel); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(channel.id); }}>
                    <Link className="mr-2 h-4 w-4" />
                    <span>Copy link</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite?.(channel.id); }}>
                    <Star className="mr-2 h-4 w-4" />
                    <span>Favorite</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {channel.isFollowed ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnfollow?.(channel.id); }}>
                      <BellOff className="mr-2 h-4 w-4" />
                      <span>Unfollow</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFollow?.(channel.id); }}>
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Follow</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(channel.id); }} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete Channel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">No channels yet.</p>
        )}
      </div>

      {/* Rename Channel Modal */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white rounded-2xl gap-0">
          {/* Icon cluster */}
          <div className="px-6 pt-6 pb-4">
            <div className="relative inline-flex mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                <Pencil className="h-4 w-4 text-slate-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 border-2 border-white">
                <MessageSquare className="h-3 w-3 text-white" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 mb-1">Rename Channel</DialogTitle>
            <p className="text-sm text-slate-500">
              You are about to rename the chat &ldquo;{renameTarget?.name}&rdquo;
            </p>
          </div>

          {/* Input */}
          <div className="px-6 pb-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmRename(); }}
              className="h-10 border-slate-200 rounded-lg text-sm focus-visible:ring-slate-300"
              autoFocus
            />
          </div>

          {/* Divider + Footer */}
          <div className="border-t border-slate-100" />
          <DialogFooter className="px-6 py-4 flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
              onClick={handleConfirmRename}
              disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.name}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChannelList;
