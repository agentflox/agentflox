"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Users, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { PostCard } from "@/entities/posts/components/PostCard";

const Editor = dynamic(
  () => import("@/entities/shared/components/Editor").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => <div className="min-h-[120px] animate-pulse rounded-md bg-muted/40" />,
  }
);
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { FaSmile } from "react-icons/fa";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { GroupHeaderSkeleton } from "@/features/community/components/GroupSkeletons";
import { PostSkeleton } from "@/entities/posts/components/PostSkeleton";

export default function CommunityGroupPage() {
  const params = useParams();
  const groupId = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [appealMessage, setAppealMessage] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  const { data: group, isLoading: isGroupLoading } = trpc.communityGroup.get.useQuery(
    { id: groupId },
    { enabled: !!groupId }
  );
  const { data: me } = trpc.user.me.useQuery();
  const { data: postsData, isLoading: isPostsLoading } = trpc.communityGroup.listPosts.useQuery(
    { groupId, page: 1, pageSize: 50 },
    {
      enabled: !!groupId && !!group?.isMember,
      retry: false,
    }
  );

  const joinMutation = trpc.communityGroup.join.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.communityGroup.get.invalidate({ id: groupId }),
        utils.communityGroup.list.invalidate({}),
        utils.communityGroup.listPosts.invalidate({ groupId, page: 1, pageSize: 50 }),
      ]);
    },
  });
  const leaveMutation = trpc.communityGroup.leave.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.communityGroup.get.invalidate({ id: groupId }),
        utils.communityGroup.list.invalidate({}),
      ]);
    },
  });
  const removeMemberMutation = trpc.communityGroup.removeMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const createPostMutation = trpc.communityGroup.createPost.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.listPosts.invalidate({ groupId, page: 1, pageSize: 50 });
    },
  });
  const createAppealMutation = trpc.communityGroup.createAppeal.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const deleteGroupMutation = trpc.communityGroup.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.communityGroup.list.invalidate({}),
      ]);
    },
  });

  const posts = useMemo(() => {
    const items = postsData?.items || [];
    switch (sortBy) {
      case "oldest":
        return [...items].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "popular":
        return [...items].sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));
      case "latest":
      default:
        return [...items].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [postsData, sortBy]);
  const isOwner = !!group?.owner?.id && group.owner.id === me?.id;

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync({ groupId });
      toast({ title: "Joined group" });
    } catch (error) {
      toast({
        title: "Unable to join group",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync({ groupId });
      toast({ title: "Left group" });
    } catch (error) {
      toast({
        title: "Unable to leave group",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync({ groupId });
      toast({ title: "Group deleted" });
      router.push("/community");
    } catch (error) {
      toast({
        title: "Unable to delete group",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    try {
      await removeMemberMutation.mutateAsync({ groupId, memberUserId });
      toast({ title: "Member removed" });
    } catch (error) {
      toast({
        title: "Unable to remove member",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = async () => {
    const bodyValue = postBody.trim();
    if (!bodyValue || bodyValue === "<p></p>") {
      toast({ title: "Post content is required", variant: "destructive" });
      return;
    }
    try {
      await createPostMutation.mutateAsync({
        groupId,
        title: "",
        content: bodyValue,
        attachments: media,
      });
      setPostBody("");
      setMedia([]);
      setIsPostModalOpen(false);
      toast({ title: "Post created" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("blocked")) {
        setIsPostModalOpen(false);
        setIsBlockedModalOpen(true);
        return;
      }
      toast({
        title: "Unable to create post",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleAppeal = async () => {
    const message = appealMessage.trim();
    if (!message) {
      toast({ title: "Please describe your appeal", variant: "destructive" });
      return;
    }
    try {
      await createAppealMutation.mutateAsync({ groupId, message });
      setAppealMessage("");
      setIsAppealModalOpen(false);
      toast({ title: "Appeal sent to group owner" });
    } catch (error) {
      toast({
        title: "Unable to submit appeal",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isGroupLoading) {
    return (
      <div className="space-y-4">
        <GroupHeaderSkeleton />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-6 text-sm text-slate-600">Group not found.</div>;
  }

  return (
    <>
      <Card className="mb-4 border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xl font-semibold">{group.name}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => router.push(`/community/group/${groupId}/members`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 hover:bg-slate-100"
            >
              <div className="flex items-center -space-x-2">
                {group.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={member.user.image || ""} />
                    <AvatarFallback className="bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                      {(member.user.name?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">+{Math.max(0, group.members.length - 3)}</span>
            </button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-auto h-8 gap-2 cursor-pointer border-none shadow-none bg-transparent hover:bg-slate-100 px-2 transition-colors font-medium text-slate-600">
                <SelectValue placeholder="Latest" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              type="button" 
              size="sm" 
              className="cursor-pointer" 
              onClick={() => setIsPostModalOpen(true)}
            >
              New post
            </Button>
          </div>
        </div>
      </Card>

      {group.isMember && (
        <Card 
          className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors border-slate-200"
          onClick={() => setIsPostModalOpen(true)}
        >
          <Avatar className="h-10 w-10 border border-slate-100 shadow-sm">
            <AvatarImage src={me?.image || ""} />
            <AvatarFallback className="bg-indigo-100 text-sm font-bold text-indigo-700">
              {(me?.name?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-[15px] text-slate-500 font-medium">
            Start a post
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <Plus className="h-5 w-5" />
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {!group.isMember ? (
          <Card className="p-8 text-center text-sm text-slate-600">
            Join this group to view and create posts.
          </Card>
        ) : !isPostsLoading && posts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-600">No posts yet. Create the first post.</Card>
        ) : (
          posts.map((post: any) => (
            <PostCard key={post.id} post={post} feedType="global" feedId="community-feed" />
          ))
        )}
      </div>

      <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create post in {group.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="min-h-[300px] rounded-md border border-slate-200 overflow-hidden">
              <Editor
                initialContent={postBody}
                onContentChange={setPostBody}
                editorClassName="prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none"
              />
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <MediaUpload
                bucket="attachments"
                pathPrefix={`community/groups/${groupId}`}
                onChange={setMedia}
                initialMedia={media}
              />
            </div>
            <Button
              type="button"
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending}
              className="w-full cursor-pointer"
            >
              Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockedModalOpen} onOpenChange={setIsBlockedModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You are blocked from posting</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Your account is currently restricted from posting in this group.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsBlockedModalOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => {
                setIsBlockedModalOpen(false);
                setIsAppealModalOpen(true);
              }}
            >
              Appeal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAppealModalOpen} onOpenChange={setIsAppealModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit appeal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={appealMessage}
              onChange={(e) => setAppealMessage(e.target.value)}
              placeholder="Explain why this block should be reviewed..."
              className="min-h-[140px]"
            />
            <Button type="button" onClick={handleAppeal} disabled={createAppealMutation.isPending} className="cursor-pointer">
              Send appeal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
