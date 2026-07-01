"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-8 space-y-6 bg-white">{children}</div>
    </div>
  );
}

export function ChannelMembersSidebar({ open, onClose, chatMembers, onRemoveMember }: { open: boolean; onClose: () => void; chatMembers: SelectedMember[]; onRemoveMember: (id: string) => void }) {
  return (
    <SidebarShell title="Chat members" open={open} onClose={onClose}>
      {chatMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {chatMembers.map((member) => (
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
                <button
                  onClick={() => onRemoveMember(member.id)}
                  aria-label="Remove member"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SidebarShell>
  );
}

export default ChannelMembersSidebar;
