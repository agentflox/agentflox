"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { X, Search, Plus, Users, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ShareModal } from "@/components/permissions/ShareModal";
import { ContextMemberPicker } from "./ContextMemberPicker";

export interface SelectedMember {
  id: string;
  name: string;
  email?: string;
  image?: string;
  source: "workspace" | "project" | "team" | "space";
  sourceName?: string;
}

function SidebarShell({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={cn(
      "absolute inset-y-4 rounded-md right-0 z-[60] w-auto min-w-[24rem] max-w-md transform bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 border border-slate-200/60 flex flex-col overflow-hidden",
      open ? "-translate-x-14" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
        <span className="text-base font-semibold tracking-tight text-slate-900">{title}</span>
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer cursor-pointer" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-8 space-y-6 bg-white">{children}</div>
    </div>
  );
}

export function ChannelMembersSidebar({ open, onClose, chatMembers, onAddMember, onRemoveMember, workspaceId, channelId }: { open: boolean; onClose: () => void; chatMembers: SelectedMember[]; onAddMember?: (member: SelectedMember) => void; onRemoveMember: (id: string) => void; workspaceId?: string; channelId?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [contextMembersOpen, setContextMembersOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: channelData, refetch: refetchChannel } = trpc.channel.get.useQuery(
    { id: channelId! },
    { enabled: !!channelId }
  );

  const addMemberMutation = trpc.channel.addMember.useMutation();
  const removeMemberMutation = trpc.channel.removeMember.useMutation();

  const { data: workspaceMembersData } = trpc.workspace.getMembers.useQuery(
    { id: workspaceId! },
    { enabled: !!workspaceId && contextMembersOpen }
  );

  const isCreator = channelData?.createdBy === currentUserId;

  const filteredMembers = chatMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let contextType: 'workspace' | 'project' | 'space' | 'team' = 'workspace';
  let contextId = workspaceId;

  // Detect context from channelData — these fields are now explicit in the get query
  if (channelData?.projectId) {
    contextType = 'project';
    contextId = channelData.projectId;
  } else if (channelData?.teamId) {
    contextType = 'team';
    contextId = channelData.teamId;
  } else if (channelData?.spaceId) {
    contextType = 'space';
    contextId = channelData.spaceId;
  }

  // Data fetching based on context
  const { data: projectData } = (trpc.project as any).get?.useQuery(
    { id: contextId! },
    { enabled: contextType === 'project' && !!contextId && contextMembersOpen }
  ) ?? { data: null };

  const { data: teamData } = (trpc.team as any).get?.useQuery(
    { id: contextId! },
    { enabled: contextType === 'team' && !!contextId && contextMembersOpen }
  ) ?? { data: null };

  const { data: spaceData } = (trpc.space as any).get?.useQuery(
    { id: contextId! },
    { enabled: contextType === 'space' && !!contextId && contextMembersOpen }
  ) ?? { data: null };

  // Calculate context name and available members
  let contextName = "Workspace";
  let availableMembers: any[] = [];

  if (contextType === 'project' && projectData) {
    contextName = projectData.name || "Project";
    availableMembers = projectData.members || [];
  } else if (contextType === 'team' && teamData) {
    contextName = teamData.name || "Team";
    availableMembers = teamData.members || [];
  } else if (contextType === 'space' && spaceData) {
    contextName = spaceData.name || "Space";
    availableMembers = spaceData.members || [];
  } else if (contextType === 'workspace') {
    contextName = "Workspace";
    availableMembers = workspaceMembersData || [];
  }

  return (
    <>
      <SidebarShell title="Chat members" open={open} onClose={onClose}>
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50/50 px-3 shadow-sm transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <Input
                // @ts-ignore
                variant="ghost"
                placeholder="Search members"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full border-0 bg-transparent pl-2 pr-0 focus:outline-none focus-visible:ring-0 shadow-none"
              />
            </div>

            {isCreator && (
              <Popover open={addPeopleOpen} onOpenChange={(open) => {
                setAddPeopleOpen(open);
                if (!open) setContextMembersOpen(false);
              }}>
                <PopoverTrigger asChild>
                  <Button className="w-full h-10 rounded-lg font-medium bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-900 hover:to-black text-white shadow-md shadow-zinc-200 hover:shadow-lg hover:shadow-zinc-300 transition-all flex items-center justify-center gap-2 border-0">
                    <Plus className="h-4 w-4" /> Add People
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2 z-[70]" align="center" side="bottom">
                  {!contextMembersOpen ? (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setContextMembersOpen(true)}
                        className="flex flex-col items-start px-3 py-2 text-left hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900">
                          <Users className="h-4 w-4 text-slate-500" />
                          Add from {contextName}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-6">
                          Select existing members from this {contextType}.
                        </p>
                      </button>
                      <button
                        onClick={() => { setAddPeopleOpen(false); setShareModalOpen(true); }}
                        className="flex flex-col items-start px-3 py-2 text-left hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-900">
                          <UserPlus className="h-4 w-4 text-slate-500" />
                          Invite new
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-6">
                          Invite someone new to this {contextType}.
                        </p>
                      </button>
                    </div>
                  ) : (
                    <ContextMemberPicker
                      contextName={contextName}
                      availableMembers={availableMembers}
                      chatMembers={chatMembers}
                      onClose={() => setContextMembersOpen(false)}
                      onInvite={async (userId) => {
                        if (!channelId) return;
                        const memberItem = availableMembers.find((m: any) => (m.user?.id || m.id) === userId);
                        const user = memberItem?.user || memberItem;
                        if (!user) return;

                        await addMemberMutation.mutateAsync({ channelId, userId });

                        if (onAddMember) {
                          onAddMember({
                            id: user.id,
                            name: user.name || "Unknown User",
                            email: user.email || undefined,
                            image: user.image || undefined,
                            source: contextType,
                            sourceName: contextName,
                          });
                        }
                        refetchChannel();
                      }}
                    />
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {filteredMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{chatMembers.length === 0 ? "No members yet." : "No members found."}</p>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:shadow-sm transition-all group">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.image} />
                    <AvatarFallback className="text-sm font-semibold bg-slate-100 text-slate-600">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                    {member.email && <p className="truncate text-xs text-muted-foreground">{member.email}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize text-slate-500 border-slate-200">{member.source}</Badge>
                    {isCreator && (
                      <button
                        onClick={async () => {
                          if (channelId) {
                            await removeMemberMutation.mutateAsync({ channelId, userId: member.id });
                            refetchChannel();
                          }
                          onRemoveMember(member.id);
                        }}
                        aria-label="Remove member"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarShell>

      {shareModalOpen && channelId && workspaceId && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          itemType="channel"
          itemId={channelId}
          itemName="Channel"
          workspaceId={workspaceId}
        />
      )}
    </>

  );
}

export default ChannelMembersSidebar;
