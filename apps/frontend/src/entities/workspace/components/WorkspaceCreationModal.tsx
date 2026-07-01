"use client";

import React from "react";
import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type WorkspaceCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

const INITIAL_STATE = {
  name: "",
  description: "",
};

export function WorkspaceCreationModal({ open, onOpenChange, onCreated }: WorkspaceCreationModalProps) {
  const { toast } = useToast();
  const [form, setForm] = React.useState(INITIAL_STATE);
  const createMutation = trpc.workspace.create.useMutation();
  const utils = trpc.useUtils();
  const isSubmitting = createMutation.isPending;

  React.useEffect(() => {
    if (!open) {
      setForm(INITIAL_STATE);
      createMutation.reset();
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Missing details",
        description: "Please provide a workspace name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isActive: true,
      });

      await utils.workspace.list.invalidate();
      toast({ title: "Workspace created", description: "Your workspace is ready." });
      onCreated?.(result.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create workspace:", error);
      toast({
        title: "Could not create the workspace",
        description: error?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
        {/* Header Section */}
        <div className="p-6 pb-2">
          <div className="flex items-start gap-5">
            <div className={cn(
              "mt-1 p-3 rounded-2xl border transition-all duration-300",
              "bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
              "group-hover:scale-105"
            )}>
              <Rocket className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                Create a workspace
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                Organize your spaces, projects, teams, and resources.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-sm font-medium text-slate-700">
                Workspace name
              </Label>
              <Input
                id="workspace-name"
                name="name"
                placeholder="Ex: Atlas Collaboration Hub"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="workspace-description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <span className="text-xs text-muted-foreground">Optional, a short purpose note</span>
              </div>
              <Textarea
                id="workspace-description"
                name="description"
                placeholder="Describe the focus, mission, or who should join..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[120px] rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            {createMutation.error && (
              <p className="text-sm text-red-600">
                {createMutation.error.message || "Something unexpected happened. Please try again."}
              </p>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/20 flex items-center justify-end gap-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-4 hover:bg-transparent hover:text-foreground text-muted-foreground font-medium transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 font-semibold shadow-lg hover:shadow-primary/25 transition-all duration-300"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Creating...
                </span>
              ) : (
                "Create workspace"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkspaceCreationModal;