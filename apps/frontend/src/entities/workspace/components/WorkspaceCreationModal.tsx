"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { useUsageCapModal } from "@/features/usage/hooks/useUsageCapModal";
import { UsageRemainingHint } from "@/features/usage/components/UsageRemainingHint";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { WorkspaceIcon } from "./WorkspaceIcon";

type WorkspaceCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

const INITIAL_STATE = {
  name: "",
  description: "",
  icon: "W",
  color: "#3B82F6",
  visibility: "ADMINS" as "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC",
  hasManualIcon: false,
};

const visibilityOptions = [
  {
    label: "Only Owners",
    value: "PRIVATE",
    description: "Only space owners can view and edit"
  },
  {
    label: "Owners & Admins",
    value: "ADMINS",
    description: "Owners and admins can view and edit"
  },
  {
    label: "Owners, Admins & Members",
    value: "MEMBERS",
    description: "All space members can view"
  },
  {
    label: "Anyone with Link",
    value: "PUBLIC",
    description: "Anyone with the link can view"
  },
];


export function WorkspaceCreationModal({ open, onOpenChange, onCreated }: WorkspaceCreationModalProps) {
  const { toast } = useToast();
  const { handleError } = useUsageCapModal();
  const [form, setForm] = React.useState(INITIAL_STATE);
  const createMutation = trpc.workspace.create.useMutation();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
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
        icon: form.icon || undefined,
        color: form.color || undefined,
        isActive: true,
        visibility: form.visibility as any,
      });

      queryClient.setQueriesData({ queryKey: [['workspace', 'list']] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        if (oldData.items.some((i: any) => i.id === result.id)) return oldData;
        return {
          ...oldData,
          items: [result, ...oldData.items],
          total: (oldData.total || 0) + 1
        };
      });
      queryClient.setQueriesData({ queryKey: [['workspace', 'listInfinite']] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any, index: number) =>
            index === 0 ? { ...page, items: [result, ...page.items.filter((i: any) => i.id !== result.id)] } : page
          )
        };
      });
      setTimeout(() => { utils.workspace.list.invalidate(); }, 1000);
      toast({ title: "Workspace created", description: "Your workspace is ready." });
      onCreated?.(result.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create workspace:", error);
      if (handleError(error)) return;
      toast({
        title: "Could not create the workspace",
        description: error?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl backdrop-blur-xl transition-all duration-300">
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
            <div className="space-y-2.5">
              <Label htmlFor="workspace-name" className="text-sm font-medium text-slate-700">
                Icon & name <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <IconColorSelector
                  icon={form.icon}
                  color={form.color}
                  onIconChange={(newIcon) => {
                    setForm(prev => ({ ...prev, icon: newIcon, hasManualIcon: true }));
                  }}
                  onColorChange={(newColor) => {
                    setForm(prev => ({ ...prev, color: newColor }));
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                    style={{ backgroundColor: form.icon ? form.color : 'transparent' }}
                  >
                    <WorkspaceIcon icon={form.icon} className="text-white" size={20} />
                  </Button>
                </IconColorSelector>
                <Input
                  id="workspace-name"
                  name="name"
                  placeholder="Ex: Atlas Collaboration Hub"
                  variant="ghost"
                  value={form.name}
                  onChange={(event) => {
                    const newName = event.target.value;
                    setForm((prev) => {
                      const updates: any = { name: newName };
                      if (!prev.hasManualIcon) {
                        updates.icon = newName.trim().charAt(0).toUpperCase() || "";
                      }
                      return { ...prev, ...updates };
                    });
                  }}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-zinc-900 shadow-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="workspace-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-xs font-normal lowercase">(optional)</span>
              </Label>
              <Textarea
                id="workspace-description"
                name="description"
                placeholder="Describe the focus, mission, or who should join..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[100px] rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus-visible:ring-none resize-none"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="workspace-visibility" className="text-sm font-medium text-slate-700">
                Visibility
              </Label>
              <Select
                value={form.visibility}
                onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger id="workspace-visibility" className="w-full max-w-xs rounded-md shadow-none bg-white border-slate-200 hover:border-slate-300 hover:bg-zinc-50">
                  <SelectValue placeholder="Select visibility">
                    {visibilityOptions.find((o) => o.value === form.visibility)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map(({ value, label, description }) => (
                    <SelectItem key={value} value={value} description={description}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createMutation.error && (
              <p className="text-sm text-red-600">
                {createMutation.error.message || "Something unexpected happened. Please try again."}
              </p>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/20 flex flex-wrap items-center justify-end gap-3 border-t border-border/40">
            <UsageRemainingHint kind="WORKSPACE" className="mr-auto w-full sm:w-auto" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-fuchsia-500/40 sm:w-auto",
                isSubmitting && "opacity-90"
              )}
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