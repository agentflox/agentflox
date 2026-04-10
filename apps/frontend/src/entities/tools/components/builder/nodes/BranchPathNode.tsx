"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Pencil, MoreVertical, Trash2, GitBranch, ChevronUp, ChevronDown, Settings2, Minimize2, Maximize2, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData } from "../../../types/builder";
import { BranchConditionRuleRow } from "../BranchConditionRuleRow";

export function BranchPathNode({ data }: { data: ToolCanvasNodeData & { branchIdx?: number, branchLabel?: string, branchConfig?: any, otherHasFallback?: boolean, varTree?: any, onUpdateBranchConfig?: (p: any) => void, onMeasureHeight?: (h: number) => void } }) {
  const label = data.branchLabel ?? data.title;
  const isNotebook = data.viewMode === "notebook";
  const isExpanded = isNotebook && !!data.isExpanded;
  const branch = data.branchConfig || {};
  const rules = branch.conditionGroup?.rules || [];
  const matchMode = branch.conditionGroup?.matchMode || "all";

  const branchIdx = data.branchIdx ?? 0;
  const assessmentMode = branch.assessmentMode ?? (branchIdx === 1 ? "fallback" : "rules");

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

  if (isNotebook) {
    return (
      <div
        ref={nodeRef}
        className={cn(
          "relative cursor-pointer group bg-white rounded-xl shadow-md border-[2px]",
          isExpanded ? "w-[680px] border-indigo-400" : "w-[600px] border-zinc-200 hover:border-indigo-300 transition-colors"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!isExpanded) {
            data.onToggleExpand?.();
          }
        }}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />

        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          {/* Left: icon + label — click to toggle expand */}
          <div
            className="flex items-center gap-3 cursor-pointer group/header flex-1"
            onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <GitBranch className="h-4 w-4 group-hover/header:hidden" />
              {isExpanded
                ? <ChevronUp className="h-4 w-4 hidden group-hover/header:block" />
                : <ChevronDown className="h-4 w-4 hidden group-hover/header:block" />
              }
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-zinc-900 group-hover/header:text-indigo-600 transition-colors">
                {label}
              </span>
              <Pencil className="h-3 w-3 text-zinc-300 hover:text-zinc-500 transition-colors opacity-0 group-hover/header:opacity-100" />
            </div>
          </div>

          {/* Right: toolbar */}
          <div className="flex items-center gap-0.5 border border-zinc-200 bg-zinc-50 rounded-lg p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 z-[9999]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onDeleteBranch?.(); }} className="text-red-600 focus:text-red-700 text-xs cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete branch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-4 w-px bg-zinc-200 mx-0.5" />
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onOpen?.(); }}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsed preview */}
        {!isExpanded && (
          <div
            className="px-4 pb-4 relative cursor-pointer"
            onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
          >
            {assessmentMode === "fallback" ? (
              <div className="h-8 rounded-md bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-500 font-medium">
                Fallback branch
              </div>
            ) : (
              <div className="h-8 rounded-md bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
                Click to configure branch logic
              </div>
            )}
          </div>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 nodrag nopan nowheel space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Branch label edit */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Branch label</label>
              <Input
                defaultValue={label}
                className="h-9 text-xs font-medium bg-zinc-50/50 border-zinc-200 hover:border-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:border-indigo-400 transition-all shadow-inner"
                placeholder="Type a new name..."
                onKeyDown={(e) => { if (e.key === "Enter") data.onUpdateBranchLabel?.(e.currentTarget.value); }}
                onBlur={(e) => data.onUpdateBranchLabel?.(e.target.value)}
              />
            </div>
            {/* Assessment mode */}
            <div>
              <div className="text-[11px] font-bold text-zinc-700 mb-1.5">Assessment mode</div>
              <Select
                value={assessmentMode}
                onValueChange={(v) => {
                  data.onUpdateBranchConfig?.({ assessmentMode: v });
                }}
              >
                <SelectTrigger className="h-8 w-64 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rules" className="text-xs">Rules</SelectItem>
                  <SelectItem value="code" className="text-xs">Code expression</SelectItem>
                  <SelectItem value="ai" className="text-xs">Let AI decide</SelectItem>
                  {(!data.otherHasFallback || assessmentMode === "fallback") && (
                    <SelectItem value="fallback" className="text-xs text-zinc-600">Fallback (if no other branches run)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Conditions */}
            {assessmentMode !== "fallback" && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] font-bold text-zinc-700">Match</span>
                <Select
                  value={matchMode}
                  onValueChange={(v) => {
                    data.onUpdateBranchConfig?.({
                      conditionGroup: { ...(branch.conditionGroup || {}), matchMode: v as any }
                    });
                  }}
                >
                  <SelectTrigger className="h-6 w-16 text-[11px] font-semibold text-indigo-600 bg-white border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px] font-semibold">ALL</SelectItem>
                    <SelectItem value="any" className="text-[11px] font-semibold">ANY</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-zinc-500">conditions in this group</span>
              </div>
              <div className="space-y-2 mt-2 nodrag nopan nowheel cursor-default" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                {rules.length === 0 ? (
                  <div className="text-center py-4 text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg">
                    No conditions yet. Click below to add one.
                  </div>
                ) : (
                  rules.map((rule: any, rIdx: number) => (
                    <BranchConditionRuleRow
                      key={rule.id}
                      rule={rule}
                      varTree={data.varTree || []}
                      onUpdate={(patch) => {
                        const nextRules = rules.map((r: any) => r.id === rule.id ? { ...r, ...patch } : r);
                        data.onUpdateBranchConfig?.({
                          conditionGroup: { ...(branch.conditionGroup || {}), rules: nextRules }
                        });
                      }}
                      onRemove={() => {
                        const nextRules = rules.filter((r: any) => r.id !== rule.id);
                        data.onUpdateBranchConfig?.({
                          conditionGroup: { ...(branch.conditionGroup || {}), rules: nextRules }
                        });
                      }}
                    />
                  ))
                )}
              </div>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-600 font-medium cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextRules = [...rules, {
                    id: crypto.randomUUID(),
                    leftVariable: "",
                    leftLabel: "",
                    operator: "equals",
                    rightValue: "",
                    rightLabel: ""
                  }];
                  data.onUpdateBranchConfig?.({
                    conditionGroup: { ...(branch.conditionGroup || {}), rules: nextRules }
                  });
                }}
              >
                <Plus className="h-3 w-3" /> Add condition
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Flow mode (unchanged)
  return (
    <div ref={nodeRef} className={cn("relative cursor-pointer group", "w-[380px]")}>
      <Handle type="target" position={Position.Top} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden w-[380px]">
        <div onClick={data.onOpen} className="w-full text-left cursor-pointer">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
             <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <GitBranch className="h-4 w-4" />
             </div>
             <div className="flex-1 flex flex-col min-w-0">
               <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-sm font-semibold text-zinc-900 truncate">
                    Logic - {label}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4 nodrag nopan rounded-xl border border-zinc-200 shadow-xl bg-white" align="start" sideOffset={8} onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rename Branch Path</label>
                        <Input
                          defaultValue={label}
                          className="h-9 text-xs font-medium bg-zinc-50/50 border-zinc-200 hover:border-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:border-indigo-400 transition-all shadow-inner"
                          placeholder="Type a new name..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              data.onUpdateBranchLabel?.(e.currentTarget.value);
                            }
                          }}
                          onBlur={(e) => data.onUpdateBranchLabel?.(e.target.value)}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={data.onDeleteBranch} className="cursor-pointer text-red-600 focus:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete branch logic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
