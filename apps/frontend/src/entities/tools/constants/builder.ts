import type { BranchConditionOperator, StepType, InputUiType, BuilderInputField } from "../types/builder";

export const BRANCH_OPERATORS: { value: BranchConditionOperator; label: string }[] = [
  { value: "equals", label: "equals (text)" },
  { value: "not_equals", label: "does not equal (text)" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "greater_than", label: "greater than (number)" },
  { value: "less_than", label: "less than (number)" },
  { value: "regex", label: "matches regex" },
];

export const STEP_LIBRARY: Array<{
  id: string;
  label: string;
  description: string;
  type: StepType;
  defaultConfig: Record<string, unknown>;
}> = [
  {
    id: "llm",
    label: "LLM",
    description: "Prompt an LLM and use its output in later steps.",
    type: "LLM",
    defaultConfig: { prompt: "", model: "gpt-4o-mini", temperature: 0.2 },
  },
  {
    id: "api",
    label: "API",
    description: "Call an HTTP API endpoint with headers/body.",
    type: "API",
    defaultConfig: { method: "GET", url: "", headers: {}, body: null },
  },
  {
    id: "system_tool",
    label: "System tool",
    description: "Call an internal system tool from the registry.",
    type: "SYSTEM_TOOL",
    defaultConfig: { toolId: "", input: {} },
  },
  {
    id: "branch",
    label: "Branch",
    description: "Route execution based on a condition (fallback supported).",
    type: "BRANCH",
    defaultConfig: {
      kind: "BRANCH",
      branches: [
        { id: "a", label: "Branch A", condition: "", steps: [], assessmentMode: "rules" },
        { id: "b", label: "Branch B", condition: "", steps: [], assessmentMode: "fallback" },
      ],
      fallback: true,
    },
  },
  {
    id: "loop",
    label: "Loop",
    description: "Repeat a step over a list of items.",
    type: "LOOP",
    defaultConfig: { kind: "LOOP", over: "{{inputs.items}}", maxIterations: 10, steps: [] },
  },
  {
    id: "python",
    label: "Python code",
    description: "Run a Python snippet (for data transforms and integrations).",
    type: "PYTHON",
    defaultConfig: { kind: "PYTHON", code: "print('hello')", outputFields: [] },
  },
  {
    id: "javascript",
    label: "Javascript code",
    description: "Run a JS snippet (for data transforms).",
    type: "JAVASCRIPT",
    defaultConfig: { kind: "JAVASCRIPT", code: "return { ok: true }", outputFields: [] },
  },
];

import { Type, AlignLeft, Hash, Check, List, Braces, FileUp, Settings2, Table as TableIcon, type LucideIcon } from "lucide-react";

export const INPUT_TYPE_OPTIONS: Array<{
  value: InputUiType;
  label: string;
  baseType: BuilderInputField["type"];
  icon: LucideIcon;
}> = [
  { value: "text", label: "Text input", baseType: "string", icon: Type },
  { value: "long_text", label: "Long text input", baseType: "string", icon: AlignLeft },
  { value: "number", label: "Numeric input", baseType: "number", icon: Hash },
  { value: "checkbox", label: "Checkbox", baseType: "boolean", icon: Check },
  { value: "options", label: "Options dropdown", baseType: "string", icon: List },
  { value: "text_list", label: "Text list", baseType: "array", icon: List },
  { value: "json", label: "JSON", baseType: "object", icon: Braces },
  { value: "json_list", label: "List of JSONs", baseType: "array", icon: Braces },
  { value: "file_to_text", label: "File to text", baseType: "string", icon: FileUp },
  { value: "file_to_url", label: "File to URL", baseType: "string", icon: FileUp },
  { value: "files_to_urls", label: "Multiple files to URLs", baseType: "array", icon: FileUp },
  { value: "api_key", label: "API key input", baseType: "string", icon: Settings2 },
  { value: "oauth_account", label: "OAuth account", baseType: "string", icon: Settings2 },
  { value: "table", label: "Table", baseType: "array", icon: TableIcon },
];
