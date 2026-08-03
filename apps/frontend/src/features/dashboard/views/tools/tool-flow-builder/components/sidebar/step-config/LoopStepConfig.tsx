"use client";

import React from "react";
import { CornerDownRight, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { StepConfigBaseProps } from "../types";

export function LoopStepConfig(props: StepConfigBaseProps) {
const { api, step, parsed } = props;
  const { updateStepConfig } = api;

  return (
    <div className="mt-1">
      <Tabs defaultValue="advanced" className="w-full">
        <TabsList className="w-full justify-start gap-6 rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
          <TabsTrigger value="advanced" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">
            Advanced
          </TabsTrigger>
          <TabsTrigger value="outputs" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">
            Outputs
          </TabsTrigger>
          <TabsTrigger value="fallback" className="relative rounded-none border-0 bg-transparent px-0.5 py-3 text-[13px] font-medium tracking-tight text-zinc-500 shadow-none transition-colors hover:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=active]:shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 cursor-pointer">
            Fallback
          </TabsTrigger>
        </TabsList>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="pt-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900">How should errors be handled?</span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
            </div>
            <Select
              value={parsed?.errorHandling || ""}
              onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, kind: "LOOP", errorHandling: val || undefined }))}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select option..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip item</SelectItem>
                <SelectItem value="throw">Throw error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900">Index of item to test loop on</span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">Optional</span>
            </div>
            <Input
              value={typeof parsed?.testIndex === "number" ? String(parsed.testIndex) : ""}
              onChange={(e) => {
                const n = e.target.value === "" ? undefined : Number(e.target.value);
                updateStepConfig(step.id, (cfg) => ({ ...cfg, kind: "LOOP", testIndex: Number.isFinite(n as number) ? n : undefined }));
              }}
              placeholder="Enter number..."
              className="h-9 text-xs"
            />
          </div>
        </TabsContent>

        {/* Outputs Tab */}
        <TabsContent value="outputs" className="pt-4 space-y-3">
          {["results", "errors", "credits_cost", "credits_used"].map((key) => (
            <div key={key} className="space-y-1">
              <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-teal-600">
                {`{{ ${key} }}`}
              </div>
              <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <CornerDownRight className="h-3 w-3 text-zinc-400" />
                  <span>output.</span>
                  <span className="bg-indigo-50 text-indigo-600 rounded px-1 font-mono text-[11px]">{key}</span>
                </div>
                <button className="text-zinc-300 hover:text-zinc-500 cursor-pointer"><X className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full mt-2 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add new output key</Button>
        </TabsContent>

        {/* Fallback Tab */}
        <TabsContent value="fallback" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">Use fallback if step fails</span>
              <Info className="h-4 w-4 text-zinc-400" />
            </div>
            <Switch
              checked={parsed?.useFallback ?? true}
              onCheckedChange={(v) => updateStepConfig(step.id, (cfg) => ({ ...cfg, useFallback: v }))}
            />
          </div>
          {parsed?.useFallback !== false && (
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-semibold text-zinc-700">Set fallback values</div>
              {["results", "errors", "credits_cost", "credits_used"].map((key) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100 rounded px-2 py-0.5">output.{key}</span>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5 uppercase">Required</span>
                  </div>
                  <Input placeholder="Default value..." className="h-8 text-xs" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
