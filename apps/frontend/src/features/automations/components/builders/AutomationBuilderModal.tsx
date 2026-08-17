"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
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

export function AutomationBuilderModal({
  open,
  onOpenChange,
  scope,
  mode,
  editingId,
  onAskBrain,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope: AutomationScope;
  mode: "classic" | "agent";
  editingId?: string | null;
  onAskBrain?: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    { enabled: !!editingId && open },
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
      setActionConfig({});
      setTriggerConfig({});
    }
  }, [mode, open, editingId]);

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
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const entityLabel = TRIGGER_BY_TYPE[triggerType]?.entity ?? "Tasks or subtasks";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this automation rule..." className="max-w-sm h-8" />
          <span className="text-xs text-zinc-500">in {scope.contextName}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 p-5 items-start max-h-[70vh] overflow-y-auto">
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
        <div className="flex items-center justify-between px-5 py-3 border-t">
          <div>
            <LogicSummary triggerType={triggerType} actionType={mode === "agent" ? "DO_ANYTHING_WITH_AI" : actionType} />
            <Input className="h-8 mt-2 w-64" placeholder="Enter description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!canSave || create.isPending || update.isPending} onClick={save}>
              {editingId ? "Save" : "Create & save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
