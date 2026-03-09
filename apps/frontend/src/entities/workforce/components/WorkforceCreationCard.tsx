"use client";

import React from "react";
import { Workflow, LayoutGrid, ArrowRight, Sparkles, GitBranch, Cpu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { WORKFORCE_TEMPLATES, WorkforceTemplate } from "@/features/dashboard/views/workforce/templates";
// WorkforceCreationMode maps to the store's 'FLOW' | 'SWARM' literals
export type WorkforceCreationMode = "FLOW" | "SWARM";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (mode: WorkforceCreationMode, id: string) => void;
};

const OPTIONS: Array<{
    mode: WorkforceCreationMode;
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
            mode: "FLOW" satisfies WorkforceCreationMode,
            icon: Workflow,
            accentIcon: GitBranch,
            label: "Workflow",
            tagline: "Visual flow-graph orchestration",
            description:
                "Design deterministic, step-by-step agent pipelines on an interactive canvas. Perfect for structured, repeatable processes with clear decision branches.",
            bullets: ["Drag-and-drop canvas", "Decision branches & conditions", "Trigger events & webhooks", "Real-time execution logs"],
            gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
            border: "border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600",
            iconBg: "bg-violet-100 dark:bg-violet-950",
            iconColor: "text-violet-600 dark:text-violet-400",
            buttonClass:
                "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25",
        },
        {
            mode: "SWARM",
            icon: LayoutGrid,
            accentIcon: Cpu,
            label: "Swarm",
            tagline: "Autonomous multi-agent workforce",
            description:
                "Deploy a fleet of specialized agents working in parallel. Agents autonomously pull tasks from a shared pool, self-organize, and scale to throughput demands.",
            bullets: ["Push & pull task allocation", "Manager / worker hierarchy", "Live throughput monitoring", "Auto-scaling agent pool"],
            gradient: "from-sky-500/10 via-cyan-500/5 to-transparent",
            border: "border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600",
            iconBg: "bg-sky-100 dark:bg-sky-950",
            iconColor: "text-sky-600 dark:text-sky-400",
            buttonClass:
                "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white shadow-lg shadow-sky-500/25",
        },
    ];

export function WorkforceCreationCard({ open, onOpenChange, onSelect }: Props) {
    const { toast } = useToast();
    const [pendingTemplateId, setPendingTemplateId] = React.useState<string | null>(null);

    const updateMutation = trpc.workforce.update.useMutation();
    const createMutation = trpc.workforce.create.useMutation({
        onSuccess: async (data, variables) => {
            // If a template is selected, immediately apply its graph to the new workforce
            const template = pendingTemplateId
                ? WORKFORCE_TEMPLATES.find((t) => t.id === pendingTemplateId)
                : undefined;

            if (template) {
                try {
                    await updateMutation.mutateAsync({
                        id: data.id,
                        name: variables.name,
                        description: template.description,
                        nodes: template.nodes,
                        edges: template.edges,
                    });
                } catch (error: any) {
                    toast({
                        title: "Template apply failed",
                        description: error?.message ?? "Failed to apply template graph. You can still configure this workforce manually.",
                        variant: "destructive",
                    });
                } finally {
                    setPendingTemplateId(null);
                }
            }

            onOpenChange(false);
            onSelect(variables.mode, data.id);
            toast({
                title: "Workforce Created",
                description: `Successfully created new ${variables.mode.toLowerCase()} workforce.`,
            });
        },
        onError: (err) => {
            toast({
                title: "Creation Failed",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const handleSelect = (mode: WorkforceCreationMode) => {
        // We simulate a default name since name isn't requested in this modal yet
        const defaultName = `New ${mode === "FLOW" ? "Workflow" : "Swarm"} Workforce`;
        setPendingTemplateId(null);
        createMutation.mutate({ mode, name: defaultName });
    };

    const handleCreateFromTemplate = (template: WorkforceTemplate) => {
        const defaultName = template.name;
        setPendingTemplateId(template.id);
        createMutation.mutate({ mode: template.mode, name: defaultName, description: template.description });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl gap-6 p-8">
                <DialogHeader className="gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-widest">New Workforce</span>
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        Choose your orchestration model
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Select the architecture that best fits your use-case. You can always reconfigure later.
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
                                        "mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150",
                                        opt.buttonClass,
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(opt.mode);
                                    }}
                                >
                                    Create {opt.label}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                Templates
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Start from battle-tested workflows for common go-to-market and ops use-cases.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto">
                        {WORKFORCE_TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.id}
                                type="button"
                                onClick={() => handleCreateFromTemplate(tpl)}
                                className={cn(
                                    "flex flex-col items-start gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left transition-all hover:bg-white hover:border-zinc-300"
                                )}
                            >
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                                    {tpl.category} · {tpl.targetTeams}
                                </span>
                                <span className="text-sm font-semibold text-zinc-900">
                                    {tpl.name}
                                </span>
                                <span className="text-xs text-zinc-500 line-clamp-2">
                                    {tpl.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
