"use client";

import type { AutomationScope } from "../types";
import { ManageAutomationsModal } from "./ManageAutomationsModal";
import { AutomationBuilderModal } from "./builders/AutomationBuilderModal";

export function DashboardAutomationOverlays({
  scope,
  manageOpen,
  onManageOpenChange,
  builderOpen,
  onBuilderOpenChange,
  builderMode,
  editingId,
  onCreate,
  onEdit,
  onAskBrain,
}: {
  scope: AutomationScope | null;
  manageOpen: boolean;
  onManageOpenChange: (open: boolean) => void;
  builderOpen: boolean;
  onBuilderOpenChange: (open: boolean) => void;
  builderMode: "classic" | "agent";
  editingId?: string | null;
  onCreate: (mode: "classic" | "agent") => void;
  onEdit: (id: string, mode: "classic" | "agent") => void;
  onAskBrain?: () => void;
}) {
  if (!scope?.workspaceId) return null;

  return (
    <>
      <ManageAutomationsModal
        open={manageOpen}
        onOpenChange={onManageOpenChange}
        scope={scope}
        onCreate={onCreate}
        onEdit={onEdit}
      />
      <AutomationBuilderModal
        open={builderOpen}
        onOpenChange={onBuilderOpenChange}
        scope={scope}
        mode={builderMode}
        editingId={editingId}
        onAskBrain={onAskBrain}
      />
    </>
  );
}
