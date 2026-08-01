"use client";

import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PostType } from "@agentflox/database/src/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowLeft, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePosts } from "@/entities/posts/hooks/usePosts";
import { PostCard } from "@/entities/posts/components/PostCard";
import { PostSkeleton } from "@/entities/posts/components/PostSkeleton";
import Link from "next/link";

const GROUP_MARKER = "[[COMMUNITY_GROUP]]";
const DISCUSSION_MARKER = "[[COMMUNITY_DISCUSSION]]";

type GroupInfo = {
  id: string;
  name: string;
  description?: string;
};

function parseGroupPost(content: string): GroupInfo | null {
  if (!content.startsWith(GROUP_MARKER)) return null;
  const payload = content.slice(GROUP_MARKER.length).trim();
  try {
    const parsed = JSON.parse(payload) as GroupInfo;
    if (!parsed.id || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getDiscussionGroupId(content: string): string | null {
  if (!content.startsWith(DISCUSSION_MARKER)) return null;
  const firstLine = content.split("\n")[0] ?? "";
  const match = firstLine.match(/\[\[COMMUNITY_DISCUSSION\]\]\s+group:([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

interface GroupFeedViewProps {
  groupId: string;
}

export function GroupFeedView({ groupId }: GroupFeedViewProps) {
  const { toast } = useToast();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const feedKey = "community-feed";
  const { posts, isLoading, createPost } = usePosts("global", feedKey);

  const groupInfo = useMemo(() => {
    return posts
      .map((post) => parseGroupPost(post.content))
      .find((group) => group?.id === groupId);
  }, [posts, groupId]);

  const groupDiscussions = useMemo(() => {
    let filtered = posts.filter((post) => getDiscussionGroupId(post.content) === groupId);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((post) => post.content.toLowerCase().includes(query));
    }

    switch (sortBy) {
      case "oldest":
        return [...filtered].sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "popular":
      case "likes":
        return [...filtered].sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));
      case "latest":
      default:
        return [...filtered].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }, [posts, groupId, sortBy, searchQuery]);

  const handleCreateDiscussion = async () => {
    const title = postTitle.trim();
    if (!title) {
      toast({ title: "Discussion title is required", variant: "destructive" });
      return;
    }

    try {
      await createPost.mutateAsync({
        id: uuidv4(),
        content: `${DISCUSSION_MARKER} group:${groupId}\n${title}\n\n${postBody.trim()}`,
        type: PostType.POST,
      } as any);
      setPostTitle("");
      setPostBody("");
      setIsComposerOpen(false);
      toast({ title: "Discussion created" });
    } catch (error) {
      toast({
        title: "Failed to create discussion",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/community"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{groupInfo?.name || "Loading group..."}</h1>
          {groupInfo?.description && <p className="text-sm text-slate-500">{groupInfo.description}</p>}
        </div>
      </div>

      <Card className="overflow-hidden border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-blue-50 p-6">
        <div className="mb-2 flex items-center gap-2 text-indigo-700">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold">Group Discussion</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          {groupInfo ? `Welcome to ${groupInfo.name}` : "Join the conversation"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Share ideas, ask questions, and collaborate with other members of this group.
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 min-w-[300px]">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Sort</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="min-w-[140px] cursor-pointer bg-white">
                  <SelectValue placeholder="Latest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="button" className="cursor-pointer" onClick={() => setIsComposerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New discussion
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => <PostSkeleton key={i} />)
        ) : groupDiscussions.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-600">
            No discussions in this group yet. Start the first thread.
          </Card>
        ) : (
          groupDiscussions.map((post) => (
            <PostCard key={post.id} post={post as any} feedType="global" feedId={feedKey} />
          ))
        )}
      </div>

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="discussion-title">Title</Label>
              <Input
                id="discussion-title"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="What do you want to discuss?"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="discussion-body">Details</Label>
              <Textarea
                id="discussion-body"
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="Share context and details..."
                className="mt-1 min-h-[140px]"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateDiscussion}
              disabled={createPost.isPending}
              className="cursor-pointer"
            >
              Post Discussion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
