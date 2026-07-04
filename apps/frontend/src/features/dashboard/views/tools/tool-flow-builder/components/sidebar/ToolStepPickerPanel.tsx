"use client";

import React from "react";
import { Bot, Braces, Code, ExternalLink, GitBranch, Repeat, Wrench } from "lucide-react";

import { Input } from "@/components/ui/input";

import { STEP_LIBRARY } from "@/entities/tools/constants/builder";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { SidebarPanelProps } from "./types";

export function ToolStepPickerPanel(props: SidebarPanelProps) {
const { api } = props;
  const { toolStepSidebarQuery, setToolStepSidebarQuery, setSystemToolsListOpen, addStepFromLibrary } = api;

  return (
<div className="space-y-4">
                        <Input
                          value={toolStepSidebarQuery}
                          onChange={(e) => setToolStepSidebarQuery(e.target.value)}
                          placeholder="Search tool steps..."
                          className="h-9"
                        />

                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-zinc-900">Popular Tool Steps</div>
                          <div className="grid grid-cols-2 gap-3">
                            {STEP_LIBRARY.filter((s) => {
                              const q = toolStepSidebarQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (s.label + " " + s.description).toLowerCase().includes(q);
                            }).map((s) => (
                              <TooltipProvider key={s.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => s.id === "system_tool" ? setSystemToolsListOpen(true) : addStepFromLibrary(s.id)}
                                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left hover:bg-zinc-50 hover:border-zinc-300"
                                    >
                                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                                        {s.id === "llm" ? <Bot className="h-4.5 w-4.5 text-indigo-600" /> : null}
                                        {s.id === "api" ? <ExternalLink className="h-4.5 w-4.5 text-sky-600" /> : null}
                                        {s.id === "system_tool" ? <Wrench className="h-4.5 w-4.5 text-zinc-700" /> : null}
                                        {s.id === "branch" ? <GitBranch className="h-4.5 w-4.5 text-violet-600" /> : null}
                                        {s.id === "loop" ? <Repeat className="h-4.5 w-4.5 text-blue-600" /> : null}
                                        {s.id === "python" ? <Code className="h-4.5 w-4.5 text-emerald-600" /> : null}
                                        {s.id === "javascript" ? <Braces className="h-4.5 w-4.5 text-amber-600" /> : null}
                                      </span>
                                      <span className="text-[15px] font-semibold text-zinc-900">{s.label}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                                    {s.description}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>
                      </div>
  );
}
