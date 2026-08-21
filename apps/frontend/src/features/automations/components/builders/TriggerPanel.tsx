"use client";

import Image from "next/image";
import React, { useEffect, useRef } from "react";
import { Info, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TriggerEntityScopePicker, type TriggerEntityScope } from "./TriggerEntityScopePicker";
import { TriggerPicker } from "./TriggerPicker";
import { TriggerConfigFields, type TriggerConfigState } from "./TriggerConfigFields";
import { IntegrationConfigFields, type IntegrationConfigValues } from "./IntegrationConfigFields";
import { CreationSourcesPicker } from "./CreationSourcesPicker";
import type { AutomationScope, CreationSourceFilters } from "../../types";
import type { AutomationTriggerTypeV1 } from "../../triggerCatalog";
import type { IntegrationConfigField } from "../../integrationAutomationCatalog";
import { TriggerConditionBlock, type Condition } from "./TriggerConditionBlock";

function DottedConnector() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-6 w-px border-l-2 border-dashed border-zinc-200" />
    </div>
  );
}

export function TriggerPanel({
  triggerType,
  integrationTrigger,
  triggerDefFields,
  integrationTriggerConfig,
  triggerConfig,
  triggerOn,
  sources,
  scope,
  mode,
  agentConditions,
  description,
  whenLabel,
  showSources,
  onTriggerTypeChange,
  onIntegrationTriggerChange,
  onIntegrationTriggerConfigChange,
  onTriggerConfigChange,
  onTriggerOnChange,
  onSourcesChange,
  onAgentConditionsChange,
  onConnect,
  conditions,
  onConditionsChange,
}: {
  triggerType: AutomationTriggerTypeV1;
  integrationTrigger: { provider: string; trigger: string } | null;
  triggerDefFields?: IntegrationConfigField[];
  integrationTriggerConfig: IntegrationConfigValues;
  triggerConfig: TriggerConfigState;
  triggerOn: TriggerEntityScope;
  sources: CreationSourceFilters;
  scope: AutomationScope;
  mode: "classic" | "agent";
  agentConditions: string;
  description: string;
  whenLabel: string;
  showSources: boolean;
  onTriggerTypeChange: (type: AutomationTriggerTypeV1) => void;
  onIntegrationTriggerChange: (provider: string, trigger: string) => void;
  onIntegrationTriggerConfigChange: (config: IntegrationConfigValues) => void;
  onTriggerConfigChange: (config: TriggerConfigState) => void;
  onTriggerOnChange: (scope: TriggerEntityScope) => void;
  onSourcesChange: (sources: CreationSourceFilters) => void;
  onAgentConditionsChange: (value: string) => void;
  onConnect: () => void;
  conditions: Condition[];
  onConditionsChange: (conditions: Condition[]) => void;
}) {
  const isIntegration = !!integrationTrigger;
  const advancedFields = isIntegration && triggerDefFields ? triggerDefFields.filter(f => f.advanced) : undefined;
  const showConditionSection = !isIntegration || (!!advancedFields && advancedFields.length > 0);

  const CLASSIC_PROPERTIES = [
    "assignee", "current_date_is", "custom_field", "due_date", "follower",
    "priority", "start_date", "status", "tag", "task_name_contains",
    "task_type", "tasks_or_subtasks_are", "time_estimate"
  ];

  // Properties that are incompatible with certain trigger types
  const TRIGGER_DISABLED_PROPERTIES: Partial<Record<AutomationTriggerTypeV1, string[]>> = {
    TASK_OR_SUBTASK_CREATED: ["tasks_or_subtasks_are"],
  };
  const disabledProperties = TRIGGER_DISABLED_PROPERTIES[triggerType] ?? [];

  // When trigger type or integration trigger changes, clean up incompatible conditions:
  // - For integrations: only allow conditions whose property is one of advancedFields (or remove all if no advancedFields)
  // - For classic task triggers: only allow conditions whose property is in CLASSIC_PROPERTIES and not in disabledProperties
  const prevTriggerStateRef = useRef({
    isIntegration,
    provider: integrationTrigger?.provider,
    trigger: integrationTrigger?.trigger,
    triggerType,
  });

  useEffect(() => {
    const prev = prevTriggerStateRef.current;
    const triggerChanged =
      prev.isIntegration !== isIntegration ||
      prev.provider !== integrationTrigger?.provider ||
      prev.trigger !== integrationTrigger?.trigger ||
      prev.triggerType !== triggerType;

    if (triggerChanged) {
      if (isIntegration) {
        if (!advancedFields || advancedFields.length === 0) {
          if (conditions.length > 0) {
            onConditionsChange([]);
          }
        } else {
          const validIds = new Set(advancedFields.map((f) => f.id));
          const filtered = conditions.filter((c) => validIds.has(c.property));
          if (filtered.length !== conditions.length) {
            onConditionsChange(filtered);
          }
        }
      } else {
        const validIds = new Set(CLASSIC_PROPERTIES.filter((id) => !disabledProperties.includes(id)));
        const filtered = conditions.filter((c) => validIds.has(c.property));
        if (filtered.length !== conditions.length) {
          onConditionsChange(filtered);
        }
      }
    } else if (!isIntegration && disabledProperties.length > 0) {
      const filtered = conditions.filter((c) => !disabledProperties.includes(c.property));
      if (filtered.length !== conditions.length) {
        onConditionsChange(filtered);
      }
    }

    prevTriggerStateRef.current = {
      isIntegration,
      provider: integrationTrigger?.provider,
      trigger: integrationTrigger?.trigger,
      triggerType,
    };
  }, [isIntegration, integrationTrigger?.provider, integrationTrigger?.trigger, triggerType, advancedFields, disabledProperties, conditions, onConditionsChange]);

  const handlePanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.scrollTop += e.deltaY;
  };

  return (
    <div
      className="flex flex-col w-full px-8 py-2"
    >
      {/* Header card */}
      <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative inline-block h-9 w-9 shrink-0 border border-zinc-200 rounded-md">
            <Image src="/images/logo.png" alt="" fill className="object-contain" />
          </span>
          <span className="text-lg font-semibold text-zinc-900">Trigger</span>
        </div>
        {!isIntegration && (
          <TriggerEntityScopePicker value={triggerOn} onChange={onTriggerOnChange} />
        )}
      </div>

      <DottedConnector />

      {/* Body card */}
      <div className="rounded-md border border-zinc-200 bg-white p-4 space-y-3">
        <TriggerPicker
          value={triggerType}
          integrationValue={integrationTrigger}
          onChange={onTriggerTypeChange}
          onIntegrationChange={onIntegrationTriggerChange}
        />

        {isIntegration && triggerDefFields ? (
          <IntegrationConfigFields
            providerId={integrationTrigger.provider}
            fields={triggerDefFields}
            config={integrationTriggerConfig}
            onChange={onIntegrationTriggerConfigChange}
            onConnect={onConnect}
          />
        ) : (
          <>
            {showSources && (
              <CreationSourcesPicker value={sources} onChange={onSourcesChange} scope={scope} />
            )}
            <TriggerConfigFields
              triggerType={triggerType}
              scope={scope}
              config={triggerConfig}
              onChange={onTriggerConfigChange}
              mode={mode}
              agentConditions={agentConditions}
              onAgentConditionsChange={onAgentConditionsChange}
            />
          </>
        )}
      </div>

      {showConditionSection && conditions.map((cond, i) => (
        <TriggerConditionBlock
          key={cond.id}
          condition={cond}
          scope={scope}
          integrationFields={advancedFields}
          disabledProperties={disabledProperties}
          onChange={(newCond) => {
            const copy = [...conditions];
            copy[i] = newCond;
            onConditionsChange(copy);
          }}
          onDelete={() => {
            const copy = [...conditions];
            copy.splice(i, 1);
            onConditionsChange(copy);
          }}
        />
      ))}

      {showConditionSection && (
        <>
          <DottedConnector />
          <button
            type="button"
            onClick={() => {
              let defaultProperty = "assignee";
              let defaultOperator = "is_any_of";

              if (isIntegration && advancedFields && advancedFields.length > 0) {
                defaultProperty = advancedFields[0].id;
                defaultOperator = "is_equal_to";
              }

              onConditionsChange([
                ...conditions,
                { id: Math.random().toString(36).slice(2), property: defaultProperty, operator: defaultOperator, value: "" }
              ]);
            }}
            className="mx-auto h-7 w-7 rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 cursor-pointer flex items-center justify-center"
            aria-label="Add step"
          >
            <Plus className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
