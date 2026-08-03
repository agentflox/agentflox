"use client";

import React from "react";
import { Bot, ChevronRight, List, Maximize2, Pencil, Repeat, Settings, Wrench, X, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SidebarPanelProps } from "./types";
import { BsInputCursor } from "react-icons/bs";
import { LuPackageCheck, LuBrain } from "react-icons/lu";
import { IoLogoJavascript, IoLogoPython } from "react-icons/io";
import { TbApi } from "react-icons/tb";

export function SidebarHeader(props: SidebarPanelProps) {
  const { api } = props;
  const { selectedNode, selectedStepId, toolStepSidebarOpen, setToolStepSidebarOpen, systemToolsListOpen, setSystemToolsListOpen, inputSidebarOpen, setInputSidebarOpen, setSelectedInputField, setSidebarOpen, setOutputsModalOpen, isSidebarTitleEditing, setIsSidebarTitleEditing, sidebarTitleDraft, setSidebarTitleDraft, outputMode, setOutputMode, steps, updateStepName, selectedStep, isSidebarTitleEditable, sidebarHeaderTitle, selectedStepTool } = api;

  return (
    <div className="px-4 py-3 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3">
        {systemToolsListOpen && (
          <button
            type="button"
            onClick={() => setSystemToolsListOpen(false)}
            className="h-8 w-8 rounded-md hover:bg-zinc-100 text-zinc-600 shrink-0 flex items-center justify-center -ml-1 cursor-pointer"
            aria-label="Back to tool steps"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}

        {/* Icon */}
        <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-indigo-600">
          {selectedNode === "step" && (() => {
            const s = steps.find(x => x.id === selectedStepId);
            let cfg: any = {};
            try { cfg = JSON.parse(s?.config || "{}"); } catch { }
            const isLoop = s?.type === "LOOP" || cfg?.kind === "LOOP";
            const t = s?.type?.toLowerCase();
            if (t === "llm") return <LuBrain className="h-5 w-5 text-indigo-600" />;
            if (t === "api") return <TbApi className="h-5 w-5 text-sky-600" />;
            if (t === "system_tool") return <Wrench className="h-5 w-5 text-zinc-700" />;
            if (t === "branch") return <GitBranch className="h-5 w-5 text-violet-600" />;
            if (t === "loop" || isLoop) return <Repeat className="h-5 w-5 text-blue-600" />;
            if (t === "python") return <IoLogoPython className="h-5 w-5 text-emerald-600" />;
            if (t === "javascript") return <IoLogoJavascript className="h-5 w-5 text-amber-600" />;
            return <Wrench className="h-5 w-5 text-zinc-700" />;
          })()}
          {selectedNode === "inputs" && <BsInputCursor className="h-4.5 w-4.5 text-indigo-600" />}
          {selectedNode === "outputs" && <LuPackageCheck className="text-sm font-bold text-emerald-600" />}
          {selectedNode !== "step" && selectedNode !== "inputs" && selectedNode !== "outputs" && <div className="text-sm font-bold text-zinc-400">T</div>}
        </div>

        {/* Title + subtitle */}
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 max-w-full">
            <div className="min-w-0">
              {isSidebarTitleEditing && isSidebarTitleEditable ? (
                <Input
                  value={sidebarTitleDraft}
                  onChange={(e) => setSidebarTitleDraft(e.target.value)}
                  autoFocus
                  className="h-8 w-[210px] rounded-[10px] border-zinc-300 text-[24px] leading-none font-medium px-3 py-1.5 focus-visible:ring-1 focus-visible:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const nextName = sidebarTitleDraft.trim();
                      if (selectedStepId && nextName) updateStepName(selectedStepId, nextName);
                      setIsSidebarTitleEditing(false);
                    }
                    if (e.key === "Escape") {
                      setSidebarTitleDraft(selectedStep?.name || "");
                      setIsSidebarTitleEditing(false);
                    }
                  }}
                  onBlur={() => {
                    const nextName = sidebarTitleDraft.trim();
                    if (selectedStepId && nextName) updateStepName(selectedStepId, nextName);
                    setIsSidebarTitleEditing(false);
                  }}
                />
              ) : (
                <div className="text-[14px] font-bold text-zinc-900 truncate">
                  {sidebarHeaderTitle}
                </div>
              )}
            </div>
            {isSidebarTitleEditable && !isSidebarTitleEditing && (
              <Pencil
                className="h-3.5 w-3.5 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors mt-[1px]"
                onClick={() => setIsSidebarTitleEditing(true)}
              />
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
            {systemToolsListOpen
              ? "Browse all registered system tools."
              : inputSidebarOpen
                ? "Set how this input gets its value."
                : toolStepSidebarOpen
                  ? "Choose from Popular Tool Steps or System tools."
                  : selectedNode === "inputs"
                    ? "Configure required values and how they are filled."
                    : selectedNode === "outputs"
                      ? "Configure what this tool returns."
                      : (selectedStep?.type === "LLM"
                        ? "Prompt a large language model with input text to produce output text."
                        : (selectedStepTool?.description || "Configure the selected tool step.")) || "Configure the selected tool step."}
          </div>
        </div>

        {/* Right actions: pill + expand (outputs only) + close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedNode === "outputs" && (
            <>
              {/* Mode pill */}
              <div className="flex items-center border border-zinc-200/80 bg-zinc-100 rounded-lg p-[3px] text-[11px] gap-0.5">
                <button
                  type="button"
                  onClick={() => setOutputMode("last_step")}
                  className={cn(
                    "px-2 h-[22px] rounded-[5px] font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer",
                    outputMode === "last_step"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <List className="h-3 w-3" />
                  Last step
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode("manual")}
                  className={cn(
                    "px-2 h-[22px] rounded-[5px] font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer",
                    outputMode === "manual"
                      ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/50"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                  )}
                >
                  <Settings className="h-3 w-3" />
                  Manual
                </button>
              </div>

              {/* Expand / collapse */}
              <button
                type="button"
                onClick={() => setOutputsModalOpen(true)}
                className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 shrink-0 flex items-center justify-center transition-colors"
                title="Expand to full view"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              setToolStepSidebarOpen(false);
              setSystemToolsListOpen(false);
              setInputSidebarOpen(false);
              setSelectedInputField(null);
            }}
            className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400 shrink-0 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
