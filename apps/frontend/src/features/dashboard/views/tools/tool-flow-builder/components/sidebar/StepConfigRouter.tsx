"use client";

import type { SidebarPanelProps } from "./types";
import { LoopStepConfig } from "./step-config/LoopStepConfig";
import { SystemToolStepConfig } from "./step-config/SystemToolStepConfig";
import { ApiStepConfig } from "./step-config/ApiStepConfig";
import { LlmStepConfig } from "./step-config/LlmStepConfig";
import { CodeStepConfig } from "./step-config/CodeStepConfig";
import { DefaultStepConfig } from "./step-config/DefaultStepConfig";

export function StepConfigRouter({ api }: SidebarPanelProps) {
  const { selectedStepId, selectedNode, steps, buildVarTree } = api;

  if (!selectedStepId || selectedNode !== "step") return null;

  const step = steps.find((s) => s.id === selectedStepId);
  if (!step) return null;

  let parsed: Record<string, any> = {};
  try {
    parsed = JSON.parse(step.config || "{}");
  } catch {
    parsed = {};
  }

  const stepIndex = steps.findIndex((s) => s.id === step.id);
  const varTree = buildVarTree(stepIndex);
  const props = { api, step, parsed, varTree };

  if (parsed?.kind === "LOOP" || step.type === "LOOP") return <LoopStepConfig {...props} />;
  if (step.type === "SYSTEM_TOOL") return <SystemToolStepConfig {...props} />;
  if (step.type === "API") return <ApiStepConfig {...props} />;
  if (step.type === "LLM") return <LlmStepConfig {...props} />;
  if (parsed?.kind === "PYTHON" || parsed?.kind === "JAVASCRIPT") {
    return <CodeStepConfig {...props} />;
  }
  return <DefaultStepConfig {...props} />;
}
