"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/components/providers/SocketProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function ListingCommentsSection({ listingId }: { listingId: string }) {
  const { socket, isConnected, waitForConnection } = useSocket();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queryInput = useMemo(() => ({ listingId, page: 1, pageSize: 50 }), [listingId]);
  const commentsQuery = trpc.marketplace.listComments.useQuery(queryInput, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!socket || !isConnected || !listingId) return;

    socket.emit("listing:comment:subscribe", { listingId });
    const onCreated = (payload: any) => {
      const incoming = payload?.comment;
      if (!incoming || incoming.listingId !== listingId) return;
      utils.marketplace.listComments.setData(queryInput, (old: any) => {
        if (!old) return old;
        const exists = old.items.some((c: any) => c.id === incoming.id);
        if (exists) return old;
        return { ...old, items: [...old.items, incoming], total: (old.total || 0) + 1 };
      });
    };

    socket.on("listing:comment:created", onCreated);
    return () => {
      socket.emit("listing:comment:unsubscribe", { listingId });
      socket.off("listing:comment:created", onCreated);
    };
  }, [socket, isConnected, listingId, utils, queryInput]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const s = await waitForConnection();
      await new Promise((resolve, reject) => {
        s.emit(
          "listing:comment:create",
          { listingId, content: content.trim() },
          (err?: string) => (err ? reject(new Error(err)) : resolve(true))
        );
      });
      setContent("");
    } catch (error: any) {
      toast({
        title: "Failed to post comment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (commentsQuery.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const comments = commentsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[90px]"
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!content.trim() || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post Comment
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {comments.map((comment: any) => (
          <div key={comment.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {(comment.user?.name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-xs font-semibold">{comment.user?.name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
        )}
      </div>
    </div>
  );
}

