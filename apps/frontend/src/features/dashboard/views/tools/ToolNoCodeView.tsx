"use client";

import React from "react";
import { Play, MessageSquare, Wrench, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BuilderInputField } from "@/entities/tools/types/builder";

interface ToolNoCodeViewProps {
  toolData?: any;
  toolDraft?: any;
  inputs: BuilderInputField[];
  runInput: Record<string, string>;
  setRunInput: (v: Record<string, string>) => void;
  isRunningTool: boolean;
  runCompositeTool: () => void;
}

export function ToolNoCodeView({
  toolData,
  toolDraft,
  inputs,
  runInput,
  setRunInput,
  isRunningTool,
  runCompositeTool,
}: ToolNoCodeViewProps) {
  const name = toolData?.name || toolDraft?.name || "Untitled Tool";
  const description = toolData?.description || toolDraft?.description || "";
  const sop: string = toolData?.systemPrompt || toolDraft?.systemPrompt || "";

  return (
    <div className="flex flex-col h-full bg-white">
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center px-6 py-6 space-y-5 max-w-2xl mx-auto w-full">

          {/* SOP Card — only show if SOP exists */}
          {sop && (
            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                <span className="bg-blue-100 p-1 rounded">
                  <ClipboardList className="w-3.5 h-3.5" />
                </span>
                <span>Standard Operating Procedure</span>
              </div>
              <div className="space-y-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {sop}
              </div>
            </div>
          )}

          {/* Tool Input Card */}
          <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900">{name}</h2>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Description */}
              {description && (
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              )}

              {/* Input Fields */}
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
                        value={runInput[field.name] ?? field.defaultValue ?? ""}
                        onChange={(e) =>
                          setRunInput({ ...runInput, [field.name]: e.target.value })
                        }
                        placeholder={(field as any).placeholder ?? (field.defaultValue ? `e.g. ${field.defaultValue}` : "Type here...")}
                        className="font-mono text-sm"
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

            {/* Action Bar */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-10 gap-2"
                onClick={runCompositeTool}
                disabled={isRunningTool || inputs.length === 0}
              >
                <Play className="w-4 h-4" />
                {isRunningTool ? "Running…" : "Run"}
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 text-gray-500">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
