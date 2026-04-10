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

export const INPUT_TYPE_OPTIONS: Array<{
  value: InputUiType;
  label: string;
  baseType: BuilderInputField["type"];
}> = [
  { value: "text", label: "Text input", baseType: "string" },
  { value: "long_text", label: "Long text input", baseType: "string" },
  { value: "number", label: "Numeric input", baseType: "number" },
  { value: "checkbox", label: "Checkbox", baseType: "boolean" },
  { value: "options", label: "Options dropdown", baseType: "string" },
  { value: "text_list", label: "Text list", baseType: "array" },
  { value: "json", label: "JSON", baseType: "object" },
  { value: "json_list", label: "List of JSONs", baseType: "array" },
  { value: "file_to_text", label: "File to text", baseType: "string" },
  { value: "file_to_url", label: "File to URL", baseType: "string" },
  { value: "files_to_urls", label: "Multiple files to URLs", baseType: "array" },
  { value: "api_key", label: "API key input", baseType: "string" },
  { value: "oauth_account", label: "OAuth account", baseType: "string" },
  { value: "table", label: "Table", baseType: "array" },
];
