"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { RefreshCw, MoreVertical, Play, Code, Copy, Repeat, Wrench, SkipForward, StickyNote, Trash2, Pencil, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ToolCanvasNodeData } from "../../../types/builder";
import { VariableSelectionModal } from "../VariableSelectionModal";
import { NodeHoverToolbar } from "./NodeHoverToolbar";

export function LoopNode({ data }: { data: ToolCanvasNodeData }) {
  const isNotebook = data.viewMode === "notebook";

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

  return (
    <div ref={nodeRef} className={cn("relative cursor-pointer group", isNotebook ? "w-[600px]" : "w-[380px]")}>
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
        style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />

      <div
        className={cn(
          "rounded-xl border border-sky-300 bg-gradient-to-br from-white to-sky-50 shadow-sm hover:shadow-md transition-shadow",
          isNotebook ? "w-[600px]" : "w-[380px]",
          data.isDisabled || data.isSkipped ? "opacity-60 grayscale" : "",
        )}
      >
        <div onClick={data.onOpen} className="w-full text-left cursor-pointer">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-sky-200">
            <div className="h-8 w-8 rounded-lg bg-white border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
               <RefreshCw className="h-4 w-4" />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                 <span className="text-sm font-semibold text-zinc-900 truncate">
                   {data.title || "Logic - Loop"}
                 </span>
                 <Popover>
                   <PopoverTrigger asChild>
                     <div
                       role="button"
                       tabIndex={0}
                       onClick={(e) => e.stopPropagation()}
                       className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-sky-100 text-sky-400 hover:text-sky-700 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                     >
                       <Pencil className="h-3.5 w-3.5" />
                     </div>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-4 nodrag nopan rounded-xl border border-zinc-200 shadow-xl bg-white" align="start" sideOffset={8} onClick={(e) => e.stopPropagation()}>
                     <div className="flex flex-col gap-2">
                        <div className="flex gap-1 items-center">
                         <Pencil className="w-3 h-3 text-zinc-600" />
                         <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rename Loop Step</label>
                        </div>
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
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/70 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
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
                      onClick={(e) => { e.stopPropagation(); data.onDeleteStep?.() || data.onDelete?.(); }}
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
                  className="h-7 text-xs shrink-0 nodrag nopan ml-1 bg-white cursor-pointer"
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

          <div className="p-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-zinc-700">List to loop</div>
                <div onClick={(e) => e.stopPropagation()}>
                  <VariableSelectionModal
                    value={data.loopOver ?? ""}
                    label={data.loopOverLabel ?? ""}
                    varTree={data.loopVarTree ?? []}
                    onChange={(val, lbl) => data.onUpdateLoop?.({ over: val, overLabel: lbl })}
                    onClear={() => data.onUpdateLoop?.({ over: "", overLabel: "" })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-zinc-700">How to process loop items</div>
                <Select
                  value={data.loopProcessing ?? "sequential"}
                  onValueChange={(val) => data.onUpdateLoop?.({ processing: val as any })}
                >
                  <SelectTrigger className="h-9 text-xs bg-white" onClick={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Select option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        {data.stickyNoteVisible ? (
          <div
            className="px-4 pb-4 nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl border border-sky-200 bg-white/70 p-3">
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
      </div>
    </div>
  );
}
