"use client";

import type { AutomationScope } from "../types";
import { ManageAutomationsModal } from "./ManageAutomationsModal";

export function DashboardAutomationOverlays({
  scope,
  manageOpen,
  onManageOpenChange,
  builderRequest,
  onBuilderRequestHandled,
  onAskBrain,
}: {
  scope: AutomationScope | null;
  manageOpen: boolean;
  onManageOpenChange: (open: boolean) => void;
  builderRequest?: { mode: "classic" | "agent"; editingId?: string | null } | null;
  onBuilderRequestHandled?: () => void;
  onAskBrain?: () => void;
}) {
  if (!scope?.workspaceId) return null;

  return (
    <ManageAutomationsModal
      open={manageOpen}
      onOpenChange={onManageOpenChange}
      scope={scope}
      builderRequest={builderRequest}
      onBuilderRequestHandled={onBuilderRequestHandled}
      onAskBrain={onAskBrain}
    />
  );
}
