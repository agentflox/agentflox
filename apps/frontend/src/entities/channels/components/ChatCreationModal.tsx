"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatCreationModal({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreate: (title: string, topic?: string, description?: string) => Promise<void> | void;
  isCreating?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    await onCreate(title.trim(), undefined, description.trim() || undefined);
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-6">
        <div className="pb-2">
          <div className="flex items-start gap-5">
            <div className={cn(
              "mt-1 p-3 rounded-2xl border transition-all duration-300",
              "bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
              "group-hover:scale-105"
            )}>
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                Create chat
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                Start a new workspace chat.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="chat-title" className="text-sm font-medium text-slate-700">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="chat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint planning"
              className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </div>

          <div className="space-y-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-[10px] font-normal lowercase">(optional)</span>
              </Label>
            </div>
            <Textarea
              id="chat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context for this chat"
              rows={3}
              className="min-h-[100px] mt-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className={cn(
              "w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/40 sm:w-auto",
              isCreating && "opacity-90"
            )}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                Creating...
              </span>
            ) : (
              "Create chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChatCreationModal;

