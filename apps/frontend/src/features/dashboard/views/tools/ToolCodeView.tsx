"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Play, Type, MessageSquare, ChevronDown, Plus, Trash2, Code2, ChevronsRight, ChevronsLeft, AlignLeft, Hash, FileUp, Table as TableIcon, MoreHorizontal, Check, List, Braces, Terminal, AlertTriangle, CornerDownRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BuilderInputField, InputUiType } from "@/entities/tools/types/builder";
import { ResizableSplitLayout } from "@/components/layout/ResizableSplitLayout";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSidebarInputWrapper } from "@/entities/tools/components/builder/nodes/InputsNode";
import { INPUT_TYPE_OPTIONS } from "@/entities/tools/constants/builder";
import { inferUiTypeFromProp } from "@/entities/tools/utils/builder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import {
  vscodeDark,
  vscodeLight,
  dracula,
  githubDark,
  githubLight,
  monokai,
  tokyoNight,
  tokyoNightDay,
  materialDark,
  materialLight,
  sublime,
  nord,
  aura,
  solarizedDark,
  solarizedLight,
} from "@uiw/codemirror-themes-all";

const THEMES: Record<string, { label: string; ext: any; dark: boolean }> = {
  "vscode-dark": { label: "VS Code Dark", ext: vscodeDark, dark: true },
  "vscode-light": { label: "VS Code Light", ext: vscodeLight, dark: false },
  "github-dark": { label: "GitHub Dark", ext: githubDark, dark: true },
  "github-light": { label: "GitHub Light", ext: githubLight, dark: false },
  "dracula": { label: "Dracula", ext: dracula, dark: true },
  "monokai": { label: "Monokai", ext: monokai, dark: true },
  "tokyo-night": { label: "Tokyo Night", ext: tokyoNight, dark: true },
  "tokyo-night-day": { label: "Tokyo Night Day", ext: tokyoNightDay, dark: false },
  "material-dark": { label: "Material Dark", ext: materialDark, dark: true },
  "material-light": { label: "Material Light", ext: materialLight, dark: false },
  "sublime": { label: "Sublime", ext: sublime, dark: true },
  "nord": { label: "Nord", ext: nord, dark: true },
  "aura": { label: "Aura", ext: aura, dark: true },
  "solarized-dark": { label: "Solarized Dark", ext: solarizedDark, dark: true },
  "solarized-light": { label: "Solarized Light", ext: solarizedLight, dark: false },
};

export type CodeBackend = "modal" | "daytona" | "local";
export type RaiseErrorMode = "traceback" | "error" | "stderr";

export interface CodeAdvancedSettings {
  backend: CodeBackend;
  sessionId: string;
  longOutput: boolean;
  gpus: number;
  cpus: number;
  memorySize: number;
  sessionTimeout: number;
  raiseError: RaiseErrorMode;
  enableFallback: boolean;
}

export interface ToolCodeSavePayload {
  code: string;
  language: string;
  packages: string[];
  runtimeCommands: string[];
  inputs: BuilderInputField[];
  advancedSettings: CodeAdvancedSettings;
}

const DEFAULT_ADVANCED: CodeAdvancedSettings = {
  backend: "local",
  sessionId: "",
  longOutput: false,
  gpus: 0,
  cpus: 1,
  memorySize: 512,
  sessionTimeout: 600,
  raiseError: "traceback",
  enableFallback: true,
};

function readAdvancedFromConfig(cfg: any): CodeAdvancedSettings {
  if (!cfg || typeof cfg !== "object") return { ...DEFAULT_ADVANCED };
  const backendRaw = String(cfg.backend || cfg.runtime || "local").toLowerCase();
  const backend: CodeBackend =
    backendRaw === "modal" || backendRaw.includes("modal")
      ? "modal"
      : backendRaw === "daytona"
        ? "daytona"
        : "local";
  return {
    backend,
    sessionId: typeof cfg.sessionId === "string" ? cfg.sessionId : "",
    longOutput: Boolean(cfg.longOutput),
    gpus: Number(cfg.gpus ?? 0) || 0,
    cpus: Number(cfg.cpus ?? 1) || 1,
    memorySize: Number(cfg.memorySize ?? cfg.memory ?? 512) || 512,
    sessionTimeout: Number(cfg.sessionTimeout ?? cfg.timeout ?? 600) || 600,
    raiseError: (["traceback", "error", "stderr"].includes(cfg.raiseError) ? cfg.raiseError : "traceback") as RaiseErrorMode,
    enableFallback: cfg.enableFallback ?? cfg.fallback ?? true,
  };
}

function AdvancedFieldLabel({ label, hint, className }: { label: string; hint?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className ?? "mb-1.5"}`}>
      <span className="text-xs font-semibold text-zinc-900">{label}</span>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-zinc-400 hover:text-zinc-600">
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
        </Tooltip>
      )}
      <span className="text-[10px] text-zinc-400 font-medium">Optional</span>
    </div>
  );
}

export type ToolCodeViewHandle = {
  getSavePayload: () => ToolCodeSavePayload;
};

interface ToolCodeViewProps {
  toolData?: any;
  toolDraft?: any;
  inputs: BuilderInputField[];
  setInputs: React.Dispatch<React.SetStateAction<BuilderInputField[]>>;
  runInput: Record<string, string>;
  setRunInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isRunningTool: boolean;
  runCompositeTool: () => void;
  runHistory?: any[];
  liveRunState?: Record<string, any>;
  selectedRunId?: string | null;
  onDraftChange?: (data: ToolCodeSavePayload) => void;
  onDirtyChange?: () => void;
  isSaving?: boolean;
}

export const ToolCodeView = React.forwardRef<ToolCodeViewHandle, ToolCodeViewProps>(function ToolCodeView({
  toolData,
  toolDraft,
  inputs,
  setInputs,
  runInput,
  setRunInput,
  isRunningTool,
  runCompositeTool,
  runHistory = [],
  liveRunState = {},
  selectedRunId,
  onDraftChange,
  onDirtyChange,
  isSaving = false,
}, ref) {
  // Empty persisted steps (`[]`) are truthy — prefer the draft when toolData has no real steps yet
  const persistedSteps: any[] = Array.isArray(toolData?.steps) ? toolData.steps : [];
  const draftSteps: any[] = Array.isArray(toolDraft?.steps) ? toolDraft.steps : [];
  const steps: any[] = persistedSteps.length > 0 ? persistedSteps : draftSteps;
  const codeStep = steps.find(
    (s: any) => s.type === "PYTHON" || s.type === "JAVASCRIPT" || s.stepType === "PYTHON" || s.stepType === "JAVASCRIPT"
  ) || steps[0];

  const sourceCode = codeStep?.config?.code || codeStep?.code || "";
  const [code, setCode] = useState<string>(sourceCode);
  const [packages, setPackages] = useState<string[]>(Array.isArray(codeStep?.config?.packages) ? codeStep.config.packages : []);
  const [runtimeCommands, setRuntimeCommands] = useState<string[]>(Array.isArray(codeStep?.config?.runtimeCommands) ? codeStep.config.runtimeCommands : []);
  const [advanced, setAdvanced] = useState<CodeAdvancedSettings>(() => readAdvancedFromConfig(codeStep?.config));
  const [language, setLanguage] = useState(codeStep?.type === "JAVASCRIPT" || codeStep?.stepType === "JAVASCRIPT" ? "JAVASCRIPT" : "PYTHON");
  const [themeKey, setThemeKey] = useState("vscode-dark");
  const suppressDirty = useRef(true);
  const lastSyncedServerJson = useRef<string>("");
  const onDraftChangeRef = useRef(onDraftChange);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  const buildSavePayload = useCallback((): ToolCodeSavePayload => ({
    code,
    language,
    packages,
    runtimeCommands,
    inputs,
    advancedSettings: advanced,
  }), [code, language, packages, runtimeCommands, inputs, advanced]);

  React.useImperativeHandle(ref, () => ({
    getSavePayload: buildSavePayload,
  }), [buildSavePayload]);

  // Sync editor when AI builder generates/updates step code
  useEffect(() => {
    if (!sourceCode && !codeStep?.config) return;
    const nextPackages = Array.isArray(codeStep?.config?.packages) ? codeStep.config.packages : [];
    const nextRuntimeCommands = Array.isArray(codeStep?.config?.runtimeCommands) ? codeStep.config.runtimeCommands : [];
    const nextAdvanced = readAdvancedFromConfig(codeStep?.config);
    const nextLanguage = codeStep?.type === "JAVASCRIPT" || codeStep?.stepType === "JAVASCRIPT" ? "JAVASCRIPT" : "PYTHON";
    const serverFingerprint = JSON.stringify({
      code: sourceCode,
      packages: nextPackages,
      runtimeCommands: nextRuntimeCommands,
      advanced: nextAdvanced,
      language: nextLanguage,
    });
    if (serverFingerprint === lastSyncedServerJson.current) return;
    lastSyncedServerJson.current = serverFingerprint;

    suppressDirty.current = true;
    setCode(sourceCode);
    setPackages(nextPackages);
    setRuntimeCommands(nextRuntimeCommands);
    setAdvanced(nextAdvanced);
    setLanguage(nextLanguage);
  }, [
    sourceCode,
    codeStep?.type,
    codeStep?.stepType,
    codeStep?.config?.packages,
    codeStep?.config?.runtimeCommands,
    codeStep?.config?.backend,
    codeStep?.config?.sessionId,
    codeStep?.config?.longOutput,
    codeStep?.config?.gpus,
    codeStep?.config?.cpus,
    codeStep?.config?.memorySize,
    codeStep?.config?.sessionTimeout,
    codeStep?.config?.raiseError,
    codeStep?.config?.enableFallback,
  ]);

  // Keep parent draft in sync for the top Save button
  useEffect(() => {
    onDraftChangeRef.current?.(buildSavePayload());
  }, [buildSavePayload]);

  // Mark dirty only for local editor edits (not server sync / parent input remaps)
  useEffect(() => {
    if (suppressDirty.current) {
      suppressDirty.current = false;
      return;
    }
    onDirtyChangeRef.current?.();
  }, [code, packages, runtimeCommands, language, advanced]);

  const handleRun = useCallback(() => {
    runCompositeTool();
  }, [runCompositeTool]);

  const updateAdvanced = <K extends keyof CodeAdvancedSettings>(key: K, value: CodeAdvancedSettings[K]) => {
    setAdvanced((prev) => ({ ...prev, [key]: value }));
  };

  const updateRunValue = (fieldName: string, value: string) => {
    if (!fieldName) return;
    setRunInput((prev) => ({ ...prev, [fieldName]: value }));
  };

  const renameInputField = (index: number, nextName: string) => {
    setInputs((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const oldName = current.name;
      if (oldName && oldName !== nextName) {
        setRunInput((runPrev) => {
          if (!(oldName in runPrev)) return runPrev;
          const next = { ...runPrev };
          if (nextName && !(nextName in next)) {
            next[nextName] = next[oldName];
          }
          delete next[oldName];
          return next;
        });
      }
      return prev.map((f, i) => (i === index ? { ...f, name: nextName } : f));
    });
  };

  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);

  const [isOutputOpen, setIsOutputOpen] = useState(true);
  const [isStdoutOpen, setIsStdoutOpen] = useState(true);
  const [isErrorsOpen, setIsErrorsOpen] = useState(true);

  const currentRun = runHistory.find((r) => r.id === selectedRunId) || runHistory[0];

  // Output: liveRunState["outputs"].output while running, then the completed RunRecord.output
  const liveOutputState = liveRunState["outputs"];
  const runOutput = liveOutputState?.output !== undefined ? liveOutputState.output : currentRun?.output;

  // stdout / stderr: look through thinking-type log payloads for code step execution details
  const stepThinkingLog = currentRun?.logs?.find(
    (l) => l.type === "thinking" && l.payload && (l.payload.stdout !== undefined || l.payload.stderr !== undefined || l.payload.errors !== undefined)
  );
  const runStdout: string | undefined = stepThinkingLog?.payload?.stdout;
  const runErrors: string | undefined = stepThinkingLog?.payload?.errors ?? stepThinkingLog?.payload?.stderr ?? currentRun?.error;

  // Also collect all thinking log content lines as a fallback stdout display
  const thinkingLines = currentRun?.logs
    ?.filter((l) => l.type === "thinking" && l.content)
    .map((l) => l.content) ?? [];
  const stdoutDisplay = runStdout ?? (thinkingLines.length > 0 ? thinkingLines.join("\n") : undefined);


  const paramPrefix = (name: string) => `params.${name}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const addInput = (uiType: InputUiType) => {
    const meta = INPUT_TYPE_OPTIONS.find((o) => o.value === uiType)!;
    const name = `var_${inputs.length + 1}`;
    setInputs((prev) => [
      ...prev,
      {
        name,
        type: meta.baseType,
        uiType,
        required: true,
        fillMode: "manual",
      },
    ]);
  };

  const langExtension = useMemo(
    () => (language === "PYTHON" ? python() : javascript({ jsx: false, typescript: false })),
    [language]
  );

  const selectedTheme = THEMES[themeKey] ?? THEMES["vscode-dark"];

  const mainContent = (
    <div className="flex flex-col h-full bg-white relative">
      {/* Code Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Code Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme selector */}
          <div className="flex items-center gap-1.5 border-gray-200 pl-2">
            <span className="text-xs text-gray-400 shrink-0">Theme</span>
            <Select value={themeKey} onValueChange={setThemeKey}>
              <SelectTrigger className="h-8 text-xs bg-white w-40 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Object.entries(THEMES).map(([key, { label, dark }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dark ? "bg-zinc-700" : "bg-yellow-300 border border-gray-300"}`} />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expand button — only when right panel is collapsed */}
          {!isPanelOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900" onClick={() => setIsPanelOpen(true)}>
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Expand tool settings</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <CodeMirror
          value={code}
          onChange={setCode}
          theme={selectedTheme.ext}
          extensions={[langExtension]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
            indentOnInput: true,
          }}
          style={{ height: "100%", fontSize: "13px" }}
          height="100%"
        />
      </div>

      {/* Bottom collapsible bars */}
      <div className="border-t border-gray-200 bg-white shrink-0">
        {/* Output Section */}
        {(isRunningTool || (runOutput !== undefined && runOutput !== null && runOutput !== "")) && (
          <>
            <div
              className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => setIsOutputOpen(!isOutputOpen)}
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-indigo-500" />
                <span>Output</span>
                {isRunningTool && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Running
                  </span>
                )}
                {!isRunningTool && currentRun?.status === "success" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">✓ Done</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOutputOpen ? "rotate-180" : ""}`} />
            </div>
            {isOutputOpen && (
              <div className="p-3 bg-white border-b border-gray-100 max-h-64 overflow-y-auto">
                {runOutput !== undefined && runOutput !== null && runOutput !== "" ? (
                  <pre className="text-[11px] font-mono whitespace-pre-wrap text-emerald-700">
                    {typeof runOutput === 'object' ? JSON.stringify(runOutput, null, 2) : String(runOutput)}
                  </pre>
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">Waiting for output…</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Stdout Section */}
        {stdoutDisplay && (
          <>
            <div
              className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => setIsStdoutOpen(!isStdoutOpen)}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-500" />
                <span>stdout</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isStdoutOpen ? "rotate-180" : ""}`} />
            </div>
            {isStdoutOpen && (
              <div className="p-3 bg-zinc-950 border-b border-zinc-800 max-h-64 overflow-y-auto">
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-zinc-200">
                  {stdoutDisplay}
                </pre>
              </div>
            )}
          </>
        )}

        {/* Errors Section */}
        {runErrors && (
          <>
            <div
              className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm font-medium text-red-500 cursor-pointer hover:bg-red-50 select-none"
              onClick={() => setIsErrorsOpen(!isErrorsOpen)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Errors</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-red-400 transition-transform duration-200 ${isErrorsOpen ? "rotate-180" : ""}`} />
            </div>
            {isErrorsOpen && (
              <div className="p-3 bg-red-50 border-b border-red-100 max-h-64 overflow-y-auto">
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-red-800">
                  {String(runErrors)}
                </pre>
              </div>
            )}
          </>
        )}

        <div
          className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
          onClick={() => setIsPackagesOpen(!isPackagesOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-gray-100 rounded text-xs">📦</span>
            <span>Packages (PyPI)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isPackagesOpen ? "rotate-180" : ""}`} />
        </div>
        {isPackagesOpen && (
          <div className="p-3 bg-gray-50/50 space-y-2 border-b border-gray-100 max-h-48 overflow-y-auto">
            {packages.map((pkg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={pkg}
                  onChange={e => { const n = [...packages]; n[idx] = e.target.value; setPackages(n); }}
                  className="h-8 text-xs bg-white"
                  placeholder="e.g. requests"
                />
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs gap-1 text-gray-400 hover:text-indigo-500 shrink-0"
                  onClick={() => {
                    const n = [...packages];
                    n.splice(idx + 1, 0, "");
                    setPackages(n);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0" onClick={() => setPackages(packages.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full h-8 text-xs gap-2 bg-white" onClick={() => setPackages([...packages, ""])}>
              <Plus className="w-3.5 h-3.5" />
              New item
            </Button>
          </div>
        )}

        <div
          className="flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
          onClick={() => setIsCommandsOpen(!isCommandsOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-gray-100 rounded text-xs">💻</span>
            <span>Run time commands</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCommandsOpen ? "rotate-180" : ""}`} />
        </div>
        {isCommandsOpen && (
          <div className="p-3 bg-gray-50/50 space-y-2 border-t border-gray-100 max-h-48 overflow-y-auto">
            {runtimeCommands.map((cmd, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={cmd}
                  onChange={e => { const n = [...runtimeCommands]; n[idx] = e.target.value; setRuntimeCommands(n); }}
                  className="h-8 text-xs bg-white"
                  placeholder="e.g. apt-get install -y jq"
                />
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs gap-1 text-gray-400 hover:text-indigo-500 shrink-0"
                  onClick={() => {
                    const n = [...runtimeCommands];
                    n.splice(idx + 1, 0, "");
                    setRuntimeCommands(n);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0" onClick={() => setRuntimeCommands(runtimeCommands.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full h-8 text-xs gap-2 bg-white" onClick={() => setRuntimeCommands([...runtimeCommands, ""])}>
              <Plus className="w-3.5 h-3.5" />
              New item
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const sidePanelContent = (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Right Panel Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-sm text-gray-900">Tool settings</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-gray-700"
              onClick={() => setIsPanelOpen(false)}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Collapse tool settings</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Tabs defaultValue="inputs" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inputs" className="cursor-pointer">Inputs</TabsTrigger>
              <TabsTrigger value="advanced" className="cursor-pointer">Advanced</TabsTrigger>
            </TabsList>
            <p className="text-xs text-gray-400 mt-3 mb-1">
              These are accessible as keys of a{" "}
              <code className="bg-gray-100 px-1 rounded text-gray-600">params</code> object in your code.
            </p>
          </div>

          <ScrollArea className="flex-1 px-4">
            <TabsContent value="inputs" className="space-y-6 m-0 mt-2 pb-20">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <div className="text-xs font-semibold text-zinc-900">Inputs</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("text")}>
                    <Type className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Text
                  </Button>
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("long_text")}>
                    <AlignLeft className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Long text
                  </Button>
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("number")}>
                    <Hash className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Number
                  </Button>
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("json")}>
                    <Braces className="w-3.5 h-3.5 mr-1 text-zinc-400" /> JSON
                  </Button>
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("file_to_url")}>
                    <FileUp className="w-3.5 h-3.5 mr-1 text-zinc-400" /> File to URL
                  </Button>
                  <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700" onClick={() => addInput("table")}>
                    <TableIcon className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Table
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="h-7 px-2 text-xs text-zinc-700">
                        <MoreHorizontal className="w-3.5 h-3.5 mr-1 text-zinc-400" /> More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {INPUT_TYPE_OPTIONS.map((o) => {
                        const Icon = o.icon;
                        return (
                          <DropdownMenuItem key={o.value} onSelect={() => addInput(o.value)} className="font-normal cursor-pointer">
                            <Icon className="w-4 h-4 mr-2 text-zinc-400" />
                            {o.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {inputs.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setInputs((prev) => {
                        const oldIndex = prev.findIndex((_, i) => `input-${i}` === active.id);
                        const newIndex = prev.findIndex((_, i) => `input-${i}` === over.id);
                        if (oldIndex !== -1 && newIndex !== -1) {
                          return arrayMove(prev, oldIndex, newIndex);
                        }
                        return prev;
                      });
                    }
                  }}
                >
                  <div className="space-y-2 mt-4">
                    <SortableContext
                      items={inputs.map((_, i) => `input-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {inputs.map((field, realIdx) => {
                          const uiType = field.uiType ?? inferUiTypeFromProp({ type: field.type });

                          return (
                            <SortableSidebarInputWrapper key={`input-${realIdx}`} id={`input-${realIdx}`}>
                              <div className="rounded-lg border border-zinc-200 bg-white p-3 w-full">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={field.name}
                                    onChange={(e) => renameInputField(realIdx, e.target.value)}
                                    placeholder="variable_name"
                                    className="h-8 text-xs"
                                  />
                                  
                                  <div className="ml-auto flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-zinc-500">Required</span>
                                      <Switch
                                        checked={!!field.required}
                                        onCheckedChange={(checked) => setInputs((prev) => prev.map((f, i) => i === realIdx ? { ...f, required: checked } : f))}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setInputs((prev) => prev.filter((_, i) => i !== realIdx))}
                                      className="text-zinc-400 hover:text-red-500 cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  {uiType === "oauth_account" ? (
                                    <Select
                                      value={runInput[field.name] ?? (field.defaultValue as string) ?? ""}
                                      onValueChange={(val) => updateRunValue(field.name, val)}
                                    >
                                      <SelectTrigger className="h-9 text-xs font-normal">
                                        <SelectValue placeholder="Select connected account..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="demo_oauth_account" className="text-xs font-normal [&_span]:font-normal">
                                          Demo connected account
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : uiType === "checkbox" ? (
                                    <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                                      <div className="text-xs text-zinc-700">Value</div>
                                      <Switch
                                        checked={String(runInput[field.name] ?? field.defaultValue ?? "false") === "true"}
                                        onCheckedChange={(checked) => updateRunValue(field.name, checked ? "true" : "false")}
                                      />
                                    </div>
                                  ) : uiType === "long_text" ? (
                                    <Textarea
                                      value={runInput[field.name] ?? (field.defaultValue as string) ?? ""}
                                      onChange={(e) => updateRunValue(field.name, e.target.value)}
                                      placeholder="Type here..."
                                      className="min-h-[72px] text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                                    />
                                  ) : (
                                    <Input
                                      value={runInput[field.name] ?? (field.defaultValue != null ? String(field.defaultValue) : "")}
                                      onChange={(e) => updateRunValue(field.name, e.target.value)}
                                      placeholder="Type here..."
                                      className="h-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                                    />
                                  )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-500 font-mono text-[10px]">params.</span>
                                    <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono text-[10px]">
                                      {field.name || 'unnamed'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                    {field.type === 'number' ? (
                                      <Hash className="w-3 h-3 text-slate-400" />
                                    ) : field.type === 'boolean' ? (
                                      <Check className="w-3 h-3 text-slate-400" />
                                    ) : field.type === 'object' || field.type === 'array' ? (
                                      <Braces className="w-3 h-3 text-slate-400" />
                                    ) : (
                                      <Type className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span className="capitalize">{field.type}</span>
                                  </div>
                                </div>
                              </div>
                            </SortableSidebarInputWrapper>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </div>
                </DndContext>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">
                  No inputs defined yet.
                </div>
              )}
            </TabsContent>
            <TabsContent value="advanced" className="m-0 mt-2 pb-20 space-y-5">
              {/* Execution backend */}
              <div>
                <AdvancedFieldLabel
                  label="Backend"
                  hint="Where Python/JS code runs: Modal cloud, Daytona sandbox, or local Docker."
                />
                <Select
                  value={advanced.backend}
                  onValueChange={(val) => updateAdvanced("backend", val as CodeBackend)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                    <SelectValue placeholder="Select backend..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local" className="text-xs">local (Docker)</SelectItem>
                    <SelectItem value="modal" className="text-xs">modal</SelectItem>
                    <SelectItem value="daytona" className="text-xs">daytona</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Runtime Commands */}
              <div>
                <AdvancedFieldLabel
                  label="Runtime Commands"
                  hint="Shell commands run before your code (e.g. apt-get install -y jq)."
                />
                <div className="space-y-2">
                  {runtimeCommands.map((cmd, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={cmd}
                        onChange={(e) => {
                          const n = [...runtimeCommands];
                          n[idx] = e.target.value;
                          setRuntimeCommands(n);
                        }}
                        className="h-9 text-xs bg-white"
                        placeholder="e.g. apt-get update && apt-get install -y curl"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-gray-400 hover:text-red-500 shrink-0"
                        onClick={() => setRuntimeCommands(runtimeCommands.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs gap-2 bg-white"
                    onClick={() => setRuntimeCommands([...runtimeCommands, ""])}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New item
                  </Button>
                </div>
              </div>

              {/* Session ID */}
              <div>
                <AdvancedFieldLabel
                  label="Session ID"
                  hint="Reuse a warm session across runs when the backend supports it."
                />
                <Input
                  value={advanced.sessionId}
                  onChange={(e) => updateAdvanced("sessionId", e.target.value)}
                  placeholder="Type '{{' to select variable"
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Long Output */}
              <div className="flex items-center justify-between gap-3">
                <AdvancedFieldLabel
                  className="mb-0"
                  label="Enable 'Long Output' Mode"
                  hint="Allow larger stdout/result payloads without truncation."
                />
                <Checkbox
                  checked={advanced.longOutput}
                  onCheckedChange={(checked) => updateAdvanced("longOutput", checked === true)}
                />
              </div>

              {/* GPUs */}
              <div>
                <AdvancedFieldLabel label="Number of GPUs" hint="GPU count for Modal/Daytona backends that support accelerators." />
                <Select
                  value={String(advanced.gpus)}
                  onValueChange={(val) => updateAdvanced("gpus", Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">0</SelectItem>
                    <SelectItem value="1" className="text-xs">1</SelectItem>
                    <SelectItem value="2" className="text-xs">2</SelectItem>
                    <SelectItem value="4" className="text-xs">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CPUs */}
              <div>
                <AdvancedFieldLabel label="Number of CPU Cores" hint="CPU cores allocated to the code sandbox." />
                <Select
                  value={String(advanced.cpus)}
                  onValueChange={(val) => updateAdvanced("cpus", Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">1</SelectItem>
                    <SelectItem value="2" className="text-xs">2</SelectItem>
                    <SelectItem value="4" className="text-xs">4</SelectItem>
                    <SelectItem value="8" className="text-xs">8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Memory */}
              <div>
                <AdvancedFieldLabel label="Memory Size" hint="Memory limit in MB for the sandbox." />
                <Input
                  type="number"
                  min={128}
                  value={advanced.memorySize}
                  onChange={(e) => updateAdvanced("memorySize", Number(e.target.value) || 512)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Session Timeout */}
              <div>
                <AdvancedFieldLabel label="Session Timeout" hint="Max execution time in seconds before the sandbox is killed." />
                <Input
                  type="number"
                  min={1}
                  value={advanced.sessionTimeout}
                  onChange={(e) => updateAdvanced("sessionTimeout", Number(e.target.value) || 600)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Raise Error */}
              <div>
                <AdvancedFieldLabel
                  label="Raise Error"
                  hint="How Python exceptions are reported: full traceback, message only, or stderr."
                />
                <Select
                  value={advanced.raiseError}
                  onValueChange={(val) => updateAdvanced("raiseError", val as RaiseErrorMode)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traceback" className="text-xs">Raise Error with Traceback</SelectItem>
                    <SelectItem value="error" className="text-xs">Raise Error Message Only</SelectItem>
                    <SelectItem value="stderr" className="text-xs">Print Error to Stderr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enable fallback */}
              <div className="flex items-center justify-between gap-3 pb-2">
                <AdvancedFieldLabel
                  className="mb-0"
                  label="Enable fallback"
                  hint="If enabled, continue with fallback values when the step fails (when configured)."
                />
                <Checkbox
                  checked={advanced.enableFallback}
                  onCheckedChange={(checked) => updateAdvanced("enableFallback", checked === true)}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0">
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9 gap-2 text-sm"
            onClick={handleRun}
            disabled={isRunningTool || isSaving}
          >
            <Play className="w-3.5 h-3.5" />
            {isRunningTool ? "Running…" : isSaving ? "Saving…" : "Run tool"}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-gray-500">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ResizableSplitLayout
      MainContent={mainContent}
      SidePanelContent={sidePanelContent}
      isPanelOpen={isPanelOpen}
      sidePanelDefaultSize={35}
    />
  );
});
