"use client";

import React from "react";
import { Braces, Code2, CornerDownRight, Info, Play, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VariableMentionInput } from "@/entities/tools/components/builder/VariableMentionInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { StepConfigBaseProps } from "../types";

export function LlmStepConfig(props: StepConfigBaseProps) {
const { api, step, parsed, varTree } = props;
  const { updateStepConfig } = api;

  return (
    <div className="mt-3 space-y-0 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="w-full justify-start gap-6 rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
          <TabsTrigger value="configure" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">Configure</TabsTrigger>
          <TabsTrigger value="advanced" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">Advanced</TabsTrigger>
          <TabsTrigger value="outputs" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">Outputs</TabsTrigger>
          <TabsTrigger value="docs" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">Docs</TabsTrigger>
          <TabsTrigger value="fallback" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">Fallback</TabsTrigger>
        </TabsList>

        {/* 笏笏 Configure Tab 笏笏 */}
        <TabsContent value="configure" className="pt-4 space-y-6 pb-6">
          {/* Prompt */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Prompt</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
              </div>
            </div>
            <div className="relative rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <VariableMentionInput
                multiline
                varTree={varTree}
                value={parsed?.prompt || ""}
                onChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, prompt: val }))}
                placeholder="Type a message..."
                className="min-h-[140px] border-none shadow-none focus-visible:ring-0 text-sm p-3 resize-y"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!parsed?.markdown}
                    onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, markdown: val }))}
                    className="scale-75"
                  />
                  <span className="text-[10px] font-medium text-zinc-600">Markdown</span>
                  <Info className="h-3 w-3 text-zinc-400" />
                </div>
                <span className="ml-auto text-[10px] text-zinc-400">Use {"{{"} to access variables</span>
              </div>
            </div>
          </div>

          {/* Your Model */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Your model</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <Select
              value={parsed?.model || "gpt-4o-mini"}
              onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, model: val }))}
            >
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">Cost-optimized Model (GPT-4o Mini)</SelectItem>
                <SelectItem value="gpt-4o">High-performance Model (GPT-4o)</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Run step */}
          <div className="pt-4 border-t border-zinc-100">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 rounded-xl shadow-lg shadow-indigo-500/10 font-bold transition-all active:scale-[0.98]">
              <Play className="h-4 w-4 fill-current" />
              Run step
            </Button>
          </div>
        </TabsContent>

        {/* 笏笏 Advanced Tab 笏笏 */}
        <TabsContent value="advanced" className="pt-4 space-y-6 pb-6">
          {/* Fallback Model */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Fallback Model</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <Select value={parsed?.fallbackModel || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, fallbackModel: val }))}>
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">System Prompt</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Optional</span>
              </div>
            </div>
            <div className="relative rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <VariableMentionInput
                multiline
                varTree={varTree}
                value={parsed?.systemPrompt || ""}
                onChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, systemPrompt: val }))}
                placeholder="Type a message..."
                className="min-h-[120px] border-none shadow-none focus-visible:ring-0 text-sm p-3 resize-y"
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-100">
                <Switch checked={!!parsed?.systemMarkdown} onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, systemMarkdown: val }))} className="scale-75" />
                <span className="text-[10px] font-medium text-zinc-600">Markdown</span>
                <Info className="h-3 w-3 text-zinc-400" />
                <span className="ml-auto text-[10px] text-zinc-400">Use {"{{"} to access variables</span>
              </div>
            </div>
          </div>

          {/* Grid of other options */}
          <div className="grid grid-cols-1 gap-5 px-0.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Temperature</div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Input type="number" step="0.1" value={parsed?.temperature ?? 0} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, temperature: parseFloat(e.target.value) }))} className="h-10 text-xs rounded-lg" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Thinking / Reasoning Configuration</div>
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
              </div>
              <Select value={parsed?.thinkingConfig || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, thinkingConfig: val }))}>
                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Disabled</SelectItem>
                  <SelectItem value="low">Low reasoning</SelectItem>
                  <SelectItem value="high">High reasoning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Force Response Format</div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Select value={parsed?.responseFormat || ""} onValueChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, responseFormat: val }))}>
                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON Object</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Max Output Tokens</div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Input type="number" placeholder="Enter number..." value={parsed?.maxTokens ?? ""} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, maxTokens: parseInt(e.target.value) }))} className="h-10 text-xs rounded-lg" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Seed</div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Input type="number" placeholder="Enter number..." value={parsed?.seed ?? ""} onChange={(e) => updateStepConfig(step.id, cfg => ({ ...cfg, seed: parseInt(e.target.value) }))} className="h-10 text-xs rounded-lg" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Validators</div>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 fill-indigo-100" />
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!parsed?.useValidators} onCheckedChange={(val) => updateStepConfig(step.id, cfg => ({ ...cfg, useValidators: val }))} />
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 笏笏 Outputs Tab 笏笏 */}
        <TabsContent value="outputs" className="pt-4 space-y-4 pb-6 px-0.5">
          {(() => {
            const outputFields = Array.isArray(parsed?.outputFields) && parsed.outputFields.length > 0
              ? parsed.outputFields
              : [{ name: "answer", type: "string" }];

            return (
              <div className="space-y-4">
                <div className="text-[11px] text-zinc-500 mb-2 leading-relaxed">Map the model response to specific output keys.</div>
                {outputFields.map((field: any, idx: number) => (
                  <div key={idx} className="group relative rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                        {"{{ "}{field.name || 'unnamed'}{" }}"}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <CornerDownRight className="h-4 w-4 text-zinc-300" />
                          <span className="text-zinc-400">output.</span>
                          <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                            {field.name || '...'}
                          </span>
                        </div>
                        <button
                          onClick={() => updateStepConfig(step.id, cfg => ({ ...cfg, outputFields: (cfg.outputFields || []).filter((_: any, i: number) => i !== idx) }))}
                          className="text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full h-11 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2 shadow-sm"
                  onClick={() => updateStepConfig(step.id, cfg => ({ ...cfg, outputFields: [...(cfg.outputFields || []), { name: "", type: "string" }] }))}
                >
                  <Plus className="h-4 w-4" /> Add new output key
                </Button>
              </div>
            )
          })()}
        </TabsContent>

        {/* 笏笏 Fallback Tab 笏笏 */}
        <TabsContent value="fallback" className="pt-4 space-y-6 pb-6 px-0.5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
              <div className="text-[10px] text-zinc-500">Enable default values for when LLM errors.</div>
            </div>
            <Switch
              checked={!!parsed?.useFallback}
              onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: !!val }))}
            />
          </div>

          {parsed?.useFallback && (
            <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FB] border border-zinc-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Set fallback values</div>
              <div className="space-y-6">
                {(Array.isArray(parsed?.outputFields) ? parsed.outputFields : [{ name: 'answer' }]).map((field: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-700 shadow-sm">
                        <span className="text-zinc-400">output.</span>{field.name || 'answer'}
                      </div>
                      <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                        Required
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
                      className="h-11 text-xs bg-white border-zinc-200 rounded-xl shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
