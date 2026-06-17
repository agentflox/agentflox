"use client";

import React, { useState } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BuilderStep } from "../../types/builder";

interface LoopDetailModalProps {
  open: boolean;
  step: BuilderStep | null;
  onClose: () => void;
  onUpdateStepConfig: (stepId: string, updater: (cfg: any) => any) => void;
}

export function LoopDetailModal({
  open,
  step,
  onClose,
  onUpdateStepConfig,
}: LoopDetailModalProps) {
  const [activeTab, setActiveTab] = useState("advanced");

  if (!open || !step || step.type !== "LOOP") return null;

  let parsed: any = {};
  if (step.config) {
    try {
      parsed = JSON.parse(step.config);
    } catch (e) {}
  }

  const updateCfg = (updater: (prev: any) => any) => {
    onUpdateStepConfig(step.id, updater);
  };

  const outputsList = [
    { key: "results", label: "output.results" },
    { key: "errors", label: "output.errors" },
    { key: "credits_cost", label: "output.credits_cost" },
    { key: "credits_used", label: "output.credits_used" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-[900px] max-w-[95vw] h-[600px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-zinc-900">
              <div className="text-indigo-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21v-5h5" />
                </svg>
              </div>
              <span className="text-[17px] font-bold tracking-tight">Loop</span>
              <svg
                className="h-3.5 w-3.5 text-zinc-400 ml-1"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </div>
            <div className="text-[13px] text-zinc-600">
              Repeat steps for each item in a list
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b border-zinc-200">
            <TabsList className="h-11 bg-transparent p-0 flex gap-6 w-full justify-start rounded-none">
              <TabsTrigger
                value="advanced"
                className="h-full rounded-none px-1 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:shadow-none text-zinc-500 font-semibold text-[13px] hover:text-zinc-800"
              >
                Advanced
              </TabsTrigger>
              <TabsTrigger
                value="outputs"
                className="h-full rounded-none px-1 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:shadow-none text-zinc-500 font-semibold text-[13px] hover:text-zinc-800"
              >
                Outputs
              </TabsTrigger>
              <TabsTrigger
                value="docs"
                className="h-full rounded-none px-1 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:shadow-none text-zinc-500 font-semibold text-[13px] hover:text-zinc-800"
              >
                Docs
              </TabsTrigger>
              <TabsTrigger
                value="fallback"
                className="h-full rounded-none px-1 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:shadow-none text-zinc-500 font-semibold text-[13px] hover:text-zinc-800"
              >
                Fallback
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
            <div className="max-w-3xl mx-auto w-full">
              <TabsContent value="advanced" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zinc-900">How should errors be handled?</span>
                      <Info className="h-3.5 w-3.5 text-zinc-300" />
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
                    </div>
                    <div className="flex items-center gap-1 text-[13px] text-zinc-400">
                      <button className="hover:text-zinc-600 transition-colors">{"{↗}"}</button>
                      <button className="hover:text-zinc-600 transition-colors">{"{}"}</button>
                    </div>
                  </div>
                  <Select
                    value={parsed.errorHandling || ""}
                    onValueChange={(v) => updateCfg((cfg) => ({ ...cfg, errorHandling: v }))}
                  >
                    <SelectTrigger className="w-full bg-white h-10 border-zinc-200">
                      <SelectValue placeholder="Select option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip item</SelectItem>
                      <SelectItem value="throw">Throw error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zinc-900">Index of item to test loop on</span>
                      <Info className="h-3.5 w-3.5 text-zinc-300" />
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
                    </div>
                    <div className="flex items-center gap-1 text-[13px] text-zinc-400">
                      <button className="hover:text-zinc-600 transition-colors">{"{↗}"}</button>
                      <button className="hover:text-zinc-600 transition-colors">{"{}"}</button>
                    </div>
                  </div>
                  <Input
                    className="w-full bg-white h-10 border-zinc-200"
                    placeholder="Enter number..."
                    value={parsed.testIndex ?? ""}
                    onChange={(e) => updateCfg(c => ({ ...c, testIndex: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="outputs" className="mt-0 space-y-5">
                {outputsList.map((output, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center w-full gap-2 relative group">
                      <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-2 flex items-center h-[46px]">
                        <div className="bg-teal-50 text-teal-600 text-[13px] font-mono px-2 py-0.5 rounded ml-1">
                          {`{{ ${output.key} }}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-1">
                       <div className="flex items-center gap-1.5 text-zinc-500 text-[12px]">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M9 10l3 3 3-3"/><path d="M12 13V4"/></svg>
                         <span>output.</span>
                         <span className="bg-indigo-50 text-indigo-600 rounded px-1 py-0.5 font-mono text-[11px]">{output.key}</span>
                       </div>
                       <button className="text-zinc-300 hover:text-zinc-500 transition-colors">
                         <X className="h-3.5 w-3.5" />
                       </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" className="h-9 gap-2 bg-white text-zinc-700 shadow-sm rounded-[8px] border-zinc-200 font-semibold px-4">
                    <span className="text-lg leading-none">+</span> Add new output key
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="fallback" className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-zinc-900">Use fallback if step fails</span>
                    <Info className="h-4 w-4 text-zinc-300" />
                  </div>
                  <Switch
                    checked={parsed.useFallback ?? true}
                    onCheckedChange={(v) => updateCfg(c => ({ ...c, useFallback: v }))}
                  />
                </div>

                {parsed.useFallback !== false && (
                  <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden p-6 ring-1 ring-black/5">
                    <div className="text-[13px] font-semibold text-zinc-900 mb-5">Set fallback values</div>
                    
                    <div className="space-y-6">
                      {outputsList.map((output, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-50/50 text-indigo-700 font-mono text-[11px] border border-indigo-100 rounded px-2 py-0.5">
                                output.{output.key}
                              </span>
                              {output.key !== "credits_cost" && <Info className="h-3.5 w-3.5 text-zinc-300" />}
                            </div>
                            <span className="text-[11px] font-bold text-zinc-700 bg-zinc-100 rounded-md px-2 py-0.5 uppercase tracking-wide">Required</span>
                          </div>
                          
                          {output.key === "credits_cost" ? (
                             <Input 
                               className="w-full bg-white h-10 border-zinc-200 placeholder:text-zinc-400"
                               placeholder="Default value"
                             />
                          ) : (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden flex flex-col items-center pb-3">
                              <div className="flex w-full min-h-[140px] relative mt-2 group px-2">
                                <div className="absolute left-2 top-0 bottom-0 w-8 bg-zinc-100 border-r border-zinc-200 flex flex-col items-center pt-2 text-[11px] text-zinc-400 rounded-l-md font-mono">
                                  1
                                </div>
                                <div className="flex-1 w-full bg-white border border-zinc-200 rounded-md ml-8 px-3 py-2 text-[13px] font-mono text-zinc-600 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 outline-none">
                                  {"{}"}
                                </div>
                                <button className="absolute right-4 top-2 text-zinc-400 hover:text-zinc-600">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Button variant="outline" className="h-8 gap-1.5 bg-white text-zinc-600 shadow-sm rounded-full border-zinc-200 text-xs font-semibold px-4 mt-4">
                                <span>+</span> Add new object to array
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="docs" className="mt-0">
                <div className="p-6 text-center text-zinc-500 text-sm">
                  Documentation coming soon...
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
