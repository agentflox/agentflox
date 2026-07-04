"use client";

import type { SidebarPanelProps } from "./types";
import { InputsConfigurePanel } from "./InputsConfigurePanel";
import { StepConfigRouter } from "./StepConfigRouter";

export function ConfigurePanel({ api }: SidebarPanelProps) {
  const { activePanelTab, selectedNode, selectedStepId } = api;

  if (activePanelTab !== "configure") return null;

  return (
    <div className="space-y-4">
      {(selectedNode === "inputs" || !selectedStepId) && (
        <InputsConfigurePanel api={api} />
      )}
      {selectedStepId && selectedNode === "step" && (
        <div className="pt-2">
          <StepConfigRouter api={api} />
        </div>
      )}
    </div>
  );
}
