import type { Node } from "@xyflow/react";

export type StepType = "LLM" | "API" | "SYSTEM_TOOL" | "LOOP" | "BRANCH" | "PYTHON" | "JAVASCRIPT";

export type BuilderStep = {
  id: string;
  name: string;
  type: StepType;
  config: string; // JSON string
  varName?: string;
  kind?: string; // Optional: helps in disambiguating SYSTEM_TOOL sub-types
};

export type InputFillMode = "manual" | "agent";

export type InputUiType =
  | "text"
  | "long_text"
  | "number"
  | "checkbox"
  | "options"
  | "text_list"
  | "table"
  | "json"
  | "json_list"
  | "file_to_text"
  | "file_to_url"
  | "files_to_urls"
  | "api_key"
  | "oauth_account";

export type BuilderInputField = {
  name: string;
  /** Human-readable display label. Falls back to name if not set. */
  label?: string;
  // JSON schema primitive type used by our backend/agent tool registry.
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  uiType?: InputUiType;
  fillMode?: InputFillMode;
  defaultValue?: unknown;
  placeholder?: string;
  options?: string[];
  jsonSchema?: unknown;
};

export type OutputMode = "last_step" | "manual";

export type BuilderOutputField = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  expression?: string;
  // The var-path this output maps to e.g. "steps.llm_1.answer"
  source?: string;
  sourceLabel?: string;
};

// Branch condition types (simplified version of workforce condition rules)
export type BranchConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"
  | "regex";

export type BranchConditionRule = {
  id: string;
  leftVariable: string;
  leftLabel: string;
  operator: BranchConditionOperator;
  rightValue: string;
  rightLabel: string;
};

export type BranchConditionGroup = {
  matchMode: "all" | "any";
  rules: BranchConditionRule[];
};

export type VarLeaf = { value: string; label: string; type: string; field: string };
export type VarSection = { id: string; label: string; leaves: VarLeaf[] };
export type VarTreeEntry = { nodeId: string; nodeName: string; nodeType: string; sections: VarSection[] };

export type ToolCanvasNodeKind = "inputs" | "step" | "outputs";

export type ToolCanvasNodeData = {
  kind: ToolCanvasNodeKind;
  title: string;
  runState?: { status: "running" | "success" | "error"; output?: any };
  subtitle?: string;
  toolName?: string;
  stepId?: string;
  stepIndex?: number;
  stepConfig?: any;
  systemTool?: any;
  onUpdateStepConfig?: (patch: any) => void;
  varName?: string;
  onOpen?: () => void;
  onOpenModal?: () => void;
  onAddStep?: () => void;
  onUpdateStepName?: (name: string) => void;
  onDelete?: () => void;
  onCopySnippet?: () => void;
  onDeleteBranch?: () => void;
  onUpdateBranchLabel?: (newLabel: string) => void;
  onUpdateBranchConfig?: (patch: any) => void;
  branchConfig?: any;
  branchIdx?: number;
  otherHasFallback?: boolean;
  onRunStep?: () => void;
  viewMode: "flow" | "notebook";
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMeasureHeight?: (h: number) => void;
  inputs?: any[];
  onAddInput?: (uiType: InputUiType) => void;
  onUpdateInput?: (idx: number, patch: Record<string, any>) => void;
  onDeleteInput?: (idx: number) => void;
  onReorderInputs?: (newOrder: any[]) => void;
  // Outputs node data
  outputs?: any[];
  outputMode?: "last_step" | "manual";
  varTree?: any[];
  onSetOutputMode?: (mode: "last_step" | "manual") => void;
  onAddOutput?: (source: string, sourceLabel: string, name: string, type: string) => void;
  onRemoveOutput?: (idx: number) => void;
  onAddCustomOutput?: () => void;
  branchLabel?: string;
  loopOver?: string;
  loopOverLabel?: string;
  loopProcessing?: "sequential" | "parallel";
  loopVarTree?: VarTreeEntry[];
  onUpdateLoop?: (patch: { over?: string; overLabel?: string; processing?: "sequential" | "parallel" }) => void;

  // Hover toolbar (main-flow nodes)
  isDisabled?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onToggleDisabled?: () => void;

  // Node kebab menu (Step/Loop)
  onRunUpToHere?: () => void;
  onCopyRunStepSnippet?: () => void;
  onDeleteStep?: () => void;
  onReplaceNode?: () => void;
  isSkipped?: boolean;
  onToggleSkip?: () => void;
  stickyNoteVisible?: boolean;
  stickyNoteContent?: string;
  onToggleStickyNote?: () => void;
  onUpdateStickyNote?: (content: string) => void;
};
