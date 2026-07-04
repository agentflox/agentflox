"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, Ban, UserMinus, MoreVertical, Globe, Tags, Compass, MapPin, Search, ArrowLeft, Users, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MemberSkeleton } from "@/features/community/components/GroupSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupMembersPage() {
  const params = useParams();
  const groupId = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockJoin, setBlockJoin] = useState(false);
  const [blockPost, setBlockPost] = useState(true);
  const [removeFromGroup, setRemoveFromGroup] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const utils = trpc.useUtils();

  const { data: group, isLoading } = trpc.communityGroup.get.useQuery(
    { id: groupId },
    { enabled: !!groupId }
  );
  const { data: me } = trpc.user.me.useQuery();
  const blockMember = trpc.communityGroup.blockMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const unblockMember = trpc.communityGroup.unblockMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });
  const removeMember = trpc.communityGroup.removeMember.useMutation({
    onSuccess: async () => {
      await utils.communityGroup.get.invalidate({ id: groupId });
    },
  });

  const members = useMemo(() => {
    const list = group?.members || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((member) => (member.user.name || "").toLowerCase().includes(q));
  }, [group?.members, query]);
  const isOwner = !!group?.owner?.id && group.owner.id === me?.id;

  const selectedMember = members.find((m) => m.userId === selectedUserId);

  const submitBlock = async () => {
    if (!selectedUserId) return;
    try {
      await blockMember.mutateAsync({
        groupId,
        memberUserId: selectedUserId,
        reason: blockReason.trim() || undefined,
        blockJoin,
        blockPost,
        removeFromGroup,
      });
      setBlockDialogOpen(false);
      setBlockReason("");
      setBlockJoin(false);
      setBlockPost(true);
      setRemoveFromGroup(false);
      toast({ title: "Member updated" });
    } catch (error) {
      toast({
        title: "Unable to block member",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 cursor-wait"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Group
          </button>
          <div className="h-6 w-48 rounded bg-slate-100 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card className="p-6 text-center animate-pulse">
              <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-slate-200" />
              <div className="h-5 w-32 mx-auto rounded bg-slate-200 mb-4" />
              <div className="h-8 w-full rounded-full bg-slate-100" />
            </Card>
            <Card className="p-5 space-y-6 animate-pulse">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
              <div className="space-y-2">
                <div className="h-10 w-full rounded-lg bg-slate-50" />
                <div className="h-10 w-full rounded-lg bg-slate-50" />
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <div className="h-6 w-32 rounded bg-slate-100 mb-4" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MemberSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-12 text-center text-slate-600">Group not found.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
      {/* Top Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/community/group/${groupId}`)}
          className="group inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to {group.name}
        </button>

        <div className="flex items-center gap-2 text-slate-900">
          <Users className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-bold">{group.name} Members</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          {/* My Profile Card */}
          {me && (
            <Card className="overflow-hidden border-slate-200/60 shadow-sm bg-gradient-to-b from-slate-50/50 to-white">
              <div className="p-6 text-center">
                <div className="relative mx-auto mb-4 w-fit">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                    <AvatarImage src={me.image || ""} />
                    <AvatarFallback className="bg-indigo-100 text-2xl font-bold text-indigo-700">
                      {(me.name?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwner && (
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-2 ring-white">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{me.name}</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full rounded-full border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                  onClick={() => router.push(`/profiles/${me.id}`)}
                >
                  View profile
                </Button>
              </div>
            </Card>
          )}

          {/* Search & Filters */}
          <Card className="border-slate-200/60 shadow-sm">
            <div className="p-5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Find members</h3>
                <button
                  onClick={() => setQuery("")}
                  className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full bg-transparent border-none p-0 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                {[
                  { icon: MapPin, label: "Near me" },
                  { icon: Compass, label: "Online" },
                  { icon: Filter, label: "Recently joined" }
                ].map((f) => (
                  <button
                    key={f.label}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-white hover:border-indigo-200 hover:text-indigo-600 hover:shadow-sm cursor-pointer"
                  >
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</label>
                  <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                    <input
                      placeholder="Search location"
                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tag</label>
                  <Select>
                    <SelectTrigger className="h-9 text-sm border-slate-100 cursor-pointer">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eng">Engineering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Members Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <h2 className="text-lg font-bold text-slate-900">Search results</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold text-slate-600">
              {members.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <Card
                key={member.id}
                className="group relative flex flex-col overflow-hidden border-slate-200/60 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 h-full"
              >
                {/* Background Decor */}
                <div className="h-20 bg-gradient-to-br from-indigo-50 to-violet-50" />

                {/* More Button - Top Right */}
                <div className="absolute top-3 right-3 z-10">
                  {isOwner && member.userId !== group.owner.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-sm hover:bg-white transition-colors text-slate-400 hover:text-slate-900 cursor-pointer shadow-sm">
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-1.5">
                        <DropdownMenuItem
                          className="gap-2 text-slate-600 cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(member.userId);
                            setBlockDialogOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                          Moderate member
                        </DropdownMenuItem>

                        {member.ban?.blockPost && (
                          <DropdownMenuItem
                            className="gap-2 text-indigo-600 cursor-pointer"
                            onClick={async () => {
                              await unblockMember.mutateAsync({ groupId, memberUserId: member.userId });
                              toast({ title: "Posting block removed" });
                            }}
                          >
                            <Ban className="h-4 w-4" />
                            Allow posting
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                          onClick={async () => {
                            await removeMember.mutateAsync({ groupId, memberUserId: member.userId });
                            toast({ title: "Member removed" });
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove from group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex-1 flex flex-col px-6 pb-6 pt-0">
                  <div className="flex flex-col items-center -mt-12 flex-1">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-1 ring-slate-100">
                      <AvatarImage src={member.user.image || ""} />
                      <AvatarFallback className="bg-slate-100 text-2xl font-bold text-slate-700">
                        {(member.user.name?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="mt-4 text-center">
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {member.user.name || "Community Member"}
                      </h3>
                      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate-500">
                        {(member.ban?.blockJoin || member.ban?.blockPost) ? (
                          <span className="flex items-center gap-1 text-red-500">
                            <Ban className="h-3.5 w-3.5" /> Blocked
                          </span>
                        ) : (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{member.role || "Member"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 w-full rounded-full border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
                    onClick={() => router.push(`/profiles/${member.userId}`)}
                  >
                    View profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {!isLoading && members.length === 0 && (
            <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-transparent">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No members found matching your search.</p>
              <button
                onClick={() => setQuery("")}
                className="mt-2 text-sm font-bold text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Moderate Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src={selectedMember?.user.image || ""} />
                <AvatarFallback className="font-bold">
                  {(selectedMember?.user.name?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-900">{selectedMember?.user.name}</p>
                <p className="text-xs text-slate-500">{selectedMember?.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { id: "post", label: "Block from posting", checked: blockPost, onChange: setBlockPost },
                { id: "join", label: "Block from joining", checked: blockJoin, onChange: setBlockJoin },
                { id: "remove", label: "Remove from group", checked: removeFromGroup, onChange: setRemoveFromGroup }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={opt.checked}
                    onChange={(e) => opt.onChange(e.target.checked)}
                  />
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Reason for moderation</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Violation of group rules"
                className="h-11 border-slate-200"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setBlockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
                onClick={submitBlock}
                disabled={blockMember.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

