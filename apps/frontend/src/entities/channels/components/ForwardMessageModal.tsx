"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Hash, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useChannels } from "../hooks/useChannels";

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: any;
}

export function ForwardMessageModal({ isOpen, onClose, message }: ForwardMessageModalProps) {
  const [search, setSearch] = useState("");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);

  // Fetch workspace context
  const { data: channel } = trpc.channel.get.useQuery(
    { id: message.channelId },
    { enabled: isOpen, staleTime: 60_000 }
  );
  const workspaceId = channel?.workspaceId || "";

  // Fetch channels & members
  const { data: channels = [] } = trpc.channel.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId && isOpen, staleTime: 60_000 }
  );
  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: workspaceId },
    { enabled: !!workspaceId && isOpen, staleTime: 60_000 }
  );

  const { sendMessage } = useChannels({});

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    
    const matchedChannels = channels
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({ ...c, destType: "channel" }));
      
    const matchedMembers = members
      .filter((m) => 
        m.user.name?.toLowerCase().includes(q) || 
        m.user.email?.toLowerCase().includes(q)
      )
      .map((m) => ({ ...m, destType: "user" }));

    return [...matchedChannels, ...matchedMembers].slice(0, 5);
  }, [search, channels, members]);

  const displayLabel = message.user?.name || message.user?.email || "Member";
  const initials = displayLabel.slice(0, 2).toUpperCase();

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?message=${message.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const handleForward = async () => {
    if (!selectedDestination) return;

    try {
      let destChannelId = selectedDestination.id;

      if (selectedDestination.destType === "user") {
        toast.error("Forwarding to direct messages is not yet fully supported.");
        return;
      }

      // Format the forwarded message as JSON
      const fwdContent = JSON.stringify({
        optionalMessage: optionalMessage.trim() || null,
        originalMessageId: message.id,
        originalContent: message.content,
        originalUser: {
          name: displayLabel,
          image: message.user?.image || null
        },
        originalCreatedAt: message.createdAt,
        originalChannelName: channel?.name || "General"
      });

      await sendMessage({
        channelId: destChannelId,
        content: fwdContent,
        type: "FORWARD",
      });

      toast.success("Message forwarded");
      onClose();
    } catch (err) {
      toast.error("Failed to forward message");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl gap-0 shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Forward this message</DialogTitle>
        </VisuallyHidden>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Forward this message</h2>
        </div>

        {/* Search Input / Selected Pill */}
        <div className="relative mb-3">
          {!selectedDestination ? (
            <>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Choose a user or Channel"
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Suggestions Dropdown */}
              {search.trim() && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
                  {searchResults.map((res: any) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedDestination(res);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                    >
                      {res.destType === "channel" ? (
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Hash className="h-3.5 w-3.5 text-slate-600" />
                        </div>
                      ) : (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={res.user?.image} />
                          <AvatarFallback className="text-[10px] bg-slate-800 text-white">
                            {(res.user?.name || res.user?.email || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {res.destType === "channel" ? res.name : (res.user?.name || res.user?.email)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600 font-medium pl-1">To:</span>
              <div className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm">
                {selectedDestination.destType === "channel" ? (
                  <Hash className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={selectedDestination.user?.image} />
                    <AvatarFallback className="text-[8px] bg-slate-800 text-white">
                      {(selectedDestination.user?.name || selectedDestination.user?.email || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm font-medium text-slate-800">
                  {selectedDestination.destType === "channel" ? selectedDestination.name : (selectedDestination.user?.name || selectedDestination.user?.email)}
                </span>
                <button 
                  onClick={() => setSelectedDestination(null)}
                  className="ml-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional Message */}
        <div className="mb-4">
          <textarea
            placeholder="Write a message (optional)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-24"
            value={optionalMessage}
            onChange={(e) => setOptionalMessage(e.target.value)}
          />
        </div>

        {/* Message Preview */}
        <div className="flex gap-3 px-1 mb-6 border-l-2 border-slate-200 pl-3">
          <Avatar className="h-8 w-8 mt-0.5 shrink-0">
            <AvatarImage src={message.user?.image || undefined} />
            <AvatarFallback className="bg-slate-800 text-white text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-semibold text-slate-900 text-sm">{displayLabel}</span>
              <span className="text-xs text-slate-400">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="text-sm text-slate-700 line-clamp-3">
              {message.content}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="text-slate-600 cursor-pointer border-zinc-300 hover:bg-zinc-100">
            <Copy className="h-4 w-4 mr-1.5" />
            Copy link
          </Button>
          <Button 
            size="sm" 
            onClick={handleForward} 
            disabled={!selectedDestination}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-none cursor-pointer"
          >
            Forward
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
