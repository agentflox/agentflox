"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Workflow,
  ShieldCheck,
  FileCode,
  Layers,
  Copy,
  Check,
  PenSquare,
  Bot,
  ExternalLink,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillSummary, SkillWorkflowStep } from "../types";
import { useToast } from "@/hooks/useToast";

interface SkillDetailModalProps {
  skill: SkillSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (skill: SkillSummary) => void;
  onDuplicate?: (skill: SkillSummary) => void;
}

export function SkillDetailModal({
  skill,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
}: SkillDetailModalProps) {
  const { toast } = useToast();
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  if (!skill) return null;

  const schema = skill.schema;
  const workflowSteps: SkillWorkflowStep[] = Array.isArray(schema?.workflow)
    ? schema.workflow
    : [];
  const triggerExamples = schema?.triggerExamples || [];
  const safetyRules = schema?.safetyAndSideEffects;
  const outputTemplate = schema?.outputTemplate;

  const copyToClipboard = (text: string, type: "template" | "trigger", index?: number) => {
    navigator.clipboard.writeText(text);
    if (type === "template") {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
      toast({ title: "Output template copied to clipboard" });
    } else if (index !== undefined) {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2000);
      toast({ title: "Trigger example copied to clipboard" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden gap-0 rounded-2xl shadow-2xl border-border/80">
        {/* Header with gradient & Icon */}
        <div className="relative border-b border-border/60 bg-muted/20 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-xs"
                style={{
                  backgroundColor: skill.color ? `${skill.color}20` : undefined,
                  borderColor: skill.color ? `${skill.color}50` : undefined,
                }}
              >
                {skill.icon || "⚡"}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {skill.displayName || skill.name}
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    v{skill.version || "1.0.0"}
                  </Badge>
                  {skill.isBuiltIn ? (
                    <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 gap-1">
                      <Sparkles className="h-3 w-3" />
                      Built-in Core Skill
                    </Badge>
                  ) : (
                    <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 gap-1">
                      <Bot className="h-3 w-3" />
                      Custom Skill
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-mono text-muted-foreground">{skill.name}</p>

                <DialogDescription className="text-sm text-muted-foreground line-clamp-2 pt-1">
                  {skill.description || schema?.purpose || "Standardized capability for AI Agents."}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="workflow" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b border-border/40 bg-muted/10">
            <TabsList className="bg-transparent h-11 p-0 gap-4">
              <TabsTrigger
                value="workflow"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
              >
                <Workflow className="h-4 w-4" />
                Workflow Pipeline ({workflowSteps.length})
              </TabsTrigger>
              <TabsTrigger
                value="triggers"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
              >
                <Layers className="h-4 w-4" />
                Triggers & Safety
              </TabsTrigger>
              <TabsTrigger
                value="template"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
              >
                <FileCode className="h-4 w-4" />
                Output Template
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-sm gap-2"
              >
                <Info className="h-4 w-4" />
                Overview & Meta
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* WORKFLOW PIPELINE TAB */}
            <TabsContent value="workflow" className="m-0 space-y-6">
              {schema?.purpose && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Core Skill Purpose
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{schema.purpose}</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  Structured Step-by-Step Execution Plan
                </h4>

                {workflowSteps.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                    {workflowSteps.map((step, idx) => (
                      <div key={idx} className="relative group">
                        {/* Step Marker */}
                        <div className="absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold ring-4 ring-background shadow-xs">
                          {step.step || idx + 1}
                        </div>

                        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
                          <h5 className="font-semibold text-sm text-foreground">
                            {step.title}
                          </h5>
                          {step.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-sm">
                    No discrete workflow steps configured. This skill operates dynamically.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TRIGGERS & SAFETY TAB */}
            <TabsContent value="triggers" className="m-0 space-y-6">
              {/* Safety Constraints */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  Safety Constraints & Side-Effect Guards
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {typeof safetyRules === "string"
                    ? safetyRules
                    : Array.isArray(safetyRules)
                      ? safetyRules.join("\n• ")
                      : "Always verify parameters before triggering external side-effects or persistent data mutations."}
                </p>
              </div>

              {/* Trigger Examples */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Trigger Phrasing & Natural Language Examples
                </h4>
                <p className="text-xs text-muted-foreground">
                  Prompts or intents that will invoke this skill automatically within agents and war rooms.
                </p>

                {triggerExamples.length > 0 ? (
                  <div className="space-y-2">
                    {triggerExamples.map((example, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs text-foreground font-mono">"{example}"</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => copyToClipboard(example, "trigger", idx)}
                        >
                          {copiedPromptIndex === idx ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground text-xs">
                    No trigger examples specified.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* OUTPUT TEMPLATE TAB */}
            <TabsContent value="template" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold">Standardized Output Template</h4>
                  <p className="text-xs text-muted-foreground">
                    Markdown structure emitted by agents executing this skill.
                  </p>
                </div>
                {outputTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => copyToClipboard(outputTemplate, "template")}
                  >
                    {copiedTemplate ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Template
                      </>
                    )}
                  </Button>
                )}
              </div>

              {outputTemplate ? (
                <div className="rounded-xl border bg-zinc-950 p-4 text-zinc-100 overflow-x-auto text-xs font-mono leading-relaxed shadow-inner">
                  <pre className="whitespace-pre-wrap">{outputTemplate}</pre>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground text-sm">
                  No explicit output template configured. Freeform markdown response is used.
                </div>
              )}
            </TabsContent>

            {/* OVERVIEW & METADATA TAB */}
            <TabsContent value="overview" className="m-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border p-3.5 space-y-1 bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Category</span>
                  <p className="text-sm font-semibold capitalize">{skill.category || "General"}</p>
                </div>
                <div className="rounded-xl border p-3.5 space-y-1 bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Visibility</span>
                  <p className="text-sm font-semibold capitalize">{skill.visibility.toLowerCase()}</p>
                </div>
                <div className="rounded-xl border p-3.5 space-y-1 bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Created At</span>
                  <p className="text-sm font-semibold">
                    {new Date(skill.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-xl border p-3.5 space-y-1 bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Last Updated</span>
                  <p className="text-sm font-semibold">
                    {new Date(skill.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {skill.tags && skill.tags.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Associated Skill Tags
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs px-2.5 py-1">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {skill.isBuiltIn ? "Core platform capability available to all agents" : "Custom user skill"}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDuplicate?.(skill);
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicate
            </Button>
            {!skill.isBuiltIn && onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(skill);
                }}
              >
                <PenSquare className="h-3.5 w-3.5 mr-1.5" />
                Edit Skill
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
