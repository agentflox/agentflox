"use client";

import React from "react";
import { FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-xl gap-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-semibold tracking-tight">Create a workspace</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Set the foundation for collaboration. You can refine details later.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-center rounded-2xl bg-white/80 p-3 text-sky-600 shadow-inner">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">A home for your projects, teams, and tasks.</p>
                <p className="text-sm text-muted-foreground">Give it a clear identity so teammates know where to work.</p>
              </div>
            </div>
          </div>

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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
              className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-600">
              {createMutation.error.message || "Something unexpected happened. Please try again."}
            </p>
          )}

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                "w-full rounded-xl bg-gradient-to-r from-sky-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-sky-500/30 transition hover:shadow-2xl sm:w-auto",
                isSubmitting && "opacity-90"
              )}
              disabled={isSubmitting}
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

