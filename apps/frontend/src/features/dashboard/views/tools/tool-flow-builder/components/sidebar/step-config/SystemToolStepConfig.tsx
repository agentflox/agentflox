"use client";

import React from "react";
import { ExternalLink, Info, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VariableSelectionModal } from "@/entities/tools/components/builder/VariableSelectionModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StepConfigBaseProps } from "../types";

export function SystemToolStepConfig(props: StepConfigBaseProps) {
const { api, step, parsed, varTree } = props;
  const { systemToolsQuery, updateStepConfig } = api;

  return (
    <div className="mt-3 space-y-0">
      {(() => {
        const systemTool = (systemToolsQuery.data ?? []).find(
          (t: any) => t.id === parsed.toolId,
        );
        if (!systemTool) {
          return (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
              <div className="text-sm font-medium text-zinc-900">
                Tool not found
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                The tool for this step couldn't be loaded. It might
                have been deleted or renamed.
              </div>
            </div>
          );
        }

        const schema = systemTool.functionSchema as any;
        const params = schema?.parameters?.properties ?? {};
        const requiredParams = schema?.parameters?.required ?? [];
        const paramEntries = Object.entries(params);
        const returns = schema?.returns?.properties ?? {};
        const returnEntries = Object.entries(returns);

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
              {paramEntries.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
                  <div className="text-sm font-medium text-zinc-900">
                    No parameters
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    This system tool does not require any input
                    parameters.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {paramEntries.map(([key, schema]: [string, any]) => {
                    const isRequired = requiredParams.includes(key);
                    const binding = (parsed.inputs ?? {})[key] ?? "";
                    const label = (parsed.inputLabels ?? {})[key] ?? "";

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
                        <VariableSelectionModal
                          value={binding}
                          label={label}
                          varTree={varTree}
                          placeholder={`Select variable or input ${key}...`}
                          onChange={(val, lbl) => {
                            updateStepConfig(step.id, (cfg) => ({
                              ...cfg,
                              inputs: {
                                ...(cfg.inputs ?? {}),
                                [key]: val,
                              },
                              inputLabels: {
                                ...(cfg.inputLabels ?? {}),
                                [key]: lbl,
                              },
                            }));
                          }}
                          onClear={() => {
                            updateStepConfig(step.id, (cfg) => {
                              const nextInputs = { ...(cfg.inputs ?? {}) };
                              const nextLabels = {
                                ...(cfg.inputLabels ?? {}),
                              };
                              delete nextInputs[key];
                              delete nextLabels[key];
                              return {
                                ...cfg,
                                inputs: nextInputs,
                                inputLabels: nextLabels,
                              };
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* 笏笏 Advanced Tab 笏笏 */}
            <TabsContent value="advanced" className="pt-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-900">Stop on error</div>
                  <Switch
                    checked={parsed?.stopOnError !== false}
                    onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, stopOnError: !!val }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-900">Timeout (sec)</div>
                  <Input
                    type="number"
                    value={(parsed?.timeout as number) ?? 60}
                    onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, timeout: Number(e.target.value) }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* 笏笏 Outputs Tab 笏笏 */}
            <TabsContent value="outputs" className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">Tool Return Fields</div>
                <div className="grid grid-cols-1 gap-2">
                  {returnEntries.length > 0 ? (
                    returnEntries.map(([key, schema]: [string, any]) => (
                      <div key={key} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-zinc-900 truncate">{key}</div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                            {schema.type ?? "any"}
                          </span>
                        </div>
                        {schema.description && (
                          <div className="mt-1 text-[10px] text-zinc-500 leading-relaxed italic line-clamp-2">
                            {schema.description}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic p-4 text-center">No structured output fields defined for this tool.</div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 笏笏 Docs Tab 笏笏 */}
            <TabsContent value="docs" className="pt-4 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs"><Wrench className="h-4 w-4" /> Tool Documentation</div>
                <p className="text-[11px] text-indigo-600 leading-relaxed">This tool is a built-in system capability. Refer to the platform documentation for detailed usage guidelines.</p>
                <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-indigo-200 text-indigo-700">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Knowledge Base
                </Button>
              </div>
            </TabsContent>

            {/* 笏笏 Fallback Tab 笏笏 */}
            <TabsContent value="fallback" className="pt-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-zinc-900">Use fallback if tool fails</div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3.5 w-3.5 text-zinc-400" /></TooltipTrigger>
                      <TooltipContent><p className="text-[10px]">When enabled, the step will use these default values if the tool execution errors.</p></TooltipContent>
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
                    {returnEntries.length > 0 ? (
                      returnEntries.map(([key, schema]: [string, any]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                              <span className="text-zinc-400">output.</span>{key}
                            </div>
                            <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                              Optional
                            </span>
                          </div>
                          <Input
                            value={(parsed?.fallbackValues?.[key] as string) || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateStepConfig(step.id, (cfg) => ({
                                ...cfg,
                                fallbackValues: {
                                  ...(cfg.fallbackValues || {}),
                                  [key]: val,
                                },
                              }));
                            }}
                            placeholder={`Default value for ${key}`}
                            className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-[11px] text-zinc-400 italic">No output fields to configure fallbacks for.</div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
}
