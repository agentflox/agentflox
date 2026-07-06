"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { GroupCardSkeleton } from "../components/GroupSkeletons";

export function DiscussionGroupsView() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const { data: groupPosts, isLoading } = trpc.communityGroup.list.useQuery({});
  const createGroup = trpc.communityGroup.create.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.list.invalidate({});
    },
  });
  const joinGroup = trpc.communityGroup.join.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.list.invalidate({});
    },
  });
  const { data: session } = useSession();

  const requireAuth = (actionName: string) => {
    if (!session) {
      toast({
        title: `Hi there! You need to login to ${actionName}.`,
      });
      setTimeout(() => {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      }, 1500);
      return false;
    }
    return true;
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    try {
      const created = await createGroup.mutateAsync({
        name,
        description: newGroupDescription.trim() || undefined,
      });
      setNewGroupName("");
      setNewGroupDescription("");
      setIsModalOpen(false);
      toast({ title: "Discussion group created" });
      router.push(`/community/group/${created.id}`);
    } catch (error) {
      toast({
        title: "Failed to create group",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenGroup = async (group: { id: string; isMember: boolean }) => {
    try {
      if (!group.isMember) {
        if (!requireAuth('join groups')) return;
        await joinGroup.mutateAsync({ groupId: group.id });
        toast({ title: "Joined group" });
      }
      router.push(`/community/group/${group.id}`);
    } catch (error) {
      toast({
        title: "Unable to join group",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-slate-200/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900">Discussion Groups</h2>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <Button 
              type="button" 
              size="sm"
              className="cursor-pointer" 
              onClick={() => { if (requireAuth('create groups')) setIsModalOpen(true); }}
            >
              New Group
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <GroupCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(groupPosts || []).map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleOpenGroup(group)}
                className="group flex flex-col justify-between w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-6 text-left transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <div className="space-y-4 w-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{group.name}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">{group.memberCount} members</p>
                      </div>
                    </div>
                    {group.isMember ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Joined
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        Join
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {(groupPosts?.length || 0) === 0 && (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-slate-200 bg-slate-50/50 rounded-xl mt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No groups found</h3>
              <p className="text-sm text-slate-500 max-w-[250px]">
                There aren&apos;t any discussion groups yet. Be the first to create one!
              </p>
            </Card>
          )}
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">Create discussion group</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-3">
              <Label htmlFor="group-name" className="text-sm font-semibold text-slate-700">Group name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. AI Agent Builders"
                className="h-11 text-[15px] border-slate-200 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-100/50 focus-visible:border-indigo-200 transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="group-description" className="text-sm font-semibold text-slate-700">Description</Label>
              <Textarea
                id="group-description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="What is this group about?"
                className="min-h-[150px] text-[15px] resize-none border-slate-200 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-100/50 focus-visible:border-indigo-200 transition-all p-3"
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button 
                type="button" 
                onClick={handleCreateGroup} 
                disabled={createGroup.isPending} 
                className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6"
              >
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
