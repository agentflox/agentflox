"use client";

import React from "react";
import { Play, Settings, Type, MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BuilderInputField } from "@/entities/tools/types/builder";

interface ToolCodeViewProps {
  toolData?: any;
  toolDraft?: any;
  inputs: BuilderInputField[];
  runInput: Record<string, string>;
  setRunInput: (v: Record<string, string>) => void;
  isRunningTool: boolean;
  runCompositeTool: () => void;
}

export function ToolCodeView({
  toolData,
  toolDraft,
  inputs,
  runInput,
  setRunInput,
  isRunningTool,
  runCompositeTool,
}: ToolCodeViewProps) {
  // Extract code from steps — prefer toolData, fall back to toolDraft
  const steps: any[] = toolData?.steps || (toolDraft?.steps as any[]) || [];
  const codeStep = steps.find(
    (s: any) => s.type === "PYTHON" || s.type === "JAVASCRIPT" || s.stepType === "PYTHON" || s.stepType === "JAVASCRIPT"
  ) || steps[0];
  const rawCode: string = codeStep?.config?.code || codeStep?.code || "";
  const codeLines = rawCode ? rawCode.split("\n") : ["# No code generated yet."];

  // Tool display name from params reference
  const paramPrefix = (name: string) =>
    `params.${name}`;

  return (
    <div className="flex w-full h-full divide-x divide-gray-200 overflow-hidden">
      {/* ── Left Pane: Code Editor ── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative min-w-0">
        <ScrollArea className="flex-1 w-full font-mono text-sm pb-20">
          <div className="p-4">
            {codeLines.map((line, idx) => (
              <div key={idx} className="flex leading-5">
                <span className="w-9 text-right pr-4 text-gray-300 select-none shrink-0 text-xs pt-[1px]">
                  {idx + 1}
                </span>
                <span className="text-gray-800 whitespace-pre">{line || " "}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom collapsible bars */}
        <div className="border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-gray-100 rounded text-xs">📦</span>
              <span>Packages (PyPI)</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-gray-100 rounded text-xs">💻</span>
              <span>Run time commands</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ── Right Pane: Tool Settings ── */}
      <div className="w-[360px] flex flex-col bg-white shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-sm text-gray-900">Tool settings</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Dark mode</span>
            <Switch />
          </div>
        </div>

        <Tabs defaultValue="inputs" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <p className="text-xs text-gray-400 mt-3 mb-1">
              These are accessible as keys of a{" "}
              <code className="bg-gray-100 px-1 rounded text-gray-600">params</code> object in your code.
            </p>
          </div>

          <ScrollArea className="flex-1 px-4">
            <TabsContent value="inputs" className="space-y-3 m-0 mt-2 pb-20">
              {inputs.length > 0 ? (
                inputs.map((field) => (
                  <div key={field.name} className="p-3 border border-gray-200 rounded-lg space-y-2 bg-white">
                    {/* Field header */}
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-gray-900">
                        {field.label || field.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Required</span>
                        <Switch checked={field.required} disabled />
                        <Settings className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>

                    {/* Description */}
                    {field.description && (
                      <p className="text-xs text-gray-400 leading-snug">{field.description}</p>
                    )}

                    {/* Value input */}
                    <div className="relative">
                      <Input
                        value={runInput[field.name] ?? (typeof field.defaultValue === 'string' ? field.defaultValue : "")}
                        onChange={(e) =>
                          setRunInput({ ...runInput, [field.name]: e.target.value })
                        }
                        placeholder={field.placeholder ?? (typeof field.defaultValue === "string" ? field.defaultValue : "Type here...")}
                        className="font-mono text-sm pr-10 text-xs"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 border rounded px-1 py-0.5 bg-gray-50 text-[10px] text-gray-400 font-mono">
                        abc
                      </div>
                    </div>

                    {/* Param reference footer */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-gray-100">
                      <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                        <Type className="w-3 h-3" />
                        {paramPrefix(field.name)}
                      </span>
                      <span className="bg-gray-100 px-1.5 rounded text-[10px] font-mono text-gray-500">
                        T {field.type === "number" ? "Number" : "String"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">
                  No inputs defined yet.
                </div>
              )}
            </TabsContent>
            <TabsContent value="advanced" className="m-0 mt-2">
              <div className="text-sm text-gray-400 text-center py-8">
                Advanced settings coming soon.
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Action Bar */}
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0">
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9 gap-2 text-sm"
            onClick={runCompositeTool}
            disabled={isRunningTool}
          >
            <Play className="w-3.5 h-3.5" />
            {isRunningTool ? "Running…" : "Run tool"}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-gray-500">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
