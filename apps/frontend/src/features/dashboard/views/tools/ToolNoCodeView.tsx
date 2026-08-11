"use client";

import React, { useEffect, useState } from "react";
import { Play, MessageSquare, Wrench, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import type { RunRecord } from "@/entities/tools/hooks/useToolRun";
import { ToolRunProgressPanel } from "./ToolRunProgressPanel";

interface ToolNoCodeViewProps {
  toolData?: any;
  toolDraft?: any;
  inputs: BuilderInputField[];
  runInput: Record<string, string>;
  setRunInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isRunningTool: boolean;
  runCompositeTool: () => void;
  runHistory?: RunRecord[];
  selectedRunId?: string | null;
  onFixWithAi?: () => void;
  onSopChange?: (sop: string) => void;
}

export function ToolNoCodeView({
  toolData,
  toolDraft,
  inputs,
  runInput,
  setRunInput,
  isRunningTool,
  runCompositeTool,
  runHistory = [],
  selectedRunId = null,
  onFixWithAi,
  onSopChange,
}: ToolNoCodeViewProps) {
  const name = toolData?.name || toolDraft?.name || "Untitled Tool";
  const description = toolData?.description || toolDraft?.description || "";
  const sourceSop: string = toolData?.systemPrompt || toolDraft?.systemPrompt || "";

  const [sopDraft, setSopDraft] = useState(sourceSop);
  const [editingSop, setEditingSop] = useState(false);

  useEffect(() => {
    if (!editingSop) setSopDraft(sourceSop);
  }, [sourceSop, editingSop]);

  const currentRun =
    runHistory.find((r) => r.id === selectedRunId) || runHistory[0] || null;

  const updateRunValue = (fieldName: string, value: string) => {
    if (!fieldName) return;
    setRunInput((prev) => ({ ...prev, [fieldName]: value }));
  };

  const commitSop = () => {
    setEditingSop(false);
    if (sopDraft !== sourceSop) {
      onSopChange?.(sopDraft);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center px-6 py-6 space-y-5 max-w-2xl mx-auto w-full">

          {/* SOP Card — grey theme; click content to edit */}
          {(sopDraft || sourceSop || onSopChange) && (
            <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-600 uppercase tracking-wide">
                <span className="bg-zinc-200/80 p-1 rounded">
                  <ClipboardList className="w-3.5 h-3.5 text-zinc-600" />
                </span>
                <span>Standard Operating Procedure</span>
              </div>
              {editingSop && !isRunningTool ? (
                <Textarea
                  autoFocus
                  value={sopDraft}
                  onChange={(e) => setSopDraft(e.target.value)}
                  onBlur={commitSop}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSopDraft(sourceSop);
                      setEditingSop(false);
                    }
                  }}
                  className="min-h-[180px] text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed bg-white border-zinc-200 focus-visible:ring-zinc-400"
                  disabled={isRunningTool}
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    "w-full text-left space-y-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed rounded-lg -mx-1 px-1 py-1 transition-colors",
                    !isRunningTool && "hover:bg-zinc-100/80 cursor-text",
                    isRunningTool && "opacity-70 cursor-not-allowed",
                  )}
                  onClick={() => {
                    if (!isRunningTool) setEditingSop(true);
                  }}
                  disabled={isRunningTool}
                  title={isRunningTool ? undefined : "Click to edit SOP"}
                >
                  {sopDraft || (
                    <span className="text-zinc-400 italic">Click to add a Standard Operating Procedure…</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Tool Input Card */}
          <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900">{name}</h2>
            </div>

            <div className="px-5 py-5 space-y-5">
              {description && (
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              )}

              {inputs.length > 0 ? (
                inputs.map((field) => {
                  const isRequired = field.required;
                  return (
                    <div key={field.name} className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-800">
                        {field.label || field.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>
                      {field.description && (
                        <p className="text-xs text-gray-400 leading-snug">{field.description}</p>
                      )}
                      <Input
                        value={runInput[field.name] ?? (field.defaultValue != null ? String(field.defaultValue) : "")}
                        onChange={(e) => updateRunValue(field.name, e.target.value)}
                        placeholder={(field as any).placeholder ?? (field.defaultValue ? `e.g. ${field.defaultValue}` : "Type here...")}
                        className="font-mono text-sm disabled:opacity-60 disabled:bg-zinc-50"
                        disabled={isRunningTool}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No inputs defined yet. Continue building in the chat.
                </p>
              )}
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-10 gap-2 disabled:opacity-50"
                onClick={runCompositeTool}
                disabled={isRunningTool || inputs.length === 0}
              >
                <Play className="w-4 h-4" />
                {isRunningTool ? "Running…" : "Run"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 text-gray-500"
                disabled={isRunningTool}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ToolRunProgressPanel
            run={currentRun}
            isRunning={isRunningTool}
            onFixWithAi={onFixWithAi}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
