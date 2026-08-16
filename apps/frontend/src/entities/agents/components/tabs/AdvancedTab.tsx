"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ModelSelectDropdown } from "@/entities/models/components/ModelSelectDropdown";
import { TagListInput } from "./TagListInput";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, Lock, Play, Unlock } from "lucide-react";
import { useRegisterAgentSettingsSave } from "@/entities/agents/components/AgentSettingsSaveContext";

const AGENT_TYPES = [
  "TASK_EXECUTOR",
  "WORKFLOW_MANAGER",
  "DATA_ANALYST",
  "CODE_GENERATOR",
  "CONTENT_CREATOR",
  "CUSTOMER_SUPPORT",
  "RESEARCHER",
  "PROJECT_MANAGER",
  "QA_TESTER",
  "INTEGRATION",
  "MONITORING",
  "GENERAL_ASSISTANT",
  "CUSTOM",
] as const;

const AUTONOMY_LEVELS = [
  { value: "SUPERVISED", label: "Supervised", desc: "Requires approval for all actions" },
  { value: "SEMI_AUTONOMOUS", label: "Semi-Autonomous", desc: "Requires approval for critical actions" },
  { value: "AUTONOMOUS", label: "Autonomous", desc: "Fully autonomous operation" },
  { value: "COLLABORATIVE", label: "Collaborative", desc: "Works with human in the loop" },
] as const;

const PERMISSION_LEVELS = [
  { value: "RESTRICTED", label: "Restricted", desc: "Can only use assigned tools" },
  { value: "STANDARD", label: "Standard", desc: "Can use standard workspace tools" },
  { value: "ELEVATED", label: "Elevated", desc: "Can use privileged tools" },
  { value: "ADMIN", label: "Admin", desc: "Full access to all tools" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private" },
  { value: "MEMBERS", label: "Members" },
  { value: "ADMINS", label: "Admins" },
  { value: "PUBLIC", label: "Public" },
  { value: "EVERYONE", label: "Everyone" },
] as const;

type AdvancedDraft = {
  description: string;
  agentType: string;
  modelId: string | null;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxIterations: number;
  maxExecutionTime: number;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  autonomyLevel: string;
  requiresApproval: boolean;
  approvalThreshold: number;
  permissionLevel: string;
  capabilities: string[];
  constraints: string[];
  visibility: string;
  tags: string[];
};

function sortedCopy(arr: string[]): string[] {
  return [...arr].map((s) => s.trim()).filter(Boolean).sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  const aa = sortedCopy(a);
  const bb = sortedCopy(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function draftFromAgent(agent: any): AdvancedDraft {
  return {
    description: agent.description ?? "",
    agentType: agent.agentType || "GENERAL_ASSISTANT",
    modelId: agent.modelId || agent.aiModel?.id || null,
    temperature: typeof agent.temperature === "number" ? agent.temperature : 0.7,
    maxTokens: typeof agent.maxTokens === "number" ? agent.maxTokens : 2000,
    topP: typeof agent.topP === "number" ? agent.topP : 1,
    frequencyPenalty: typeof agent.frequencyPenalty === "number" ? agent.frequencyPenalty : 0,
    presencePenalty: typeof agent.presencePenalty === "number" ? agent.presencePenalty : 0,
    maxIterations: typeof agent.maxIterations === "number" ? agent.maxIterations : 10,
    maxExecutionTime: typeof agent.maxExecutionTime === "number" ? agent.maxExecutionTime : 300,
    autoRetry: agent.autoRetry !== false,
    maxRetries: typeof agent.maxRetries === "number" ? agent.maxRetries : 3,
    retryDelay: typeof agent.retryDelay === "number" ? agent.retryDelay : 5,
    autonomyLevel: agent.autonomyLevel || "SEMI_AUTONOMOUS",
    requiresApproval: agent.requiresApproval !== false,
    approvalThreshold:
      typeof agent.approvalThreshold === "number" ? agent.approvalThreshold : 0.8,
    permissionLevel: agent.permissionLevel || "RESTRICTED",
    capabilities: Array.isArray(agent.capabilities) ? [...agent.capabilities] : [],
    constraints: Array.isArray(agent.constraints) ? [...agent.constraints] : [],
    visibility: agent.visibility || "PRIVATE",
    tags: Array.isArray(agent.tags) ? [...agent.tags] : [],
  };
}

function buildPatch(draft: AdvancedDraft, baseline: AdvancedDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const desc = draft.description.trim();
  const baselineDesc = baseline.description.trim();
  if (desc !== baselineDesc) {
    patch.description = desc === "" ? null : desc;
  }
  if (draft.agentType !== baseline.agentType) patch.agentType = draft.agentType;
  if (draft.modelId !== baseline.modelId) patch.modelId = draft.modelId;
  if (draft.temperature !== baseline.temperature) patch.temperature = draft.temperature;
  if (draft.maxTokens !== baseline.maxTokens) patch.maxTokens = draft.maxTokens;
  if (draft.topP !== baseline.topP) patch.topP = draft.topP;
  if (draft.frequencyPenalty !== baseline.frequencyPenalty) {
    patch.frequencyPenalty = draft.frequencyPenalty;
  }
  if (draft.presencePenalty !== baseline.presencePenalty) {
    patch.presencePenalty = draft.presencePenalty;
  }
  if (draft.maxIterations !== baseline.maxIterations) patch.maxIterations = draft.maxIterations;
  if (draft.maxExecutionTime !== baseline.maxExecutionTime) {
    patch.maxExecutionTime = draft.maxExecutionTime;
  }
  if (draft.autoRetry !== baseline.autoRetry) patch.autoRetry = draft.autoRetry;
  if (draft.maxRetries !== baseline.maxRetries) patch.maxRetries = draft.maxRetries;
  if (draft.retryDelay !== baseline.retryDelay) patch.retryDelay = draft.retryDelay;
  if (draft.autonomyLevel !== baseline.autonomyLevel) patch.autonomyLevel = draft.autonomyLevel;
  if (draft.requiresApproval !== baseline.requiresApproval) {
    patch.requiresApproval = draft.requiresApproval;
  }
  if (draft.approvalThreshold !== baseline.approvalThreshold) {
    patch.approvalThreshold = draft.approvalThreshold;
  }
  if (draft.permissionLevel !== baseline.permissionLevel) {
    patch.permissionLevel = draft.permissionLevel;
  }
  if (!arraysEqual(draft.capabilities, baseline.capabilities)) {
    patch.capabilities = draft.capabilities;
  }
  if (!arraysEqual(draft.constraints, baseline.constraints)) {
    patch.constraints = draft.constraints;
  }
  if (draft.visibility !== baseline.visibility) patch.visibility = draft.visibility;
  if (!arraysEqual(draft.tags, baseline.tags)) patch.tags = draft.tags;
  return patch;
}

function isDirty(draft: AdvancedDraft, baseline: AdvancedDraft): boolean {
  return Object.keys(buildPatch(draft, baseline)).length > 0;
}

interface AdvancedTabProps {
  agentId: string;
  agent: any;
  onUpdate?: () => void;
  isReconfiguring?: boolean;
  isOwner?: boolean;
}

export function AdvancedTab({
  agentId,
  agent,
  onUpdate,
  isReconfiguring,
  isOwner: isOwnerProp,
}: AdvancedTabProps) {
  // Server-authoritative ownership (same pattern as MemoryTab — avoid fragile client session id).
  const { data: access, isLoading: accessLoading } = trpc.agent.getMemoryAccess.useQuery(
    { agentId },
    { staleTime: 30_000 }
  );
  const isOwner =
    access?.isOwner ??
    (typeof isOwnerProp === "boolean" ? isOwnerProp : undefined) ??
    agent.viewerIsOwner ??
    false;

  const [baseline, setBaseline] = useState(() => draftFromAgent(agent));
  const [draft, setDraft] = useState(() => draftFromAgent(agent));

  useEffect(() => {
    const next = draftFromAgent(agent);
    setBaseline(next);
    setDraft(next);
  }, [
    agent.id,
    agent.description,
    agent.agentType,
    agent.modelId,
    agent.aiModel?.id,
    agent.temperature,
    agent.maxTokens,
    agent.topP,
    agent.frequencyPenalty,
    agent.presencePenalty,
    agent.maxIterations,
    agent.maxExecutionTime,
    agent.autoRetry,
    agent.maxRetries,
    agent.retryDelay,
    agent.autonomyLevel,
    agent.requiresApproval,
    agent.approvalThreshold,
    agent.permissionLevel,
    agent.capabilities,
    agent.constraints,
    agent.visibility,
    agent.tags,
    agent.viewerIsOwner,
  ]);

  const dirty = useMemo(() => isDirty(draft, baseline), [draft, baseline]);
  const readOnly = !isOwner || Boolean(isReconfiguring) || accessLoading;

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Advanced settings saved");
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || "Failed to save advanced settings"),
  });

  const setField = <K extends keyof AdvancedDraft>(key: K, value: AdvancedDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleSave = () => {
    const patch = buildPatch(draft, baseline);
    if (Object.keys(patch).length === 0) return;
    updateMutation.mutate({ id: agentId, ...patch } as any);
  };

  const handleDiscard = () => setDraft(baseline);

  useRegisterAgentSettingsSave(
    "advanced",
    {
      dirty,
      save: handleSave,
      discard: handleDiscard,
      isPending: updateMutation.isPending,
    },
    isOwner && !isReconfiguring
  );

  return (
    <div className="pt-2 space-y-6 relative">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">Advanced</h3>
        <p className="text-sm text-zinc-500 mt-0.5">
          Fine-tune this agent&apos;s profile, model, execution, and permissions.
        </p>
        {!isOwner && !accessLoading && (
          <p className="text-xs text-amber-700 mt-2">
            Only the agent owner can edit advanced settings.
          </p>
        )}
      </div>

      <Accordion
        type="multiple"
        defaultValue={["profile", "model"]}
        className="w-full space-y-3"
      >
        <AccordionItem value="profile" className="rounded-xl border border-zinc-200 bg-white px-2">
          <AdvancedSectionTrigger title="Profile" />
          <AccordionContent className="px-2">
            <div className="space-y-3 pb-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-xs text-zinc-500">Short summary shown in settings and listings.</p>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={readOnly}
                  rows={3}
                  placeholder="What does this agent do?"
                  className="rounded-xl border-zinc-200 text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="model" className="rounded-xl border border-zinc-200 bg-white px-2">
          <AdvancedSectionTrigger title="Model" />
          <AccordionContent className="px-2">
            <div className="space-y-4 pb-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">AI model</Label>
                <ModelSelectDropdown
                  modelId={draft.modelId}
                  disabled={readOnly}
                  onModelChange={(id) => setField("modelId", id)}
                />
              </div>

              <NumberSliderRow
                label="Temperature"
                value={draft.temperature}
                min={0}
                max={2}
                step={0.1}
                disabled={readOnly}
                onChange={(v) => setField("temperature", v)}
                display={draft.temperature.toFixed(1)}
              />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Max tokens</Label>
                <Input
                  type="number"
                  min={100}
                  max={32000}
                  value={draft.maxTokens}
                  disabled={readOnly}
                  onChange={(e) =>
                    setField(
                      "maxTokens",
                      Math.min(32000, Math.max(100, Number(e.target.value) || 100))
                    )
                  }
                  className="w-40 rounded-xl"
                />
              </div>
              <NumberSliderRow
                label="Top P"
                value={draft.topP}
                min={0}
                max={1}
                step={0.05}
                disabled={readOnly}
                onChange={(v) => setField("topP", v)}
                display={draft.topP.toFixed(2)}
              />
              <NumberSliderRow
                label="Frequency penalty"
                value={draft.frequencyPenalty}
                min={-2}
                max={2}
                step={0.1}
                disabled={readOnly}
                onChange={(v) => setField("frequencyPenalty", v)}
                display={draft.frequencyPenalty.toFixed(1)}
              />
              <NumberSliderRow
                label="Presence penalty"
                value={draft.presencePenalty}
                min={-2}
                max={2}
                step={0.1}
                disabled={readOnly}
                onChange={(v) => setField("presencePenalty", v)}
                display={draft.presencePenalty.toFixed(1)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="execution" className="rounded-xl border border-zinc-200 bg-white px-2">
          <AdvancedSectionTrigger title="Execution" />
          <AccordionContent className="px-2">
            <div className="space-y-4 pb-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Max iterations</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.maxIterations}
                    disabled={readOnly}
                    onChange={(e) =>
                      setField(
                        "maxIterations",
                        Math.min(100, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Max execution time (sec)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={3600}
                    value={draft.maxExecutionTime}
                    disabled={readOnly}
                    onChange={(e) =>
                      setField(
                        "maxExecutionTime",
                        Math.min(3600, Math.max(10, Number(e.target.value) || 10))
                      )
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto retry</Label>
                  <p className="text-xs text-zinc-500">Retry failed steps automatically.</p>
                </div>
                <Switch
                  checked={draft.autoRetry}
                  disabled={readOnly}
                  onCheckedChange={(v) => setField("autoRetry", v)}
                />
              </div>
              {draft.autoRetry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Max retries</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={draft.maxRetries}
                      disabled={readOnly}
                      onChange={(e) =>
                        setField(
                          "maxRetries",
                          Math.min(10, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Retry delay (sec)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={draft.retryDelay}
                      disabled={readOnly}
                      onChange={(e) =>
                        setField(
                          "retryDelay",
                          Math.min(60, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="autonomy" className="rounded-xl border border-zinc-200 bg-white px-2">
          <AdvancedSectionTrigger title="Autonomy & permissions" />
          <AccordionContent className="px-2">
            <div className="space-y-4 pb-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Autonomy level</Label>
                <Select
                  value={draft.autonomyLevel}
                  onValueChange={(v) => setField("autonomyLevel", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full max-w-[200px] rounded-xl">
                    <SelectValue>
                      {AUTONOMY_LEVELS.find((l) => l.value === draft.autonomyLevel)?.label ??
                        draft.autonomyLevel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AUTONOMY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {draft.requiresApproval ? (
                      <Lock className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <Unlock className="h-4 w-4 text-zinc-400" />
                    )}
                    Requires approval
                  </div>
                  <p className="text-xs text-zinc-500">
                    Require human approval before executing actions.
                  </p>
                </div>
                <Switch
                  checked={draft.requiresApproval}
                  disabled={readOnly}
                  onCheckedChange={(v) => setField("requiresApproval", v)}
                />
              </div>

              {draft.requiresApproval && (
                <NumberSliderRow
                  label="Approval threshold"
                  value={draft.approvalThreshold}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={readOnly}
                  onChange={(v) => setField("approvalThreshold", v)}
                  display={`${(draft.approvalThreshold * 100).toFixed(0)}%`}
                />
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Permission level</Label>
                <Select
                  value={draft.permissionLevel}
                  onValueChange={(v) => setField("permissionLevel", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full max-w-[160px] rounded-xl">
                    <SelectValue>
                      {PERMISSION_LEVELS.find((l) => l.value === draft.permissionLevel)?.label ??
                        draft.permissionLevel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {draft.autonomyLevel === "AUTONOMOUS" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Autonomous agents can execute actions without approval. Use with caution.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sharing" className="rounded-xl border border-zinc-200 bg-white px-2">
          <AdvancedSectionTrigger title="Sharing" />
          <AccordionContent className="px-2">
            <div className="space-y-4 pb-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Visibility</Label>
                <Select
                  value={draft.visibility}
                  onValueChange={(v) => setField("visibility", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full max-w-[160px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tags</Label>
                <TagListInput
                  value={draft.tags}
                  onChange={(v) => setField("tags", v)}
                  disabled={readOnly}
                  placeholder="Add tag and press Enter"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function AdvancedSectionTrigger({ title }: { title: string }) {
  return (
    <AccordionTrigger className="hover:no-underline px-2 [&>svg]:hidden group">
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 text-left">
        <div className="flex items-center justify-center h-5 w-5 rounded hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-700 shrink-0 transition-colors cursor-pointer">
          <Play className="h-2.5 w-2.5 shrink-0 fill-current transition-transform duration-150 group-data-[state=open]:rotate-90" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{title}</div>
        </div>
      </div>
    </AccordionTrigger>
  );
}

function NumberSliderRow({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs font-medium text-zinc-500 tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(typeof v === "number" ? v : value)}
      />
    </div>
  );
}