"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  CheckCircle,
  RefreshCw,
  Settings,
  Settings2,
  Minimize2,
  Maximize2,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  Hash,
  Type,
  ToggleLeft,
  List,
  Braces,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData, VarTreeEntry, VarLeaf } from "../../../types/builder";
import { NodeHoverToolbar } from "./NodeHoverToolbar";
import { LuPackageCheck } from "react-icons/lu";

/* ─── type helpers ─────────────────────────────────────────────── */
export const TYPE_ICONS: Record<string, React.ReactNode> = {
  String:  <Type       className="h-3.5 w-3.5 text-blue-500"   />,
  Number:  <Hash       className="h-3.5 w-3.5 text-amber-500"  />,
  Boolean: <ToggleLeft className="h-3.5 w-3.5 text-purple-500" />,
  Object:  <Braces     className="h-3.5 w-3.5 text-zinc-500"   />,
  Array:   <List       className="h-3.5 w-3.5 text-zinc-500"   />,
  Any:     <Layers     className="h-3.5 w-3.5 text-zinc-400"   />,
};

export function typeIcon(t: string) {
  return TYPE_ICONS[t] ?? TYPE_ICONS.Any;
}

export function typeLabel(t: string) {
  if (t === "Any") return "Any";
  if (t === "Array") return "List of Anys";
  return t;
}

export function typeFromLabel(t: string): "string" | "number" | "boolean" | "object" | "array" {
  const map: Record<string, any> = {
    String: "string", Number: "number", Boolean: "boolean",
    Object: "object", Array: "array", Any: "string",
  };
  return map[t] ?? "string";
}

/* ─── Inline VarTree list ───────────────────────────────────────── */
export function InlineVarTree({
  varTree,
  selectedSources,
  onToggle,
}: {
  varTree: VarTreeEntry[];
  selectedSources: Set<string>;
  onToggle: (leaf: VarLeaf, nodeName: string) => void;
}) {
  const [openNodes, setOpenNodes] = React.useState<Set<string>>(
    () => new Set(varTree.map((n) => n.nodeId))
  );

  const toggleNode = (id: string) =>
    setOpenNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (varTree.length === 0) {
    return (
      <div className="text-[12px] text-zinc-400 italic py-3 px-4">
        No step outputs available yet. Add steps first.
      </div>
    );
  }

  return (
    <div className="nodrag nopan nowheel overflow-y-auto" style={{ maxHeight: 320 }}>
      {varTree.map((entry) => {
        const leaves = entry.sections.flatMap((s) => s.leaves);
        const isOpen = openNodes.has(entry.nodeId);
        return (
          <div key={entry.nodeId}>
            {/* section header */}
            <button
              type="button"
              onClick={() => toggleNode(entry.nodeId)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-zinc-50 transition-colors"
            >
              {isOpen
                ? <ChevronDown  className="h-3 w-3 text-zinc-400 shrink-0" />
                : <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />}
              {/* node type icon */}
              {entry.nodeType === "inputs" ? (
                <span className="text-[13px] leading-none shrink-0">🎤</span>
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded shrink-0 bg-violet-100 text-violet-600 text-[10px] font-bold">
                  T
                </span>
              )}
              <span className="text-[12px] font-semibold text-zinc-700 flex-1 truncate">
                {entry.nodeName}
              </span>
            </button>

            {/* leaves */}
            {isOpen && leaves.map((leaf) => {
              const isSelected = selectedSources.has(leaf.value);
              return (
                <button
                  key={leaf.value}
                  type="button"
                  onClick={() => onToggle(leaf, entry.nodeName)}
                  className={cn(
                    "w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-left transition-colors",
                    isSelected ? "bg-violet-50 hover:bg-violet-100" : "hover:bg-zinc-50"
                  )}
                >
                  {/* type icon */}
                  <span className="shrink-0">
                    {isSelected
                      ? <CheckCircle className="h-3.5 w-3.5 text-violet-500" />
                      : typeIcon(leaf.type)
                    }
                  </span>
                  <span className={cn(
                    "text-[12px] flex-1 truncate",
                    isSelected ? "text-violet-700 font-semibold" : "text-zinc-700"
                  )}>
                    {leaf.field}
                  </span>
                  <span className="text-[11px] text-zinc-400 shrink-0">
                    {typeLabel(leaf.type)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      {/* keyboard hint footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-100 bg-zinc-50 text-[10px] text-zinc-400">
        <span className="flex items-center gap-0.5">
          <ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-white border border-zinc-200 rounded px-1">↵</kbd>Insert
        </span>
        <span className="flex items-center gap-1">
          <kbd className="bg-white border border-zinc-200 rounded px-1">Esc</kbd>Close/Exit
        </span>
      </div>
    </div>
  );
}

/* ─── OutputsNode ──────────────────────────────────────────────── */
export function OutputsNode({ data }: { data: ToolCanvasNodeData }) {
  const isNotebook = data.viewMode === "notebook";
  const isExpanded = isNotebook && !!data.isExpanded;

  const outputMode = data.outputMode ?? "last_step";
  const outputs: any[] = data.outputs ?? [];
  const varTree: VarTreeEntry[] = (data.varTree ?? []) as VarTreeEntry[];

  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const selectedSources = React.useMemo(
    () => new Set(outputs.filter((o) => o.source).map((o) => o.source as string)),
    [outputs]
  );

  const handleToggle = (leaf: VarLeaf, _nodeName: string) => {
    if (selectedSources.has(leaf.value)) {
      const idx = outputs.findIndex((o) => o.source === leaf.value);
      if (idx >= 0) data.onRemoveOutput?.(idx);
    } else {
      const name = leaf.field.replace(/[^a-zA-Z0-9_]/g, "_");
      data.onAddOutput?.(leaf.value, leaf.label, name, typeFromLabel(leaf.type));
    }
  };

  // Close picker when switching away from manual
  React.useEffect(() => {
    if (outputMode !== "manual") setShowPicker(false);
  }, [outputMode]);

  // Close picker when click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  /* ── shared run-result / re-run footer ─────────────────────── */
  const RunFooter = () => (
    <div className="py-6 text-center">
      {data.runState?.output != null ? (
        <div className="mx-4 rounded-lg bg-zinc-900 p-3 font-mono text-[11px] text-zinc-300 border border-zinc-800 shadow-inner text-left">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Final Output</span>
            <span className="text-[9px] text-zinc-600">JSON</span>
          </div>
          <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto text-emerald-200">
            {typeof data.runState.output === "string"
              ? data.runState.output
              : JSON.stringify(data.runState.output, null, 2)}
          </pre>
        </div>
      ) : data.runState?.status === "running" ? (
        <div className="flex flex-col items-center justify-center gap-2 text-blue-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-[13px] font-medium">Executing workflow…</span>
        </div>
      ) : (
        <span
          className="text-[13px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
          onClick={() => data.onRunStep?.()}
        >
          Re-run tool to generate results
        </span>
      )}
    </div>
  );

  /* ─────────────── NOTEBOOK MODE ─────────────────────────────── */
  if (isNotebook) {
    return (
      <div
        className={cn(
          "relative cursor-pointer group bg-white rounded-lg shadow-sm border",
          isExpanded
            ? "border-violet-300"
            : "border-violet-200 hover:border-violet-300 transition-colors"
        )}
        style={{ width: 600 }}
      >
        <NodeHoverToolbar canMoveUp={false} canMoveDown={false} isDisabled={false} />
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
          isConnectable={false}
        />

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            {/* left: icon + title */}
            <div
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <LuPackageCheck className="h-4 w-4" />
              </div>
              <span className="text-[14px] font-bold text-zinc-800 truncate">Outputs</span>
            </div>

            {/* right: expand icon + mode pill */}
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                className="text-zinc-500 hover:text-zinc-700 p-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); data.onOpenModal?.(); }}
                title="Expand to full view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); data.onOpen?.(); }}
                className="text-zinc-500 hover:text-zinc-700 p-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* mode pill */}
              <div className="flex items-center border border-zinc-200/80 bg-zinc-100 rounded-lg p-[3px] text-[11px] gap-0.5">
                <button
                  type="button"
                  onClick={() => data.onSetOutputMode?.("last_step")}
                  className={cn(
                    "px-2.5 h-[24px] rounded-[6px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    outputMode === "last_step"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Last step
                </button>
                <button
                  type="button"
                  onClick={() => data.onSetOutputMode?.("manual")}
                  className={cn(
                    "px-2.5 h-[24px] rounded-[6px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    outputMode === "manual"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <Settings className="h-3 w-3" />
                  Manual
                </button>
              </div>
            </div>
          </div>

          {/* subtitle */}
          <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
            What you or your agent will get back when this tool runs
          </p>
        </div>

        {/* ── Separator ── */}
        <div className="h-px bg-zinc-100" />

        {/* ── Body ── */}
        {isExpanded && (
          <div className="nodrag nopan" onClick={(e) => e.stopPropagation()}>
            {outputMode === "last_step" ? (
              <RunFooter />
            ) : (
              /* ── Manual mode ── */
              <div>
                {/* selected outputs list */}
                {outputs.length > 0 && (
                  <div className="px-4 pt-3 space-y-1.5">
                    {outputs.map((o, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-1.5">
                          {typeIcon(o.type === "string" ? "String" : o.type === "number" ? "Number" : o.type === "boolean" ? "Boolean" : "Any")}
                          <span className="text-[12px] font-mono text-violet-800 font-medium flex-1 truncate">{o.name}</span>
                          {o.source && (
                            <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">{o.source}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => data.onRemoveOutput?.(idx)}
                          className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* + Add button — always after the list */}
                <div className="px-4 py-3">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPicker((v) => !v);
                    }}
                    className="flex items-center gap-1 text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Add
                  </button>
                </div>

                {/* inline picker section/card */}
                {showPicker && (
                  <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                    <div ref={pickerRef} className="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
                      <InlineVarTree
                        varTree={varTree}
                        selectedSources={selectedSources}
                        onToggle={handleToggle}
                      />
                    </div>
                  </div>
                )}

                {/* empty state banner — only when nothing selected */}
                {outputs.length === 0 && !showPicker && (
                  <div className="px-4 py-2.5 bg-red-50 border-y border-red-100">
                    <p className="text-[12px] text-red-500 leading-snug">
                      No output currently configured. Click &ldquo;+ Add&rdquo; to select the outputs for this tool.
                    </p>
                  </div>
                )}

                <RunFooter />
              </div>
            )}
          </div>
        )}

        {/* ── Collapsed preview (when not expanded) ── */}
        {!isExpanded && (
          <div
            className="cursor-pointer py-5 px-4 text-center"
            onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
          >
            {data.runState?.output != null ? (
              <div className="mx-0 rounded-lg bg-zinc-900 p-3 font-mono text-[11px] text-zinc-300 border border-zinc-800 shadow-inner text-left">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Final Output</span>
                  <span className="text-[9px] text-zinc-600">JSON</span>
                </div>
                <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto text-emerald-200">
                  {typeof data.runState.output === "string"
                    ? data.runState.output
                    : JSON.stringify(data.runState.output, null, 2)}
                </pre>
              </div>
            ) : data.runState?.status === "running" ? (
              <div className="flex flex-col items-center justify-center gap-2 text-blue-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-[13px] font-medium">Executing workflow…</span>
              </div>
            ) : outputMode === "manual" ? (
              <span className="text-[13px] text-[#7c9fd4] hover:text-[#5b85bd] transition-colors">
                {outputs.length === 0
                  ? "No output configured. Click to add."
                  : `${outputs.length} output${outputs.length !== 1 ? "s" : ""} configured`}
              </span>
            ) : (
              <span className="text-[13px] text-[#7c9fd4] hover:text-[#5b85bd] transition-colors">
                Re-run tool to generate results
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─────────────── FLOW MODE ─────────────────────────────────── */
  return (
    <div 
      className="relative cursor-pointer group nodrag" 
      style={{ width: 380 }}
      onClick={data.onOpen}
    >
      <NodeHoverToolbar
        canMoveUp={false}
        canMoveDown={false}
        isDisabled={false}
        onMoveUp={undefined}
        onMoveDown={undefined}
        onDuplicate={undefined}
        onToggleDisabled={undefined}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />

      <div className="bg-white rounded-lg shadow-sm border border-violet-200 hover:border-violet-300 transition-colors overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <LuPackageCheck className="h-4 w-4" />
              </div>
              <span className="text-[14px] font-bold text-zinc-800 truncate">Outputs</span>
            </div>
            {/* right: expand icon + mode pill */}
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                className="text-zinc-500 hover:text-zinc-700 p-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); data.onOpenModal?.(); }}
                title="Expand to full view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              {/* mode pill */}
              <div className="flex items-center border border-zinc-200/80 bg-zinc-100 rounded-lg p-[3px] text-[11px] gap-0.5">
                <button
                  type="button"
                  onClick={() => data.onSetOutputMode?.("last_step")}
                  className={cn(
                    "px-2.5 h-[24px] rounded-[6px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    outputMode === "last_step"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Last step
                </button>
                <button
                  type="button"
                  onClick={() => data.onSetOutputMode?.("manual")}
                  className={cn(
                    "px-2.5 h-[24px] rounded-[6px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                    outputMode === "manual"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <Settings className="h-3 w-3" />
                  Manual
                </button>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
            What you or your agent will get back when this tool runs
          </p>
        </div>

        {/* Separator */}
        <div className="h-px bg-zinc-100" />

        {/* Body */}
        {outputMode === "last_step" ? (
          <RunFooter />
        ) : (
          <div>
            {outputs.length === 0 && !showPicker && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
                <p className="text-[12px] text-red-500 leading-snug">
                  No output currently configured. Click &ldquo;+ Add&rdquo; to select the outputs for this tool.
                </p>
              </div>
            )}
            {outputs.length > 0 && (
              <div className="px-4 pt-3 space-y-1.5">
                {outputs.map((o, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-1.5">
                      {typeIcon(o.type === "string" ? "String" : o.type === "number" ? "Number" : o.type === "boolean" ? "Boolean" : "Any")}
                      <span className="text-[12px] font-mono text-violet-800 font-medium flex-1 truncate">{o.name}</span>
                    </div>
                    <button type="button" onClick={() => data.onRemoveOutput?.(idx)} className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 py-2">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v); }}
                className="flex items-center gap-1 text-[12.5px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add
              </button>
            </div>

            {showPicker && (
              <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                <div ref={pickerRef} className="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <InlineVarTree varTree={varTree} selectedSources={selectedSources} onToggle={handleToggle} />
                </div>
              </div>
            )}
            <RunFooter />
          </div>
        )}
      </div>
    </div>
  );
}
