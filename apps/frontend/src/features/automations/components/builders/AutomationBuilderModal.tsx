"use client";

import type { AutomationScope } from "../../types";
import { AutomationBuilderContent } from "./AutomationBuilderContent";

/** @deprecated Use ManageAutomationsModal with inline builder view instead. */
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
  if (!open) return null;

  return (
    <AutomationBuilderContent
      scope={scope}
      mode={mode}
      editingId={editingId}
      onBack={() => onOpenChange(false)}
      onSaved={() => onOpenChange(false)}
      onAskBrain={onAskBrain}
    />
  );
}
