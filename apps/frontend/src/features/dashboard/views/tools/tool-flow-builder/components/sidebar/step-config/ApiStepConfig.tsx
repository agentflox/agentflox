"use client";

import React from "react";
import { Braces, Code2, CornerDownRight, ExternalLink, Info, Play, Plus, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VariableMentionInput } from "@/entities/tools/components/builder/VariableMentionInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { StepConfigBaseProps } from "../types";

export function ApiStepConfig(props: StepConfigBaseProps) {
  const { api, step, parsed, varTree } = props;
  const { updateStepConfig } = api;

  return (
    <div className="mt-3 space-y-0">
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
        <TabsContent value="configure" className="pt-4 space-y-6">
          {/* Method */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Method</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <Select value={(parsed?.method as string) || "GET"} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, method: val }))}>
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">URL</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200/50">Required</span>
              </div>
            </div>
            <VariableMentionInput
              value={(parsed?.url as string) || ""}
              onChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, url: val }))}
              varTree={varTree}
              placeholder="Type '{{' to select variable"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Body</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
              </div>
              <Code2 className="h-3.5 w-3.5 text-zinc-300" />
            </div>
            <Select value={(parsed?.bodyType as string) || ""} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, bodyType: val }))}>
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                <SelectValue placeholder="Select option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form-data">Form data</SelectItem>
                <SelectItem value="raw">Raw (Plain text)</SelectItem>
              </SelectContent>
            </Select>
            {parsed?.bodyType === "json" && (
              <Textarea
                value={(parsed?.body as string) || ""}
                onChange={(e) => updateStepConfig(step.id, (cfg) => ({ ...cfg, body: e.target.value }))}
                placeholder='{"key": "value"}'
                className="h-24 text-xs font-mono bg-zinc-50 border-zinc-200 mt-2"
              />
            )}
          </div>

          {/* URL Params */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">URL Params</div>
                <Info className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5 text-zinc-300" />
                <Code2 className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <div className="space-y-2">
              {(Array.isArray(parsed?.params) ? parsed.params : []).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 px-1">
                  <Input value={p.key} placeholder="Key" className="h-8 text-xs flex-1" onChange={(e) => {
                    const current = Array.isArray(parsed?.params) ? parsed.params : [];
                    const next = [...current];
                    next[idx] = { ...next[idx], key: e.target.value };
                    updateStepConfig(step.id, (cfg) => ({ ...cfg, params: next }));
                  }} />
                  <Input value={p.value} placeholder="Value" className="h-8 text-xs flex-1" onChange={(e) => {
                    const current = Array.isArray(parsed?.params) ? parsed.params : [];
                    const next = [...current];
                    next[idx] = { ...next[idx], value: e.target.value };
                    updateStepConfig(step.id, (cfg) => ({ ...cfg, params: next }));
                  }} />
                  <button onClick={() => {
                    const current = Array.isArray(parsed?.params) ? parsed.params : [];
                    updateStepConfig(step.id, (cfg) => ({ ...cfg, params: current.filter((_: any, i: number) => i !== idx) }));
                  }} className="text-zinc-300 hover:text-red-500 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <Button variant="ghost" className="w-fit h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4 py-2 mx-auto flex" onClick={() => {
                updateStepConfig(step.id, (cfg) => {
                  const current = Array.isArray(cfg.params) ? cfg.params : [];
                  return { ...cfg, params: [...current, { key: "", value: "" }] };
                });
              }}>
                <Plus className="h-4 w-4" /> Add param
              </Button>
            </div>
          </div>

          {/* Run button */}
          <div className="pt-4 border-t border-zinc-100">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10">
              <Play className="h-4 w-4" />
              Run step
            </Button>
          </div>
        </TabsContent>

        {/* 笏笏 Advanced Tab 笏笏 */}
        <TabsContent value="advanced" className="pt-4 space-y-6">
          <div className="space-y-4">
            {/* Response format */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Response format</div>
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <Select value={(parsed?.responseFormat as string) || "JSON"} onValueChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, responseFormat: val }))}>
                <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="BINARY">Binary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cookies */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Cookies</div>
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <div className="space-y-2">
                {(Array.isArray(parsed?.cookies) ? parsed.cookies : []).map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 px-1">
                    <Input value={c.key} placeholder="Key" className="h-8 text-xs flex-1" onChange={(e) => {
                      const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                      const next = [...current];
                      next[idx] = { ...next[idx], key: e.target.value };
                      updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: next }));
                    }} />
                    <Input value={c.value} placeholder="Value" className="h-8 text-xs flex-1" onChange={(e) => {
                      const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                      const next = [...current];
                      next[idx] = { ...next[idx], value: e.target.value };
                      updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: next }));
                    }} />
                    <button onClick={() => {
                      const current = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
                      updateStepConfig(step.id, (cfg) => ({ ...cfg, cookies: current.filter((_: any, i: number) => i !== idx) }));
                    }} className="text-zinc-300 hover:text-red-500 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <Button variant="ghost" className="w-fit h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4 py-2 mx-auto flex" onClick={() => {
                  updateStepConfig(step.id, (cfg) => {
                    const current = Array.isArray(cfg.cookies) ? cfg.cookies : [];
                    return { ...cfg, cookies: [...current, { key: "", value: "" }] };
                  });
                }}>
                  <Plus className="h-4 w-4" /> Add cookie
                </Button>
              </div>
            </div>

            {/* Throw error on 4xx/5xx */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-zinc-900 uppercase tracking-tight">Throw error on 4xx/5xx response</div>
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-100 rounded px-1.5 py-0.5">Optional</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" />
                  <Code2 className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-1">
                <Switch
                  checked={!!parsed?.throwOnHttpError}
                  onCheckedChange={(val) => updateStepConfig(step.id, (cfg) => ({ ...cfg, throwOnHttpError: !!val }))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 笏笏 Outputs Tab 笏笏 */}
        <TabsContent value="outputs" className="pt-4 space-y-4">
          {(() => {
            const outputFields = Array.isArray(parsed?.outputFields) ? parsed.outputFields : [
              { name: "response_body", type: "any" },
              { name: "status", type: "number" }
            ];
            return (
              <div className="space-y-4">
                {outputFields.map((field: any, idx: number) => (
                  <div key={idx} className="group relative rounded-xl border border-zinc-100 bg-white p-4 shadow-sm hover:border-zinc-200 transition-all">
                    <div className="space-y-3">
                      <div className="flex items-center justify-center p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-mono text-sm">
                        {`{{ ${field.name} }}`}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-zinc-400">output.</span>
                          <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                            {field.name}
                          </span>
                        </div>
                        <button className="text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full h-10 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-semibold gap-2 rounded-xl mt-2">
                  <Plus className="h-4 w-4" /> Add new output key
                </Button>
              </div>
            );
          })()}
        </TabsContent>

        {/* 笏笏 Docs Tab 笏笏 */}
        <TabsContent value="docs" className="pt-4 space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs"><Wrench className="h-4 w-4" /> API Tool Help</div>
            <p className="text-[11px] text-indigo-600 leading-relaxed">Execute HTTP requests to any external endpoint. Supports variable injection with <code>{`{{ var_name }}`}</code> syntax.</p>
            <Button variant="outline" className="w-full h-9 text-xs gap-2 bg-white border-indigo-200 text-indigo-700">
              <ExternalLink className="h-3.5 w-3.5" /> Platform Documentation
            </Button>
          </div>
        </TabsContent>

        {/* 笏笏 Fallback Tab 笏笏 */}
        <TabsContent value="fallback" className="pt-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-900">Use fallback if step fails</div>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
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
                {[
                  { name: "response_body", required: true },
                  { name: "status", required: true },
                  { name: "body", required: false },
                  { name: "url", required: false },
                  { name: "response_headers", required: false, isJson: true }
                ].map((field, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-700">
                        <span className="text-zinc-400">output.</span>{field.name}
                      </div>
                      <span className="bg-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    {field.isJson ? (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 font-mono text-[10px] text-zinc-400">
                        1  <span className="ml-2 text-zinc-400">{"{}"}</span>
                      </div>
                    ) : (
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
                        className="h-10 text-xs bg-white border-zinc-200 rounded-lg shadow-none"
                      />
                    )}
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
