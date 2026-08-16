"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AtSign, Loader2, MessageSquare, UserRoundPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export type ManualTriggerKind = "mention" | "directMessage" | "assignTask";

const TRIGGER_META: Record<
  ManualTriggerKind,
  {
    title: string;
    description: string;
    triggerType: "MENTION" | "DIRECT_MESSAGE" | "ASSIGN_TASK";
    icon: React.ComponentType<{ className?: string }>;
    iconClassName: string;
  }
> = {
  mention: {
    title: "Mention",
    description:
      "Describe in detail what this agent should do when a user mentions the agent (e.g., with an @-mention) in a conversation.",
    triggerType: "MENTION",
    icon: AtSign,
    iconClassName: "text-blue-600",
  },
  directMessage: {
    title: "Direct message",
    description:
      "Describe in detail what this agent should do when it receives a direct message from a user.",
    triggerType: "DIRECT_MESSAGE",
    icon: MessageSquare,
    iconClassName: "text-violet-600",
  },
  assignTask: {
    title: "Assign task",
    description:
      "Describe in detail what this agent should do when a user sets the agent as an assignee.",
    triggerType: "ASSIGN_TASK",
    icon: UserRoundPlus,
    iconClassName: "text-orange-500",
  },
};

export function getManualTriggerMeta(kind: ManualTriggerKind) {
  return TRIGGER_META[kind];
}

interface TriggerInstructionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ManualTriggerKind | null;
  initialInstructions?: string;
  isLoading?: boolean;
  onSave: (instructions: string) => void | Promise<void>;
}

export function TriggerInstructionModal({
  open,
  onOpenChange,
  kind,
  initialInstructions = "",
  isLoading = false,
  onSave,
}: TriggerInstructionModalProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const meta = kind ? TRIGGER_META[kind] : null;
  const Icon = meta?.icon ?? AtSign;

  useEffect(() => {
    if (!open) return;
    setInstructions(initialInstructions || "");
  }, [open, initialInstructions, kind]);

  if (!meta || !kind) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-[520px] w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl",
        )}
      >
        <DialogHeader className="px-6 pt-5 pb-2 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center shrink-0",
              )}
            >
              <Icon className={cn("h-5 w-5", meta.iconClassName)} />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5 text-left">
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              {meta.title}
            </DialogTitle>
            <p className="text-sm text-zinc-500 leading-relaxed font-normal">
              {meta.description}
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Write your instructions here"
            disabled={isLoading}
            className="min-h-[200px] max-h-[320px] rounded-xl border-zinc-200 text-sm resize-y"
          />
          <p className="mt-2 text-[11px] text-zinc-400 flex items-center justify-end gap-1.5">
            Reference tasks, Docs, people to guide your agent
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
              <AtSign className="h-3 w-3" />
            </span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-white px-6 py-4 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-10 min-w-[110px] rounded-xl border-zinc-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(instructions)}
            disabled={isLoading}
            className="h-10 min-w-[110px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
