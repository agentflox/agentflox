"use client";

import React from "react";
import {
  X,
  Minimize2,
  Maximize2,
  Settings,
  List,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VarTreeEntry, VarLeaf } from "../../types/builder";
import { InlineVarTree, typeIcon, typeFromLabel } from "./nodes/OutputsNode";

export type OutputsDetailModalProps = {
  open: boolean;
  onClose: () => void;
  outputMode: "last_step" | "manual";
  outputs: any[];
  varTree: VarTreeEntry[];
  onSetOutputMode: (mode: "last_step" | "manual") => void;
  onAddOutput: (source: string, sourceLabel: string, name: string, type: string) => void;
  onRemoveOutput: (idx: number) => void;
  runState: any;
  onRunStep: () => void;
};

export function OutputsDetailModal({
  open,
  onClose,
  outputMode,
  outputs,
  varTree,
  onSetOutputMode,
  onAddOutput,
  onRemoveOutput,
  runState,
  onRunStep,
}: OutputsDetailModalProps) {
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const selectedSources = React.useMemo(
    () => new Set(outputs.filter((o) => o.source).map((o) => o.source as string)),
    [outputs]
  );

  const handleToggle = (leaf: VarLeaf, _nodeName: string) => {
    if (selectedSources.has(leaf.value)) {
      const idx = outputs.findIndex((o) => o.source === leaf.value);
      if (idx >= 0) onRemoveOutput(idx);
    } else {
      const name = leaf.field.replace(/[^a-zA-Z0-9_]/g, "_");
      onAddOutput(leaf.value, leaf.label, name, typeFromLabel(leaf.type));
    }
  };

  React.useEffect(() => {
    if (outputMode !== "manual") setShowPicker(false);
  }, [outputMode]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-[900px] max-w-[95vw] h-[600px] max-h-[90vh] bg-zinc-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-zinc-900">
              Outputs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body (similar to OutputNode) */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 w-full max-w-4xl overflow-hidden self-start">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[20px] leading-none shrink-0">📦</span>
                  <span className="text-[15px] font-bold text-zinc-900 truncate">Outputs</span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-zinc-200/80 bg-zinc-100 rounded-[10px] p-1 text-[13px] gap-1">
                    <button
                      type="button"
                      onClick={() => onSetOutputMode("last_step")}
                      className={cn(
                        "px-4 h-[30px] rounded-[8px] font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                        outputMode === "last_step"
                          ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                          : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                      )}
                    >
                      <List className="h-4 w-4" />
                      Last step
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetOutputMode("manual")}
                      className={cn(
                        "px-4 h-[30px] rounded-[8px] font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                        outputMode === "manual"
                          ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                          : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Manual
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[13px] text-zinc-500 mt-2 leading-relaxed">
                What you or your agent will get back when this tool runs
              </p>
            </div>

            <div className="h-px bg-zinc-100" />

            <div className="px-0">
              {outputMode === "last_step" ? (
                <div className="py-12 text-center">
                  {runState?.output ? (
                    <div className="mx-6 rounded-lg bg-zinc-900 p-4 font-mono text-[12px] text-zinc-300 border border-zinc-800 shadow-inner text-left">
                      <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Final Output</span>
                        <span className="text-[10px] text-zinc-600">JSON</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-80 overflow-y-auto text-emerald-200">
                        {typeof runState.output === "string"
                          ? runState.output
                          : JSON.stringify(runState.output, null, 2)}
                      </pre>
                    </div>
                  ) : runState?.status === "running" ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-blue-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span className="text-[14px] font-medium">Executing workflow…</span>
                    </div>
                  ) : (
                    <span
                      className="text-[14px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
                      onClick={onRunStep}
                    >
                      Re-run tool to generate results
                    </span>
                  )}
                </div>
              ) : (
                <div className="pb-6">
                  {outputs.length > 0 && (
                    <div className="px-6 pt-4 space-y-2">
                      {outputs.map((o, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-3 rounded-lg bg-violet-50 border border-violet-200 px-4 py-2.5">
                            {typeIcon(o.type === "string" ? "String" : o.type === "number" ? "Number" : o.type === "boolean" ? "Boolean" : "Any")}
                            <span className="text-[13px] font-mono text-violet-800 font-medium flex-1 truncate">{o.name}</span>
                            {o.source && (
                              <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">{o.source}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveOutput(idx)}
                            className="text-zinc-300 hover:text-red-500 transition-colors p-1.5 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setShowPicker((v) => !v)}
                      className="flex items-center gap-1.5 text-[13.5px] text-zinc-500 hover:text-zinc-700 transition-colors font-medium cursor-pointer"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      Add Output
                    </button>
                  </div>

                  {showPicker && (
                    <div className="px-6 pb-4">
                      <div ref={pickerRef} className="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden max-w-lg">
                        <InlineVarTree
                          varTree={varTree}
                          selectedSources={selectedSources}
                          onToggle={handleToggle}
                        />
                      </div>
                    </div>
                  )}

                  {outputs.length === 0 && !showPicker && (
                    <div className="px-6 py-4 bg-red-50/50 border-y border-red-100">
                      <p className="text-[13px] text-red-500 leading-snug">
                        No output currently configured. Click &ldquo;+ Add Output&rdquo; to select the outputs for this tool.
                      </p>
                    </div>
                  )}
                  
                  <div className="py-6 text-center border-t border-zinc-100 mt-4">
                    {runState?.output ? (
                      <div className="mx-6 rounded-lg bg-zinc-900 p-4 font-mono text-[12px] text-zinc-300 border border-zinc-800 shadow-inner text-left">
                        <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                          <span>Final Output</span>
                          <span className="text-[10px] text-zinc-600">JSON</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-80 overflow-y-auto text-emerald-200">
                          {typeof runState.output === "string"
                            ? runState.output
                            : JSON.stringify(runState.output, null, 2)}
                        </pre>
                      </div>
                    ) : runState?.status === "running" ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-blue-400">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="text-[14px] font-medium">Executing workflow…</span>
                      </div>
                    ) : (
                      <span
                        className="text-[14px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
                        onClick={onRunStep}
                      >
                        Re-run tool to generate results
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
