"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function ChannelSettingsSidebar({
  open,
  onClose,
  chatTitle,
  onChatTitle,
  chatTopic,
  onChatTopic,
  chatDescription,
  onChatDescription,
  onSave,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  chatTitle: string;
  onChatTitle: (v: string) => void;
  chatTopic: string;
  onChatTopic: (v: string) => void;
  chatDescription: string;
  onChatDescription: (v: string) => void;
  onSave: () => void;
  disabled?: boolean;
}) {
  return (
    <SidebarShell title="Chat settings" open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={chatTitle} onChange={(e) => onChatTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Input value={chatTopic} onChange={(e) => onChatTopic(e.target.value)} placeholder="e.g. Sprint 14 planning" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={chatDescription} onChange={(e) => onChatDescription(e.target.value)} rows={3} placeholder="Describe the purpose of this chat" />
        </div>
        <Button onClick={onSave} disabled={disabled || !chatTitle.trim()}>Save</Button>
      </div>
    </SidebarShell>
  );
}

export default ChannelSettingsSidebar;
