"use client";

import React from "react";
import {
  X,
  Play,
  Info,
  Braces,
  Code2,
  Wrench,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BuilderStep, VarTreeEntry } from "../../types/builder";
import { VariableSelectionModal } from "./VariableSelectionModal";

export type StepDetailModalProps = {
  open: boolean;
  step: BuilderStep | null;
  systemTool?: any;
  varTree: VarTreeEntry[];
  onClose: () => void;
  onUpdateStepConfig: (stepId: string, updater: (cfg: any) => any) => void;
  onRunStep?: () => void;
  isRunning?: boolean;
  runOutput?: any;
};

export function StepDetailModal({
  open,
  step,
  systemTool,
  varTree,
  onClose,
  onUpdateStepConfig,
  onRunStep,
  isRunning,
  runOutput,
}: StepDetailModalProps) {
  // Hooks must be before any conditional return (React rules of hooks)
  const [advOpen, setAdvOpen] = React.useState(false);

  if (!open || !step) return null;

  let parsed: any = {};
  try {
    parsed = JSON.parse(step.config || "{}");
  } catch {
    parsed = {};
  }

  const kind = parsed?.kind || step.kind || step.type;
  const isJavaScript = kind === "JAVASCRIPT";
  const isPython = kind === "PYTHON";
  const isCode = isJavaScript || isPython;
  const isApi = step.type === "API";
  const isSystemTool = step.type === "SYSTEM_TOOL";

  const params = systemTool?.functionSchema?.parameters?.properties ?? {};
  const requiredParams = systemTool?.functionSchema?.parameters?.required ?? [];
  const paramEntries = Object.entries(params);
  const returns = systemTool?.functionSchema?.returns?.properties ?? {};
  const returnEntries = Object.entries(returns);

  const updateCfg = (updater: (cfg: any) => any) => {
    onUpdateStepConfig(step.id, updater);
  };

  /* ---- header icon ---- */
  const headerIcon = isCode ? (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-400 text-white text-xs font-bold">
      {isJavaScript ? "JS" : "PY"}
    </div>
  ) : isApi ? (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white text-[9px] font-bold">
      API
    </div>
  ) : (
    <Wrench className="h-5 w-5 text-zinc-600" />
  );

  /* ---- header title ---- */
  const headerTitle = isCode
    ? isJavaScript
      ? "Javascript code"
      : "Python code"
    : isApi
    ? "API"
    : systemTool
    ? systemTool.displayName ?? systemTool.name ?? step.name
    : step.name;

  /* ---------- LEFT PANEL CONTENT ---------- */
  const leftPanel = () => {
    if (isCode) {
      const codeValue = parsed?.code ?? "";
      return (
        <div className="flex flex-col gap-4 h-full">
          {/* Code label row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-800">Code</span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="rounded bg-zinc-900 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase">
                Required
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Code2 className="h-3.5 w-3.5" />
              <Braces className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Code editor */}
          <div className="flex-1 min-h-0 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
            <Textarea
              value={codeValue}
              onChange={(e) =>
                updateCfg((cfg) => ({ ...cfg, code: e.target.value }))
              }
              className="h-full min-h-[300px] w-full resize-none font-mono text-[12px] text-emerald-300 bg-zinc-900 border-none focus-visible:ring-0 p-4 leading-6"
              placeholder={
                isJavaScript
                  ? '// "params" are all the user inputs values\n// "steps" are all the inputs and outputs from previous steps\n\n// IMPORTANT: Include a "return" statement in your code if you want to use the output of this step in other steps.\nreturn {"params": params, "steps": steps};'
                  : '# "params" are all the user inputs values\n# "steps" are all the inputs and outputs from previous steps\n\nreturn {"params": params, "steps": steps}'
              }
            />
          </div>

          {/* Advanced settings accordion */}
          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setAdvOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              <span
                className={cn(
                  "transition-transform",
                  advOpen ? "rotate-90" : ""
                )}
              >
                ▶
              </span>
              Advanced Settings
            </button>
            {advOpen && (
              <div className="mt-3 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">
                    Stop on error
                  </span>
                  <Switch
                    checked={parsed?.stopOnError !== false}
                    onCheckedChange={(v) =>
                      updateCfg((cfg) => ({ ...cfg, stopOnError: v }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-700">
                    Timeout (sec)
                  </span>
                  <Input
                    type="number"
                    value={parsed?.timeout ?? 60}
                    onChange={(e) =>
                      updateCfg((cfg) => ({
                        ...cfg,
                        timeout: Number(e.target.value),
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isApi) {
      return (
        <div className="space-y-5">
          {/* Method */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">
                Method
              </span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="rounded bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 font-bold uppercase border border-zinc-200">
                Required
              </span>
            </div>
            <Select
              value={parsed?.method || "GET"}
              onValueChange={(v) => updateCfg((cfg) => ({ ...cfg, method: v }))}
            >
              <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">
                URL
              </span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="rounded bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 font-bold uppercase border border-zinc-200">
                Required
              </span>
            </div>
            <Input
              value={parsed?.url || ""}
              onChange={(e) =>
                updateCfg((cfg) => ({ ...cfg, url: e.target.value }))
              }
              placeholder="Type '{{' to select variable"
              className="h-10 text-xs bg-white border-zinc-200"
            />
          </div>

          {/* Headers */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">
                Headers
              </span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase border border-zinc-100 rounded px-1.5 py-0.5">
                Optional
              </span>
            </div>
            <div className="space-y-2">
              {(Array.isArray(parsed?.headers) ? parsed.headers : []).map(
                (h: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={h.key}
                      placeholder="Key"
                      className="h-8 text-xs flex-1"
                      onChange={(e) => {
                        const next = [...(parsed.headers ?? [])];
                        next[idx] = { ...next[idx], key: e.target.value };
                        updateCfg((cfg) => ({ ...cfg, headers: next }));
                      }}
                    />
                    <Input
                      value={h.value}
                      placeholder="Value"
                      className="h-8 text-xs flex-1"
                      onChange={(e) => {
                        const next = [...(parsed.headers ?? [])];
                        next[idx] = { ...next[idx], value: e.target.value };
                        updateCfg((cfg) => ({ ...cfg, headers: next }));
                      }}
                    />
                    <button
                      onClick={() =>
                        updateCfg((cfg) => ({
                          ...cfg,
                          headers: (cfg.headers ?? []).filter(
                            (_: any, i: number) => i !== idx
                          ),
                        }))
                      }
                      className="text-zinc-300 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
              <Button
                variant="ghost"
                className="h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4"
                onClick={() =>
                  updateCfg((cfg) => ({
                    ...cfg,
                    headers: [...(cfg.headers ?? []), { key: "", value: "" }],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Add header
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">
                Body
              </span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase border border-zinc-100 rounded px-1.5 py-0.5">
                Optional
              </span>
            </div>
            <Select
              value={parsed?.bodyType || ""}
              onValueChange={(v) =>
                updateCfg((cfg) => ({ ...cfg, bodyType: v }))
              }
            >
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
                value={parsed?.body || ""}
                onChange={(e) =>
                  updateCfg((cfg) => ({ ...cfg, body: e.target.value }))
                }
                placeholder='{"key": "value"}'
                className="h-24 text-xs font-mono bg-zinc-50 border-zinc-200 mt-2"
              />
            )}
          </div>

          {/* URL Params */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-800 uppercase tracking-tight">
                URL Params
              </span>
              <Info className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase border border-zinc-100 rounded px-1.5 py-0.5">
                Optional
              </span>
            </div>
            <div className="space-y-2">
              {(Array.isArray(parsed?.params) ? parsed.params : []).map(
                (p: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={p.key}
                      placeholder="Key"
                      className="h-8 text-xs flex-1"
                      onChange={(e) => {
                        const next = [...(parsed.params ?? [])];
                        next[idx] = { ...next[idx], key: e.target.value };
                        updateCfg((cfg) => ({ ...cfg, params: next }));
                      }}
                    />
                    <Input
                      value={p.value}
                      placeholder="Value"
                      className="h-8 text-xs flex-1"
                      onChange={(e) => {
                        const next = [...(parsed.params ?? [])];
                        next[idx] = { ...next[idx], value: e.target.value };
                        updateCfg((cfg) => ({ ...cfg, params: next }));
                      }}
                    />
                    <button
                      onClick={() =>
                        updateCfg((cfg) => ({
                          ...cfg,
                          params: (cfg.params ?? []).filter(
                            (_: any, i: number) => i !== idx
                          ),
                        }))
                      }
                      className="text-zinc-300 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
              <Button
                variant="ghost"
                className="h-9 bg-white border border-zinc-200 text-zinc-900 text-xs gap-2 rounded-xl px-4"
                onClick={() =>
                  updateCfg((cfg) => ({
                    ...cfg,
                    params: [...(cfg.params ?? []), { key: "", value: "" }],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Add param
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (isSystemTool) {
      const usedVarNames = Object.values(parsed?.inputs ?? {}) as string[];
      return (
        <Tabs defaultValue="inputs" className="w-full flex flex-col h-full">
          <TabsList className="shrink-0 w-fit rounded-full bg-zinc-100 p-0.5">
            <TabsTrigger
              value="inputs"
              className="rounded-full px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow"
            >
              Inputs
            </TabsTrigger>
            <TabsTrigger
              value="variables"
              className="rounded-full px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow"
            >
              Variables used{" "}
              {usedVarNames.filter(Boolean).length > 0 && (
                <span className="ml-1 rounded-full bg-zinc-200 px-1.5 text-[10px] font-bold">
                  {usedVarNames.filter(Boolean).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="flex-1 overflow-y-auto pt-4">
            {paramEntries.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                No parameters required.
              </div>
            ) : (
              <div className="space-y-5">
                {paramEntries.map(([key, schema]: [string, any]) => {
                  const isRequired = requiredParams.includes(key);
                  const binding = (parsed.inputs ?? {})[key] ?? "";
                  const label = (parsed.inputLabels ?? {})[key] ?? "";
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-800">
                          {key}
                        </span>
                        {schema.description && (
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                        {isRequired && (
                          <span className="rounded bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 font-bold uppercase border border-zinc-200">
                            Required
                          </span>
                        )}
                      </div>
                      <VariableSelectionModal
                        value={binding}
                        label={label}
                        varTree={varTree}
                        placeholder={`{{ ${key} }}`}
                        onChange={(val, lbl) => {
                          updateCfg((cfg) => ({
                            ...cfg,
                            inputs: { ...(cfg.inputs ?? {}), [key]: val },
                            inputLabels: {
                              ...(cfg.inputLabels ?? {}),
                              [key]: lbl,
                            },
                          }));
                        }}
                        onClear={() => {
                          updateCfg((cfg) => {
                            const ni = { ...(cfg.inputs ?? {}) };
                            const nl = { ...(cfg.inputLabels ?? {}) };
                            delete ni[key];
                            delete nl[key];
                            return { ...cfg, inputs: ni, inputLabels: nl };
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="flex-1 overflow-y-auto pt-4">
            <p className="text-xs text-zinc-500 mb-3">
              Variables referenced in this step
            </p>
            <div className="space-y-2">
              {usedVarNames.filter(Boolean).length === 0 ? (
                <div className="text-xs text-zinc-400 italic">
                  No variables used yet.
                </div>
              ) : (
                usedVarNames
                  .filter(Boolean)
                  .map((v, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-mono text-zinc-700"
                    >
                      {v}
                    </div>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-[900px] max-w-[95vw] h-[600px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            {headerIcon}
            <span className="text-base font-semibold text-zinc-900">
              {headerTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left panel */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-zinc-100">
            {leftPanel()}
          </div>

          {/* Right panel – Output */}
          <div className="w-[340px] shrink-0 flex flex-col">
            <div className="px-5 py-3 border-b border-zinc-100">
              <span className="text-sm font-semibold text-zinc-800">Output</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-amber-600">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-widest">
                    Running…
                  </span>
                </div>
              ) : runOutput ? (
                <pre className="text-[11px] font-mono text-zinc-700 whitespace-pre-wrap break-all leading-relaxed">
                  {typeof runOutput === "string"
                    ? runOutput
                    : JSON.stringify(runOutput, null, 2)}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
                  <svg
                    className="h-10 w-10 opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 6h16M4 10h16M4 14h10"
                    />
                  </svg>
                  <span className="text-xs font-medium">No output yet</span>
                  <span className="text-[11px] text-zinc-400">
                    Run this step to see the output.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-zinc-100 bg-zinc-50/50">
          <span className="text-xs text-zinc-400">Changes are saved automatically</span>
          <Button
            onClick={onRunStep}
            disabled={isRunning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 gap-2 cursor-pointer text-sm font-semibold rounded-xl"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run step
          </Button>
        </div>
      </div>
    </div>
  );
}
