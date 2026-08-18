"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ChevronLeft, Sparkles, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DEFAULT_AGENT_SOURCES,
  DEFAULT_CLASSIC_SOURCES,
  emptyKnowledge,
  type ActionSpec,
  type AutomationActionTypeV1,
  type AutomationScope,
  type CreationSourceFilters,
} from "../../types";
import { TRIGGER_BY_TYPE, type AutomationTriggerTypeV1 } from "../../triggerCatalog";
import { LogicSummary } from "../shared/LogicSummary";
import { TriggerPicker } from "./TriggerPicker";
import {
  TriggerConfigFields,
  serializeTriggerConfig,
  triggerConfigIsValid,
  type TriggerConfigState,
} from "./TriggerConfigFields";
import { ActionPicker } from "./ActionPicker";
import {
  ActionConfigFields,
  actionConfigIsValid,
  serializeAction,
  type ActionConfigState,
} from "./ActionConfigFields";

function displayActionType(type: AutomationActionTypeV1): AutomationActionTypeV1 {
  if (type === "ADD_ASSIGNEE") return "UPDATE_ASSIGNEES";
  if (type === "ADD_FOLLOWER") return "UPDATE_FOLLOWERS";
  if (type === "SET_AI_FIELD") return "UPDATE_CUSTOM_FIELD";
  return type;
}

export function AutomationBuilderContent({
  scope,
  mode,
  editingId,
  onBack,
  onSaved,
  onAskBrain,
}: {
  scope: AutomationScope;
  mode: "classic" | "agent";
  editingId?: string | null;
  onBack: () => void;
  onSaved: () => void;
  onAskBrain?: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [triggerType, setTriggerType] = useState<AutomationTriggerTypeV1>("TASK_OR_SUBTASK_CREATED");
  const [actionType, setActionType] = useState<AutomationActionTypeV1>(
    mode === "agent" ? "DO_ANYTHING_WITH_AI" : "UPDATE_STATUS",
  );
  const [agentConditions, setAgentConditions] = useState("");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfigState>({});
  const [actionConfig, setActionConfig] = useState<ActionConfigState>({});
  const [sources, setSources] = useState<CreationSourceFilters>(
    mode === "agent" ? DEFAULT_AGENT_SOURCES : DEFAULT_CLASSIC_SOURCES,
  );



  const existing = trpc.automation.get.useQuery(
    { id: editingId! },
    { enabled: !!editingId },
  );
  const create = trpc.automation.create.useMutation();
  const update = trpc.automation.update.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (mode === "agent") {
      setActionType("DO_ANYTHING_WITH_AI");
      setSources(DEFAULT_AGENT_SOURCES);
    } else {
      setActionType("UPDATE_STATUS");
      setSources(DEFAULT_CLASSIC_SOURCES);
    }
    if (!editingId) {
      setName("");
      setDescription("");
      setIsEditingDescription(false);
      setAgentConditions("");
      setActionConfig({});
      setTriggerConfig({});
    }
  }, [mode, editingId]);

  useEffect(() => {
    const row = existing.data;
    if (!row) return;
    setName(row.name);
    setDescription(row.description || "");
    const t = row.triggers?.[0];
    if (t) {
      setTriggerType(t.triggerType as AutomationTriggerTypeV1);
      const cfg = (t.triggerConfig || {}) as any;
      if (cfg.creationSources) setSources(cfg.creationSources);
      setTriggerConfig({
        customFieldId: cfg.customFieldId,
        fromValue: cfg.fromValue,
        toValue: cfg.toValue,
        fromStatusId: cfg.fromStatusId,
        toStatusId: cfg.toStatusId,
        tag: cfg.tag,
        cronExpression: cfg.cronExpression || row.cronExpression || undefined,
        dateMode: cfg.dateMode,
      });
      if ((t.conditions as any)?.prompt) setAgentConditions((t.conditions as any).prompt);
    }
    const a = Array.isArray(row.actions) ? (row.actions[0] as ActionSpec) : null;
    if (a) {
      setActionType(displayActionType(a.type));
      setActionConfig({ ...(a.input || {}) });
    }
  }, [existing.data]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!triggerConfigIsValid(triggerType, triggerConfig)) return false;
    if (mode === "agent") return !!actionConfig.prompt?.trim();
    return actionConfigIsValid(actionType, actionConfig);
  }, [name, mode, actionConfig, actionType, triggerType, triggerConfig]);

  const buildActions = (): ActionSpec[] => {
    if (mode === "agent") {
      return [{
        type: "DO_ANYTHING_WITH_AI",
        input: { prompt: actionConfig.prompt || "", version: "0.5", workspaceKnowledge: emptyKnowledge() },
      }];
    }
    const spec = serializeAction(actionType, actionConfig);
    if (spec.type === "DO_ANYTHING_WITH_AI" || spec.type === "LAUNCH_AI_AGENT") {
      return [{
        type: spec.type,
        input: { ...spec.input, version: "0.5", workspaceKnowledge: emptyKnowledge() },
      }];
    }
    return [{ type: spec.type as AutomationActionTypeV1, input: spec.input }];
  };

  const save = async () => {
    const payload = {
      workspaceId: scope.workspaceId!,
      spaceId: scope.spaceId,
      teamId: scope.teamId,
      projectId: scope.projectId,
      folderId: scope.folderId,
      listId: scope.listId,
      name: name.trim(),
      description: description || null,
      cronExpression: triggerConfig.cronExpression || null,
      isScheduled: triggerType === "EVERY_SCHEDULED_TIME",
      agentId: actionConfig.agentId || null,
      triggers: [{
        triggerType,
        triggerConfig: {
          triggerOn: "ALL",
          creationSources: sources,
          ...serializeTriggerConfig(triggerConfig),
        },
        conditions: (mode === "agent" || actionType === "DO_ANYTHING_WITH_AI") && agentConditions.trim()
          ? { prompt: agentConditions }
          : undefined,
      }],
      actions: buildActions(),
    };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, ...payload });
      else await create.mutateAsync(payload);
      await utils.automation.list.invalidate();
      toast.success("Automation saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const entityLabel = TRIGGER_BY_TYPE[triggerType]?.entity ?? "Tasks or subtasks";

  return (
    <div className="flex flex-col min-h-0 h-[600px]">
      <div className="flex flex-col gap-1.5 px-5 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="group relative inline-block align-middle h-8 focus-within:w-[480px] transition-[width] duration-150">
            {/*
              Mirror span: paints the resting/truncated display, and — since it's
              the only in-flow child of the wrapper — sizes the wrapper to its
              content at rest. Border shows on hover so it reads as clickable.
            */}
            <span
              className={
                "block max-w-full overflow-hidden text-ellipsis whitespace-pre px-1 h-8 leading-8 text-sm rounded-md border border-transparent group-hover:border-zinc-300 " +
                (name ? "text-zinc-900" : "text-zinc-500")
              }
              aria-hidden="true"
            >
              {name || "Name this automation rule..."}
            </span>

            {/*
              Real input: overlays the span, stretched to fill whatever width the
              wrapper currently has (auto at rest, 480px on focus-within). No
              per-input width logic needed anymore — the wrapper drives it.
            */}
            <Input
              variant="ghost"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this automation rule..."
              className="absolute inset-0 z-10 w-full h-8 px-1 focus:px-3 text-sm placeholder:text-sm bg-transparent text-transparent placeholder:text-transparent focus:bg-white focus:text-zinc-900 focus:placeholder:text-zinc-500 caret-zinc-900 selection:bg-zinc-200 rounded-md border border-transparent hover:border-zinc-300 focus:border-zinc-300 focus-visible:outline-none transition-[padding] duration-100"
            />
          </div>

          <span className="text-xs text-zinc-500 shrink-0">in {scope.contextName}</span>
        </div>

        <div className="ml-11">
          {isEditingDescription ? (
            <Textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setIsEditingDescription(false)}
              placeholder="Enter description..."
              className="max-w-md text-sm min-h-[60px] resize-none focus-visible:ring-0 focus-visible:border-zinc-300 focus-visible:outline-none shadow-none"
            />
          ) : description ? (
            <button
              type="button"
              onClick={() => setIsEditingDescription(true)}
              className="text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded px-1.5 py-0.5 -mx-1.5 text-left max-w-md truncate block"
            >
              {description}
            </button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded -ml-1.5"
              onClick={() => setIsEditingDescription(true)}
            >
              + Add description
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 p-5 items-start overflow-y-auto flex-1">
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Zap className="h-4 w-4" /> Trigger
            </div>
            <span className="text-[11px] rounded-md border px-2 py-0.5 text-zinc-500">{entityLabel}</span>
          </div>
          <TriggerPicker
            value={triggerType}
            onChange={(next) => {
              setTriggerType(next);
              setTriggerConfig({});
            }}
          />
          <TriggerConfigFields
            triggerType={triggerType}
            scope={scope}
            config={triggerConfig}
            onChange={setTriggerConfig}
            mode={mode}
            agentConditions={agentConditions}
            onAgentConditionsChange={setAgentConditions}
          />
        </div>
        <ArrowRight className="h-5 w-5 text-zinc-400 mt-16" />
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Action</span>
          </div>
          {mode === "classic" && (
            <ActionPicker
              value={actionType}
              onChange={(next) => {
                setActionType(next);
                setActionConfig({});
              }}
            />
          )}
          {mode === "agent" && (
            <p className="text-sm font-medium flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Do anything with AI
            </p>
          )}
          <ActionConfigFields
            actionType={mode === "agent" ? "DO_ANYTHING_WITH_AI" : actionType}
            scope={scope}
            config={actionConfig}
            onChange={setActionConfig}
            onAskBrain={onAskBrain}
          />
        </div>
      </div>

      <div className="flex items-center justify-end px-5 py-3 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button
            disabled={!canSave || create.isPending || update.isPending}
            onClick={save}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {editingId ? "Save changes" : "Create automation"}
          </Button>
        </div>
      </div>
    </div>
  );
}