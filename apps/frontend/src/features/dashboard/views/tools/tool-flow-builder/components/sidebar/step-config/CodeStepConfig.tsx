"use client";

import React from "react";
import {
  Bot, Braces, Check, ChevronRight, Code, Code2, CornerDownRight, ExternalLink,
  GitBranch, Info, List, Maximize2, Pencil, Play, Plus, Repeat, Settings, Settings2,
  Sparkles, Trash2, Wrench, X, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSidebarInputWrapper } from "@/entities/tools/components/builder/nodes/InputsNode";
import { cn } from "@/lib/utils";
import { STEP_LIBRARY, BRANCH_OPERATORS, INPUT_TYPE_OPTIONS } from "@/entities/tools/constants/builder";
import { BranchConditionRuleRow } from "@/entities/tools/components/builder/BranchConditionRuleRow";
import { VariableMentionInput } from "@/entities/tools/components/builder/VariableMentionInput";
import { VariableSelectionModal } from "@/entities/tools/components/builder/VariableSelectionModal";
import { operatorHasRightValue, inferUiTypeFromProp } from "@/entities/tools/utils/builder";
import type { BranchConditionGroup, BranchConditionRule, InputUiType } from "@/entities/tools/types/builder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StepConfigBaseProps } from "../types";

export function CodeStepConfig(props: StepConfigBaseProps) {
const { api, step, parsed, varTree } = props;
  const { updateStepConfig, setSteps, systemToolsQuery } = api;

  return (
    <Tabs defaultValue="configure" className="w-full">
      <TabsList className="w-full justify-start gap-6 rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
        <TabsTrigger
          value="configure"
          className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer"
        >
          Configure
        </TabsTrigger>
        <TabsTrigger
          value="advanced"
          className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer"
        >
          Advanced
        </TabsTrigger>
        <TabsTrigger
          value="outputs"
          className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer"
        >
          Outputs
        </TabsTrigger>
        <TabsTrigger
          value="docs"
          className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer"
        >
          Docs
        </TabsTrigger>
        <TabsTrigger
          value="fallback"
          className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer"
        >
          Fallback
        </TabsTrigger>
      </TabsList>

      {/* 笏笏 Configure Tab 笏笏 */}
      <TabsContent value="configure" className="pt-4 space-y-4">
        {/* Language badge + switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold border ${parsed?.kind === "PYTHON" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
              <Code className="h-3 w-3" />
              {parsed?.kind === "PYTHON" ? "Python 3" : "JavaScript (Node)"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextKind = parsed?.kind === "PYTHON" ? "JAVASCRIPT" : "PYTHON";
              const nextCode = nextKind === "PYTHON" ? "# Write your Python code here\n# Access inputs via: params['input_name']\n\nresult = params.get('text', '')\nreturn {'output': result}" : "// Write your JavaScript code here\n// Access inputs via: params.input_name\n\nconst result = params.text || '';\nreturn { output: result };";
              updateStepConfig(step.id, (cfg) => ({
                ...cfg,
                kind: nextKind,
                code: nextCode,
              }));
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 underline underline-offset-2 cursor-pointer"
          >
            Switch to {parsed?.kind === "PYTHON" ? "JavaScript" : "Python"}
          </button>
        </div>

        {/* Code editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Code</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-zinc-400" /></TooltipTrigger>
                  <TooltipContent><p className="text-[10px]">The code to execute. Access inputs via <code>params</code>.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultCode = parsed?.kind === "PYTHON"
                    ? "# Write your Python code here\n# Access inputs via: params['input_name']\n\nresult = params.get('text', '')\nreturn {'output': result}"
                    : "// Write your JavaScript code here\n// Access inputs via: params.input_name\n\nconst result = params.text || '';\nreturn { output: result };";
                  updateStepConfig(step.id, (cfg) => ({ ...cfg, code: defaultCode }));
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 mr-2 cursor-pointer"
              >
                Reset
              </button>
              <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-300 overflow-hidden shadow-sm">
            <div className={`flex items-center gap-2 px-3 py-2 border-b border-zinc-200 ${parsed?.kind === "PYTHON" ? "bg-blue-950" : "bg-zinc-900"}`}>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400 opacity-80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 opacity-80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 opacity-80" />
              </div>
              <span className="text-[10px] font-medium text-zinc-400 ml-1">
                {parsed?.kind === "PYTHON" ? "main.py" : "main.js"}
              </span>
            </div>
            <textarea
              value={(parsed?.code as string) ?? ""}
              onChange={(e) =>
                updateStepConfig(step.id, (cfg) => ({
                  ...cfg,
                  code: e.target.value,
                }))
              }
              spellCheck={false}
              className={`w-full resize-none font-mono text-[12px] leading-relaxed p-4 focus:outline-none min-h-[240px] ${parsed?.kind === "PYTHON" ? "bg-blue-950 text-blue-100" : "bg-zinc-900 text-green-100"}`}
            />
          </div>
        </div>

        {/* PyPI Packages section */}
        {parsed?.kind === "PYTHON" && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-900">PyPI Packages</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-zinc-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px]">Additional Python packages to be available in the environment.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[10px] text-zinc-400">Optional</span>
              <div className="ml-auto flex items-center gap-2">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <div className="space-y-2">
              {(Array.isArray(parsed?.packages) ? parsed.packages : []).map((pkg: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={pkg}
                    className="h-9 text-xs"
                    onChange={(e) => {
                      const current = Array.isArray(parsed?.packages) ? parsed.packages : [];
                      const newPkgs = [...current];
                      newPkgs[idx] = e.target.value;
                      updateStepConfig(step.id, (cfg) => ({ ...cfg, packages: newPkgs }));
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400"
                    onClick={() => {
                      const current = Array.isArray(parsed?.packages) ? parsed.packages : [];
                      const newPkgs = current.filter((_: any, i: number) => i !== idx);
                      updateStepConfig(step.id, (cfg) => ({ ...cfg, packages: newPkgs }));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                className="w-full h-9 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-500 text-xs gap-2"
                onClick={() => {
                  updateStepConfig(step.id, (cfg) => {
                    const current = Array.isArray(cfg.packages) ? cfg.packages : [];
                    return { ...cfg, packages: [...current, ""] };
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New item
              </Button>
            </div>
          </div>
        )}

        {/* Run step button */}
        <div className="pt-4 border-t border-zinc-100">
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10">
            <Play className="h-4 w-4" />
            Run step
          </Button>
        </div>
      </TabsContent>

      {/* 笏笏 Advanced Tab 笏笏 */}
      <TabsContent value="advanced" className="pt-4 space-y-6">
        {parsed?.kind === "JAVASCRIPT" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Runtime</div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-zinc-400" /></TooltipTrigger>
                      <TooltipContent><p className="text-[10px]">Select the JavaScript runtime environment.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="bg-zinc-100 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Optional</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Select
                value={(parsed?.runtime as string) || "modal-node"}
                onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, runtime: val }))}
              >
                <SelectTrigger className="h-10 text-xs text-zinc-900 bg-white border-zinc-200">
                  <SelectValue placeholder="Select runtime..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deno">deno</SelectItem>
                  <SelectItem value="modal-node">modal-node</SelectItem>
                  <SelectItem value="Deno">Deno</SelectItem>
                  <SelectItem value="modal-node-deprecated">Modal Labs Node.js (deprecated)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-zinc-900">Runtime Commands</div>
                <span className="text-[10px] text-zinc-400">Optional</span>
              </div>
              <div className="space-y-2">
                {(Array.isArray(parsed?.runtimeCommands) ? parsed.runtimeCommands : []).map((cmd: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={cmd}
                      className="h-9 text-xs"
                      onChange={(e) => {
                        const current = Array.isArray(parsed?.runtimeCommands) ? parsed.runtimeCommands : [];
                        const newCmds = [...current];
                        newCmds[idx] = e.target.value;
                        updateStepConfig(step.id, (cfg) => ({ ...cfg, runtimeCommands: newCmds }));
                      }}
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  className="w-full h-9 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-500 text-xs"
                  onClick={() => {
                    updateStepConfig(step.id, (cfg) => {
                      const current = Array.isArray(cfg.runtimeCommands) ? cfg.runtimeCommands : [];
                      return { ...cfg, runtimeCommands: [...current, ""] };
                    });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  New item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-900">Session ID <span className="text-[10px] font-normal text-zinc-400">Optional</span></div>
              <Input
                value={(parsed?.sessionId as string) ?? ""}
                onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, sessionId: e.target.value }))}
                placeholder="Type '{{' to select variable"
                className="h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-900">GPUs</div>
                <Select value={String(parsed?.gpus ?? 0)} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, gpus: Number(val) }))}>
                  <SelectTrigger className="h-10 text-xs text-zinc-900"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="0">0</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-900">CPU Cores</div>
                <Select value={String(parsed?.cpus ?? 1)} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, cpus: Number(val) }))}>
                  <SelectTrigger className="h-10 text-xs text-zinc-900"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="4">4</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-900">Memory (MB)</div>
              <Input type="number" value={(parsed?.memory as number) ?? 512} onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, memory: Number(e.target.value) }))} className="h-10 text-xs" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-900">Timeout (sec)</div>
              <Input type="number" value={(parsed?.timeout as number) ?? 600} onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, timeout: Number(e.target.value) }))} className="h-10 text-xs" />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-900">Fallback</div>
              <Switch checked={!!parsed?.fallback} onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, fallback: !!val }))} />
            </div>
          </>
        )}
      </TabsContent>

      {/* 笏笏 Outputs Tab 笏笏 */}
      <TabsContent value="outputs" className="pt-4 space-y-4">
        {(() => {
          const outputFields: any[] = parsed?.outputFields || [];
          return (
            <div className="space-y-4">
              {outputFields.map((field: any, idx: number) => (
                <div key={idx} className="group relative rounded-xl border border-zinc-100 bg-white p-4 shadow-sm hover:border-zinc-200 transition-all">
                  <div className="space-y-3">
                    {/* Variable Preview */}
                    <div className="flex items-center justify-center p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                      {`{{ ${field.name || '...'} }}`}
                    </div>

                    {/* Path Label + Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-zinc-400">output.</span>
                        <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100 transition-colors">
                          {field.name || 'unnamed'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateStepConfig(step.id, (cfg) => {
                            const current = Array.isArray(cfg.outputFields) ? cfg.outputFields : [];
                            return {
                              ...cfg,
                              outputFields: current.filter((_: any, i: number) => i !== idx),
                            };
                          });
                        }}
                        className="text-zinc-300 hover:text-red-500 transition-colors outline-none cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                className="w-full h-10 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2"
                onClick={() => {
                  updateStepConfig(step.id, (cfg) => {
                    const current = Array.isArray(cfg.outputFields) ? cfg.outputFields : [];
                    return {
                      ...cfg,
                      outputFields: [
                        ...current,
                        { name: "new_key", type: "string" }
                      ],
                    };
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                Add new output key
              </Button>
            </div>
          );
        })()}
      </TabsContent>

      {/* 笏笏 Docs Tab 笏笏 */}
      <TabsContent value="docs" className="pt-4 space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs"><StickyNote className="h-4 w-4" /> Documentation</div>
          <p className="text-[11px] text-blue-600 leading-relaxed">Learn how to use built-in helper functions like <code>run_step</code> and <code>prompt_completion</code>.</p>
          <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-blue-200 text-blue-700" onClick={() => window.open('https://relevanceai.com/docs/build/tools/tool-steps/python-code/code-python-helper-functions', '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" /> View Documentation
          </Button>
        </div>
      </TabsContent>

      {/* 笏笏 Fallback Tab 笏笏 */}
      <TabsContent value="fallback" className="pt-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-zinc-400" /></TooltipTrigger>
                <TooltipContent><p className="text-[10px]">When enabled, the step will use these default values instead of failing if the execution errors.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            checked={!!parsed?.useFallback}
            onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
          />
        </div>

        {parsed?.useFallback && (
          <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-5 animate-in slide-in-from-top-2 duration-300">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
            <div className="space-y-6">
              {(Array.isArray(parsed?.outputFields) ? parsed.outputFields : []).length > 0 ? (
                (Array.isArray(parsed?.outputFields) ? parsed.outputFields : []).map((field: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                        <span className="text-zinc-400">output.</span>{field.name || 'unnamed'}
                      </div>
                      <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <Input
                      value={(parsed?.fallbackValues?.[field.name] as string) || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateStepConfig(step.id, (cfg) => ({
                          ...cfg,
                          fallbackValues: {
                            ...(cfg.fallbackValues || {}),
                            [field.name]: val,
                          },
                        }));
                      }}
                      placeholder="Default value"
                      className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[11px] text-zinc-400 italic">No output fields defined.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </TabsContent>

      {/* 笏笏 JSON tab 笏笏 */}
      <TabsContent value="json" className="pt-4">
        <div className="text-[11px] text-zinc-500 mb-1">Raw step config (JSON)</div>
        <Textarea value={step.config} onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, config: e.target.value } : s))} className="min-h-[160px] font-mono text-[11px]" />
      </TabsContent>
    </Tabs>
  );
}
