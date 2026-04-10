"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { ChevronRight, MoreVertical, Play, Code, Copy, Repeat, Wrench, SkipForward, StickyNote, Trash2, Plus, Pencil, X, RefreshCw, Maximize2, Minimize2, Settings2, FileCode2, ChevronUp, ChevronDown, Info, Code2, Braces } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData } from "../../../types/builder";
import { VariableSelectionModal } from "../VariableSelectionModal";
import { NodeHoverToolbar } from "./NodeHoverToolbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function StepNode({ data }: { data: ToolCanvasNodeData }) {
  const isNotebook = data.viewMode === "notebook";
  const isExpanded = isNotebook && data.isExpanded;
  const isRunning = data.runState?.status === "running";
  const kind = data.kind || "step";
  const stepType = data.subtitle;
  const isCode = typeof stepType === "string" && (stepType.toLowerCase().includes("code") || stepType.toLowerCase().includes("script"));
  const isApi = typeof stepType === "string" && stepType.toLowerCase().includes("api");

  // Measure actual rendered height and report to layout engine
  const nodeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = nodeRef.current;
    if (!el || !data.onMeasureHeight) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 0) data.onMeasureHeight!(Math.round(h));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [data.onMeasureHeight]);

  const renderExpandedContent = () => {
    const d = data as any;
    const stepConfig = d.stepConfig || {};
    const parsed = stepConfig;
    const kindStr = data.kind || stepType || "step";
    const isJavaScript = typeof kindStr === "string" && kindStr.toUpperCase() === "JAVASCRIPT";

    if (isCode) {
      const codeValue = parsed?.code ?? "";
      return (
        <div className="px-5 pb-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-800">Code</span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="rounded bg-zinc-900 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase">Required</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Code2 className="h-3.5 w-3.5" />
              <Braces className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden nodrag nopan nowheel" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <Textarea
              value={codeValue}
              onChange={(e) => d.onUpdateStepConfig?.({ code: e.target.value })}
              className="min-h-[220px] w-full resize-none font-mono text-[12px] text-zinc-800 bg-zinc-50 border-none focus-visible:ring-0 p-4 leading-6 shadow-inner"
              placeholder={isJavaScript
                ? '// "params" are all the user inputs values\n// "steps" are all the inputs and outputs from previous steps\n\n// IMPORTANT: Include a "return" statement in your code if you want to use the output in following steps.\nreturn {"params": params, "steps": steps};'
                : '# "params" are all the user inputs values\n# "steps" are all the inputs and outputs from previous steps\n\nreturn {"params": params, "steps": steps}'}
            />
          </div>
        </div>
      );
    }

    if (isApi) {
      return (
        <div className="px-5 pb-5 space-y-4 nodrag nopan nowheel" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 pointer-events-none">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">Method</span>
              <span className="rounded bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 font-bold uppercase border border-zinc-200">Required</span>
            </div>
            <Select value={parsed?.method || "GET"} onValueChange={(v) => d.onUpdateStepConfig?.({ method: v })}>
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 pointer-events-none">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">URL</span>
              <span className="rounded bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 font-bold uppercase border border-zinc-200">Required</span>
            </div>
            <Input
              value={parsed?.url || ""}
              onChange={(e) => d.onUpdateStepConfig?.({ url: e.target.value })}
              placeholder="Type '{{' to select variable"
              className="h-10 text-xs bg-white border-zinc-200"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 pointer-events-none">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">Headers</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
            </div>
            <div className="space-y-2">
              {(Array.isArray(parsed?.headers) ? parsed.headers : []).map((h: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={h.key} placeholder="Key" className="h-8 text-xs flex-1" onChange={(e) => {
                    const next = [...(parsed.headers ?? [])];
                    next[idx] = { ...next[idx], key: e.target.value };
                    d.onUpdateStepConfig?.({ headers: next });
                  }} />
                  <Input value={h.value} placeholder="Value" className="h-8 text-xs flex-1" onChange={(e) => {
                    const next = [...(parsed.headers ?? [])];
                    next[idx] = { ...next[idx], value: e.target.value };
                    d.onUpdateStepConfig?.({ headers: next });
                  }} />
                  <button onClick={() => d.onUpdateStepConfig?.({ headers: (parsed.headers ?? []).filter((_: any, i: number) => i !== idx) })} className="text-zinc-300 hover:text-red-500 cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" className="h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4 cursor-pointer hover:bg-zinc-50" onClick={() => d.onUpdateStepConfig?.({ headers: [...(parsed.headers ?? []), { key: "", value: "" }] })}>
                <Plus className="h-4 w-4" /> Add header
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 pointer-events-none">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">Body</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
            </div>
            <Select value={parsed?.bodyType || ""} onValueChange={(v) => d.onUpdateStepConfig?.({ bodyType: v })}>
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                <SelectValue placeholder="Select option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form-data">Form data</SelectItem>
                <SelectItem value="raw">Raw (Plain text)</SelectItem>
              </SelectContent>
            </Select>
            {parsed?.bodyType === "json" && (
              <div className="nodrag nopan nowheel" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <Textarea
                  value={parsed?.body || ""}
                  onChange={(e) => d.onUpdateStepConfig?.({ body: e.target.value })}
                  placeholder='{"key": "value"}'
                  className="h-24 text-xs font-mono bg-zinc-50 border-zinc-200 mt-2 hover:bg-white focus:bg-white transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // System tool configuration
    if (d.systemTool) {
      const params = d.systemTool.functionSchema?.parameters?.properties ?? {};
      const paramEntries = Object.entries(params);

      return (
        <div className="px-5 pb-5">
          {paramEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-center">
              <div className="text-xs font-semibold text-indigo-700 mb-1">No parameters</div>
              <p className="text-[11px] text-indigo-500/80 mb-3">This tool doesn't require any inputs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paramEntries.map(([key, schema]: [string, any]) => {
                const binding = (d.stepConfig?.inputs ?? {})[key] ?? "";
                const label = (d.stepConfig?.inputLabels ?? {})[key] ?? "";

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">{key}</div>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                        {schema.type ?? "any"}
                      </span>
                    </div>
                    {schema.description && (
                      <div className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                        {schema.description}
                      </div>
                    )}
                    <div className="nodrag nopan nowheel" onMouseDown={(e) => e.stopPropagation()}>
                      <VariableSelectionModal
                        value={binding}
                        label={label}
                        varTree={d.varTree || []}
                        placeholder={`Select variable or input ${key}...`}
                        onChange={(val, lbl) => {
                          d.onUpdateStepConfig?.({
                            inputs: { ...(d.stepConfig?.inputs ?? {}), [key]: val },
                            inputLabels: { ...(d.stepConfig?.inputLabels ?? {}), [key]: lbl },
                          });
                        }}
                        onClear={() => {
                          const nextInputs = { ...(d.stepConfig?.inputs ?? {}) };
                          const nextLabels = { ...(d.stepConfig?.inputLabels ?? {}) };
                          delete nextInputs[key];
                          delete nextLabels[key];
                          d.onUpdateStepConfig?.({
                            inputs: nextInputs,
                            inputLabels: nextLabels,
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Default / LLM: show a configure banner with settings shortcut
    return (
      <div className="px-5 pb-5">
        <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-center">
          <div className="text-xs font-semibold text-indigo-700 mb-1">
            {data.subtitle || "Step"} — {data.title}
          </div>
          <p className="text-[11px] text-indigo-500/80 mb-3">
            Open Settings to configure this step's inputs and parameters.
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onOpen?.(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-7 px-3 rounded-md border border-indigo-200 bg-white text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Open Settings
          </button>
        </div>
      </div>
    );
  };

  if (isNotebook) {
    return (
      <div
        ref={nodeRef}
        className={cn(
          "relative cursor-pointer group bg-white rounded-xl shadow-md border-[2px]",
          isExpanded ? "w-[680px] border-indigo-400" : "w-[600px] border-zinc-200 hover:border-indigo-300 transition-colors",
          data.isDisabled || data.isSkipped ? "opacity-60 grayscale" : ""
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!isExpanded) {
            data.onToggleExpand?.();
          }
        }}
      >
        <NodeHoverToolbar canMoveUp={data.canMoveUp} canMoveDown={data.canMoveDown} isDisabled={data.isDisabled} onMoveUp={data.onMoveUp} onMoveDown={data.onMoveDown} onDuplicate={data.onDuplicate} onToggleDisabled={data.onToggleDisabled} />
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group flex-1" onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              {isCode ? <FileCode2 className="h-4 w-4 group-hover:hidden" /> : <Wrench className="h-4 w-4 group-hover:hidden" />}
              {isExpanded ? <ChevronUp className="h-4 w-4 hidden group-hover:block" /> : <ChevronDown className="h-4 w-4 hidden group-hover:block" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-zinc-900">{data.title}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 nodrag nopan rounded-xl border border-zinc-200 shadow-xl bg-white" align="start" sideOffset={8} onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rename Step</label>
                    <Input
                      defaultValue={data.title}
                      className="h-9 text-xs font-medium bg-zinc-50/50 border-zinc-200 hover:border-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:border-indigo-400 transition-all shadow-inner"
                      placeholder="Type a new name..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          data.onUpdateStepName?.(e.currentTarget.value);
                        }
                      }}
                      onBlur={(e) => data.onUpdateStepName?.(e.target.value)}
                    />
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center justify-center p-0.5 rounded border border-zinc-200 bg-zinc-100/50 shadow-sm leading-none font-mono">↵</span>
                      Hit enter to save
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-0.5 border border-zinc-200 bg-zinc-50 rounded-lg p-0.5 shadow-sm" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 z-[9999]" sideOffset={5}>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onRunUpToHere?.(); }} className="text-xs cursor-pointer">
                  <Play className="h-3.5 w-3.5 mr-2" />
                  Run
                </DropdownMenuItem>
                {data.onDuplicate && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onDuplicate?.(); }} className="text-xs cursor-pointer">
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {data.onCopyRunStepSnippet && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onCopyRunStepSnippet?.(); }} className="text-xs cursor-pointer">
                    <Code className="h-3.5 w-3.5 mr-2" />
                    Copy snippet
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onToggleDisabled?.(); }} className="text-xs cursor-pointer">
                  <X className="h-3.5 w-3.5 mr-2" />
                  {data.isDisabled ? "Enable node" : "Disable node"}
                </DropdownMenuItem>
                {data.onToggleSkip && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onToggleSkip?.(); }} className="text-xs cursor-pointer">
                    <SkipForward className="h-3.5 w-3.5 mr-2" />
                    {data.isSkipped ? "Unskip mode" : "Skip mode"}
                  </DropdownMenuItem>
                )}
                {data.onDeleteStep && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onDeleteStep?.(); }} className="text-xs text-red-600 focus:text-red-700 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onOpenModal?.(); }}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onOpen?.(); }}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-zinc-200 mx-1" />
            <button
              className="h-7 px-3 flex items-center justify-center gap-1.5 rounded-md hover:bg-white bg-white shadow-sm border border-zinc-200 text-zinc-700 text-[11px] font-semibold cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onRunStep?.(); }}
              disabled={isRunning}
            >
              {isRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run
            </button>
          </div>
        </div>

        {!isExpanded && (
          <div className="px-5 pb-5 relative cursor-pointer group-hover:bg-zinc-50/30 transition-colors rounded-b-xl" onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}>
            {isApi && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex flex-col gap-1 opacity-50">
                  <span className="font-semibold text-zinc-500">Method <span className="bg-zinc-100 text-zinc-400 px-1 py-0.5 rounded text-[9px]">Required</span></span>
                  <span className="font-mono text-zinc-700">GET</span>
                </div>
              </div>
            )}

            <div className={cn("flex justify-center mt-3", isApi ? "absolute bottom-3 left-0 right-0" : "")}>
              <button className="h-7 px-4 bg-white border border-zinc-200 shadow-sm rounded-md text-xs font-semibold text-zinc-700 pointer-events-auto hover:bg-zinc-50 flex items-center gap-1.5 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Expand
              </button>
            </div>
          </div>
        )}

        {isExpanded && (
          <>
            <div className="nodrag nopan nowheel">
              {renderExpandedContent()}
            </div>
            <div className="px-5 pb-3 pt-2 flex items-center justify-between border-t border-indigo-100/50">
              <div className="flex items-center gap-1.5">
                <span className="text-indigo-400 rotate-90 scale-75">↳</span>
                <span className="bg-indigo-50 text-indigo-500 border border-indigo-100 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  {data.varName || "step"}
                </span>
              </div>
              <div className="text-[10px] font-medium text-zinc-400">
                {data.subtitle}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={nodeRef} className="relative w-[380px] cursor-pointer group">
      <NodeHoverToolbar
        canMoveUp={data.canMoveUp}
        canMoveDown={data.canMoveDown}
        isDisabled={data.isDisabled}
        onMoveUp={data.onMoveUp}
        onMoveDown={data.onMoveDown}
        onDuplicate={data.onDuplicate}
        onToggleDisabled={data.onToggleDisabled}
      />
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
      <div
        className={cn(
          "w-[380px] rounded-xl border border-indigo-200 bg-white shadow-sm hover:shadow-md transition-shadow",
          data.isDisabled || data.isSkipped ? "opacity-60 grayscale" : "",
        )}
      >
        <div className="w-full text-left transition-colors">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
            <div
              className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 relative cursor-pointer"
              onClick={data.onOpenModal ?? data.onOpen}
            >
              <Wrench className="h-4 w-4" />
              {data.runState?.status === "running" && (
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                  <RefreshCw className="h-2 w-2 text-white animate-spin" />
                </div>
              )}
              {data.runState?.status === "success" && (
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                  <div className="h-1.5 w-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span
                  className="text-sm font-semibold text-zinc-900 truncate cursor-pointer"
                  onClick={data.onOpenModal ?? data.onOpen}
                >
                  {data.title}
                </span>
                {data.runState?.status === "running" && (
                  <span className="text-[10px] font-bold text-amber-600 animate-pulse bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Running</span>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4 nodrag nopan rounded-xl border border-zinc-200 shadow-xl bg-white" align="start" sideOffset={8} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rename Step</label>
                      <Input
                        defaultValue={data.title}
                        className="h-9 text-xs font-medium bg-zinc-50/50 border-zinc-200 hover:border-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:border-indigo-400 transition-all shadow-inner"
                        placeholder="Type a new name..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            data.onUpdateStepName?.(e.currentTarget.value);
                          }
                        }}
                        onBlur={(e) => data.onUpdateStepName?.(e.target.value)}
                      />
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center justify-center p-0.5 rounded border border-zinc-200 bg-zinc-100/50 shadow-sm leading-none font-mono">↵</span>
                        Hit enter to save
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center gap-1 nodrag nopan">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
                    aria-label="Node menu"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onRunUpToHere?.(); }}>
                    <Play className="mr-2 h-4 w-4" />
                    <span>Re-run steps up to here</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onCopyRunStepSnippet?.(); }}>
                    <Code className="mr-2 h-4 w-4" />
                    <span>Copy Python run_step snippet</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onDuplicate?.(); }}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                      <Repeat className="mr-2 h-4 w-4" />
                      <span>Replace node</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onReplaceNode?.(); }}>
                        <Wrench className="mr-2 h-4 w-4 text-zinc-500" />
                        <span>Select replacement…</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onToggleSkip?.(); }}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    <span>{data.isSkipped ? "Unskip node" : "Skip node"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onToggleStickyNote?.(); }}>
                    <StickyNote className="mr-2 h-4 w-4" />
                    <span>{data.stickyNoteVisible ? "Hide Sticky Note" : "Show Sticky Note"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); data.onDeleteStep?.(); }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0 nodrag nopan ml-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRunStep?.();
                }}
              >
                <Play className="h-3 w-3 mr-1" /> Run
              </Button>
            </div>
          </div>
        </div>
        {data.runState?.output && (
          <div className="px-4 pb-3">
            <div className="rounded-lg bg-zinc-900 p-3 font-mono text-[11px] text-zinc-300 border border-zinc-800 shadow-inner group-hover:border-zinc-700 transition-colors">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Step Output</span>
                <span className="text-[9px] text-zinc-600">JSON</span>
              </div>
              <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">
                {typeof data.runState.output === 'string'
                  ? data.runState.output
                  : JSON.stringify(data.runState.output, null, 2)}
              </pre>
            </div>
          </div>
        )}
        {data.stickyNoteVisible ? (
          <div
            className="px-4 pb-4 nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-[11px] font-semibold text-zinc-700 mb-1">Sticky note</div>
              <Textarea
                value={data.stickyNoteContent ?? ""}
                onChange={(e) => data.onUpdateStickyNote?.(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[70px] text-xs bg-white"
              />
            </div>
          </div>
        ) : null}
        {/* varName + expand row */}
        <div className="nodrag nopan px-4 py-3 flex items-center justify-between gap-2">
          {data.varName && (
            <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 truncate max-w-[240px]">
              {data.varName}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); (data.onOpenModal ?? data.onOpen)?.(); }}
            className="ml-auto h-7 w-7 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
            aria-label="Expand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
