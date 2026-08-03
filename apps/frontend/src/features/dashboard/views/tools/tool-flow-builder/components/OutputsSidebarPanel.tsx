"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { InlineVarTree, typeIcon, typeFromLabel } from "@/entities/tools/components/builder/nodes/OutputsNode";
import type { BuilderOutputField, OutputMode, VarTreeEntry } from "@/entities/tools/types/builder";

export type OutputsSidebarPanelProps = {
  outputMode: OutputMode;
  outputs: BuilderOutputField[];
  buildVarTree: (beforeStepIndex: number) => VarTreeEntry[];
  stepsLength: number;
  removeOutput: (idx: number) => void;
  addOutputFromSource: (source: string, sourceLabel: string, name: string, type: string) => void;
  runCompositeTool: () => void;
};

export function OutputsSidebarPanel({
  outputMode,
  outputs,
  buildVarTree,
  stepsLength,
  removeOutput,
  addOutputFromSource,
  runCompositeTool,
}: OutputsSidebarPanelProps) {
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const varTree = buildVarTree(stepsLength);
  const selectedSources = React.useMemo(
    () => new Set(outputs.filter((o) => o.source).map((o) => o.source as string)),
    []
  );

  React.useEffect(() => {
    if (outputMode !== "manual") setShowPicker(false);
  }, []);

  React.useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as globalThis.Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showPicker]);

  return (
    <div className="space-y-0 -mx-4 -mt-4">
      {/* Description */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[12px] text-zinc-500 leading-relaxed">
          What you or your agent will get back when this tool runs
        </p>
      </div>

      {/* Body */}
      {outputMode === "last_step" ? (
        <div className="py-10 text-center">
          <span
            className="text-[13px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
            onClick={() => runCompositeTool()}
          >
            Re-run tool to generate results
          </span>
        </div>
      ) : (
        <div>
          {/* Empty state */}
          {outputs.length === 0 && !showPicker && (
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
              <p className="text-[12px] text-red-500 leading-snug">
                No output currently configured. Click &ldquo;+ Add&rdquo; to select the outputs for this tool.
              </p>
            </div>
          )}

          {/* Output list */}
          {outputs.length > 0 && (
            <div className="px-4 pt-3 space-y-1.5">
              {outputs.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-1.5 shadow-sm">
                    {typeIcon(
                      field.type === "string" ? "String"
                        : field.type === "number" ? "Number"
                          : field.type === "boolean" ? "Boolean"
                            : field.type === "object" ? "Object" : "Any"
                    )}
                    <span className="text-[12px] font-mono text-violet-800 font-medium flex-1 truncate">{field.name}</span>
                    {field.source && (
                      <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">{field.source}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOutput(idx)}
                    className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1 text-[12.5px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add
            </button>
          </div>

          {/* Picker */}
          {showPicker && (
            <div className="px-4 pb-3">
              <div ref={pickerRef} className="border border-zinc-200 rounded-lg bg-white shadow-sm overflow-hidden">
                <InlineVarTree
                  varTree={varTree}
                  selectedSources={selectedSources}
                  onToggle={(leaf) => {
                    const isSelected = outputs.some((o) => o.source === leaf.value);
                    if (isSelected) {
                      const idx = outputs.findIndex((o) => o.source === leaf.value);
                      if (idx >= 0) removeOutput(idx);
                    } else {
                      const name = leaf.field.replace(/[^a-zA-Z0-9_]/g, "_");
                      addOutputFromSource(leaf.value, leaf.label, name, typeFromLabel(leaf.type));
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Run footer */}
          <div className="py-6 text-center border-t border-zinc-100">
            <span
              className="text-[13px] font-medium text-[#7c9fd4] hover:text-[#5b85bd] cursor-pointer transition-colors"
              onClick={() => runCompositeTool()}
            >
              Re-run tool to generate results
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
