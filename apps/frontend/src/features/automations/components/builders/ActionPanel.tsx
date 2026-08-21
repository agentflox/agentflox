"use client";

import Image from "next/image";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { ActionPicker } from "./ActionPicker";
import { ActionConfigFields, type ActionConfigState } from "./ActionConfigFields";
import { IntegrationConfigFields, type IntegrationConfigValues } from "./IntegrationConfigFields";
import type { AutomationActionTypeV1, AutomationScope } from "../../types";
import { getIntegrationAction, type IntegrationConfigField } from "../../integrationAutomationCatalog";
import type { ActionState } from "./AutomationBuilderContent";

function DottedConnector() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-6 w-px border-l-2 border-dashed border-zinc-200" />
    </div>
  );
}

export function ActionPanel({
  mode,
  actions,
  scope,
  onChange,
  onAddAction,
  onRemoveAction,
  onConnect,
  onAskBrain,
}: {
  mode: "classic" | "agent";
  actions: ActionState[];
  scope: AutomationScope;
  onChange: (index: number, newAction: ActionState) => void;
  onAddAction: () => void;
  onRemoveAction: (index: number) => void;
  onConnect: (providerId: string) => void;
  onAskBrain?: () => void;
}) {
  const handlePanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.scrollTop += e.deltaY;
  };

  return (
    <div
      className="flex flex-col w-full px-8 py-2"
    >
      <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative inline-block h-9 w-9 shrink-0 border border-zinc-200 rounded-md">
            <Image src="/images/logo.png" alt="" fill className="object-contain" />
          </span>
          <span className="text-lg font-semibold text-zinc-900">Action</span>
        </div>
      </div>

      {actions.map((action, index) => {
        const isIntegration = !!action.integration;
        const actionDef = action.integration 
          ? getIntegrationAction(action.integration.provider, action.integration.action) 
          : null;
        
        return (
          <div key={action.id} className="flex flex-col w-full">
            <DottedConnector />

            <div className="rounded-md border border-zinc-200 bg-white p-4 space-y-3 relative group">
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveAction(index)}
                  className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}

              <ActionPicker
                value={action.type || (mode === "agent" ? "DO_ANYTHING_WITH_AI" : "UPDATE_STATUS")}
                integrationValue={action.integration}
                actionConfig={action.config}
                scope={scope}
                onChange={(type, extraConfig) =>
                  onChange(index, {
                    ...action,
                    type,
                    integration: null,
                    integrationConfig: {},
                    config: extraConfig ? { ...action.config, ...extraConfig } : {},
                  })
                }
                onIntegrationChange={(provider, actionName) =>
                  onChange(index, {
                    ...action,
                    integration: { provider, action: actionName },
                    integrationConfig: {},
                    config: {},
                  })
                }
              />

              {isIntegration && actionDef?.fields ? (
                <IntegrationConfigFields
                  providerId={action.integration!.provider}
                  fields={actionDef.fields}
                  config={action.integrationConfig}
                  onChange={(config) => onChange(index, { ...action, integrationConfig: config })}
                  onConnect={() => onConnect(action.integration!.provider)}
                />
              ) : (
                <ActionConfigFields
                  actionType={action.type || (mode === "agent" ? "DO_ANYTHING_WITH_AI" : "UPDATE_STATUS")}
                  scope={scope}
                  config={action.config}
                  onChange={(config) => onChange(index, { ...action, config })}
                  onAskBrain={onAskBrain}
                />
              )}
            </div>
          </div>
        );
      })}

      <DottedConnector />
      <button
        type="button"
        onClick={onAddAction}
        className="mx-auto h-7 w-7 rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 cursor-pointer flex items-center justify-center shadow-sm"
        aria-label="Add step"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
