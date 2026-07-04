import type { BuilderStep, VarTreeEntry } from "@/entities/tools/types/builder";
import type { ToolFlowBuilderApi } from "../../hooks/useToolFlowBuilder";

export type SidebarPanelProps = {
  api: ToolFlowBuilderApi;
};

export type StepConfigBaseProps = SidebarPanelProps & {
  step: BuilderStep;
  parsed: Record<string, any>;
  varTree: VarTreeEntry[];
};
