"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData } from "../../../types/builder";

export function BranchEndNode({ data }: { data: ToolCanvasNodeData & { branchLabel?: string; viewMode?: string } }) {
  const label = (data as any).branchLabel ?? data.title;
  const isNotebook = data.viewMode === "notebook";
  const widthClass = isNotebook ? "w-[600px]" : "w-[380px]";

  return (
    <div 
      className={cn("relative cursor-pointer group", widthClass)}
      onClick={(e) => {
        e.stopPropagation();
        data.onOpen?.();
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
      <div className={cn("flex justify-center", widthClass)}>
        <button type="button" className={cn("rounded-lg border border-zinc-200 bg-white/70 shadow-sm hover:shadow-md hover:bg-white transition-colors px-4 py-2 flex items-center justify-center text-center cursor-pointer pointer-events-none", widthClass)}>
          <span className="text-xs font-medium text-zinc-700 truncate">{label}</span>
        </button>
      </div>
    </div>
  );
}
