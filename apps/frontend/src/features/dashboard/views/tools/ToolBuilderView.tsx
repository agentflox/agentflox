"use client";

import React from "react";
import {
  ChevronRight,
  GitBranch,
  MoreHorizontal,
  MoreVertical,
  Play,
  Plus,
  Trash2,
  Code,
  Pencil,
  Settings2,
  X,
  Search,
  Bot,
  Wrench,
  MessageCircle,
  Files,
  Share2,
  Lock,
  Link2,
  Hammer,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
  getStraightPath,
  EdgeLabelRenderer,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { fetchAuthToken } from "@/utils/backend-request";

type StepType = "LLM" | "API" | "SYSTEM_TOOL";

type BuilderStep = {
  id: string;
  name: string;
  type: StepType;
  config: string; // JSON string
  varName?: string;
};

type InputFillMode = "manual" | "agent";

type InputUiType =
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

type BuilderInputField = {
  name: string;
  // JSON schema primitive type used by our backend/agent tool registry.
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  uiType?: InputUiType;
  fillMode?: InputFillMode;
  defaultValue?: unknown;
  options?: string[];
  jsonSchema?: unknown;
};

type BuilderOutputField = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  expression?: string;
};

// Branch condition types (simplified version of workforce condition rules)
type BranchConditionOperator =
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

type BranchConditionRule = {
  id: string;
  leftVariable: string;
  leftLabel: string;
  operator: BranchConditionOperator;
  rightValue: string;
  rightLabel: string;
};

type BranchConditionGroup = {
  matchMode: "all" | "any";
  rules: BranchConditionRule[];
};

type VarLeaf = { value: string; label: string; type: string; field: string };
type VarSection = { id: string; label: string; leaves: VarLeaf[] };
type VarTreeEntry = { nodeId: string; nodeName: string; nodeType: string; sections: VarSection[] };

const BRANCH_OPERATORS: { value: BranchConditionOperator; label: string }[] = [
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

const operatorHasRightValue = (op: BranchConditionOperator) =>
  op !== "is_empty" && op !== "is_not_empty";

function branchEntryIcon(nodeType: string) {
  if (nodeType === "inputs") return <Files className="h-3.5 w-3.5 text-sky-500" />;
  if (nodeType === "tool") return <Wrench className="h-3.5 w-3.5 text-emerald-500" />;
  return <Bot className="h-3.5 w-3.5 text-violet-500" />;
}

function branchTypeColor(t: string) {
  if (t === "String") return "text-amber-600";
  if (t === "Object") return "text-violet-600";
  if (t === "Number") return "text-sky-600";
  if (t === "Any") return "text-zinc-500";
  return "text-zinc-500";
}

function branchTypeIcon(t: string) {
  if (t === "Number") return <span className="text-[9px] font-black text-sky-600">#</span>;
  return <span className="text-[9px] font-black text-amber-600">T</span>;
}

// Inline VariableInput used by branch condition rules
function BranchVariableInput({
  value,
  label,
  varTree,
  onChange,
  onClear,
}: {
  value: string;
  label: string;
  varTree: VarTreeEntry[];
  onChange: (val: string, lbl: string) => void;
  onClear: () => void;
}) {
  const isVar = value.startsWith("inputs.") || value.startsWith("steps.");
  const displayLabel = isVar ? label : value;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [inputValue, setInputValue] = React.useState(displayLabel || "");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [highlightedIdx, setHighlightedIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openTimestampRef = React.useRef<number>(0);

  React.useEffect(() => {
    setInputValue(displayLabel || "");
  }, [displayLabel]);

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectLeaf = (leaf: VarLeaf) => {
    onChange(leaf.value, leaf.label);
    setOpen(false);
    setQuery("");
  };

  const filteredTree = React.useMemo(() => {
    if (!query) return varTree;
    const q = query.toLowerCase();
    const filterSections = (secs: VarSection[]) =>
      secs
        .map((s) => ({
          ...s,
          leaves: s.leaves.filter(
            (l) =>
              l.field.toLowerCase().includes(q) ||
              l.type.toLowerCase().includes(q) ||
              l.label.toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.leaves.length > 0);
    return varTree
      .map((entry) => ({
        ...entry,
        sections: filterSections(entry.sections),
      }))
      .filter((e) => e.sections.length > 0);
  }, [varTree, query]);

  const allLeaves: VarLeaf[] = React.useMemo(() => {
    const collect = (secs: VarSection[], prefix: string) =>
      secs.flatMap((s) => (collapsed[`${prefix}:${s.id}`] ? [] : s.leaves));
    return filteredTree.flatMap((entry) => collect(entry.sections, entry.nodeId));
  }, [filteredTree, collapsed]);

  const renderLeaves = (leaves: VarLeaf[], indent: number) =>
    leaves.map((leaf) => {
      const flatIdx = allLeaves.indexOf(leaf);
      const isHighlighted = flatIdx === highlightedIdx;
      return (
        <button
          key={leaf.value}
          className={cn(
            "w-full flex items-center gap-2.5 pr-4 py-1.5 text-left transition-colors cursor-pointer",
            isHighlighted ? "bg-violet-50" : "hover:bg-zinc-50",
          )}
          style={{ paddingLeft: indent }}
          onClick={() => selectLeaf(leaf)}
          onMouseEnter={() => setHighlightedIdx(flatIdx)}
        >
          <span className="h-4 w-4 rounded flex items-center justify-center bg-amber-50 border border-amber-100 shrink-0">
            {branchTypeIcon(leaf.type)}
          </span>
          <span className="flex-1 text-[12px] text-zinc-700 font-medium">{leaf.field}</span>
          <span className={cn("text-[11px] font-semibold", branchTypeColor(leaf.type))}>
            {leaf.type}
          </span>
        </button>
      );
    });

  const renderSection = (sec: VarSection, collapseKey: string, indent: number) => {
    const isOpen = collapsed[collapseKey] !== true;
    return (
      <div key={sec.id}>
        <button
          className="w-full flex items-center gap-2 py-1.5 hover:bg-zinc-50 transition-colors cursor-pointer"
          style={{ paddingLeft: indent - 8, paddingRight: 16 }}
          onClick={() => toggleCollapse(collapseKey)}
        >
          <div className="h-4 w-4 rounded flex items-center justify-center bg-violet-50 border border-violet-100 shrink-0">
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              className="text-violet-500"
            >
              <path
                d="M1 2.5L4 5.5L7 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  transform: isOpen ? "none" : "rotate(-90deg)",
                  transformOrigin: "50% 50%",
                  transition: "transform 0.15s",
                }}
              />
            </svg>
          </div>
          <span className="flex-1 text-[12px] font-medium text-zinc-600 text-left">
            {sec.label}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Object
          </span>
        </button>
        {isOpen && renderLeaves(sec.leaves, indent + 16)}
      </div>
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      openTimestampRef.current = Date.now();
      setOpen(true);
      setHighlightedIdx(0);
    } else {
      const elapsed = Date.now() - openTimestampRef.current;
      if (elapsed < 150) return;
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center h-10 border rounded-lg bg-white px-3 gap-2 transition-all cursor-pointer",
            open ? "border-violet-400 ring-2 ring-violet-100" : "border-zinc-200 hover:border-zinc-300",
          )}
          onPointerDown={(e) => {
            if (!open) {
              e.preventDefault();
              handleOpenChange(true);
            }
          }}
          onClick={(e) => open && e.stopPropagation()}
        >
          {isVar && (
            <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded uppercase shrink-0 tracking-wide">
              VAR
            </span>
          )}
          <input
            className={cn(
              "flex-1 text-[12px] bg-transparent outline-none min-w-0",
              inputValue ? "text-zinc-800" : "text-zinc-400",
            )}
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              onChange(val, val);
            }}
            onFocus={() => {
              if (!open) handleOpenChange(true);
            }}
            placeholder="Select variable or input a constant value"
          />
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear();
                setOpen(false);
              }}
              className="shrink-0 h-4 w-4 rounded flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        className="p-0 w-[360px] rounded-xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              ref={inputRef}
              autoFocus
              className="w-full h-9 pl-8 pr-3 text-[13px] bg-zinc-50 rounded-lg border border-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all placeholder:text-zinc-400"
              placeholder="Select variable or input a constant value"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIdx((i) => Math.min(i + 1, allLeaves.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIdx((i) => Math.max(i - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (allLeaves[highlightedIdx]) {
                    selectLeaf(allLeaves[highlightedIdx]);
                    return;
                  }
                  if (query.trim()) {
                    onChange(query.trim(), query.trim());
                    setOpen(false);
                    setQuery("");
                  }
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
          {filteredTree.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-zinc-400">
              {query ? "No variables match" : "No variables available"}
            </div>
          ) : (
            filteredTree.map((entry) => (
              <div key={entry.nodeId}>
                <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                  <div className="h-5 w-5 rounded flex items-center justify-center bg-white border border-zinc-200 shadow-sm shrink-0">
                    {branchEntryIcon(entry.nodeType)}
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-zinc-800">
                    {entry.nodeName}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Object
                  </span>
                </div>
                {entry.sections.map((sec) =>
                  renderSection(sec, `${entry.nodeId}:${sec.id}`, 24),
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 bg-zinc-50/50">
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↑
            </kbd>
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↵
            </kbd>
            Insert
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              Esc
            </kbd>
            Close/Exit
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Responsive row for a single branch condition rule (same behavior as workforce)
function BranchConditionRuleRow({
  rule,
  varTree,
  onUpdate,
  onRemove,
}: {
  rule: BranchConditionRule;
  varTree: VarTreeEntry[];
  onUpdate: (patch: Partial<BranchConditionRule>) => void;
  onRemove: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setIsWide(e.contentRect.width > 500);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const leftInput = (
    <BranchVariableInput
      value={rule.leftVariable}
      label={rule.leftLabel}
      varTree={varTree}
      onChange={(val, lbl) => onUpdate({ leftVariable: val, leftLabel: lbl })}
      onClear={() => onUpdate({ leftVariable: "", leftLabel: "" })}
    />
  );

  const operatorSelect = (
    <Select
      value={rule.operator}
      onValueChange={(val) => onUpdate({ operator: val as BranchConditionOperator })}
    >
      <SelectTrigger
        className={cn(
          "h-9 text-[12px] bg-white border-zinc-200 rounded-lg",
          isWide ? "w-44 shrink-0" : "w-full",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BRANCH_OPERATORS.map((op) => (
          <SelectItem key={op.value} value={op.value} className="text-[12px]">
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const rightInput =
    operatorHasRightValue(rule.operator) && (
      <BranchVariableInput
        value={rule.rightValue}
        label={rule.rightLabel}
        varTree={varTree}
        onChange={(val, lbl) => onUpdate({ rightValue: val, rightLabel: lbl })}
        onClear={() => onUpdate({ rightValue: "", rightLabel: "" })}
      />
    );

  const deleteBtn = (
    <button
      type="button"
      onClick={onRemove}
      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
    >
      {isWide ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">{leftInput}</div>
          {operatorSelect}
          {rightInput && <div className="flex-1 min-w-0">{rightInput}</div>}
          {deleteBtn}
        </div>
      ) : (
        <div className="space-y-2">
          {leftInput}
          {operatorSelect}
          {rightInput}
          <div className="flex justify-end pt-0.5">{deleteBtn}</div>
        </div>
      )}
    </div>
  );
}

export type ToolBuilderViewProps = {
  workspaceId: string;
  initialTool?: any | null;
};

const STEP_LIBRARY: Array<{
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
      type: "SYSTEM_TOOL",
      defaultConfig: {
        kind: "BRANCH",
        branches: [
          { id: "a", label: "Branch A", condition: "", steps: [] },
          { id: "b", label: "Branch B", condition: "", steps: [] },
        ],
        fallback: true,
      },
    },
    {
      id: "loop",
      label: "Loop",
      description: "Repeat a step over a list of items.",
      type: "SYSTEM_TOOL",
      defaultConfig: { kind: "LOOP", over: "{{inputs.items}}", maxIterations: 10 },
    },
    {
      id: "python",
      label: "Python code",
      description: "Run a Python snippet (for data transforms and integrations).",
      type: "SYSTEM_TOOL",
      defaultConfig: { kind: "PYTHON", code: "print('hello')" },
    },
    {
      id: "javascript",
      label: "Javascript code",
      description: "Run a JS snippet (for data transforms).",
      type: "SYSTEM_TOOL",
      defaultConfig: { kind: "JAVASCRIPT", code: "return { ok: true }" },
    },
  ];

const INPUT_TYPE_OPTIONS: Array<{ value: InputUiType; label: string; baseType: BuilderInputField["type"] }> = [
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

function toVarName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "step";
}

function inferUiTypeFromProp(prop: any): InputUiType {
  const hinted = prop?.["x-uiType"] as InputUiType | undefined;
  if (hinted) return hinted;
  const t = (prop?.type as string | undefined) ?? "string";
  if (t === "boolean") return "checkbox";
  if (t === "number" || t === "integer") return "number";
  if (t === "array") return "text_list";
  if (t === "object") return "json";
  return "text";
}

type ToolCanvasNodeKind = "inputs" | "step" | "outputs";

type ToolCanvasNodeData = {
  kind: ToolCanvasNodeKind;
  title: string;
  subtitle?: string;
  stepId?: string;
  stepIndex?: number;
  varName?: string;
  onOpen?: () => void;
  onAddStep?: () => void;
  onDelete?: () => void;
  onCopySnippet?: () => void;
  onDeleteBranch?: () => void;
  onUpdateBranchLabel?: (newLabel: string) => void;
  onRunStep?: () => void;
  viewMode: "flow" | "notebook";
  branchLabel?: string;
};

function InputsNode({ data }: { data: ToolCanvasNodeData }) {
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <button
        type="button"
        onClick={data.onOpen}
        className="w-[380px] text-left rounded-xl border border-amber-300 bg-white shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="text-base font-semibold text-zinc-900">{data.title}</div>
          <div className="mt-1 text-sm text-zinc-500">{data.subtitle}</div>
        </div>
      </button>
    </div>
  );
}

function OutputsNode({ data }: { data: ToolCanvasNodeData }) {
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <button
        type="button"
        onClick={data.onOpen}
        className="w-[380px] text-left rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-zinc-900">{data.title}</div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5">Last step</span>
              <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5">Manual</span>
            </div>
          </div>
          <div className="mt-1 text-sm text-zinc-500">{data.subtitle}</div>
          <div className="mt-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
            No tool results yet
            <div className="mt-1 text-[11px] text-zinc-400">“Run tool” to see output</div>
          </div>
        </div>
      </button>
    </div>
  );
}

function StepNode({ data }: { data: ToolCanvasNodeData }) {
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <div className="w-[380px] rounded-xl border border-indigo-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <button
          type="button"
          onClick={data.onOpen}
          className="w-full text-left"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-md bg-zinc-100 flex items-center justify-center text-[11px] font-semibold text-zinc-600 shrink-0">
                {typeof data.stepIndex === "number" ? data.stepIndex + 1 : "•"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-zinc-900 truncate">{data.title}</div>
                  {data.varName ? (
                    <div className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                      {data.varName}
                    </div>
                  ) : null}
                </div>
                {data.subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{data.subtitle}</div> : null}
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 mt-1 shrink-0" />
            </div>

            {data.viewMode === "notebook" ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                Notebook view: configuration preview appears on the node.
              </div>
            ) : null}
          </div>
        </button>
        {data.onAddStep ? (
          <div className="px-4 pb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                data.onAddStep?.();
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add step
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BranchNode({ data }: { data: ToolCanvasNodeData }) {
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <div className="w-[380px] rounded-xl border border-indigo-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-3">
        <button type="button" onClick={data.onOpen} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <GitBranch className="h-5 w-5 text-indigo-600 shrink-0" />
          <span className="text-sm font-medium text-zinc-900">Branch</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 shrink-0 nodrag nopan">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={data.onCopySnippet}>
              <Code className="h-4 w-4 mr-2" />
              Copy Python run_step snippet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={data.onDelete} className="text-red-600 focus:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0 nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            data.onRunStep?.();
          }}
        >
          <Play className="h-3 w-3 mr-1" /> Run
        </Button>
      </div>
    </div>
  );
}

function BranchPathNode({ data }: { data: ToolCanvasNodeData & { branchLabel?: string } }) {
  const label = (data as any).branchLabel ?? data.title;
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle type="target" position={Position.Top} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <div className="w-[380px] group rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow p-3 flex items-center gap-1 text-left">
        <button type="button" onClick={data.onOpen} className="flex items-center gap-2 text-left max-w-[280px]">
          <span className="text-sm font-medium text-zinc-900 truncate shrink-0">{label}</span>
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 min-w-[24px] opacity-0 group-hover:opacity-100 text-zinc-400 nodrag nopan transition-opacity shrink-0">
              <Pencil className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 nodrag nopan" align="start">
            <div className="text-xs font-semibold mb-2">Branch label</div>
            <Input
              defaultValue={label}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  data.onUpdateBranchLabel?.(e.currentTarget.value);
                }
              }}
              onBlur={(e) => data.onUpdateBranchLabel?.(e.target.value)}
            />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 min-w-[24px] opacity-0 group-hover:opacity-100 text-zinc-400 nodrag nopan transition-opacity ml-auto shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={data.onDeleteBranch} className="text-red-600 focus:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete branch logic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function BranchEndNode({ data }: { data: ToolCanvasNodeData & { branchLabel?: string } }) {
  const label = (data as any).branchLabel ?? data.title;
  return (
    <div className="relative w-[380px] cursor-pointer">
      <Handle type="target" position={Position.Top} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <div className="w-[380px] flex justify-center">
        <button type="button" onClick={data.onOpen} className="w-[380px] rounded-lg border border-zinc-200 bg-white/70 shadow-sm hover:shadow-md transition-shadow px-4 py-2 flex items-center justify-center text-center">
          <span className="text-xs font-medium text-zinc-700 truncate">{label}</span>
        </button>
      </div>
    </div>
  );
}

function StepsEmptyNode({
  data,
}: {
  data: ToolCanvasNodeData & {
    onAddStep?: () => void;
    onQuickAdd?: (libId: string) => void;
  };
}) {
  return (
    <div className="relative w-[380px] text-left rounded-xl border border-zinc-200 bg-white shadow-sm cursor-pointer">
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-indigo-50 flex items-center justify-center text-[11px] font-semibold text-indigo-600">
            ▦
          </div>
          <div className="text-base font-semibold text-zinc-900">{data.title}</div>
        </div>
        <div className="mt-1 text-sm text-zinc-500">{data.subtitle}</div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 nodrag nopan">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              className="h-9 text-xs font-semibold col-span-1 bg-indigo-600 hover:bg-indigo-700 nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onAddStep?.();
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Step
            </Button>

            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("llm")}>
              LLM
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 text-xs nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onAddStep?.(); }}
            >
              AI Generation
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("branch")}>
              Branch
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("loop")}>
              Loop
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("python")}>
              Python
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("javascript")}>
              JavaScript
            </Button>
            <Button type="button" variant="outline" className="h-9 text-xs nodrag nopan" onClick={() => data.onQuickAdd?.("api")}>
              API
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd, data } = props;
  const [hovered, setHovered] = React.useState(false);

  // For vertical connections: clean straight line.
  // For horizontally-offset connections (branches): a 3-segment orthogonal path
  // that goes straight down, turns horizontal at midpoint, then straight down again.
  // This matches the reference design exactly and avoids getSmoothStepPath's backward-U routing.
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (Math.abs(targetX - sourceX) > 30) {
    const midY = (sourceY + targetY) / 2;
    edgePath = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = midY;
  } else {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  }

  const onPlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (data as any)?.onPlus?.();
  };

  return (
    <>
      <path
        id={id}
        className={cn(
          "fill-none transition-colors",
          hovered ? "stroke-indigo-400 stroke-[2.5]" : "stroke-indigo-300 stroke-[2]"
        )}
        d={edgePath}
        markerEnd={markerEnd ?? { type: MarkerType.ArrowClosed }}
      />
      <EdgeLabelRenderer>
        <div
          role="button"
          tabIndex={0}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            width: 56,
            height: 56,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onPlusClick}
        >
          <span
            className={cn(
              "h-9 w-9 rounded-full bg-white border border-indigo-200 shadow-sm hover:shadow-md transition-all flex items-center justify-center pointer-events-none",
              hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            aria-hidden
          >
            <Plus className="h-4 w-4 text-indigo-600" />
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export function ToolBuilderView({ workspaceId, initialTool }: ToolBuilderViewProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [name, setName] = React.useState(initialTool?.name ?? "");
  const [description, setDescription] = React.useState<string>(initialTool?.description ?? "");
  const [category, setCategory] = React.useState<string>(initialTool?.category ?? "Custom");

  const [activePanelTab, setActivePanelTab] =
    React.useState<"configure" | "outputs" | "fallback">("configure");
  const [activeTopTab, setActiveTopTab] = React.useState<"build" | "run">("build");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [toolIcon, setToolIcon] = React.useState<string>("T");
  const [selectedNode, setSelectedNode] = React.useState<"inputs" | "outputs" | "step" | "branch_path">("inputs");
  const [selectedSubBranchId, setSelectedSubBranchId] = React.useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"flow" | "notebook">("flow");
  const [navigatorOpen, setNavigatorOpen] = React.useState(false);
  const [navigatorQuery, setNavigatorQuery] = React.useState("");
  const [toolStepSidebarOpen, setToolStepSidebarOpen] = React.useState(false);
  const [toolStepSidebarQuery, setToolStepSidebarQuery] = React.useState("");
  const [systemToolsListOpen, setSystemToolsListOpen] = React.useState(false);
  const [inputSidebarOpen, setInputSidebarOpen] = React.useState(false);
  const [selectedInputField, setSelectedInputField] = React.useState<{ stepId: string; fieldName: string } | { kind: "tool"; fieldIdx: number } | null>(null);
  const [pendingBranchStep, setPendingBranchStep] = React.useState<{ branchStepId?: string, branchId?: string, insertIndex?: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [sidebarWidth, setSidebarWidth] = React.useState(420);
  const [isResizingSidebar, setIsResizingSidebar] = React.useState(false);
  const [isRunningTool, setIsRunningTool] = React.useState(false);

  const systemToolsQuery = trpc.tool.systemList.useQuery({
    query: systemToolsListOpen ? toolStepSidebarQuery || undefined : undefined,
  });
  const [isSyncingTools, setIsSyncingTools] = React.useState(false);
  const syncSystemTools = React.useCallback(async () => {
    setIsSyncingTools(true);
    try {
      const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3002") : "";
      const res = await fetch(`${base}/api/sync-tools`, { method: "POST" });
      if (res.ok) {
        await systemToolsQuery.refetch();
        toast({ title: "Tools synced", description: "System tools have been synced." });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Sync failed", description: err?.error || res.statusText, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message || "Could not reach sync endpoint.", variant: "destructive" });
    } finally {
      setIsSyncingTools(false);
    }
  }, [systemToolsQuery, toast]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const w = window.innerWidth - e.clientX;
      if (w > 320 && w < 900) setSidebarWidth(w);
    };
    const onUp = () => setIsResizingSidebar(false);
    if (isResizingSidebar) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingSidebar]);

  const [inputs, setInputs] = React.useState<BuilderInputField[]>(() => {
    const fn = initialTool?.functionSchema as any;
    const props = fn?.parameters?.properties || {};
    const required: string[] = fn?.parameters?.required || [];
    return Object.keys(props).map((key) => ({
      name: key,
      type: (props[key].type as any) || "string",
      description: props[key].description as string | undefined,
      required: required.includes(key),
      uiType: inferUiTypeFromProp(props[key]),
      fillMode: (props[key]?.["x-fillMode"] as InputFillMode | undefined) ?? "agent",
      defaultValue: props[key]?.default,
      options: Array.isArray(props[key]?.enum) ? (props[key].enum as string[]) : undefined,
      jsonSchema: props[key]?.["x-jsonSchema"],
    }));
  });

  const [outputs, setOutputs] = React.useState<BuilderOutputField[]>(() => {
    const fn = initialTool?.functionSchema as any;
    const props = fn?.returns?.properties || {};
    return Object.keys(props).map((key) => ({
      name: key,
      type: (props[key].type as any) || "string",
      description: props[key].description as string | undefined,
      expression: props[key]?.["x-expression"] as string | undefined,
    }));
  });

  const [steps, setSteps] = React.useState<BuilderStep[]>(() => {
    const rawSteps = (initialTool?.steps as any[]) || [];
    return rawSteps.map((s) => ({
      id: s.id || s.name || crypto.randomUUID(),
      name: s.name || "",
      type: (s.type || "LLM") as StepType,
      config: JSON.stringify(s.config ?? {}, null, 2),
      varName: s.varName || s.variableName || s.id || toVarName(s.name || "step"),
    }));
  });

  const isEditing = !!initialTool?.id;
  const seededDefaultsRef = React.useRef(false);

  // Always include default inputs (Relevance-like): oauth account + sessionId + text.
  React.useEffect(() => {
    if (seededDefaultsRef.current) return;
    // Only auto-seed when creating a new tool and there are no inputs defined yet.
    if (isEditing) return;
    if (inputs.length > 0) return;
    seededDefaultsRef.current = true;
    setInputs([
      {
        name: "oauth_account_id",
        type: "string",
        uiType: "oauth_account",
        fillMode: "manual",
        required: true,
        description: "Connected account used for authorization. Requests will run on behalf of this account.",
      },
      {
        name: "text",
        type: "string",
        uiType: "text",
        fillMode: "agent",
        required: true,
        description: "Text to process for this tool run.",
        defaultValue: "",
      },
      {
        name: "sessionId",
        type: "string",
        uiType: "text",
        fillMode: "agent",
        required: false,
        description: "Optional session id to group related tool runs.",
      },
    ]);
  }, [inputs.length, isEditing]);

  const createMutation = trpc.compositeTool.create.useMutation({
    onSuccess: async (tool) => {
      toast({ title: "Tool created", description: "Your tool was created successfully." });
      await utils.compositeTool.list.invalidate();
      window.history.replaceState(null, "", `/dashboard/tools/${tool.id}`);
    },
    onError: (err) => {
      toast({ title: "Error creating tool", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.compositeTool.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Tool saved", description: "Changes have been saved." });
      await utils.compositeTool.get.invalidate({ id: initialTool.id });
      await utils.compositeTool.list.invalidate();
    },
    onError: (err) => {
      toast({ title: "Error saving tool", description: err.message, variant: "destructive" });
    },
  });

  const upsert = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give your tool a name before saving." });
      return;
    }

    const parameters: any = {
      type: "object",
      properties: {},
      required: [] as string[],
    };
    inputs.forEach((field) => {
      if (!field.name) return;
      parameters.properties[field.name] = {
        type: field.type === "object" || field.type === "array" ? field.type : field.type,
        description: field.description ?? undefined,
        default: field.defaultValue === undefined ? undefined : field.defaultValue,
        enum: field.uiType === "options" && field.options?.length ? field.options : undefined,
        "x-uiType": field.uiType ?? undefined,
        "x-fillMode": field.fillMode ?? undefined,
        "x-jsonSchema": field.jsonSchema ?? undefined,
      };
      if (field.required) parameters.required.push(field.name);
    });

    const returns: any = {
      type: "object",
      properties: {},
    };
    outputs.forEach((field) => {
      if (!field.name) return;
      returns.properties[field.name] = {
        type: field.type,
        description: field.description ?? undefined,
        "x-expression": field.expression ?? undefined,
      };
    });

    const functionSchema = {
      name,
      description,
      parameters,
      returns,
      "x-fallback": (initialTool?.functionSchema as any)?.["x-fallback"],
    };

    const normalizedSteps = steps.map((s) => {
      let parsedConfig: any = {};
      try {
        parsedConfig = s.config ? JSON.parse(s.config) : {};
      } catch {
        parsedConfig = { raw: s.config };
      }
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        config: parsedConfig,
      };
    });

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: initialTool.id,
        name,
        description,
        category,
        functionSchema,
        steps: normalizedSteps,
      });
    } else {
      await createMutation.mutateAsync({
        workspaceId,
        name,
        description,
        category,
        functionSchema,
        steps: normalizedSteps,
        isPublic: true,
      });
    }
  };

  const addInput = (uiType: InputUiType = "text") => {
    const meta = INPUT_TYPE_OPTIONS.find((o) => o.value === uiType) ?? INPUT_TYPE_OPTIONS[0];
    setInputs((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        required: false,
        uiType,
        fillMode: uiType === "oauth_account" || uiType === "api_key" ? "manual" : "agent",
        type: meta.baseType,
        defaultValue: undefined,
      },
    ]);
  };

  const addOutput = () => {
    setOutputs((prev) => [...prev, { name: "", type: "string" }]);
  };

  const runCompositeTool = React.useCallback(
    async (options?: { startStepId?: string }) => {
      if (!initialTool?.id) {
        toast({
          title: "Save tool first",
          description: "Please save this tool before running it.",
          variant: "destructive",
        });
        return;
      }

      if (isRunningTool) return;

      setIsRunningTool(true);
      try {
        const token = await fetchAuthToken();
        const resolvedInput: Record<string, unknown> = {};
        for (const field of inputs) {
          if (!field.name) continue;
          if (field.defaultValue !== undefined) {
            resolvedInput[field.name] = field.defaultValue;
          }
        }

        const res = await fetch(
          `${BACKEND_URL}/v1/agents/composite-tools/${encodeURIComponent(
            initialTool.id,
          )}/run`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              input: resolvedInput,
              startStepId: options?.startStepId,
            }),
          },
        );

        if (!res.ok) {
          const text = await res.text();
          let message = text;
          try {
            const parsed = JSON.parse(text);
            message = parsed?.message || parsed?.error || text;
          } catch {
            // ignore
          }
          throw new Error(message || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          executionId?: string;
          status?: string;
          summary?: string;
        };

        toast({
          title: "Tool run started",
          description:
            data.summary ||
            (data.executionId
              ? `Execution ${data.status ?? "STARTED"} (ID: ${String(
                  data.executionId,
                ).slice(0, 8)}…)`
              : "Backend accepted the run request."),
        });
      } catch (err: any) {
        toast({
          title: "Error running tool",
          description: err?.message || "Failed to start tool run.",
          variant: "destructive",
        });
      } finally {
        setIsRunningTool(false);
      }
    },
    [initialTool?.id, inputs, toast, isRunningTool],
  );

  const doInsertStep = React.useCallback((created: BuilderStep) => {
    setSteps((prev) => {
      if (!pendingBranchStep) return [...prev, created];

      const { branchStepId, branchId, insertIndex } = pendingBranchStep;

      // Inserting into the main flow
      if (!branchStepId || !branchId) {
        if (typeof insertIndex === "number") {
          const next = [...prev];
          next.splice(insertIndex, 0, created);
          return next;
        }
        return [...prev, created];
      }

      // Inserting into a branch
      return prev.map((s) => {
        if (s.id !== branchStepId) return s;
        let cfg: any = {};
        try { cfg = JSON.parse(s.config || "{}"); } catch { }
        const branches = (cfg.branches ?? []).map((b: any) => {
          if (b.id !== branchId) return b;
          const currentSteps = b.steps ?? [];
          if (typeof insertIndex === "number") {
            const nextInner = [...currentSteps];
            nextInner.splice(insertIndex, 0, created);
            return { ...b, steps: nextInner };
          }
          return { ...b, steps: [...currentSteps, created] };
        });
        return { ...s, config: JSON.stringify({ ...cfg, branches }, null, 2) };
      });
    });
    setPendingBranchStep(null);
  }, [pendingBranchStep, setSteps]);

  const addStepFromLibrary = (libId: string) => {
    const item = STEP_LIBRARY.find((s) => s.id === libId);
    if (!item) return;
    const nextIndex = steps.length + 1;
    const stepName = `${item.label} ${nextIndex}`;
    doInsertStep({
      id: crypto.randomUUID(),
      name: stepName,
      type: item.type,
      varName: toVarName(stepName),
      config: JSON.stringify(item.defaultConfig ?? {}, null, 2),
    });
  };

  /** Add a new branch column to an existing Branch step (Branch C, D, …). */
  const addBranchColumn = React.useCallback((branchStepId: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const existing: any[] = cfg.branches ?? [];
      const letter = String.fromCharCode(65 + existing.length); // A→B→C…
      const newBranch = { id: letter.toLowerCase(), label: `Branch ${letter}`, condition: "", steps: [] };
      return { ...s, config: JSON.stringify({ ...cfg, branches: [...existing, newBranch] }, null, 2) };
    }));
  }, []);

  const deleteStep = React.useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
      setSelectedNode("inputs");
      setActivePanelTab("configure");
    }
  }, [selectedStepId]);

  const deleteBranchLogic = React.useCallback((branchStepId: string, branchId: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const branches = (cfg.branches ?? []).filter((b: any) => b.id !== branchId);
      return { ...s, config: JSON.stringify({ ...cfg, branches }, null, 2) };
    }));
  }, []);

  const updateBranchLabel = React.useCallback((branchStepId: string, branchId: string, newLabel: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== branchStepId) return s;
      let cfg: any = {};
      try { cfg = JSON.parse(s.config || "{}"); } catch { }
      const branches = (cfg.branches ?? []).map((b: any) => {
        if (b.id !== branchId) return b;
        return { ...b, label: newLabel };
      });
      return { ...s, config: JSON.stringify({ ...cfg, branches }, null, 2) };
    }));
  }, []);

  const openToolStepSidebar = React.useCallback((target?: { branchStepId?: string; branchId?: string; insertIndex?: number }) => {
    setPendingBranchStep(target ?? null);
    setSidebarOpen(true);
    setToolStepSidebarOpen(true);
    setSystemToolsListOpen(false);
    setInputSidebarOpen(false);
    setSelectedInputField(null);
    setToolStepSidebarQuery("");
  }, []);

  const addSystemToolStep = React.useCallback((tool: any) => {
    const newId = crypto.randomUUID();
    const nextIndex = steps.length + 1;
    const stepName = tool?.displayName ?? tool?.name ?? `System tool ${nextIndex}`;
    doInsertStep({
      id: newId,
      name: stepName,
      type: "SYSTEM_TOOL" as StepType,
      varName: toVarName(stepName),
      config: JSON.stringify({ toolId: tool.id, input: {} }, null, 2),
    });
    setToolStepSidebarOpen(false);
    setSystemToolsListOpen(false);
    setSelectedNode("step");
    setSelectedStepId(newId);
    setActivePanelTab("configure");
  }, [steps.length, doInsertStep]);

  const nodeTypes = React.useMemo<NodeTypes>(() => {
    return {
      inputsNode: InputsNode as any,
      stepNode: StepNode as any,
      branchNode: BranchNode as any,
      branchPathNode: BranchPathNode as any,
      branchEndNode: BranchEndNode as any,
      outputsNode: OutputsNode as any,
      stepsEmptyNode: StepsEmptyNode as any,
    };
  }, []);

  const edgeTypes = React.useMemo<EdgeTypes>(() => {
    return {
      plusEdge: PlusEdge as any,
    };
  }, []);

  const computedNodes = React.useMemo<Node<ToolCanvasNodeData>[]>(() => {
    const baseX = 0;
    const baseY = 0;
    // SEG = target visible line length between any two nodes
    // node height estimates used only when steps exist, declared here to keep empty-step path clean
    const gapY = 182; // Inputs → first step: H_INPUTS(82) + SEG(100)

    const nodes: Node<ToolCanvasNodeData>[] = [];

    nodes.push({
      id: "node_inputs",
      type: "inputsNode",
      position: { x: baseX, y: baseY },
      data: {
        kind: "inputs",
        title: "Inputs",
        subtitle: "What you or your agent should pass into this tool",
        viewMode,
        onOpen: () => {
          setSelectedNode("inputs");
          setActivePanelTab("configure");
        },
      },
    });

    if (steps.length === 0) {
      nodes.push({
        id: "node_steps_empty",
        type: "stepsEmptyNode",
        position: { x: baseX, y: baseY + gapY },
        data: {
          kind: "step",
          title: "Steps",
          subtitle: "Define the logic of your tool. Chain together LLM prompts, call APIs, run code and more.",
          viewMode,
          onAddStep: () => openToolStepSidebar({ insertIndex: 0 }),
          onQuickAdd: (libId: string) => addStepFromLibrary(libId),
        } as any,
      });
      return nodes;
    }

    // Target visible segment length (px) — every connection line should look this long.
    // Estimated rendered node heights (px) for layout math:
    //   BranchNode ≈ 68px, BranchPathNode ≈ 56px, BranchEndNode ≈ 46px
    // Math: so every path segment (straight or elbow half) equals SEG exactly.
    //   Branch → BranchPath gap   = H_B + 2·SEG  → midpoint gives SEG on each elbow side
    //   BranchPath → BranchEnd gap = H_P + SEG    → straight line equals SEG
    //   BranchEnd → Next gap       = H_E + 2·SEG  → midpoint convergence gives SEG each side
    const SEG = 100;
    const BRANCH_SEG = 50; // Use shorter connecting lines for branch elbows
    // Estimated rendered heights — visible line = nextNode.y - sourceNode.y - sourceNode.height = SEG
    const H_INPUTS = 82;  // InputsNode: p-4 + title + subtitle
    const H_STEP = 112;   // StepNode: p-4 + row + subtitle + Add-step button
    const H_B = 62, H_P = 50, H_E = 34;  // branch node sub-types
    const branchOffsetX = 400;
    const branchToPathGapY = H_B + 2 * BRANCH_SEG;             // Branch top → BranchPath top
    // First step starts at H_INPUTS + SEG below Inputs node (= gapY = 182)
    // Each subsequent step advances H_STEP + SEG so visible segment = SEG = 100px
    const stepAdvance = H_STEP + SEG; // 215
    let currentY = baseY + gapY;

    steps.forEach((s, idx) => {
      let config: { kind?: string; branches?: Array<{ id: string; label: string }> } = {};
      try {
        config = JSON.parse(s.config || "{}");
      } catch { }

      const isBranch = config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2;
      const branches = isBranch ? config.branches! : [];
      const branchA = branches[0];
      const branchB = branches[1];

      if (isBranch && branches.length >= 2) {
        const branchId = `node_branch_${s.id}`;

        // Calculate the max inner steps across all branches to align all BranchEnd nodes at the same Y.
        const H_INNER = 72; // inner steps do not render the bottom "Add step" button, so they are 40px shorter
        const maxInner = Math.max(0, ...branches.map((b: any) => (b.steps ?? []).length));
        const dynamicPathToEndGapY = branchToPathGapY + H_P + maxInner * (H_INNER + SEG) + SEG;
        const dynamicBlockAdvance = dynamicPathToEndGapY + H_E + 2 * BRANCH_SEG;

        // Central branch node
        nodes.push({
          id: branchId,
          type: "branchNode",
          position: { x: baseX, y: currentY },
          data: {
            kind: "step",
            title: "Branch",
            stepId: s.id,
            viewMode,
            onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
            onAddStep: () => openToolStepSidebar({ insertIndex: idx + 1 }),
            onDelete: () => deleteStep(s.id),
            onCopySnippet: () => {
              // Copy to clipboard or trigger toast
              navigator.clipboard.writeText(`agent.run_step("${s.varName}")`);
              toast({ title: "Copied Python Snippet", description: "The snippet has been copied to your clipboard." });
            },
            onRunStep: () => runCompositeTool({ startStepId: s.id }),
          },
        });

        // Render each branch column (path node, inner steps, end node)
        branches.forEach((branch: any, bIdx: number) => {
          // Spread columns symmetrically: col 0→ leftmost, last→ rightmost
          const totalCols = branches.length;
          const colOffset = (bIdx - (totalCols - 1) / 2) * branchOffsetX;
          const pathNodeId = `node_branch_${s.id}_${branch.id}`;
          const endNodeId = `node_branch_${s.id}_${branch.id}_end`;

          nodes.push({
            id: pathNodeId,
            type: "branchPathNode",
            position: { x: baseX + colOffset, y: currentY + branchToPathGapY },
            data: {
              kind: "step",
              title: branch.label,
              stepId: s.id,
              branchLabel: branch.label,
              viewMode,
              onOpen: () => { setSelectedNode("branch_path"); setSelectedStepId(s.id); setSelectedSubBranchId(branch.id); setActivePanelTab("configure"); },
              onDeleteBranch: () => deleteBranchLogic(s.id, branch.id),
              onUpdateBranchLabel: (newLabel) => updateBranchLabel(s.id, branch.id, newLabel),
            },
          });

          // Inner steps inside this branch
          (branch.steps ?? []).forEach((inner: any, iIdx: number) => {
            const innerNodeId = `node_branch_${s.id}_${branch.id}_inner_${iIdx}`;
            nodes.push({
              id: innerNodeId,
              type: "stepNode",
              position: { x: baseX + colOffset, y: currentY + branchToPathGapY + H_P + SEG + iIdx * (H_INNER + SEG) },
              data: {
                kind: "step",
                title: inner.name || "Untitled",
                subtitle: inner.type,
                stepId: s.id,
                stepIndex: iIdx,
                viewMode,
                onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
              },
            });
          });

          nodes.push({
            id: endNodeId,
            type: "branchEndNode",
            position: { x: baseX + colOffset, y: currentY + dynamicPathToEndGapY },
            data: { kind: "step", title: `${branch.label} end`, stepId: s.id, branchLabel: `${branch.label} end`, viewMode, onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); } },
          });
        });

        currentY += dynamicBlockAdvance;
      } else {
        nodes.push({
          id: `node_step_${s.id}`,
          type: "stepNode",
          position: { x: baseX, y: currentY },
          data: {
            kind: "step",
            title: s.name || "Untitled step",
            subtitle: s.type,
            stepId: s.id,
            stepIndex: idx,
            varName: s.varName,
            viewMode,
            onOpen: () => { setSelectedNode("step"); setSelectedStepId(s.id); setActivePanelTab("configure"); },
            onAddStep: () => openToolStepSidebar({ insertIndex: idx + 1 }),
            onRunStep: () => runCompositeTool({ startStepId: s.id }),
          },
        });
        currentY += stepAdvance;
      }
    });

    nodes.push({
      id: "node_outputs",
      type: "outputsNode",
      position: { x: baseX, y: currentY },
      data: {
        kind: "outputs",
        title: "Outputs",
        subtitle: "What you or your agent will get back when this tool runs",
        viewMode,
        onOpen: () => {
          setSelectedNode("outputs");
          setActivePanelTab("outputs");
        },
      },
    });

    return nodes;
  }, [steps, viewMode, openToolStepSidebar]);

  const computedEdges = React.useMemo<Edge[]>(() => {
    const edges: Edge[] = [];
    const connect = (
      source: string,
      target: string,
      onPlus: () => void = () => openToolStepSidebar(),
      sourceHandle?: string,
      targetHandle?: string,
    ) => {
      edges.push({
        id: `edge_${source}_${target}${sourceHandle ? `_${sourceHandle}` : ""}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: "plusEdge",
        data: { onPlus },
      });
    };

    if (steps.length === 0) {
      connect("node_inputs", "node_steps_empty");
      return edges;
    }

    const getFirstNodeId = (idx: number) => {
      const s = steps[idx];
      let config: { kind?: string; branches?: Array<{ id: string }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && (config.branches?.length ?? 0) >= 2) return `node_branch_${s.id}`;
      return `node_step_${s.id}`;
    };

    const getLastNodeIds = (idx: number): string[] => {
      const s = steps[idx];
      let config: { kind?: string; branches?: Array<{ id: string }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2) {
        return config.branches.map((b) => `node_branch_${s.id}_${b.id}_end`);
      }
      return [`node_step_${s.id}`];
    };

    // Main flow: Inputs → first step, step → step, last step → Outputs
    connect("node_inputs", getFirstNodeId(0), () => openToolStepSidebar({ insertIndex: 0 }));
    for (let i = 0; i < steps.length - 1; i++) {
      const lastIds = getLastNodeIds(i);
      const nextFirst = getFirstNodeId(i + 1);
      for (const lastId of lastIds) {
        connect(lastId, nextFirst, () => openToolStepSidebar({ insertIndex: i + 1 }));
      }
    }
    const lastIds = getLastNodeIds(steps.length - 1);
    for (const lastId of lastIds) {
      connect(lastId, "node_outputs", () => openToolStepSidebar({ insertIndex: steps.length }));
    }

    // Branch-internal edges with context-sensitive onPlus
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      let config: { kind?: string; branches?: Array<{ id: string; label: string; steps?: any[] }> } = {};
      try { config = JSON.parse(s.config || "{}"); } catch { }
      if (config.kind === "BRANCH" && Array.isArray(config.branches) && config.branches.length >= 2) {
        const branchNodeId = `node_branch_${s.id}`;

        config.branches.forEach((branch) => {
          const pathNodeId = `node_branch_${s.id}_${branch.id}`;
          const endNodeId = `node_branch_${s.id}_${branch.id}_end`;
          const innerSteps = branch.steps ?? [];

          // Branch → BranchPath: clicking plus adds a new branch column
          connect(branchNodeId, pathNodeId, () => addBranchColumn(s.id));

          if (innerSteps.length === 0) {
            // No inner steps: BranchPath → BranchEnd, clicking adds an inner step
            connect(pathNodeId, endNodeId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
          } else {
            // BranchPath → first inner step
            const firstInnerId = `node_branch_${s.id}_${branch.id}_inner_0`;
            connect(pathNodeId, firstInnerId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: 0 }));
            // Inner step → inner step
            for (let j = 0; j < innerSteps.length - 1; j++) {
              const fromId = `node_branch_${s.id}_${branch.id}_inner_${j}`;
              const toId = `node_branch_${s.id}_${branch.id}_inner_${j + 1}`;
              connect(fromId, toId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: j + 1 }));
            }
            // Last inner step → BranchEnd
            const lastInnerId = `node_branch_${s.id}_${branch.id}_inner_${innerSteps.length - 1}`;
            connect(lastInnerId, endNodeId, () => openToolStepSidebar({ branchStepId: s.id, branchId: branch.id, insertIndex: innerSteps.length }));
          }
        });
      }
    }

    return edges;
  }, [steps, openToolStepSidebar, addBranchColumn]);

  function ToolFlowCanvas() {
    const rf = useReactFlow();

    // Fit once on mount instead of on every resize, so navigator zoom
    // stays in place when popovers or layout change.
    React.useEffect(() => {
      rf.fitView({ padding: 0.5, duration: 0 });
    }, [rf]);

    const navigatorItems = React.useMemo(() => {
      const items: Array<{ id: string; label: string }> = [
        { id: "node_inputs", label: "Inputs" },
        ...(steps.length === 0
          ? [{ id: "node_steps_empty", label: "Steps" }]
          : steps.flatMap((s) => {
            let config: { kind?: string; branches?: Array<{ label: string }> } = {};
            try {
              config = JSON.parse(s.config || "{}");
            } catch { }
            if (config.kind === "BRANCH" && config.branches?.length >= 2) {
              return [
                { id: `node_branch_${s.id}`, label: "Branch" },
                { id: `node_branch_${s.id}_a`, label: config.branches![0]?.label ?? "Branch A" },
                { id: `node_branch_${s.id}_b`, label: config.branches![1]?.label ?? "Branch B" },
              ];
            }
            return [{ id: `node_step_${s.id}`, label: s.name || "Untitled step" }];
          })),
        ...(steps.length === 0 ? [] : [{ id: "node_outputs", label: "Output" }]),
      ];
      const q = navigatorQuery.trim().toLowerCase();
      if (!q) return items;
      return items.filter((i) => i.label.toLowerCase().includes(q));
    }, [steps, navigatorQuery]);

    const focusNode = (nodeId: string) => {
      const node = computedNodes.find((n) => n.id === nodeId);
      if (!node) return;
      // Close navigator immediately so layout is stable,
      // then fit the view in the next frame so it sticks.
      setNavigatorOpen(false);
      requestAnimationFrame(() => {
        rf.fitView({ nodes: [node], padding: 0.5, duration: 450 });
      });
      // Also set selection state
      if (nodeId === "node_inputs") {
        setSelectedNode("inputs");
        setActivePanelTab("configure");
      } else if (nodeId === "node_steps_empty") {
        setSelectedNode("step");
        setSelectedStepId(null);
        setActivePanelTab("configure");
      } else if (nodeId === "node_outputs") {
        setSelectedNode("outputs");
        setActivePanelTab("outputs");
      } else if (nodeId.startsWith("node_step_")) {
        const stepId = nodeId.replace("node_step_", "");
        setSelectedNode("step");
        setSelectedStepId(stepId);
        setActivePanelTab("configure");
      } else if (nodeId.startsWith("node_branch_")) {
        const stepId = nodeId.replace("node_branch_", "").replace(/_a$|_b$|_a_end$|_b_end$/, "");
        setSelectedNode("step");
        setSelectedStepId(stepId);
        setActivePanelTab("configure");
      }
    };

    return (
      <div className="h-full w-full">
        <ReactFlow
          nodes={computedNodes}
          edges={computedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ markerEnd: MarkerType.ArrowClosed as any }}
          fitView={false}
          nodeOrigin={[0.5, 0]}
          className="bg-[#fafafa]"
          onNodeClick={(_, node) => {
            setSidebarOpen(true);
            setToolStepSidebarOpen(false);
            setSystemToolsListOpen(false);
            setInputSidebarOpen(false);
            setSelectedInputField(null);
            (node.data as any)?.onOpen?.();
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#64748b" className="opacity-10" />

          {/* Flow/Notebook toggle and Navigator (like Relevance) */}
          <Panel position="top-left" className="m-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-1 flex items-center gap-1">
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md",
                    viewMode === "flow" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
                  )}
                  onClick={() => setViewMode("flow")}
                >
                  Flow
                </button>
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md",
                    viewMode === "notebook" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
                  )}
                  onClick={() => setViewMode("notebook")}
                >
                  Notebook
                </button>
              </div>

              <Popover open={navigatorOpen} onOpenChange={setNavigatorOpen}>
                <PopoverTrigger asChild>
                  <button className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    Navigator
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={8} className="w-72 p-3">
                  <div className="text-sm font-semibold text-zinc-900 mb-2">Navigator</div>
                  <Input
                    value={navigatorQuery}
                    onChange={(e) => setNavigatorQuery(e.target.value)}
                    placeholder="Search tool contents..."
                    className="h-8 text-xs"
                  />
                  <div className="mt-2 space-y-1 max-h-64 overflow-auto">
                    {navigatorItems.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => focusNode(i.id)}
                        className="w-full text-left rounded-md px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </Panel>

          {/* Zoom controls + fit (bottom-left) */}
          <Panel position="bottom-left" className="m-4">
            <div className="flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => rf.zoomIn({ duration: 200 })}
                aria-label="Zoom in"
              >
                <span className="text-base leading-none">+</span>
              </button>
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center border-t border-b border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => rf.zoomOut({ duration: 200 })}
                aria-label="Zoom out"
              >
                <span className="text-base leading-none">−</span>
              </button>
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => rf.fitView({ padding: 0.4, duration: 250 })}
                aria-label="Fit to screen"
              >
                <span className="text-[13px] leading-none">▢</span>
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Top bar – match Workforce canvas layout */}
      <div className="border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between bg-white">
        {/* Left: lock + link + icon + name + status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 text-zinc-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <Link2 className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-100 text-[13px] font-semibold text-zinc-800">
              {toolIcon || "T"}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Workflow Tool"
              className="h-7 text-sm font-semibold border-none px-0 shadow-none focus-visible:ring-0 max-w-xs"
            />
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
              Unsaved
            </span>
          </div>
        </div>

        {/* Center: Build / Run toggle */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
                activeTopTab === "build"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
              onClick={() => setActiveTopTab("build")}
            >
              <Hammer className="h-3.5 w-3.5" />
              <span>Build</span>
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
                activeTopTab === "run"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
              onClick={() => setActiveTopTab("run")}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Right: Share / Run tool / Save changes / Publish / more */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>

          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={isRunningTool}
            onClick={() => runCompositeTool()}
          >
            <Play className="h-3 w-3 mr-1.5" />
            {isRunningTool ? "Running…" : "Run tool"}
          </Button>

          <Button
            onClick={upsert}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : "Save changes"}
          </Button>

          <Button
            type="button"
            className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() =>
              toast({
                title: "Publish",
                description: "Publishing flow isn’t wired yet—UI parity first.",
              })
            }
          >
            Publish
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-200 text-zinc-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Edit agent prompt</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Clone</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Copy link</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Export</DropdownMenuItem>
              <div className="my-1 border-t border-zinc-100" />
              <DropdownMenuItem className="text-xs">Report bug</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Help</DropdownMenuItem>
              <div className="my-1 border-t border-zinc-100" />
              <DropdownMenuItem className="text-xs text-red-600 focus:text-red-700">
                Delete tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 overflow-hidden bg-zinc-50 relative">
          <ReactFlowProvider>
            <ToolFlowCanvas />
          </ReactFlowProvider>
        </div>

        {/* Right sidebar (single, switches content) */}
        {sidebarOpen ? (
          <div
            className="border-l border-zinc-200 bg-white overflow-hidden flex flex-col relative"
            style={{ width: sidebarWidth }}
          >
            {/* Resizer */}
            <div
              className={cn(
                "absolute left-0 top-0 h-full w-1 cursor-col-resize z-50",
                isResizingSidebar ? "bg-indigo-200/60" : "hover:bg-indigo-200/40"
              )}
              onMouseDown={() => setIsResizingSidebar(true)}
            />
            <div className="px-4 py-3 border-b border-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  {systemToolsListOpen ? (
                    <button
                      type="button"
                      onClick={() => setSystemToolsListOpen(false)}
                      className="h-8 w-8 rounded-md hover:bg-zinc-100 text-zinc-600 shrink-0 flex items-center justify-center"
                      aria-label="Back to tool steps"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-900">
                      {systemToolsListOpen
                        ? "System Tools"
                        : inputSidebarOpen
                          ? "Configure Input"
                          : toolStepSidebarOpen
                            ? "Select a Tool Step"
                            : selectedNode === "inputs"
                              ? "Inputs"
                              : selectedNode === "outputs"
                                ? "Outputs"
                                : selectedNode === "branch_path"
                                  ? (
                                    (() => {
                                      const step = steps.find(s => s.id === selectedStepId);
                                      let cfg: any = {};
                                      try { cfg = JSON.parse(step?.config || "{}"); } catch { }
                                      const branch = (cfg.branches || []).find((b: any) => b.id === selectedSubBranchId);
                                      return (branch?.label || "Branch") + " Configuration";
                                    })()
                                  )
                                  : "Step"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {systemToolsListOpen
                        ? "Browse all registered system tools."
                        : inputSidebarOpen
                          ? "Set how this input gets its value."
                          : toolStepSidebarOpen
                            ? "Choose from Popular Tool Steps or System tools."
                            : selectedNode === "inputs"
                              ? "Configure required values and how they are filled."
                              : selectedNode === "outputs"
                                ? "Configure what this tool returns."
                                : selectedNode === "branch_path"
                                  ? "Define branch execution conditions."
                                  : "Configure the selected tool step."}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setToolStepSidebarOpen(false);
                    setSystemToolsListOpen(false);
                    setInputSidebarOpen(false);
                    setSelectedInputField(null);
                  }}
                  className="h-8 w-8 rounded-md hover:bg-zinc-50 text-zinc-500 shrink-0"
                  aria-label="Close sidebar"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-zinc-200">
              {toolStepSidebarOpen || systemToolsListOpen || inputSidebarOpen || selectedNode === "branch_path" ? null : selectedNode === "inputs" ? (
                <div className="text-xs font-semibold text-zinc-700">Configure</div>
              ) : (
                <Tabs value={activePanelTab} onValueChange={(v) => setActivePanelTab(v as any)} className="gap-0">
                  <TabsList className="w-full">
                    <TabsTrigger value="configure" className="text-xs">Configure</TabsTrigger>
                    <TabsTrigger value="outputs" className="text-xs">Outputs</TabsTrigger>
                    <TabsTrigger value="fallback" className="text-xs">Fallback</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <div className="flex-1 overflow-auto px-4 py-4">
              {systemToolsListOpen ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={toolStepSidebarQuery}
                      onChange={(e) => setToolStepSidebarQuery(e.target.value)}
                      placeholder="Search system tools..."
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={isSyncingTools}
                      onClick={syncSystemTools}
                    >
                      {isSyncingTools ? "Syncing…" : "Sync"}
                    </Button>
                  </div>
                  {(systemToolsQuery.data ?? []).length === 0 && !systemToolsQuery.isLoading ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-900">
                      <p className="font-medium">No system tools found</p>
                      <p className="mt-1 text-xs text-amber-800">Run sync to populate from the registry. Ensure the backend is running.</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3" disabled={isSyncingTools} onClick={syncSystemTools}>
                        {isSyncingTools ? "Syncing…" : "Sync system tools"}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {(systemToolsQuery.data ?? [])
                        .filter((t: any) => {
                          const q = toolStepSidebarQuery.trim().toLowerCase();
                          if (!q) return true;
                          return `${t?.name ?? ""} ${t?.displayName ?? ""} ${t?.description ?? ""}`.toLowerCase().includes(q);
                        })
                        .map((t: any) => (
                          <button
                            key={t.id}
                            onClick={() => addSystemToolStep(t)}
                            className="rounded-lg border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-50"
                          >
                            <div className="text-sm font-medium text-zinc-900 truncate">{t.displayName ?? t.name}</div>
                            <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{t.description || "System tool"}</div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ) : inputSidebarOpen && selectedInputField ? (
                <div className="space-y-4">
                  <div className="text-xs text-zinc-500">Configure how this input receives its value.</div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                    Input configuration panel — bind to variables or set defaults.
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setInputSidebarOpen(false); setSelectedInputField(null); }}>
                    Done
                  </Button>
                </div>
              ) : toolStepSidebarOpen ? (
                <div className="space-y-4">
                  <Input
                    value={toolStepSidebarQuery}
                    onChange={(e) => setToolStepSidebarQuery(e.target.value)}
                    placeholder="Search tool steps..."
                    className="h-9"
                  />

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-900">Popular Tool Steps</div>
                    <div className="grid grid-cols-2 gap-2">
                      {STEP_LIBRARY.filter((s) => {
                        const q = toolStepSidebarQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (s.label + " " + s.description).toLowerCase().includes(q);
                      }).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => s.id === "system_tool" ? setSystemToolsListOpen(true) : addStepFromLibrary(s.id)}
                          className="rounded-lg border border-zinc-200 bg-white p-3 text-left hover:bg-zinc-50"
                        >
                          <div className="text-sm font-medium text-zinc-900">{s.label}</div>
                          <div className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{s.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedNode === "branch_path" ? (
                <div className="flex-1 overflow-y-auto w-full pt-1">
                  <Tabs defaultValue="condition" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0">
                      <TabsTrigger
                        value="condition"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 font-semibold text-sm"
                      >
                        Branch Condition
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="condition" className="p-4 w-full">
                      {(() => {
                        const step = steps.find((s) => s.id === selectedStepId);
                        if (!step || !selectedSubBranchId) {
                          return null;
                        }

                        let cfg: any = {};
                        try {
                          cfg = JSON.parse(step.config || "{}");
                        } catch {
                          cfg = {};
                        }
                        const branches: any[] = Array.isArray(cfg.branches) ? cfg.branches : [];
                        const branchIdx = branches.findIndex((b) => b.id === selectedSubBranchId);
                        const activeBranch = branchIdx >= 0 ? branches[branchIdx] : {};

                        const assessmentMode: "rules" | "code" | "ai" | "fallback" =
                          activeBranch.assessmentMode ?? "rules";
                        const otherHasFallback = branches.some(
                          (b, i) => i !== branchIdx && b.assessmentMode === "fallback",
                        );

                        const group: BranchConditionGroup =
                          activeBranch.conditionGroup ?? {
                            matchMode: "all",
                            rules: [],
                          };

                        // Build variable tree: inputs + previous steps before this branch
                        const stepIndex = steps.findIndex((s) => s.id === step.id);
                        const varTree: VarTreeEntry[] = [];

                        if (inputs.length > 0) {
                          varTree.push({
                            nodeId: "inputs",
                            nodeName: "Inputs",
                            nodeType: "inputs",
                            sections: [
                              {
                                id: "inputs",
                                label: "Input fields",
                                leaves: inputs.map((inp) => ({
                                  value: `inputs.${inp.name}`,
                                  label: inp.name,
                                  field: inp.name,
                                  type:
                                    inp.type === "number"
                                      ? "Number"
                                      : inp.type === "object"
                                      ? "Object"
                                      : "String",
                                })),
                              },
                            ],
                          });
                        }

                        if (stepIndex > 0) {
                          const prevSteps = steps.slice(0, stepIndex);
                          prevSteps.forEach((ps) => {
                            const identifier = ps.varName || ps.name || ps.id;
                            varTree.push({
                              nodeId: ps.id,
                              nodeName: ps.name || "Previous step",
                              nodeType: "tool",
                              sections: [
                                {
                                  id: "outputs",
                                  label: "Outputs",
                                  leaves: [
                                    {
                                      value: `steps.${identifier}`,
                                      label: identifier,
                                      field: identifier,
                                      type: "Any",
                                    },
                                  ],
                                },
                              ],
                            });
                          });
                        }

                        const updateBranch = (updater: (b: any) => any) => {
                          setSteps((prev) =>
                            prev.map((s) => {
                              if (s.id !== step.id) return s;
                              let currentCfg: any = {};
                              try {
                                currentCfg = JSON.parse(s.config || "{}");
                              } catch {
                                currentCfg = {};
                              }
                              const currentBranches: any[] = Array.isArray(currentCfg.branches)
                                ? currentCfg.branches
                                : [];
                              const nextBranches = currentBranches.map((b) =>
                                b.id === selectedSubBranchId ? updater(b) : b,
                              );
                              return {
                                ...s,
                                config: JSON.stringify(
                                  { ...currentCfg, branches: nextBranches },
                                  null,
                                  2,
                                ),
                              };
                            }),
                          );
                        };

                        const handleAssessmentChange = (val: string) => {
                          updateBranch((b) => ({ ...b, assessmentMode: val }));
                        };

                        const handleMatchChange = (val: "all" | "any") => {
                          updateBranch((b) => ({
                            ...b,
                            conditionGroup: { ...(b.conditionGroup ?? group), matchMode: val },
                          }));
                        };

                        const handleRuleUpdate = (
                          id: string,
                          patch: Partial<BranchConditionRule>,
                        ) => {
                          updateBranch((b) => {
                            const existing: BranchConditionGroup =
                              b.conditionGroup ?? group;
                            const rules = (existing.rules ?? []).map((r: BranchConditionRule) =>
                              r.id === id ? { ...r, ...patch } : r,
                            );
                            return {
                              ...b,
                              conditionGroup: { ...existing, rules },
                            };
                          });
                        };

                        const handleRuleRemove = (id: string) => {
                          updateBranch((b) => {
                            const existing: BranchConditionGroup =
                              b.conditionGroup ?? group;
                            const rules = (existing.rules ?? []).filter(
                              (r: BranchConditionRule) => r.id !== id,
                            );
                            return {
                              ...b,
                              conditionGroup: { ...existing, rules },
                            };
                          });
                        };

                        const handleAddCondition = () => {
                          const newRule: BranchConditionRule = {
                            id: crypto.randomUUID(),
                            leftVariable: "",
                            leftLabel: "",
                            operator: "equals",
                            rightValue: "",
                            rightLabel: "",
                          };
                          updateBranch((b) => {
                            const existing: BranchConditionGroup =
                              b.conditionGroup ?? group;
                            const rules = [...(existing.rules ?? []), newRule];
                            return {
                              ...b,
                              conditionGroup: { ...existing, rules },
                            };
                          });
                        };

                        return (
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm font-semibold mb-2">
                                Assessment mode
                              </div>
                              <Select
                                value={assessmentMode}
                                onValueChange={handleAssessmentChange}
                              >
                                <SelectTrigger className="w-[260px] h-[36px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rules">Rules</SelectItem>
                                  <SelectItem value="code">Code expression</SelectItem>
                                  <SelectItem value="ai">Let AI decide</SelectItem>
                                  {(!otherHasFallback ||
                                    assessmentMode === "fallback") && (
                                    <SelectItem value="fallback">
                                      Fallback (if no other branches run)
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Only show match/conditions when not in fallback mode */}
                            {assessmentMode !== "fallback" && (() => {
                              const effectiveGroup: BranchConditionGroup = {
                                matchMode: group.matchMode,
                                rules: group.rules ?? [],
                              };

                              return (
                                <>
                                  <div className="flex items-center gap-2 mt-6 mb-2">
                                    <span className="text-sm font-medium text-zinc-700">
                                      Match
                                    </span>
                                    <Select
                                      value={effectiveGroup.matchMode}
                                      onValueChange={(val) =>
                                        handleMatchChange(val as "all" | "any")
                                      }
                                    >
                                      <SelectTrigger className="w-[80px] h-[32px] text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="any">Any</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <span className="text-sm font-medium text-zinc-700">
                                      conditions in this group
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {effectiveGroup.rules.length === 0 ? (
                                      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-xs text-zinc-500">
                                        No conditions yet. Add one below to control when this
                                        branch should run.
                                      </div>
                                    ) : (
                                      effectiveGroup.rules.map((rule) => (
                                        <BranchConditionRuleRow
                                          key={rule.id}
                                          rule={rule}
                                          varTree={varTree}
                                          onUpdate={(patch) =>
                                            handleRuleUpdate(rule.id, patch)
                                          }
                                          onRemove={() => handleRuleRemove(rule.id)}
                                        />
                                      ))
                                    )}
                                  </div>

                                  <div className="pt-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleAddCondition}
                                      className="text-zinc-600 hover:text-zinc-900 border border-transparent hover:bg-zinc-100 flex items-center h-8 font-medium"
                                    >
                                      <Plus className="h-4 w-4 mr-1.5" /> Add condition
                                    </Button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <>
                  {/* Configure */}
                  {activePanelTab === "configure" && (
                    <div className="space-y-4">
                      {/* Missing required banner */}
                      {(() => {
                        const missing = inputs
                          .filter((i) => i.required)
                          .filter((i) => i.fillMode === "manual" ? (i.defaultValue == null || i.defaultValue === "") : true)
                          .map((i) => i.name)
                          .filter(Boolean);
                        if (missing.length === 0) return null;
                        return (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <div className="font-medium">Missing required values for:</div>
                            <ul className="mt-1 list-disc pl-4">
                              {missing.map((m) => (
                                <li key={m}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-zinc-900">Inputs</div>
                          <Select
                            value=""
                            onValueChange={(v) => {
                              addInput(v as InputUiType);
                            }}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue placeholder="More" />
                            </SelectTrigger>
                            <SelectContent>
                              {INPUT_TYPE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => addInput("text")}>
                            Text
                          </Button>
                          <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => addInput("long_text")}>
                            Long text
                          </Button>
                          <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => addInput("number")}>
                            Number
                          </Button>
                          <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => addInput("json")}>
                            JSON
                          </Button>
                          <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => addInput("api_key")}>
                            API key
                          </Button>
                        </div>
                      </div>

                      {/* Manual vs agent groups */}
                      {(["manual", "agent"] as const).map((group) => {
                        const groupInputs = inputs.filter((i) => (i.fillMode ?? "agent") === group);
                        const title = group === "manual" ? "Should be set manually" : "Agent decides how to fill";
                        const subtitle =
                          group === "manual"
                            ? "Values must be provided before the tool can run."
                            : "The agent can fill these from context (you can still add defaults).";
                        if (groupInputs.length === 0) return null;
                        return (
                          <div key={group} className="space-y-2">
                            <div>
                              <div className="text-xs font-semibold text-zinc-900">{title}</div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</div>
                            </div>
                            <div className="space-y-2">
                              {groupInputs.map((field, idx) => {
                                const realIdx = inputs.findIndex((x) => x === field);
                                const uiType = field.uiType ?? inferUiTypeFromProp({ type: field.type });
                                return (
                                  <div key={`${field.name}-${idx}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={field.name}
                                        onChange={(e) =>
                                          setInputs((prev) =>
                                            prev.map((f, i) => (i === realIdx ? { ...f, name: e.target.value } : f))
                                          )
                                        }
                                        placeholder="variable_name"
                                        className="h-8 text-xs"
                                      />
                                      <Select
                                        value={uiType}
                                        onValueChange={(val) => {
                                          const meta = INPUT_TYPE_OPTIONS.find((o) => o.value === val)!;
                                          setInputs((prev) =>
                                            prev.map((f, i) =>
                                              i === realIdx
                                                ? { ...f, uiType: val as any, type: meta.baseType }
                                                : f
                                            )
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-40 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {INPUT_TYPE_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                              {o.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <button
                                        type="button"
                                        onClick={() => setInputs((prev) => prev.filter((_, i) => i !== realIdx))}
                                        className="ml-auto text-zinc-400 hover:text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="text-[11px] text-zinc-500">Required</div>
                                      <Switch
                                        checked={!!field.required}
                                        onCheckedChange={(checked) =>
                                          setInputs((prev) =>
                                            prev.map((f, i) => (i === realIdx ? { ...f, required: checked } : f))
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="mt-2">
                                      <Textarea
                                        value={field.description ?? ""}
                                        onChange={(e) =>
                                          setInputs((prev) =>
                                            prev.map((f, i) => (i === realIdx ? { ...f, description: e.target.value } : f))
                                          )
                                        }
                                        placeholder="Description"
                                        className="min-h-[56px] text-xs"
                                      />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="text-[11px] text-zinc-500">Fill mode</div>
                                      <Select
                                        value={field.fillMode ?? "agent"}
                                        onValueChange={(val) =>
                                          setInputs((prev) =>
                                            prev.map((f, i) => (i === realIdx ? { ...f, fillMode: val as any } : f))
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8 w-40 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="manual">Manual</SelectItem>
                                          <SelectItem value="agent">Agent</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Default value (manual feels like Relevance's "set manually") */}
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-medium text-zinc-700">Default / value</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedInputField({ kind: "tool", fieldIdx: realIdx });
                                            setInputSidebarOpen(true);
                                            setToolStepSidebarOpen(false);
                                            setSystemToolsListOpen(false);
                                            setSidebarOpen(true);
                                          }}
                                          className="h-6 w-6 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 flex items-center justify-center"
                                          title="Configure input"
                                        >
                                          <Settings2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      {uiType === "oauth_account" ? (
                                        <Select
                                          value={(field.defaultValue as string) || ""}
                                          onValueChange={(val) =>
                                            setInputs((prev) =>
                                              prev.map((f, i) => (i === realIdx ? { ...f, defaultValue: val } : f))
                                            )
                                          }
                                        >
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Select connected account..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="demo_oauth_account">Demo connected account</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : uiType === "checkbox" ? (
                                        <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                                          <div className="text-xs text-zinc-700">Default</div>
                                          <Switch
                                            checked={Boolean(field.defaultValue)}
                                            onCheckedChange={(checked) =>
                                              setInputs((prev) =>
                                                prev.map((f, i) => (i === realIdx ? { ...f, defaultValue: checked } : f))
                                              )
                                            }
                                          />
                                        </div>
                                      ) : uiType === "long_text" ? (
                                        <Textarea
                                          value={(field.defaultValue as string) ?? ""}
                                          onChange={(e) =>
                                            setInputs((prev) =>
                                              prev.map((f, i) => (i === realIdx ? { ...f, defaultValue: e.target.value } : f))
                                            )
                                          }
                                          placeholder="Type here..."
                                          className="min-h-[72px] text-xs"
                                        />
                                      ) : (
                                        <Input
                                          value={(field.defaultValue as any) ?? ""}
                                          onChange={(e) =>
                                            setInputs((prev) =>
                                              prev.map((f, i) => (i === realIdx ? { ...f, defaultValue: e.target.value } : f))
                                            )
                                          }
                                          placeholder="Type here..."
                                          className="h-9 text-xs"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Step config editor when a step node is selected */}
                      {selectedStepId && selectedNode === "step" && (
                        <div className="pt-2 border-t border-zinc-200">
                          <div className="text-xs font-semibold text-zinc-900 mb-2">Selected step</div>
                          {(() => {
                            const step = steps.find((s) => s.id === selectedStepId);
                            if (!step) return null;
                            return (
                              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={step.name}
                                    onChange={(e) =>
                                      setSteps((prev) =>
                                        prev.map((s) => (s.id === step.id ? { ...s, name: e.target.value, varName: toVarName(e.target.value) } : s))
                                      )
                                    }
                                    className="h-8 text-xs"
                                  />
                                  <Select
                                    value={step.type}
                                    onValueChange={(val: any) =>
                                      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, type: val } : s)))
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-32 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="LLM">LLM</SelectItem>
                                      <SelectItem value="API">API</SelectItem>
                                      <SelectItem value="SYSTEM_TOOL">System tool</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => openToolStepSidebar()}
                                  >
                                    <Plus className="h-3 w-3 mr-1.5" />
                                    Add step
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-8 text-xs"
                                    disabled={isRunningTool}
                                    onClick={() => runCompositeTool({ startStepId: step.id })}
                                  >
                                    <Play className="h-3 w-3 mr-1.5" />
                                    {isRunningTool ? "Running…" : "Run from here"}
                                  </Button>
                                </div>
                                <div className="mt-2">
                                  <div className="text-[11px] text-zinc-500 mb-1">Step config (JSON)</div>
                                  <Textarea
                                    value={step.config}
                                    onChange={(e) =>
                                      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, config: e.target.value } : s)))
                                    }
                                    className="min-h-[140px] font-mono text-[11px]"
                                    placeholder='{"prompt":"Use {{inputs.text}}..."}'
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outputs */}
                  {activePanelTab === "outputs" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-zinc-900">Outputs</div>
                        <Button variant="outline" className="h-8 text-xs" onClick={addOutput}>
                          <Plus className="h-3 w-3 mr-1.5" />
                          Add output key
                        </Button>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        By default, the tool output is the last step output. Configure outputs to keep only what matters.
                      </div>
                      <div className="space-y-2">
                        {outputs.map((field, idx) => (
                          <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={field.name}
                                onChange={(e) =>
                                  setOutputs((prev) => prev.map((f, i) => (i === idx ? { ...f, name: e.target.value } : f)))
                                }
                                placeholder="output_key"
                                className="h-8 text-xs"
                              />
                              <Select
                                value={field.type}
                                onValueChange={(val: any) =>
                                  setOutputs((prev) => prev.map((f, i) => (i === idx ? { ...f, type: val } : f)))
                                }
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="object">JSON</SelectItem>
                                  <SelectItem value="array">List</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => setOutputs((prev) => prev.filter((_, i) => i !== idx))}
                                className="ml-auto text-zinc-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <Textarea
                              value={field.description ?? ""}
                              onChange={(e) =>
                                setOutputs((prev) => prev.map((f, i) => (i === idx ? { ...f, description: e.target.value } : f)))
                              }
                              placeholder="Description"
                              className="min-h-[48px] text-xs"
                            />
                            <Input
                              value={field.expression ?? ""}
                              onChange={(e) =>
                                setOutputs((prev) => prev.map((f, i) => (i === idx ? { ...f, expression: e.target.value } : f)))
                              }
                              placeholder='Expression e.g. {{steps.llm_1.output.answer}}'
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        ))}
                        {outputs.length === 0 && (
                          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs text-zinc-500">
                            No explicit outputs configured.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback */}
                  {activePanelTab === "fallback" && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-zinc-900">Fallback</div>
                      <div className="text-[11px] text-zinc-500">
                        Relevance uses “Fallback” as the default branch when no other conditions match. We’ll store a fallback message/config here.
                      </div>
                      <Textarea
                        value={((initialTool?.functionSchema as any)?.["x-fallback"] as string) ?? ""}
                        onChange={(e) => {
                          const next = e.target.value;
                          // Store locally in description as we don't keep a separate state; persisted via upsert.
                          (initialTool as any) = {
                            ...(initialTool ?? {}),
                            functionSchema: { ...(initialTool?.functionSchema ?? {}), "x-fallback": next },
                          };
                          toast({ title: "Updated", description: "Fallback text will be saved when you click Save." });
                        }}
                        placeholder="What should happen if nothing matches?"
                        className="min-h-[120px] text-xs"
                      />
                      <div className="text-[11px] text-zinc-500">
                        Next iteration: support Branch/Loop steps and configure per-branch conditions and fallback routing like Relevance.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tool settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-800">
                {toolIcon || "T"}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Icon (emoji or letter)
                </label>
                <Input
                  value={toolIcon}
                  onChange={(e) => setToolIcon(e.target.value.slice(0, 2))}
                  placeholder="e.g. 🧰"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Title
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Workflow Tool"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this tool does…"
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 text-xs"
                onClick={() => setSettingsOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ToolBuilderView;

