"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ChevronLeft, MoveRight } from "lucide-react";
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
import type { BrowseTemplate } from "../../browseCatalog";
import {
  INTEGRATION_PROVIDER_BY_ID,
  getIntegrationTrigger,
  getIntegrationAction,
} from "../../integrationAutomationCatalog";
import { TriggerPanel } from "./TriggerPanel";
import { ActionPanel } from "./ActionPanel";
import type { TriggerEntityScope } from "./TriggerEntityScopePicker";
import type { Condition } from "./TriggerConditionBlock";
import {
  serializeTriggerConfig,
  triggerConfigIsValid,
  type TriggerConfigState,
} from "./TriggerConfigFields";
import {
  actionConfigIsValid,
  serializeAction,
  type ActionConfigState,
} from "./ActionConfigFields";
import { type IntegrationConfigValues } from "./IntegrationConfigFields";
import { ConnectionSetupModal } from "@/features/integrations/components/ConnectionSetupModal";

export type ActionState = {
  id: string;
  type: AutomationActionTypeV1;
  config: ActionConfigState;
  integration: { provider: string; action: string } | null;
  integrationConfig: IntegrationConfigValues;
};

function displayActionType(type: AutomationActionTypeV1): AutomationActionTypeV1 {
  if (type === "ADD_ASSIGNEE") return "UPDATE_ASSIGNEES";
  if (type === "ADD_FOLLOWER") return "UPDATE_FOLLOWERS";
  return type;
}

export function AutomationBuilderContent({
  scope,
  mode,
  editingId,
  initialTemplate,
  onBack,
  onSaved,
  onAskBrain,
}: {
  scope: AutomationScope;
  mode: "classic" | "agent";
  editingId?: string | null;
  initialTemplate?: BrowseTemplate | null;
  onBack: () => void;
  onSaved: () => void;
  onAskBrain?: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [triggerType, setTriggerType] = useState<AutomationTriggerTypeV1>("TASK_OR_SUBTASK_CREATED");
  const [actions, setActions] = useState<ActionState[]>([
    {
      id: "1",
      type: mode === "agent" ? "DO_ANYTHING_WITH_AI" : "UPDATE_STATUS",
      config: {},
      integration: null,
      integrationConfig: {},
    }
  ]);
  const [agentConditions, setAgentConditions] = useState("");
  const [classicConditions, setClassicConditions] = useState<Condition[]>([]);
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfigState>({});
  const [sources, setSources] = useState<CreationSourceFilters>(
    mode === "agent" ? DEFAULT_AGENT_SOURCES : DEFAULT_CLASSIC_SOURCES,
  );

  const [integrationTrigger, setIntegrationTrigger] = useState<{ provider: string; trigger: string } | null>(null);
  const [integrationTriggerConfig, setIntegrationTriggerConfig] = useState<IntegrationConfigValues>({});
  const [triggerOn, setTriggerOn] = useState<TriggerEntityScope>("ALL");
  const [connectModal, setConnectModal] = useState<{ provider: string; displayName: string } | null>(null);



  const existing = trpc.automation.get.useQuery(
    { id: editingId! },
    { enabled: !!editingId },
  );
  const create = trpc.automation.create.useMutation();
  const update = trpc.automation.update.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (editingId) return;

    if (initialTemplate) {
      setName(initialTemplate.title);
      setDescription(initialTemplate.description);
      setIsEditingDescription(false);
      setTriggerType(initialTemplate.triggerType);
      if (initialTemplate.triggerConfig) {
        setTriggerConfig(initialTemplate.triggerConfig);
      } else {
        setTriggerConfig({});
      }
      setActions([
        {
          id: crypto.randomUUID(),
          type: initialTemplate.actionType,
          config: initialTemplate.actionConfig || (
            initialTemplate.actionType === "DO_ANYTHING_WITH_AI"
              ? { prompt: initialTemplate.description }
              : {}
          ),
          integration: null,
          integrationConfig: {},
        },
      ]);
      setSources(initialTemplate.mode === "agent" ? DEFAULT_AGENT_SOURCES : DEFAULT_CLASSIC_SOURCES);
      setAgentConditions("");
      setClassicConditions([]);
      setIntegrationTrigger(null);
      setIntegrationTriggerConfig({});
      setTriggerOn("ALL");
      return;
    }

    if (mode === "agent") {
      setActions([{
        id: crypto.randomUUID(),
        type: "DO_ANYTHING_WITH_AI",
        config: {},
        integration: null,
        integrationConfig: {},
      }]);
      setSources(DEFAULT_AGENT_SOURCES);
    } else {
      setActions([{
        id: crypto.randomUUID(),
        type: "UPDATE_STATUS",
        config: {},
        integration: null,
        integrationConfig: {},
      }]);
      setSources(DEFAULT_CLASSIC_SOURCES);
    }

    setName("");
    setDescription("");
    setIsEditingDescription(false);
    setAgentConditions("");
    setClassicConditions([]);
    setTriggerConfig({});
    setIntegrationTrigger(null);
    setIntegrationTriggerConfig({});
    setTriggerOn("ALL");
  }, [mode, editingId, initialTemplate]);

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
      if (cfg.triggerOn === "TASK" || cfg.triggerOn === "SUBTASK" || cfg.triggerOn === "ALL") {
        setTriggerOn(cfg.triggerOn);
      }
      if (cfg.integration && cfg.integrationEvent) {
        setIntegrationTrigger({ provider: String(cfg.integration), trigger: String(cfg.integrationEvent) });
        setIntegrationTriggerConfig(cfg.integrationConfig ?? {});
      }
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
      if (Array.isArray((t.conditions as any)?.classic)) setClassicConditions((t.conditions as any).classic);
    }
    const a = Array.isArray(row.actions) ? (row.actions as ActionSpec[]) : [];
    if (a.length > 0) {
      setActions(a.map((act) => {
        const actionInput: any = { ...(act.input || {}) };
        if (row.aiAgent) {
          if (!actionInput.prompt && row.aiAgent.systemPrompt) {
            actionInput.prompt = row.aiAgent.systemPrompt;
          }
          if (!actionInput.agentId) {
            actionInput.agentId = row.aiAgent.id;
          }
          if (!actionInput.agentName) {
            actionInput.agentName = row.aiAgent.name;
          }
          if (!actionInput.agentAvatar && row.aiAgent.avatar) {
            actionInput.agentAvatar = row.aiAgent.avatar;
          }
          if (!actionInput.agentDescription && row.aiAgent.description) {
            actionInput.agentDescription = row.aiAgent.description;
          }
          if (!actionInput.model && row.aiAgent.modelId) {
            actionInput.model = row.aiAgent.modelId;
          }
          const agentMeta = (row.aiAgent.metadata || {}) as any;
          if (agentMeta.knowledge && !actionInput.workspaceKnowledge) {
            actionInput.workspaceKnowledge = agentMeta.knowledge;
          }
          if (agentMeta.tools && !actionInput.toolIds) {
            actionInput.toolIds = agentMeta.tools;
          }
        }
        return {
          id: crypto.randomUUID(),
          type: displayActionType(act.type),
          config: actionInput,
          integration: null,
          integrationConfig: {},
        };
      }));
    } else if (row.aiAgent || row.kind === "AGENT") {
      const agentMeta = (row.aiAgent?.metadata || {}) as any;
      setActions([{
        id: crypto.randomUUID(),
        type: "DO_ANYTHING_WITH_AI",
        config: {
          prompt: row.aiAgent?.systemPrompt || "",
          agentId: (row.aiAgent?.id || row.agentId) ?? undefined,
          agentName: row.aiAgent?.name ?? undefined,
          agentAvatar: row.aiAgent?.avatar ?? undefined,
          agentDescription: row.aiAgent?.description ?? undefined,
          model: row.aiAgent?.modelId ?? undefined,
          workspaceKnowledge: agentMeta.knowledge,
          toolIds: agentMeta.tools,
        },
        integration: null,
        integrationConfig: {},
      }]);
    }
  }, [existing.data]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!triggerConfigIsValid(triggerType, triggerConfig)) return false;
    if (mode === "agent") return !!actions[0]?.config.prompt?.trim();
    if (actions.length === 0) return false;
    return actions.every(a => {
      if (a.integration) return true; // TODO: validate integration action config
      return actionConfigIsValid(a.type, a.config);
    });
  }, [name, mode, actions, triggerType, triggerConfig]);

  const buildActions = (): ActionSpec[] => {
    if (mode === "agent") {
      const cfg = actions[0]?.config || {};
      return [{
        type: "DO_ANYTHING_WITH_AI",
        input: {
          ...cfg,
          prompt: cfg.prompt || "",
          version: "0.5",
          workspaceKnowledge: cfg.workspaceKnowledge || emptyKnowledge(),
        },
      }];
    }
    return actions.map(a => {
      // If it's an integration, the backend spec would likely need to store provider/action. 
      // For now we map classic actions:
      const spec = serializeAction(a.type, a.config);
      if (spec.type === "DO_ANYTHING_WITH_AI" || spec.type === "LAUNCH_AI_AGENT") {
        return {
          type: spec.type,
          input: { ...a.config, ...spec.input, version: "0.5", workspaceKnowledge: a.config.workspaceKnowledge || emptyKnowledge() },
        };
      }
      return { type: spec.type as AutomationActionTypeV1, input: spec.input };
    });
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
      agentId: actions[0]?.config.agentId || null,
      triggers: [{
        triggerType: integrationTrigger ? "WEBHOOK" : triggerType,
        triggerConfig: {
          triggerOn,
          creationSources: sources,
          ...serializeTriggerConfig(triggerConfig),
          ...(integrationTrigger && {
            integration: integrationTrigger.provider,
            integrationEvent: integrationTrigger.trigger,
            integrationConfig: integrationTriggerConfig,
          }),
        },
        conditions: (mode === "agent" || actions[0]?.type === "DO_ANYTHING_WITH_AI") && agentConditions.trim()
          ? { prompt: agentConditions }
          : classicConditions.length > 0 ? { classic: classicConditions } : undefined,
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

  const triggerDef = integrationTrigger ? getIntegrationTrigger(integrationTrigger.provider, integrationTrigger.trigger) : null;

  const showSources =
    !integrationTrigger &&
    (triggerType === "TASK_OR_SUBTASK_CREATED" || triggerType === "TASK_OR_SUBTASK_UPDATED");

  const whenLabel = integrationTrigger
    ? triggerDef?.label ?? "Trigger is set"
    : TRIGGER_BY_TYPE[triggerType]?.label ?? "Trigger is set";

  const utils2 = trpc.useUtils();
  const openConnect = (providerId: string) => {
    const prov = INTEGRATION_PROVIDER_BY_ID[providerId];
    setConnectModal({ provider: prov?.catalogProvider ?? providerId, displayName: prov?.label ?? providerId });
  };

  return (
    <div className="flex flex-col min-h-0 h-[640px]">
      <div className="flex flex-col gap-1.5 px-5 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="group relative inline-block align-middle h-8 focus-within:w-[480px] transition-[width] duration-150">
            <span
              className={
                "block max-w-full overflow-hidden text-ellipsis whitespace-pre px-1 h-8 leading-8 text-sm rounded-md border border-transparent group-hover:border-zinc-300 " +
                (name ? "text-zinc-900" : "text-zinc-500")
              }
              aria-hidden="true"
            >
              {name || "Name this automation rule..."}
            </span>
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

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 p-5 pt-3 pb-8 items-start overflow-y-auto flex-1">
        {/* ── Trigger panel ── */}
        <TriggerPanel
          triggerType={triggerType}
          integrationTrigger={integrationTrigger}
          triggerDefFields={triggerDef?.fields}
          integrationTriggerConfig={integrationTriggerConfig}
          triggerConfig={triggerConfig}
          triggerOn={triggerOn}
          sources={sources}
          scope={scope}
          mode={mode}
          agentConditions={agentConditions}
          description={description}
          whenLabel={whenLabel}
          showSources={showSources}
          onTriggerTypeChange={(next) => {
            setIntegrationTrigger(null);
            setIntegrationTriggerConfig({});
            setTriggerType(next);
            setTriggerConfig({});
            const validIds = new Set([
              "assignee", "current_date_is", "custom_field", "due_date", "follower",
              "priority", "start_date", "status", "tag", "task_name_contains",
              "task_type", "tasks_or_subtasks_are", "time_estimate"
            ]);
            setClassicConditions((prev) => prev.filter((c) => validIds.has(c.property)));
          }}
          onIntegrationTriggerChange={(provider, trigger) => {
            setIntegrationTrigger({ provider, trigger });
            setIntegrationTriggerConfig({});
            const def = getIntegrationTrigger(provider, trigger);
            const advFields = def?.fields?.filter((f) => f.advanced) || [];
            const validIds = new Set(advFields.map((f) => f.id));
            setClassicConditions((prev) => prev.filter((c) => validIds.has(c.property)));
          }}
          onIntegrationTriggerConfigChange={setIntegrationTriggerConfig}
          onTriggerConfigChange={setTriggerConfig}
          onTriggerOnChange={setTriggerOn}
          onSourcesChange={setSources}
          onAgentConditionsChange={setAgentConditions}
          conditions={classicConditions}
          onConditionsChange={setClassicConditions}
          onConnect={() => openConnect(integrationTrigger?.provider || "")}
        />

        <div className="flex flex-col items-center self-stretch">
          <div className="flex items-center justify-center h-16 w-16 rounded-md border border-zinc-200 bg-white shadow-sm shrink-0">
            <MoveRight className="h-7 w-7 text-zinc-500" />
          </div>
          <div className="w-px flex-1 border-l border-zinc-200" />
        </div>

        <ActionPanel
          mode={mode}
          actions={actions}
          scope={scope}
          onChange={(index, newAction) => {
            const next = [...actions];
            next[index] = newAction;
            setActions(next);
          }}
          onAddAction={() => {
            setActions([...actions, {
              id: crypto.randomUUID(),
              type: "UPDATE_STATUS",
              config: {},
              integration: null,
              integrationConfig: {}
            }]);
          }}
          onRemoveAction={(index) => {
            if (actions.length > 1) {
              const next = [...actions];
              next.splice(index, 1);
              setActions(next);
            }
          }}
          onConnect={(providerId) => openConnect(providerId)}
          onAskBrain={onAskBrain}
        />
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

      {connectModal && (
        <ConnectionSetupModal
          open
          onOpenChange={(open) => { if (!open) setConnectModal(null); }}
          provider={connectModal.provider}
          displayName={connectModal.displayName}
          onConnected={() => {
            utils2.integration.listCatalog.invalidate();
            setConnectModal(null);
          }}
        />
      )}
    </div>
  );
}