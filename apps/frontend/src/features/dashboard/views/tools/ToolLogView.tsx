"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Braces } from "lucide-react";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import type { RunRecord, RunLogEntry } from "../../../../entities/tools/hooks/useToolRun";

export type ToolLogViewProps = {
  inputs: BuilderInputField[];
  runHistory: RunRecord[];
  setRunHistory: React.Dispatch<React.SetStateAction<RunRecord[]>>;
  selectedRunId: string | null;
  setSelectedRunId: React.Dispatch<React.SetStateAction<string | null>>;
  runInput: Record<string, string>;
  setRunInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedRun: RunRecord | null;
  isRunningTool: boolean;
  runCompositeTool: () => void;
};

export function ToolLogView({
  inputs,
  runHistory,
  setRunHistory,
  selectedRunId,
  setSelectedRunId,
  runInput,
  setRunInput,
  selectedRun,
  isRunningTool,
  runCompositeTool,
}: ToolLogViewProps) {
  return (
    <div className="flex-1 flex w-full h-full overflow-hidden bg-[#f9f9fb]">
      {/* LEFT: Input form + Live streaming log */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-zinc-200">
        {/* Run input form */}
        <div className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Test Input</div>
              <div className="text-xs text-zinc-400 mt-0.5">Fill in values and run the tool to see results</div>
            </div>
            <Button
              size="sm"
              disabled={isRunningTool}
              onClick={runCompositeTool}
              className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Play className="h-3 w-3" />
              {isRunningTool ? "Running…" : "Run"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {inputs.filter((f) => f.name).map((field) => (
              <div key={field.name} className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-600">
                  {field.name}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  className="h-8 px-2.5 text-xs border border-zinc-200 rounded-md bg-white text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
                  type="text"
                  placeholder={field.description || field.name}
                  value={runInput[field.name] ?? (field.defaultValue !== undefined ? String(field.defaultValue) : "")}
                  onChange={(e) => setRunInput((prev) => ({ ...prev, [field.name!]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Live console area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 font-mono text-[12px] flex flex-col gap-1.5">
          {selectedRun ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Execution Log</div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedRun.status === "running" ? "bg-amber-50 text-amber-600" :
                  selectedRun.status === "success" ? "bg-emerald-50 text-emerald-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                  {selectedRun.status === "running" && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                  {selectedRun.status === "success" && <span>✓</span>}
                  {selectedRun.status === "error" && <span>✗</span>}
                  {selectedRun.status}
                </div>
                {selectedRun.finishedAt && (
                  <div className="text-[10px] text-zinc-400 ml-auto">
                    {((selectedRun.finishedAt - selectedRun.startedAt) / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
              {/* Input summary */}
              {Object.keys(selectedRun.input).length > 0 && (
                <div className="bg-zinc-900 rounded-lg px-4 py-3 mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Input</div>
                  {Object.entries(selectedRun.input).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-[11px]">
                      <span className="text-indigo-400 shrink-0">{k}:</span>
                      <span className="text-zinc-200 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Log entries */}
              {selectedRun.logs.map((log, i) => (
                <div key={i} className={`rounded-lg px-4 py-2.5 flex gap-3 items-start ${log.type === "thinking" ? "bg-zinc-900" :
                  log.type === "error" ? "bg-red-950" :
                    log.type === "complete" ? "bg-emerald-950" :
                      "bg-zinc-800"
                  }`}>
                  <span className={`shrink-0 text-[10px] font-bold uppercase mt-0.5 w-14 ${log.type === "thinking" ? "text-indigo-400" :
                    log.type === "error" ? "text-red-400" :
                      log.type === "complete" ? "text-emerald-400" :
                        "text-blue-400"
                    }`}>{log.type}</span>
                  <pre className="text-zinc-200 text-[11px] whitespace-pre-wrap break-all flex-1 font-mono leading-relaxed">{log.content}</pre>
                  <span className="text-zinc-600 text-[9px] shrink-0 mt-0.5">{new Date(log.ts).toLocaleTimeString()}</span>
                </div>
              ))}
              {selectedRun.status === "running" && (
                <div className="flex items-center gap-2 text-zinc-400 text-[11px] mt-2 animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Streaming…
                </div>
              )}
              {/* Output summary */}
              {selectedRun.output !== undefined && (
                <div className="bg-emerald-950 rounded-lg px-4 py-3 mt-2 border border-emerald-900">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Final Output</div>
                  <pre className="text-emerald-200 text-[11px] whitespace-pre-wrap break-all font-mono leading-relaxed">{typeof selectedRun.output === "string" ? selectedRun.output : JSON.stringify(selectedRun.output, null, 2)}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Play className="h-8 w-8 text-zinc-300" />
              <div className="text-sm font-medium text-zinc-500">No run selected</div>
              <div className="text-xs text-zinc-400">Fill inputs above and click Run to start</div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Run history */}
      <div className="w-[360px] shrink-0 flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-700">Run History</div>
          {runHistory.length > 0 && (
            <button
              type="button"
              className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
              onClick={() => { setRunHistory([]); setSelectedRunId(null); }}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {runHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-2 py-12">
              <Braces className="h-6 w-6" />
              <div className="text-xs text-zinc-400">No runs yet</div>
            </div>
          ) : (
            runHistory.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedRunId(run.id)}
                className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${selectedRunId === run.id ? "bg-indigo-50 border-l-2 border-indigo-500" : "border-l-2 border-transparent"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${run.status === "running" ? "bg-amber-50 text-amber-600" :
                    run.status === "success" ? "bg-emerald-50 text-emerald-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                    {run.status === "running" && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                    {run.status === "success" && "✓"}
                    {run.status === "error" && "✗"}
                    {run.status}
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {Object.keys(run.input).length > 0
                    ? Object.entries(run.input).map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`).join(", ")
                    : "No input"}
                </div>
                {run.error && (
                  <div className="text-[11px] text-red-500 mt-1 truncate">{run.error}</div>
                )}
                {run.finishedAt && (
                  <div className="text-[10px] text-zinc-400 mt-1">
                    {((run.finishedAt - run.startedAt) / 1000).toFixed(2)}s · {run.logs.length} events
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
