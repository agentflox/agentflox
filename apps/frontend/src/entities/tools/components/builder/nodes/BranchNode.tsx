"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch, MoreVertical, Play, Code, Repeat, Wrench, SkipForward, StickyNote, Trash2, Pencil, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ToolCanvasNodeData } from "../../../types/builder";

export function BranchNode({ data }: { data: ToolCanvasNodeData }) {
  const isNotebook = data.viewMode === "notebook";

  return (
    <div 
      className={cn("relative cursor-pointer group", isNotebook ? "w-[600px]" : "w-[380px]")}
      onClick={(e) => {
        e.stopPropagation();
        data.onOpen?.();
      }}
    >
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
      {data.stickyNoteVisible ? (
        <div
          className="mb-3 nodrag nopan"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <div className="text-[11px] font-semibold text-indigo-900 mb-1">Sticky note</div>
            <Textarea
              value={data.stickyNoteContent ?? ""}
              onChange={(e) => data.onUpdateStickyNote?.(e.target.value)}
              placeholder="Add a note..."
              className="min-h-[80px] text-xs bg-white"
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-xl border border-indigo-200 bg-white shadow-sm hover:shadow-md transition-shadow",
          isNotebook ? "w-[600px]" : "w-[380px]",
          data.isSkipped ? "opacity-60 grayscale" : "",
        )}
      >
        <div className="w-full text-left cursor-default">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
               <GitBranch className="h-4 w-4" />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                 <span className="text-sm font-semibold text-zinc-900 truncate">
                   {data.title || "Logic - Branch"}
                 </span>
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
                       <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rename Branch Step</label>
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
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); data.onRunUpToHere?.(); }}>
                      <Play className="mr-2 h-4 w-4" />
                      <span>Re-run steps up to here</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); data.onCopyRunStepSnippet?.(); }}>
                      <Code className="mr-2 h-4 w-4" />
                      <span>Copy Python run_step snippet</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <Repeat className="mr-2 h-4 w-4" />
                        <span>Replace node</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); data.onReplaceNode?.(); }}>
                          <Wrench className="mr-2 h-4 w-4 text-zinc-500" />
                          <span>Select replacement…</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); data.onToggleSkip?.(); }}>
                      <SkipForward className="mr-2 h-4 w-4" />
                      <span>{data.isSkipped ? "Unskip node" : "Skip node"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); data.onToggleStickyNote?.(); }}>
                      <StickyNote className="mr-2 h-4 w-4" />
                      <span>{data.stickyNoteVisible ? "Hide Sticky Note" : "Show Sticky Note"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); data.onDeleteStep?.() || data.onDelete?.(); }} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
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

      </div>
    </div>
  );
}
