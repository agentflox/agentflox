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
    <div className={cn("absolute right-0 top-14 z-[60] w-auto min-w-[22rem] max-w-md h-[calc(100%-3rem)] transform bg-white shadow-2xl transition-transform duration-300 border-l", open ? "-translate-x-14" : "translate-x-full")}> 
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-medium">{title}</span>
        <button className="rounded-md border p-1.5 hover:bg-muted" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="h-full overflow-y-auto p-4 space-y-4">{children}</div>
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
            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.image} />
                <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name}</p>
                {member.email && <p className="truncate text-xs text-muted-foreground">{member.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{member.source}</Badge>
                <Button size="icon" variant="ghost" onClick={() => onRemoveMember(member.id)} aria-label="Remove member">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SidebarShell>
  );
}

export default ChannelMembersSidebar;
