"use client";

import { ACTION_CATALOG, TRIGGER_CATALOG, type AutomationActionTypeV1, type AutomationTriggerTypeV1 } from "../../types";

export function LogicSummary({
  triggerType,
  actionType,
}: {
  triggerType?: string;
  actionType?: string;
}) {
  const trigger = TRIGGER_CATALOG[triggerType as AutomationTriggerTypeV1]?.label || triggerType || "…";
  const action = ACTION_CATALOG[actionType as AutomationActionTypeV1]?.label || actionType || "…";
  return (
    <p className="text-sm text-zinc-600">
      When{" "}
      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-800">
        {trigger}
      </span>{" "}
      then{" "}
      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-800">
        {action}
      </span>
    </p>
  );
}
