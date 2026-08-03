"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData } from "../../../types/builder";
import { Bot, Braces, Code, ExternalLink, GitBranch, Repeat, Wrench } from "lucide-react";
import { RiNodeTree } from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { IoLogoJavascript } from "react-icons/io";
import { IoLogoPython } from "react-icons/io";
import { TbApi } from "react-icons/tb";

export function StepsEmptyNode({
  data,
}: {
  data: ToolCanvasNodeData & {
    onAddStep?: () => void;
    onQuickAdd?: (libId: string) => void;
    onOpenSystemToolSidebar?: () => void;
  };
}) {
  const isNotebook = data.viewMode === "notebook";

  return (
    <div className={cn("relative text-left rounded-xl border border-zinc-200 bg-white shadow-sm cursor-pointer", isNotebook ? "w-[600px]" : "w-[380px]")}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-indigo-50 flex items-center justify-center text-base">
            <RiNodeTree className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div className="text-base font-semibold text-zinc-900">{data.title}</div>
        </div>
        <div className="mt-1 text-sm text-zinc-500">{data.subtitle}</div>

        {/* Button grid */}
        <div className="mt-5 nodrag nopan flex flex-col items-center gap-3">

          {/* Row 1: Add Step + LLM */}
          <div className="flex gap-3 w-full justify-center">
            <Button
              type="button"
              className="h-10 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onAddStep?.();
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Step
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("llm"); }}
            >
              <LuBrain className="h-4.5 w-4.5 text-indigo-600 mr-1" /> LLM
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-6 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("api"); }}
            >
              <TbApi className="h-4.5 w-4.5 text-sky-600 mr-1" /> API
            </Button>
          </div>

          {/* Row 2: AI Generation + Branch */}
          <div className="flex gap-3 w-full justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("branch"); }}
            >
              <GitBranch className="h-4.5 w-4.5 text-violet-600 mr-1" /> Branch
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onOpenSystemToolSidebar?.(); }}
            >
              <Wrench className="h-4.5 w-4.5 text-violet-600 mr-1" /> System Tools
            </Button>
          </div>

          {/* Row 3: Loop + Python + JavaScript */}
          <div className="flex gap-3 w-full justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("python"); }}
            >
              <IoLogoPython className="h-4.5 w-4.5 text-emerald-600" /> Python
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("javascript"); }}
            >
              <IoLogoJavascript className="h-4.5 w-4.5 text-amber-600 mr-1" /> JavaScript
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 text-sm font-medium bg-white nodrag nopan"
              onClick={(e) => { e.stopPropagation(); data.onQuickAdd?.("loop"); }}
            >
              <Repeat className="h-4.5 w-4.5 text-blue-600 mr-1" /> Loop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}