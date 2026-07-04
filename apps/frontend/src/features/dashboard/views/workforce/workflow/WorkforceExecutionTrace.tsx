"use client";

import React, { useState } from "react";
import {
  Zap, Bot, Wrench, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, Code2, Play, ClipboardList, MessageSquare, Files,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingMessage, type ThinkingStep } from "@/entities/agents/components/StreamingMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionStep {
  stepId: string;
  name?: string;
  capability?: string;
  agentId?: string;
  status?: "completed" | "failed" | "running" | "skipped" | "pending";
  duration?: number;
  output?: any;
  error?: string;
  toolName?: string;
  skipped?: boolean;
  reason?: string;
}

export interface ExecutionTrace {
  executionId: string;
  workflowId?: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | string;
  summary?: string | null;
  output?: any;
  steps?: Record<string, any>;
  startedAt?: string;
  trigger?: string;
  workforceName?: string;
  triggerLabel?: string;
}

export interface ArtifactItem {
  id: string;
  label: string;
  stepId: string;
  stepName: string;
  content: string;
  type: "task" | "text" | "json";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getStepIcon(step: any) {
  const cap = (step.capability || "").toUpperCase();
  if (cap === "WORKFLOW_TRIGGER") return { Icon: Zap, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" };
  if (cap.includes("TOOL")) return { Icon: Wrench, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  if (cap === "GENERAL" || cap.includes("AGENT")) return { Icon: Bot, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" };
  return { Icon: Play, color: "text-zinc-600", bg: "bg-zinc-50 border-zinc-200" };
}

function getStepStatusInfo(result: any) {
  if (!result) return { label: "Pending", Icon: Clock, color: "text-zinc-400", dot: "bg-zinc-300" };
  if (result.skipped && result.reason === "NO_EXECUTOR_PLACEHOLDER") {
    return { label: "Skipped", Icon: AlertTriangle, color: "text-amber-500", dot: "bg-amber-400" };
  }
  const s = result.status?.toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS" || result.output != null) {
    return { label: "Completed", Icon: CheckCircle2, color: "text-emerald-600", dot: "bg-emerald-500" };
  }
  if (s === "FAILED" || result.error) {
    return { label: "Failed", Icon: XCircle, color: "text-red-500", dot: "bg-red-400" };
  }
  if (s === "RUNNING") {
    return { label: "Running", Icon: Loader2, color: "text-blue-500", dot: "bg-blue-400" };
  }
  return { label: "Done", Icon: CheckCircle2, color: "text-emerald-600", dot: "bg-emerald-500" };
}

// ─── Artifact Extraction ──────────────────────────────────────────────────────

/** Extracts all artifact items from a full trace for the sidebar */
export function collectArtifacts(
  steps: Record<string, any>,
  stepDefs?: Record<string, any>
): ArtifactItem[] {
  const artifacts: ArtifactItem[] = [];
  if (!steps) return artifacts;

  Object.entries(steps).forEach(([stepId, result]) => {
    const stepDef = stepDefs?.[stepId];
    const name = stepDef?.name || stepDef?.label || stepId;

    // Agent FSM internal steps (result.output array of { toolName, result })
    if (Array.isArray(result?.output) && result.output.length > 0 && result.output[0]?.hasOwnProperty?.("result")) {
      // Group by stepId so we only show the final successful attempt for a given step (if it was retried)
      const latestSteps = new Map();
      result.output.forEach((step: any) => {
        // If there's no stepId, use a random key to ensure it isn't deduplicated
        const key = step.stepId || Math.random().toString();
        latestSteps.set(key, step);
      });

      let artifactIndex = 0;
      latestSteps.forEach((step: any) => {
        if (!step.result || step.success === false) return;
        const stepLabel = step.toolName ? `[${step.toolName}]` : "Content";
        let extractedContent = "";
        if (typeof step.result === "string") {
          extractedContent = step.result;
        } else if (step.result !== null && typeof step.result === "object") {
          if (typeof step.result.content === "string") extractedContent = step.result.content;
          else if (typeof step.result.script === "string") extractedContent = step.result.script;
          else if (typeof step.result.text === "string") extractedContent = step.result.text;
          else if (typeof step.result.url === "string") {
            const isImage = step.toolName === 'generateImage' || step.result.url.match(/\.(jpeg|jpg|gif|png)$/i);
            extractedContent = isImage ? `![Generated Media](${step.result.url})\n\n**Prompt:** ${step.result.prompt || ''}` : `[View Generated Media](${step.result.url})\n\n**Prompt:** ${step.result.prompt || ''}`;
          }
          else extractedContent = "```json\n" + JSON.stringify(step.result, null, 2) + "\n```";
        }

        if (extractedContent && extractedContent !== "null") {
          artifacts.push({
            id: `${stepId}-step-${artifactIndex++}`,
            label: step.toolName || "Content",
            stepId,
            stepName: name,
            content: extractedContent,
            type: "text",
          });
        }
      });
      // Also include the agent final response
      const finalResponse = typeof result.result === "string" ? result.result : null;
      if (finalResponse) {
        artifacts.push({
          id: `${stepId}-final`,
          label: "Summary",
          stepId,
          stepName: name,
          content: finalResponse,
          type: "text",
        });
      }
      return;
    }

    // Task output
    const outputObj = result?.output ?? result?.result ?? result?.response;
    if (outputObj?.taskId && typeof outputObj.title === "string") {
      return;
    }

    // Plain text / string result
    if (typeof outputObj === "string" && outputObj.trim()) {
      artifacts.push({
        id: `${stepId}-text`,
        label: name,
        stepId,
        stepName: name,
        content: outputObj,
        type: "text",
      });
      return;
    }

    // Final agent response
    if (typeof result?.result === "string" && result.result.trim()) {
      artifacts.push({
        id: `${stepId}-result`,
        label: name,
        stepId,
        stepName: name,
        content: result.result,
        type: "text",
      });
    }
  });

  return artifacts;
}

// ─── Trigger Widget ───────────────────────────────────────────────────────────

export function TriggerWidget({
  prompt,
  workforceName,
  triggerLabel,
  executionId,
  timestamp,
}: {
  prompt: string;
  workforceName?: string;
  triggerLabel?: string;
  executionId?: string;
  timestamp?: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
          <Zap className="h-3 w-3 text-violet-600" />
        </div>
        <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Workforce Run</span>
        {timestamp && (
          <span className="ml-auto text-[10px] text-zinc-400 font-mono">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="bg-white border-2 border-violet-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 flex items-center gap-3 border-b border-violet-100">
          <div className="h-8 w-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center shadow-sm">
            <span className="text-sm font-black text-violet-700">
              {(workforceName || "W").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">
              {triggerLabel ? `Triggered by ${triggerLabel}` : "User Trigger"}
            </div>
            <div className="text-xs font-semibold text-zinc-800">{workforceName || "Workforce"}</div>
          </div>
          {executionId && (
            <div className="ml-auto font-mono text-[10px] text-zinc-400 bg-white/80 px-2 py-0.5 rounded-md border border-zinc-100">
              {executionId.slice(0, 8)}…
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="px-4 py-3">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Input Prompt</div>
          <p className="text-sm text-zinc-900 font-medium leading-relaxed">{prompt}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Task Output Card ─────────────────────────────────────────────────────────

function TaskOutputCard({ outputObj }: { outputObj: any }) {

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-100 bg-indigo-50">
        <ClipboardList className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Task Created</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <div className="font-semibold text-sm text-zinc-900">{outputObj.title}</div>
        {outputObj.description && outputObj.description !== outputObj.title && (
          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {outputObj.description.replace(/<[^>]+>/g, "")}
          </p>
        )}
        {outputObj.priority && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Priority</span>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase",
              outputObj.priority === "HIGH" ? "bg-red-100 text-red-600" :
                outputObj.priority === "URGENT" ? "bg-red-200 text-red-700" :
                  "bg-zinc-100 text-zinc-500"
            )}>
              {outputObj.priority}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Internal Steps ─────────────────────────────────────────────────────

function AgentStepsExpanded({ outputSteps, finalResponse, onOpenArtifact }: {
  outputSteps: any[];
  finalResponse?: string | null;
  onOpenArtifact?: (label: string, content: string) => void;
}) {
  // Group by stepId so we only show the final successful attempt for a given step (if it was retried)
  const latestSteps = new Map();
  outputSteps.forEach((step: any) => {
    // If there's no stepId, use a random key to ensure it isn't deduplicated
    const key = step.stepId || Math.random().toString();
    latestSteps.set(key, step);
  });
  const deduplicatedSteps = Array.from(latestSteps.values());

  return (
    <div className="space-y-2">
      {deduplicatedSteps.map((step: any, i: number) => {
        const isSuccess = step.success !== false;
        let content = "";
        if (typeof step.result === "string") {
          content = step.result;
        } else if (step.result !== null && typeof step.result === "object") {
          if (typeof step.result.content === "string") content = step.result.content;
          else if (typeof step.result.script === "string") content = step.result.script;
          else if (typeof step.result.text === "string") content = step.result.text;
          else if (typeof step.result.url === "string") {
            const isImage = step.toolName === 'generateImage' || step.result.url.match(/\.(jpeg|jpg|gif|png)$/i);
            content = isImage ? `![Generated Media](${step.result.url})\n\n**Prompt:** ${step.result.prompt || ''}` : `[View Generated Media](${step.result.url})\n\n**Prompt:** ${step.result.prompt || ''}`;
          }
          else content = "```json\n" + JSON.stringify(step.result, null, 2) + "\n```";
        }

        const isTruncated = content.length > 300;
        const preview = isTruncated ? content.slice(0, 300) + "…" : content;

        return (
          <div key={i} className={cn("rounded-lg border overflow-hidden",
            isSuccess ? "border-zinc-200 bg-white" : "border-red-100 bg-red-50/50"
          )}>
            <div className={cn("flex items-center gap-2 px-3 py-1.5 border-b",
              isSuccess ? "bg-zinc-50/80 border-zinc-100" : "bg-red-50 border-red-100"
            )}>
              {step.toolName ? (
                <Wrench className={cn("h-3 w-3 shrink-0", isSuccess ? "text-amber-500" : "text-red-400")} />
              ) : (
                <MessageSquare className="h-3 w-3 text-zinc-400 shrink-0" />
              )}
              <span className={cn("text-[10px] font-bold uppercase tracking-wider",
                isSuccess ? "text-zinc-600" : "text-red-500"
              )}>
                {step.toolName || "Content"}
              </span>
              {!isSuccess && <span className="ml-auto text-[10px] text-red-400 font-mono">{step.error}</span>}
              {isSuccess && onOpenArtifact && content && (
                <button
                  onClick={() => onOpenArtifact(step.toolName || "Content", content)}
                  className="ml-auto text-[10px] text-zinc-400 hover:text-indigo-600 cursor-pointer flex items-center gap-1"
                >
                  <Files className="h-2.5 w-2.5" /> View Artifact
                </button>
              )}
            </div>
            {isSuccess && content && content !== "null" && (
              <div className="px-3 py-2">
                <p className="text-[11px] text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap">{preview}</p>
              </div>
            )}
          </div>
        );
      })}

      {finalResponse && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-emerald-100 bg-emerald-50">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Summary</span>
            {onOpenArtifact && (
              <button
                onClick={() => onOpenArtifact("Summary", finalResponse)}
                className="ml-auto text-[10px] text-emerald-500 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
              >
                <Files className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap">{finalResponse}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  stepId,
  stepDef,
  result,
  isLast,
  thinkingSteps,
  currentNode,
  currentStep,
  streamingContent,
  isStreaming,
  onOpenArtifact,
}: {
  stepId: string;
  stepDef?: any;
  result?: any;
  isLast: boolean;
  thinkingSteps?: ThinkingStep[];
  currentNode?: string | null;
  currentStep?: string | null;
  streamingContent?: string;
  isStreaming?: boolean;
  onOpenArtifact?: (label: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { Icon: StepIcon, color: iconColor, bg: iconBg } = getStepIcon(stepDef || {});
  const { label: statusLabel, Icon: StatusIcon, color: statusColor, dot: dotColor } = getStepStatusInfo(result);

  const isRunning = statusLabel === "Running";
  const cap = (stepDef?.capability || "").toUpperCase();
  const isTrigger = cap === "WORKFLOW_TRIGGER";
  const isThisNodeStreaming = currentNode === stepId;

  React.useEffect(() => {
    if (isThisNodeStreaming || isRunning) setExpanded(true);
  }, [isThisNodeStreaming, isRunning]);

  if (isTrigger) return null;

  const name = stepDef?.name || stepDef?.label || stepId;
  const agentId = stepDef?.agentId;
  const nodeThinkingSteps = thinkingSteps?.filter(s => s.node === stepId) || [];

  // Determine output type
  const hasAgentSteps = Array.isArray(result?.output) && result.output.length > 0 && result.output[0]?.hasOwnProperty?.("result");
  const outputObj = result?.output ?? result?.result ?? result?.response;
  const isTaskOutput = !hasAgentSteps && outputObj?.taskId && typeof outputObj.title === "string";
  const finalResponse = hasAgentSteps
    ? (typeof result.result === "string" ? result.result : null)
    : null;

  // For plain tool nodes (no agent steps, no task)
  const plainOutputText = !hasAgentSteps && !isTaskOutput ? extractPlainText(result) : null;

  const hasDetail = hasAgentSteps || isTaskOutput || !!plainOutputText || !!result?.error
    || isThisNodeStreaming || nodeThinkingSteps.length > 0;

  // Count successful artifact steps for badge
  const artifactCount = hasAgentSteps
    ? result.output.filter((s: any) => s.success !== false && s.result).length + (finalResponse ? 1 : 0)
    : plainOutputText ? 1 : 0;

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-4 top-full h-4 w-px bg-zinc-200 z-0" />
      )}

      <div className={cn(
        "bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200",
        isRunning ? "border-blue-200 shadow-blue-50/60" : "border-zinc-200",
      )}>
        {/* Main row */}
        <button
          onClick={() => hasDetail && setExpanded(e => !e)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left",
            hasDetail && "cursor-pointer hover:bg-zinc-50/60 transition-colors"
          )}
        >
          {/* Icon */}
          <div className={cn("h-8 w-8 rounded-lg border flex items-center justify-center shrink-0", iconBg)}>
            <StepIcon className={cn("h-4 w-4", iconColor)} />
          </div>

          {/* Labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 truncate">{name}</span>
              {cap === "GENERAL" && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Agent
                </span>
              )}
              {cap.includes("TOOL") && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Tool
                </span>
              )}
              {artifactCount > 0 && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-md">
                  {artifactCount} output{artifactCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {agentId && (
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                Agent: {agentId.slice(0, 16)}…
              </div>
            )}
          </div>

          {/* Status */}
          <div className={cn("flex items-center gap-1.5 shrink-0", statusColor)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor, isRunning && "animate-pulse")} />
            <StatusIcon className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
            <span className="text-[11px] font-bold">{statusLabel}</span>
          </div>

          {/* Expand toggle */}
          {hasDetail && (
            <span className="text-zinc-400 ml-1 shrink-0">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
        </button>

        {/* Expanded output */}
        {expanded && hasDetail && (
          <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50/60 space-y-3">
            {result?.error && (
              <div className="text-xs text-red-600 font-mono bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                {result.error}
              </div>
            )}

            {(isThisNodeStreaming || nodeThinkingSteps.length > 0) && (
              <div>
                <StreamingMessage
                  thinkingSteps={nodeThinkingSteps}
                  currentStep={isThisNodeStreaming ? (currentStep ?? null) : null}
                  currentNode={isThisNodeStreaming ? (currentNode ?? null) : null}
                  streamingContent={isThisNodeStreaming ? (streamingContent ?? "") : ""}
                  isStreaming={isStreaming || false}
                  label={cap === "GENERAL" ? "Agent" : name}
                />
              </div>
            )}

            {hasAgentSteps && (
              <AgentStepsExpanded
                outputSteps={result.output}
                finalResponse={finalResponse}
                onOpenArtifact={onOpenArtifact}
              />
            )}

            {isTaskOutput && (
              <TaskOutputCard outputObj={outputObj} />
            )}

            {!hasAgentSteps && !isTaskOutput && plainOutputText && (
              <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-100 bg-zinc-50/80">
                  <Code2 className="h-3 w-3 text-zinc-500 shrink-0" />
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Output</span>
                  {onOpenArtifact && (
                    <button
                      onClick={() => onOpenArtifact("Output", plainOutputText)}
                      className="ml-auto text-[10px] text-zinc-400 hover:text-indigo-600 cursor-pointer flex items-center gap-1"
                    >
                      <Files className="h-2.5 w-2.5" /> View Artifact
                    </button>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-[11px] text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
                    {plainOutputText}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Extracts a human-readable string from a plain result (non-agent, non-task)
function extractPlainText(result: any): string {
  if (!result) return "";
  if (result.error) return "";

  const outputObj = result.output !== undefined && !Array.isArray(result.output)
    ? result.output
    : (result.result !== undefined ? result.result : result.response);

  if (!outputObj && typeof result.result === "string") return result.result;
  if (!outputObj) return "";
  if (typeof outputObj === "string") return outputObj;
  if (typeof outputObj.summary === "string") return outputObj.summary;
  if (typeof outputObj.text === "string") return outputObj.text;
  if (typeof outputObj.message === "string") return outputObj.message;

  // Skip task objects (handled separately)
  if (outputObj.taskId && typeof outputObj.title === "string") return "";

  // Don't show raw JSON for tool nodes if it's explicitly simple status. Otherwise show JSON
  if (typeof outputObj.result === "string") return outputObj.result;

  try { return JSON.stringify(outputObj, null, 2).slice(0, 2000); } catch { return ""; }
}

// ─── Final Summary Widget ─────────────────────────────────────────────────────

function FinalSummaryWidget({ status, summary, error, artifactCount, onViewArtifacts }: {
  status: string;
  summary?: string | null;
  error?: string | null;
  artifactCount?: number;
  onViewArtifacts?: () => void;
}) {
  const isCompleted = status === "COMPLETED";

  return (
    <div className={cn(
      "rounded-xl border-2 overflow-hidden shadow-sm",
      isCompleted ? "border-emerald-200 bg-white" : "border-red-200 bg-white"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b",
        isCompleted ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
      )}>
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          : <XCircle className="h-5 w-5 text-red-500" />}
        <span className={cn("text-sm font-bold", isCompleted ? "text-emerald-800" : "text-red-700")}>
          {isCompleted ? "Execution Completed" : "Execution Failed"}
        </span>
        {artifactCount && artifactCount > 0 && onViewArtifacts && (
          <button
            onClick={onViewArtifacts}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Files className="h-3 w-3" />
            {artifactCount} Artifact{artifactCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Body */}
      {(summary || error) && (
        <div className="px-4 py-3">
          <p className={cn("text-sm leading-relaxed", !isCompleted ? "text-red-700" : "text-zinc-700")}>
            {summary || error}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Execution Trace component ──────────────────────────────────────────

interface WorkforceExecutionTraceProps {
  trace: ExecutionTrace;
  stepDefs?: Record<string, any>;
  isPolling?: boolean;
  thinkingSteps?: ThinkingStep[];
  currentNode?: string | null;
  currentStep?: string | null;
  streamingContent?: string;
  isStreaming?: boolean;
  onOpenArtifact?: (label: string, content: string) => void;
  onViewArtifacts?: () => void;
}

export function WorkforceExecutionTrace({
  trace,
  stepDefs,
  isPolling,
  thinkingSteps,
  currentNode,
  currentStep,
  streamingContent,
  isStreaming,
  onOpenArtifact,
  onViewArtifacts,
}: WorkforceExecutionTraceProps) {
  const { steps, status, summary } = trace;

  const stepEntries = steps ? Object.entries(steps as Record<string, any>) : [];
  const isFinalised = status === "COMPLETED" || status === "FAILED";

  const artifacts = React.useMemo(() => {
    if (!steps) return [];
    return collectArtifacts(steps, stepDefs);
  }, [steps, stepDefs]);

  // Determine if the current streaming node is outside the completed/active steps list
  const isStreamingOutsideSteps = isStreaming && !!currentNode && !stepEntries.some(([sid]) => sid === currentNode);

  return (
    <div className="w-full space-y-3">
      {/* Step-by-step trace */}
      {stepEntries.length > 0 && (
        <div className="space-y-2">
          <div className="space-y-2 relative">
            {stepEntries.map(([sid, result], i) => (
              <StepCard
                key={sid}
                stepId={sid}
                stepDef={stepDefs?.[sid]}
                result={result}
                isLast={i === stepEntries.length - 1}
                thinkingSteps={thinkingSteps}
                currentNode={currentNode}
                currentStep={currentStep}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                onOpenArtifact={onOpenArtifact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standalone streaming block for orchestration/system steps not yet in the trace */}
      {isStreamingOutsideSteps && (
        <div className="relative pl-[1.125rem] border-l border-zinc-200 ml-4 pb-4">
          <div className="absolute top-1 -left-[0.3125rem] h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white ring-1 ring-blue-200" />
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
            System Processing
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
            <StreamingMessage
              thinkingSteps={thinkingSteps || []}
              currentStep={currentStep ?? null}
              currentNode={currentNode ?? null}
              streamingContent={streamingContent ?? ""}
              isStreaming={isStreaming || false}
              label="System"
            />
          </div>
        </div>
      )}

      {/* Polling spinner */}
      {isPolling && !isFinalised && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
          <span className="text-sm text-blue-700 font-medium">Workflow still running… checking for updates</span>
        </div>
      )}

      {/* Final status */}
      {isFinalised && (
        <FinalSummaryWidget
          status={status}
          summary={summary}
          error={trace.steps ? undefined : undefined}
          artifactCount={artifacts.length}
          onViewArtifacts={onViewArtifacts}
        />
      )}
    </div>
  );
}

// ─── Running indicator ────────────────────────────────────────────────────────

export function ExecutionRunningCard({ executionId, workforceName, prompt }: { executionId: string; workforceName: string; prompt: string }) {
  return (
    <div className="w-full bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center gap-3 border-b border-blue-100">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <span className="text-sm font-bold text-blue-800">Running Workflow</span>
        <span className="ml-auto font-mono text-[10px] text-blue-400">{executionId.slice(0, 8)}…</span>
      </div>
      <div className="px-4 py-3">
        <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Task</div>
        <p className="text-sm text-zinc-800 font-medium">{prompt}</p>
      </div>
    </div>
  );
}

// ─── Compact step summary ─────────────────────────────────────────────────────

export function StepSummaryBadges({ steps }: { steps: Record<string, any> }) {
  const entries = Object.entries(steps);
  const completed = entries.filter(([, v]) => !v?.skipped && !v?.error).length;
  const failed = entries.filter(([, v]) => v?.error || v?.status === "error").length;
  const skipped = entries.filter(([, v]) => v?.skipped).length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {completed > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-2.5 w-2.5" />{completed} done
        </span>
      )}
      {failed > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          <XCircle className="h-2.5 w-2.5" />{failed} failed
        </span>
      )}
      {skipped > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-2.5 w-2.5" />{skipped} skipped
        </span>
      )}
    </div>
  );
}
