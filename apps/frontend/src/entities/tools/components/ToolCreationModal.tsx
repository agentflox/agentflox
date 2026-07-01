"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Workflow, Sparkles, GitBranch, Cpu, ArrowRight, Hammer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ToolCreationMode = "AI" | "FLOW";

type ToolCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

const OPTIONS: Array<{
  mode: ToolCreationMode;
  icon: React.ElementType;
  accentIcon: React.ElementType;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  buttonClass: string;
}> = [
    {
      mode: "AI",
      icon: Sparkles,
      accentIcon: Cpu,
      label: "Build with AI",
      tagline: "Generate tool automatically",
      description: "Describe what you want the tool to do and AI will build the necessary nodes and connections for you.",
      bullets: ["Prompt-to-tool generation", "Auto-configured parameters", "Quick setup"],
      gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
      border: "border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600",
      iconBg: "bg-violet-100 dark:bg-violet-950",
      iconColor: "text-violet-600 dark:text-violet-400",
      buttonClass: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25",
    },
    {
      mode: "FLOW",
      icon: Workflow,
      accentIcon: GitBranch,
      label: "Build with Flow",
      tagline: "Build the tool from nodes manually",
      description: "Design custom tool logic using an interactive node-based visual editor. Complete control over every step and data flow.",
      bullets: ["Drag-and-drop canvas", "Custom data transformations", "API integrations"],
      gradient: "from-sky-500/10 via-cyan-500/5 to-transparent",
      border: "border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600",
      iconBg: "bg-sky-100 dark:bg-sky-950",
      iconColor: "text-sky-600 dark:text-sky-400",
      buttonClass: "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white shadow-lg shadow-sky-500/25",
    },
  ];

export function ToolCreationModal({ open, onOpenChange, onCreated }: ToolCreationModalProps) {
  const { toast } = useToast();
  const router = useRouter();

  const createTool = trpc.compositeTool.create.useMutation({
    onSuccess: async (data) => {
      toast({
        title: "Tool created",
        description: "Your tool has been created successfully.",
      });
      onOpenChange(false);
      onCreated?.(data.id);
      router.push(`/dashboard/tools/build/flow/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error creating tool",
        description: error.message || "An error occurred while creating the tool.",
        variant: "destructive",
      });
    },
  });

  const handleSelect = (mode: ToolCreationMode) => {
    if (mode === "AI") {
      onOpenChange(false);
      router.push("/dashboard/tools/build/ai");
    } else if (mode === "FLOW") {
      const defaultName = "Untitled";

      const functionSchema = {
        name: "untitled_tool",
        description: "A new custom tool",
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

      createTool.mutate({
        name: defaultName,
        description: "A new custom tool",
        functionSchema,
        steps: [],
        mode: "MANUAL",
      } as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl gap-6 p-8">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hammer className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">New Tool</span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Choose your build method
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Select how you want to construct this new tool.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const AccentIcon = opt.accentIcon;
            return (
              <div
                key={opt.mode}
                className={cn(
                  "group relative flex flex-col gap-5 rounded-2xl border-2 bg-gradient-to-br p-5 transition-all duration-200 cursor-pointer",
                  opt.gradient,
                  opt.border,
                  (createTool.isPending && opt.mode === "FLOW") ? "opacity-70 pointer-events-none" : ""
                )}
                onClick={() => handleSelect(opt.mode)}
              >
                {/* Icon */}
                <div className={cn("inline-flex w-fit rounded-xl p-3", opt.iconBg)}>
                  <Icon className={cn("h-6 w-6", opt.iconColor)} />
                </div>

                {/* Copy */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {opt.tagline}
                  </p>
                  <h3 className="text-lg font-bold">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{opt.description}</p>
                </div>

                {/* Bullets */}
                <ul className="space-y-1.5">
                  {opt.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AccentIcon className={cn("h-3.5 w-3.5 flex-shrink-0", opt.iconColor)} />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={cn(
                    "mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer",
                    opt.buttonClass,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt.mode);
                  }}
                  disabled={createTool.isPending && opt.mode === "FLOW"}
                >
                  {createTool.isPending && opt.mode === "FLOW" ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Creating...
                    </span>
                  ) : (
                    <>
                      {opt.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ToolCreationModal;
