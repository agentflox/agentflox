"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
    <SidebarShell title="Chat Settings" open={open} onClose={onClose}>
      <div className="space-y-5">

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Title</Label>
          <Input
            value={chatTitle}
            onChange={(e) => onChatTitle(e.target.value)}
            className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-all"
          />
        </div>

        {/* Topic */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Topic</Label>
          <Input
            value={chatTopic}
            onChange={(e) => onChatTopic(e.target.value)}
            placeholder="e.g. Sprint 14 planning"
            className="h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-all"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Description</Label>
          <Textarea
            value={chatDescription}
            onChange={(e) => onChatDescription(e.target.value)}
            rows={4}
            placeholder="Describe the purpose of this chat"
            className="rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-all resize-none"
          />
        </div>

        {/* Save */}
        <div className="pt-4 border-t border-slate-100">
          <Button
            onClick={onSave}
            disabled={disabled || !chatTitle.trim()}
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all disabled:opacity-40 disabled:shadow-none"
          >
            Save Changes
          </Button>
        </div>

      </div>
    </SidebarShell>
  );
}

export default ChannelSettingsSidebar;
