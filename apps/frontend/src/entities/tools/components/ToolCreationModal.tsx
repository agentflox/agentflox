"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TOOL_CATEGORIES = [
  { value: "Custom", label: "Custom" },
  { value: "Workflow", label: "Workflow" },
  { value: "Integration", label: "Integration" },
];

type ToolCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

const INITIAL_STATE = {
  name: "",
  description: "",
  category: "Custom",
  isPublic: true,
};

export function ToolCreationModal({ open, onOpenChange, onCreated }: ToolCreationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();

  const [form, setForm] = useState(INITIAL_STATE);

  const createTool = trpc.compositeTool.create.useMutation();
  const isSubmitting = createTool.isPending;

  useEffect(() => {
    if (open) {
      setForm(INITIAL_STATE);
      createTool.reset();
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category.trim()) {
      toast({
        title: "Missing details",
        description: "Please provide both a tool name and category.",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    const functionSchema = {
      name: trimmedName,
      description: trimmedDescription || undefined,
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
      returns: {
        type: "object",
        properties: {},
      },
    };

    try {
      const result = await createTool.mutateAsync({
        name: trimmedName,
        description: trimmedDescription || undefined,
        category: form.category,
        functionSchema,
        steps: [],
        isPublic: form.isPublic,
        // workspaceId is optional; backend will fall back to first active workspace if missing.
        workspaceId: (params?.workspaceId as string) || undefined,
      } as any);

      toast({
        title: "Tool created",
        description: "Your composite tool is ready.",
      });
      onCreated?.(result.id);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error creating tool",
        description: error?.message || "An error occurred while creating the tool.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl gap-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Create a tool
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Define a composite tool. You can refine inputs, outputs, and steps in the builder.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="tool-name" className="text-sm font-medium text-slate-700">
              Tool name
            </Label>
            <Input
              id="tool-name"
              name="name"
              placeholder="Ex: Research & Synthesis Workflow"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Category
            </Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-xs focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-slate-100 shadow-xl">
                {TOOL_CATEGORIES.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg px-3 py-2.5"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="tool-description"
                className="text-sm font-medium text-slate-700"
              >
                Description
              </Label>
              <span className="text-xs text-muted-foreground">
                Optional, but recommended
              </span>
            </div>
            <Textarea
              id="tool-description"
              name="description"
              placeholder="Describe what this tool does and when it should be used."
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="tool-public" className="text-sm font-medium text-slate-700">
                Public tool
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow other workspace members to use this tool.
              </p>
            </div>
            <Switch
              id="tool-public"
              checked={form.isPublic}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isPublic: checked }))
              }
            />
          </div>

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
                "w-full rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-2xl sm:w-auto",
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
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create tool
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ToolCreationModal;
