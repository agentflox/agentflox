"use client";

import type { SidebarPanelProps } from "./types";
import { OutputsSidebarPanel } from "../OutputsSidebarPanel";
import { SystemToolsPanel } from "./SystemToolsPanel";
import { InputFieldPanel } from "./InputFieldPanel";
import { ToolStepPickerPanel } from "./ToolStepPickerPanel";
import { BranchPathPanel } from "./BranchPathPanel";
import { ConfigurePanel } from "./ConfigurePanel";

export function SidebarBody({ api }: SidebarPanelProps) {
  const {
    systemToolsListOpen,
    inputSidebarOpen,
    selectedInputField,
    toolStepSidebarOpen,
    selectedNode,
    outputMode,
    outputs,
    buildVarTree,
    steps,
    removeOutput,
    addOutputFromSource,
    runCompositeTool,
  } = api;

  if (systemToolsListOpen) return <SystemToolsPanel api={api} />;
  if (inputSidebarOpen && selectedInputField) return <InputFieldPanel api={api} />;
  if (toolStepSidebarOpen) return <ToolStepPickerPanel api={api} />;
  if (selectedNode === "branch_path") return <BranchPathPanel api={api} />;
  if (selectedNode === "outputs") {
    return (
      <OutputsSidebarPanel
        outputMode={outputMode}
        outputs={outputs}
        buildVarTree={buildVarTree}
        stepsLength={steps.length}
        removeOutput={removeOutput}
        addOutputFromSource={addOutputFromSource}
        runCompositeTool={() => runCompositeTool()}
      />
    );
  }

  return <ConfigurePanel api={api} />;
}
