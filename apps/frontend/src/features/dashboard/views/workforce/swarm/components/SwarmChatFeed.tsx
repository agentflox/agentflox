import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, XCircle, Shield, Check, Zap,
  AlertTriangle, Loader2, ChevronDown, X, AtSign, Layers, Pencil,
  Clock, Terminal, Brain, MessageSquare, ShieldAlert, Play, Files, ArrowRight,
  Sparkles, Eye, EyeOff, ChevronRight, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingMessage } from "@/entities/agents/components/StreamingMessage";
import { type SwarmTask } from "./SwarmTaskView";
import ReactMarkdown from "react-markdown";

// Helper to parse inspect tasks list
const parseInspectTasks = (detail: string) => {
  if (!detail) return [];
  return detail.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { title: '', status: 'PENDING' };
    if (trimmed.toLowerCase().includes('backlog tasks')) return { title: '', status: 'PENDING' };

    // Match • Task Title [STATUS]
    const matchWithStatus = trimmed.match(/^•\s*(.*?)\s*\[([^\]]+)\]$/);
    if (matchWithStatus) {
      return {
        title: matchWithStatus[1].trim(),
        status: matchWithStatus[2].trim()
      };
    }

    // Match • Task Title
    const matchBullet = trimmed.match(/^•\s*(.*)$/);
    if (matchBullet) {
      return {
        title: matchBullet[1].trim(),
        status: 'PENDING'
      };
    }

    // Fallback: match without bullet
    return {
      title: trimmed.replace(/^•\s*/, '').trim(),
      status: 'PENDING'
    };
  }).filter(t => t.title.length > 0);
};

const renderUserMessageTokens = (content: string, mentions?: any[]) => {
  if (!content) return "";

  // Match [@Name], [#Name], @Name, #Name. Be greedy inside brackets to allow spaces in names.
  const regex = /(\[[@#][^\]]+\]|@[^\s]+|#[^\s]+)/g;
  const parts = content.split(regex);

  return parts.map((part, idx) => {
    let isMention = false;
    let name = "";
    let prefix = "";

    if (part.startsWith('[@') && part.endsWith(']')) {
      isMention = true;
      prefix = '@';
      name = part.slice(2, -1);
    } else if (part.startsWith('[#') && part.endsWith(']')) {
      isMention = true;
      prefix = '#';
      name = part.slice(2, -1);
    } else if (part.startsWith('@')) {
      isMention = true;
      prefix = '@';
      name = part.slice(1);
    } else if (part.startsWith('#')) {
      isMention = true;
      prefix = '#';
      name = part.slice(1);
    }

    if (isMention) {
      if (prefix === '@') {
        return (
          <span key={idx} className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-100/80 text-[10.5px] font-sans">
            <AtSign className="h-3 w-3 text-purple-500 flex-shrink-0" />
            {name}
          </span>
        );
      } else {
        return (
          <span key={idx} className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100/80 text-[10.5px] font-sans">
            <Files className="h-3 w-3 text-indigo-500 flex-shrink-0" />
            {name}
          </span>
        );
      }
    }

    return part;
  });
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ConvMessage {
  role: "user" | "assistant";
  content: string;
  executionId?: string;
  swarmEvent?: { type: string; payload: any; timestamp: string } | null;
  ts: number;
  meta?: { mentions?: any[]; contexts?: any[]; responder?: string; suggestedActions?: any[] } | null;
}

export interface SwarmEvent {
  sessionId: string;
  type: string;
  payload: any;
  timestamp: string;
}

export interface TaskExecutionStep {
  id: string;
  type: string; // 'assign' | 'progress' | 'thinking' | 'tool_call' | 'tool_result' | 'comm' | 'cross_check' | 'hitl' | 'completed' | 'failed'
  timestamp: string;
  detail: string;
  category?: string;
  payload?: any;
}

export interface TaskExecution {
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'hitl';
  ts: number;
  steps: TaskExecutionStep[];
  result?: string;
  error?: string;
  suggestedActions?: any[];
  artifacts?: { filename: string; content: string; detail?: string }[];
  pipeline?: string[];
  currentStepIndex?: number;
  blockedByTitles?: string[];
  metadata?: any;
}

type SessionStatus = "idle" | "running" | "stopped";

// ─── HITL Request Card ────────────────────────────────────────────────────────
export function HitlRequestCard({ task, onApprove, onDeny }: { task: SwarmTask; onApprove: (id: string) => void; onDeny: (id: string) => void }) {
  return (
    <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-xl shadow-inner px-4 py-3 w-full">
      <div className="flex items-start gap-2 mb-2">
        <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-0.5">Human Review Required</span>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">{task.title}</p>
          {task.metadata?.approvalReason && (
            <p className="text-[11px] text-amber-800 italic mt-1 leading-snug">{task.metadata.approvalReason}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => onApprove(task.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          onClick={() => onDeny(task.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-red-50 active:bg-red-100 text-red-600 text-[11px] font-bold rounded-lg border border-red-200 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" /> Deny
        </button>
      </div>
    </div>
  );
}

// ─── Task Result Card ─────────────────────────────────────────────────────────
export function TaskResultCard({ payload, time }: { payload: any; time: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = !!payload.result;
  const isHtml = hasResult && /^\s*<[a-z][\s\S]*>/i.test(payload.result);
  return (
    <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl px-4 py-3 w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Task Completed</span>
        <span className="text-[9px] text-emerald-400">{time}</span>
      </div>
      <p className="font-semibold text-sm text-emerald-900 leading-snug">{payload.taskTitle}</p>
      {payload.agentName && <p className="text-[10px] text-emerald-600 mt-0.5">via {payload.agentName}</p>}
      {hasResult && (
        <div className="mt-2 relative">
          <div
            className={cn(
              "bg-white border border-emerald-100 rounded-lg p-2.5 text-[10.5px] leading-relaxed shadow-sm overflow-hidden transition-all duration-300",
              isHtml ? "prose prose-sm max-w-none" : "font-mono text-emerald-800",
              !expanded && "max-h-20"
            )}
            style={!expanded ? { WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)", maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)" } : {}}
          >
            {isHtml ? <div dangerouslySetInnerHTML={{ __html: payload.result }} /> : payload.result}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold transition-colors cursor-pointer"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Collapse" : "Show full output"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Coordinator Tick ─────────────────────────────────────────────────────────
export function CoordinatorTick({ agentLabel, time }: { agentLabel: string; time: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 px-1">
      <div className="flex-1 h-px bg-zinc-100" />
      <span className="text-[9px] text-zinc-400 font-mono whitespace-nowrap">{agentLabel} · {time}</span>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  );
}

// ─── Inter-Agent Message ──────────────────────────────────────────────────────
export function InterAgentMessage({ payload, time }: { payload: any; time: string }) {
  const sender = payload.fromName || (payload.from ? payload.from.slice(0, 8) : "Agent");
  const receiver = payload.toName || (payload.to ? payload.to.slice(0, 8) : "Agent");

  // Initials for avatar
  const senderInitials = sender
    ? sender
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A"
    : "A";
  const receiverInitials = receiver
    ? receiver
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "B"
    : "B";

  return (
    <div className="my-3 pl-8 relative">
      {/* Connecting dotted lines */}
      <div className="absolute left-4 top-0 bottom-0 border-l-2 border-dotted border-teal-200" />

      <div className="bg-teal-50/40 border border-teal-100 rounded-2xl p-3 shadow-sm hover:border-teal-200 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm">
            {senderInitials}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 uppercase tracking-wider">
            <span>{sender}</span>
            <ArrowRight className="h-3 w-3 text-teal-400" />
            <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm">
              {receiverInitials}
            </div>
            <span>{receiver}</span>
          </div>
          <span className="ml-auto text-[9px] text-teal-400 font-mono">{time}</span>
        </div>
        <div className="bg-white/85 border border-teal-50/50 rounded-xl p-2.5 text-xs text-teal-950 font-medium leading-relaxed whitespace-pre-wrap">
          {payload.detail || payload.content}
        </div>
      </div>
    </div>
  );
}

// ─── Final Output Bubble ──────────────────────────────────────────────────────
export function FinalOutputBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pr-1">
        <CheckCircle2 className="h-3 w-3" /> Swarm complete
      </span>
      <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm whitespace-pre-wrap max-w-[90%] ring-2 ring-indigo-500/40 shadow-lg">
        {content}
      </div>
    </div>
  );
}


export function SwarmFeedMessage({
  avatarInitials,
  avatarBgClass,
  agentName,
  badgeLabel,
  badgeType,
  timestamp,
  content,
  attachment,
  isLoading,
  reasoning,
}: {
  avatarInitials: string;
  avatarBgClass: string;
  agentName: string;
  badgeLabel: string;
  badgeType: 'dispatch' | 'status' | 'result' | 'pending';
  timestamp: string;
  content: React.ReactNode;
  attachment?: {
    filename: string;
    detail: string;
    isExpanded: boolean;
    rawResult?: string;
    onClick?: () => void;
  };
  isLoading?: boolean;
  reasoning?: {
    detail: string;
    time: string;
  };
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const badgeColors = {
    dispatch: "bg-emerald-50 text-emerald-700 border-emerald-250/30",
    status: "bg-blue-50 text-blue-700 border-blue-200/40",
    result: "bg-emerald-50 text-emerald-700 border-emerald-250/30",
    pending: "bg-amber-50 text-amber-700 border-amber-250/30",
  };

  return (
    <div className="flex gap-3 py-2.5 w-full animate-fadeIn group">
      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm flex-shrink-0 border", avatarBgClass)}>
        {avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-zinc-900">{agentName}</span>
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", badgeColors[badgeType])}>
            {badgeLabel}
          </span>
          <span className="text-[9px] text-zinc-400 font-mono">{timestamp}</span>
        </div>
        <div className={cn(
          "text-xs text-zinc-800 font-medium leading-relaxed font-sans prose prose-sm max-w-none prose-strong:font-bold",
          typeof content === 'string' && "whitespace-pre-wrap"
        )}>
          {content}
        </div>

        {reasoning && (
          <div className="mt-2 max-w-[90%]">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-[10px] font-bold text-violet-650 hover:text-violet-800 transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
            >
              <Brain className="h-3 w-3 animate-pulse" />
              {showReasoning ? "Hide Reasoning" : "Show Coordinator Reasoning"}
            </button>
            {showReasoning && (
              <div className="mt-1.5 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/20 border border-violet-100 rounded-xl p-3 shadow-sm text-xs leading-relaxed font-sans prose prose-sm max-w-none text-zinc-800">
                <ReactMarkdown>{reasoning.detail}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {attachment && (
          <div className="space-y-2">
            <div className="mt-2.5 max-w-[90%] bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-zinc-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <Files className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-800 truncate">{attachment.filename}</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{attachment.detail}</p>
                </div>
              </div>
              <button
                onClick={attachment.onClick}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded hover:bg-zinc-150/40 flex items-center gap-0.5 flex-shrink-0 cursor-pointer"
              >
                {attachment.isExpanded ? "Hide" : "View"} <span className="text-[10px]"></span>
              </button>
            </div>
            {attachment.isExpanded && (
              <div className="max-w-[90%] bg-white border border-zinc-150 rounded-xl p-4 shadow-sm text-xs leading-relaxed font-sans prose prose-sm max-w-none text-zinc-800 overflow-y-auto max-h-[300px]">
                <ReactMarkdown>
                  {typeof attachment.rawResult === 'string'
                    ? attachment.rawResult
                    : (attachment.rawResult as any)?.content ||
                    (attachment.rawResult as any)?.result ||
                    (attachment.rawResult as any)?.summary ||
                    (attachment.rawResult && JSON.stringify(attachment.rawResult, null, 2)) ||
                    "No content available."}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-1 mt-2 pl-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce duration-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce duration-500 delay-150" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce duration-500 delay-300" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Active Processing Widget ─────────────────────────────────────────────────
export function ActiveProcessingWidget({ events, status }: { events: SwarmEvent[]; status: SessionStatus }) {
  if (status === "idle") return null;
  if (status === "stopped") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Session complete
      </div>
    );
  }
  const latest = events.find(e => e.type === "CYCLE_INSPECT");
  if (!latest) return (
    <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-semibold">
      <Loader2 className="h-3 w-3 animate-spin" /> Swarm initializing…
    </div>
  );
  const count = latest.payload?.taskCount ?? latest.payload?.taskIds?.length ?? 0;
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold">
      {count > 0 ? `Coordinator inspecting ${count} tasks…` : "Coordinator scanning backlog…"}
    </div>
  );
}

// ─── parseToolDetail ──────────────────────────────────────────────────────────
// Parses both the verbose "Calling tool: X with arguments: {...}" format
// and the compact backend format "toolName (arg: val)" or "toolName..."
const parseToolDetail = (detail: string): { toolName: string; args: string } | null => {
  if (!detail) return null;

  // Format 1: "Calling tool: toolName with arguments: {...}"
  const verboseMatch = detail.match(/Calling tool:\s*([a-zA-Z0-9_\-]+)\s*(?:with arguments:|with args:|args:)?\s*([\s\S]*)/i);
  if (verboseMatch) {
    const toolName = verboseMatch[1];
    const argsStr = verboseMatch[2].trim();
    try {
      const parsedArgs = JSON.parse(argsStr);
      return { toolName, args: JSON.stringify(parsedArgs, null, 2) };
    } catch {
      return { toolName, args: argsStr };
    }
  }

  // Format 2: "toolName (arg: val, arg2: val2)"  Ecompact format emitted by agentExecutorService
  const compactMatch = detail.match(/^([a-zA-Z0-9_\-]+)\s*\((.+)\)$/);
  if (compactMatch) {
    return { toolName: compactMatch[1], args: compactMatch[2] };
  }

  // Format 3: "toolName..."  Ejust tool name with ellipsis
  const bareMatch = detail.match(/^([a-zA-Z0-9_\-]+)\.{2,}$/);
  if (bareMatch) {
    return { toolName: bareMatch[1], args: '' };
  }

  // Format 4: "toolName ↁEresult" (tool_result format)
  const resultMatch = detail.match(/^([a-zA-Z0-9_\-]+)\s*→\s*([\s\S]*)$/);
  if (resultMatch) {
    return { toolName: resultMatch[1], args: resultMatch[2].trim() };
  }

  // Fallback: first word is tool name
  const firstWord = detail.split(/[\s(\.]/)[0];
  if (firstWord && /^[a-zA-Z0-9_\-]+$/.test(firstWord) && firstWord.length > 2) {
    return { toolName: firstWord, args: detail.slice(firstWord.length).trim().replace(/^[\s(]+|[)\s]+$/g, '') };
  }

  return null;
};

const groupSteps = (steps: TaskExecutionStep[]) => {
  const groups: Array<{
    id: string;
    type: 'ai_group' | 'single';
    timestamp: string;
    thinking?: TaskExecutionStep;
    toolCall?: TaskExecutionStep;
    toolResult?: TaskExecutionStep;
    step?: TaskExecutionStep;
  }> = [];

  for (let i = 0; i < steps.length; i++) {
    const current = steps[i];

    // AI thinking steps (includes 'thinking' from AGENT_LIVE_PROGRESS category)
    if (current.type === 'thinking') {
      const group: any = {
        id: current.id,
        type: 'ai_group',
        timestamp: current.timestamp,
        thinking: current,
      };

      // Peek if next is tool_call
      if (i + 1 < steps.length && steps[i + 1].type === 'tool_call') {
        group.toolCall = steps[i + 1];
        i++; // consume tool_call

        // Peek if next is tool_result
        if (i + 1 < steps.length && steps[i + 1].type === 'tool_result') {
          group.toolResult = steps[i + 1];
          i++; // consume tool_result
        }
      }
      groups.push(group);
    } else if (current.type === 'tool_call') {
      // Standalone tool_call (no preceding thinking)  Ecreate an ai_group from it
      const group: any = {
        id: current.id,
        type: 'ai_group',
        timestamp: current.timestamp,
        toolCall: current,
      };
      // Peek if next is tool_result
      if (i + 1 < steps.length && steps[i + 1].type === 'tool_result') {
        group.toolResult = steps[i + 1];
        i++;
      }
      groups.push(group);
    } else {
      groups.push({
        id: current.id,
        type: 'single',
        timestamp: current.timestamp,
        step: current,
      });
    }
  }

  return groups;
};

const getGroupLastTimestamp = (group: any) => {
  if (group.type === 'single') {
    return new Date(group.step.timestamp).getTime();
  }
  const timestamps = [
    group.toolResult?.timestamp,
    group.toolCall?.timestamp,
    group.thinking?.timestamp
  ].filter(Boolean);
  if (timestamps.length > 0) {
    return new Date(timestamps[0]).getTime();
  }
  return 0;
};

export function GroupedAiStepRow({
  group,
  startTimeMs,
  prevTimestampMs,
  isLatestRunningStep,
}: {
  group: any;
  startTimeMs: number;
  prevTimestampMs: number;
  isLatestRunningStep: boolean;
}) {
  // Step details are expanded by default so user can see detailed thinking/tool details easily in real time
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (isLatestRunningStep) {
      setIsExpanded(true);
    }
  }, [isLatestRunningStep]);

  const thinking = group.thinking;
  const toolCall = group.toolCall;
  const toolResult = group.toolResult;
  const isRunning = isLatestRunningStep;

  // Calculate duration label from timestamps
  let durationMs = 0;
  if (thinking || toolCall) {
    const startTs = new Date(thinking?.timestamp || toolCall?.timestamp || '').getTime();
    const endTs = toolResult
      ? new Date(toolResult.timestamp).getTime()
      : isRunning ? Date.now() : startTs;
    durationMs = endTs - startTs;
  }
  const durationLabel = durationMs > 0 ? (() => {
    const s = Math.round(durationMs / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  })() : '';

  // Parse tool call if available
  const parsedTool = toolCall ? parseToolDetail(toolCall.detail) : null;
  const toolName = parsedTool?.toolName || toolCall?.payload?.toolName || 'tool';

  // Time label
  const time = new Date(thinking?.timestamp || toolCall?.timestamp || '').toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  // Collapsed header label
  const collapsedLabel = toolCall
    ? `Used ${toolName}${durationLabel ? ` · ${durationLabel}` : ''}`
    : thinking
      ? `Reasoned${durationLabel ? ` for ${durationLabel}` : ''}…`
      : 'Processing…';

  return (
    <div className="relative group/step animate-fadeIn">
      {/* Timeline bullet with pulsing dot when running */}
      <div className={cn(
        "absolute -left-[25px] top-[13px] h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shadow",
        isRunning ? "bg-amber-400 ring-4 ring-amber-100" : toolCall ? "bg-indigo-400" : "bg-violet-400"
      )}>
        {isRunning
          ? <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          : toolCall
            ? <Terminal className="h-2 w-2 text-white" />
            : <Brain className="h-2 w-2 text-white" />
        }
      </div>

      <div className={cn(
        "rounded-2xl border text-xs transition-all duration-200 overflow-hidden",
        isRunning
          ? "border-amber-200 bg-gradient-to-br from-amber-50/60 to-white shadow-md shadow-amber-100/50"
          : toolCall
            ? "border-indigo-100 bg-white shadow-sm"
            : "border-violet-100 bg-white shadow-sm"
      )}>

        {/* ── Header row (always visible) ── */}
        <button
          onClick={() => setIsExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-zinc-50/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin flex-shrink-0" />
            ) : toolCall ? (
              <Check className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
            ) : (
              <Check className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
            )}
            <span className={cn(
              "font-semibold text-[11.5px] truncate",
              isRunning ? "text-amber-800" : "text-zinc-700"
            )}>
              {isRunning
                ? (toolCall ? `Calling ${toolName}…` : thinking ? 'Thinking…' : 'Processing…')
                : collapsedLabel
              }
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-[9px] text-zinc-400 font-mono">{time}</span>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isExpanded ? "rotate-180 text-zinc-500" : "text-zinc-300"
            )} />
          </div>
        </button>

        {/* ── Expanded detail panel ── */}
        {isExpanded && (
          <div className="border-t border-zinc-100">

            {/* AI Thinking / Reasoning block */}
            {thinking && (
              <div className="px-3.5 pt-3 pb-2.5">
                <StreamingMessage
                  thinkingSteps={[]}
                  currentStep={isRunning ? "Thinking..." : null}
                  currentNode={null}
                  streamingContent={thinking.detail || ''}
                  isStreaming={isRunning}
                  label="AI Reasoning"
                />
              </div>
            )}

            {/* Tool call block */}
            {toolCall && (
              <div className={cn("px-3.5 pb-3", thinking ? "pt-0" : "pt-3")}>
                {/* Tool header badge */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                    <Terminal className="h-2.5 w-2.5 text-indigo-500" />
                    <span className="text-[8.5px] font-black text-indigo-600 uppercase tracking-widest">Tool Call</span>
                  </div>
                  <code className="bg-indigo-100/80 text-indigo-800 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-indigo-200/50">
                    {toolName}
                  </code>
                </div>

                {/* Arguments */}
                {parsedTool?.args && (
                  <div className="mb-2">
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Input Arguments
                    </div>
                    <pre className="bg-zinc-900 text-emerald-300 rounded-xl p-2.5 font-mono text-[9.5px] overflow-x-auto border border-zinc-700 shadow-inner max-h-40 leading-relaxed">
                      {parsedTool.args}
                    </pre>
                  </div>
                )}

                {/* Result / Output */}
                {toolResult ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        <span className="text-[8.5px] font-black text-emerald-600 uppercase tracking-widest">Output</span>
                      </div>
                    </div>
                    <pre className="bg-zinc-900 text-zinc-200 rounded-xl p-2.5 font-mono text-[9.5px] overflow-x-auto border border-zinc-700 shadow-inner max-h-52 leading-relaxed">
                      {toolResult.detail}
                    </pre>
                  </div>
                ) : isRunning ? (
                  <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                    <span className="font-semibold">Awaiting tool output…</span>
                  </div>
                ) : (
                  <div className="text-[9px] text-zinc-400 italic">No output captured.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const getFriendlyStepName = (step: string): string => {
  const map: Record<string, string> = {
    blog_agent: "Blog agent",
    blog_review_agent: "Blog review",
    code_agent: "Code agent",
    review_agent: "Review agent",
    report_agent: "Report agent",
    general_agent: "General agent",
  };
  return map[step] || step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function TaskExecutionCard({
  taskExec,
  handleApprove,
  handleDeny,
  onArtifactClick,
}: {
  taskExec: TaskExecution;
  handleApprove: (id: string) => void;
  handleDeny: (id: string) => void;
  onArtifactClick?: (filename: string, content: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const { taskId, taskTitle, agentName, status, steps, result, error } = taskExec;

  // Extract pipeline metadata
  const metadata = (taskExec as any).metadata || {};
  const pipeline = (taskExec as any).pipeline || metadata.pipeline || [];
  const currentStepIndex = (taskExec as any).currentStepIndex ?? metadata.currentStepIndex ?? 0;

  // Initials for card header: Coordinator "CO"
  const initials = "CO";
  const avatarColor = "bg-gradient-to-br from-violet-650 to-indigo-600";

  // Status-specific styles
  const statusConfig = {
    queued: {
      border: "border-zinc-200",
      bg: "bg-white",
      badge: "bg-zinc-100 text-zinc-700",
      icon: <Clock className="h-3 w-3 animate-pulse" />,
      text: "Queued",
    },
    running: {
      border: "border-amber-250 shadow-md",
      bg: "bg-amber-50/10",
      badge: "bg-amber-100 text-amber-800 font-semibold border border-amber-250",
      icon: <Loader2 className="h-3 w-3 animate-spin text-amber-600" />,
      text: "Running",
    },
    hitl: {
      border: "border-red-300 shadow-lg animate-pulse",
      bg: "bg-red-50/10",
      badge: "bg-red-100 text-red-800 font-bold border border-red-200",
      icon: <ShieldAlert className="h-3 w-3 text-red-600" />,
      text: "Review Required",
    },
    completed: {
      border: "border-emerald-200 shadow-sm",
      bg: "bg-emerald-50/10",
      badge: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
      text: "Completed",
    },
    failed: {
      border: "border-red-200 shadow-sm",
      bg: "bg-red-50/10",
      badge: "bg-red-100 text-red-800 font-semibold border border-red-200",
      icon: <XCircle className="h-3 w-3 text-red-600" />,
      text: "Failed",
    },
  };

  let currentStatus = statusConfig[status] || statusConfig.queued;

  if (status === 'queued' && taskExec.blockedByTitles?.length) {
    currentStatus = {
      border: "border-purple-200 shadow-sm",
      bg: "bg-purple-50/10",
      badge: "bg-purple-100 text-purple-800 font-semibold border border-purple-200",
      icon: <Clock className="h-3 w-3 animate-pulse text-purple-600" />,
      text: `Waiting on ${taskExec.blockedByTitles.join(', ')}`,
    };
  }

  const isHtml = result && /^\s*<[a-z][\s\S]*>/i.test(result);

  // Compute checklist states dynamically from steps and status
  const hasThinking = steps.some(s => s.type === 'thinking');
  const hasToolCall = steps.some(s => s.type === 'tool_call');
  const hasCrossCheck = steps.some(s => s.type === 'cross_check' || s.type === 'comm');
  const hasHitl = steps.some(s => s.type === 'hitl') || status === 'hitl';

  // 1. Planning & Context Gathering
  let planningState: 'pending' | 'processing' | 'completed' = 'pending';
  if (status === 'queued') {
    planningState = 'pending';
  } else if (status === 'completed' || status === 'failed' || hasToolCall || hasCrossCheck || hasHitl) {
    planningState = 'completed';
  } else if (status === 'running') {
    planningState = 'processing';
  }

  // 2. Execution & Tool Usage
  let executionState: 'pending' | 'processing' | 'completed' = 'pending';
  if (status === 'queued') {
    executionState = 'pending';
  } else if (status === 'completed' || status === 'failed' || hasCrossCheck || hasHitl) {
    executionState = 'completed';
  } else if (status === 'running') {
    if (hasToolCall) {
      executionState = 'processing';
      planningState = 'completed';
    } else if (hasThinking) {
      executionState = 'pending';
    }
  }

  // 3. Peer Review & Alignment
  let reviewState: 'pending' | 'processing' | 'completed' | 'skipped' = 'pending';
  if (status === 'queued') {
    reviewState = 'pending';
  } else if (status === 'completed' || status === 'failed') {
    reviewState = hasCrossCheck ? 'completed' : 'skipped';
  } else if (status === 'running') {
    if (hasCrossCheck) {
      reviewState = 'processing';
      executionState = 'completed';
      planningState = 'completed';
    }
  }

  // 4. Human Approval
  let hitlState: 'pending' | 'processing' | 'completed' | 'none' = 'none';
  if (hasHitl) {
    if (status === 'completed' || status === 'failed') {
      hitlState = 'completed';
    } else if (status === 'hitl') {
      hitlState = 'processing';
      reviewState = 'completed';
      executionState = 'completed';
      planningState = 'completed';
    } else {
      hitlState = 'pending';
    }
  }

  // 5. Final Output
  let finalState: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
  if (status === 'completed') {
    finalState = 'completed';
  } else if (status === 'failed') {
    finalState = 'failed';
  } else if (status === 'running' || status === 'hitl') {
    finalState = 'processing';
  }

  const checklistItems = [
    { agentLabel: "Planning", state: planningState },
    { agentLabel: "Execution", state: executionState },
    { agentLabel: "Peer Review", state: reviewState },
    ...(hitlState !== 'none' ? [{ agentLabel: "Human Review", state: hitlState }] : []),
    { agentLabel: "Final Result", state: finalState },
  ];

  // Calculate percentage progress for pipeline steps
  const totalSteps = pipeline.length || 1;
  const progressPercent = status === 'completed' ? 100 : Math.round((currentStepIndex / totalSteps) * 100);

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden w-full my-2",
      currentStatus.border,
      currentStatus.bg
    )}>
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black shadow-sm", avatarColor)}>
            {initials}
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-zinc-950 truncate max-w-[200px] sm:max-w-xs">{taskTitle}</span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", currentStatus.badge)}>
                {currentStatus.icon}
                {currentStatus.text}
              </span>
            </div>
            {pipeline.length > 0 && (
              <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase mt-1 block">
                Swarm Pipeline Execution ({currentStepIndex + 1}/{pipeline.length})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Real-time Progress Bar & Percent */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-black text-zinc-800">{progressPercent}%</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-500 transition-all flex-shrink-0 cursor-pointer"
            title={isExpanded ? "Hide steps" : "Show steps"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Horizontal Pipeline DAG Visualizer */}
      {pipeline && pipeline.length > 0 && (
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-150/40 flex items-center gap-2 overflow-x-auto text-[10.5px]">
          {pipeline.map((stepName: string, idx: number) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex && status === 'running';
            const isStalled = idx === currentStepIndex && status === 'failed';
            const friendlyName = metadata?.pipelineNames?.[idx] || getFriendlyStepName(stepName);

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-350 flex-shrink-0" />
                )}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-200 whitespace-nowrap",
                  isActive ? "bg-indigo-50 text-indigo-700 font-bold border-indigo-200 ring-2 ring-indigo-100/65" :
                    isCompleted ? "bg-emerald-50/70 text-emerald-700 font-semibold border-emerald-150" :
                      isStalled ? "bg-red-50 text-red-700 font-bold border-red-200" :
                        "bg-white text-zinc-400 border-zinc-200"
                )}>
                  <div className={cn(
                    "h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0",
                    isActive ? "bg-indigo-500 text-white animate-pulse" :
                      isCompleted ? "bg-emerald-500 text-white" :
                        isStalled ? "bg-red-500 text-white" :
                          "bg-zinc-100 text-zinc-500"
                  )}>
                    {isCompleted ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <span>{friendlyName}</span>
                </div>
              </React.Fragment>
            );
          })}
          <ChevronRight className="h-3.5 w-3.5 text-zinc-350 flex-shrink-0" />
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-200 whitespace-nowrap",
            status === 'completed' ? "bg-emerald-50 text-emerald-750 font-bold border-emerald-250 ring-2 ring-emerald-100" :
              "bg-white text-zinc-450 border-zinc-200"
          )}>
            <div className={cn(
              "h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0",
              status === 'completed' ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-450"
            )}>
              {status === 'completed' ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : "G"}
            </div>
            <span>Done</span>
          </div>
        </div>
      )}

      {/* Execution Steps */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 bg-zinc-50/50 border-b border-zinc-100">
          {steps.length === 0 && (!pipeline.length || currentStepIndex === 0) ? (
            <p className="text-xs text-zinc-400 italic">Waiting for agent to initialize...</p>
          ) : (
            <div className="relative pl-4 border-l-2 border-zinc-200 space-y-4">

              {/* Task Inputs & Context (Step 0) */}
              <div className="relative group/singlestep">
                {/* Timeline bullet */}
                <div className="absolute -left-[24px] top-[14px] h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-sm bg-indigo-400" />

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-indigo-900">Task Context & Inputs</span>
                  </div>

                  <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-3">
                    <div className="relative">
                      <div className="font-bold text-[10px] uppercase text-zinc-500 mb-1">Task Description</div>
                      <div
                        className={cn(
                          "text-xs text-zinc-700 font-medium overflow-hidden transition-all duration-300",
                          descExpanded ? "max-h-none pb-2" : "max-h-24 relative"
                        )}
                      >
                        {/<[a-z][\s\S]*>/i.test(metadata.description || taskTitle) ? (
                          <div dangerouslySetInnerHTML={{ __html: metadata.description || taskTitle }} className="prose prose-sm max-w-none prose-p:leading-snug prose-p:my-1 prose-a:text-indigo-600 prose-ul:my-1 prose-li:my-0" />
                        ) : (
                          <div className="whitespace-pre-wrap">{metadata.description || taskTitle}</div>
                        )}

                        {!descExpanded && (metadata.description || taskTitle).length > 200 && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        )}
                      </div>

                      {(metadata.description || taskTitle).length > 200 && (
                        <button
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 cursor-pointer flex items-center gap-0.5"
                        >
                          {descExpanded ? "Less" : "More"}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`w-3 h-3 transition-transform duration-200 ${descExpanded ? "rotate-180" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {((pipeline.length > 0 && currentStepIndex > 0 && metadata?.artifacts?.[`step_${currentStepIndex - 1}`]) || (metadata?.inputData?.upstreamResults && Object.keys(metadata.inputData.upstreamResults).length > 0)) && (
                      <div className="mt-2 pt-2 border-t border-zinc-100">
                        <div className="font-bold text-[10px] uppercase text-zinc-500 mb-2">Input Artifacts</div>
                        <div className="flex flex-col gap-2">

                          {/* Previous Step in same pipeline */}
                          {pipeline.length > 0 && currentStepIndex > 0 && metadata?.artifacts?.[`step_${currentStepIndex - 1}`] && (
                            <div className="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-xl bg-zinc-50">
                              <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold text-zinc-700 truncate">Output from previous step</span>
                                <span className="text-[10px] text-zinc-500 truncate">Generated by {metadata?.pipelineNames?.[currentStepIndex - 1] || getFriendlyStepName(pipeline[currentStepIndex - 1])}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (onArtifactClick) {
                                    onArtifactClick("Previous Context", metadata.artifacts[`step_${currentStepIndex - 1}`]);
                                  }
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:underline px-2 py-1 bg-white rounded shadow-sm border border-indigo-200 cursor-pointer"
                              >
                                View contents
                              </button>
                            </div>
                          )}

                          {/* Upstream Dependent Task Results */}
                          {metadata?.inputData?.upstreamResults && Object.entries(metadata.inputData.upstreamResults).map(([upTaskId, upResult]) => (
                            <div key={upTaskId} className="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-xl bg-zinc-50">
                              <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold text-zinc-700 truncate">Upstream Task Output</span>
                                <span className="text-[10px] text-zinc-500 truncate">Dependency result passed as context</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (onArtifactClick) {
                                    onArtifactClick("Upstream Task Context", upResult as string);
                                  }
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:underline px-2 py-1 bg-white rounded shadow-sm border border-indigo-200 cursor-pointer"
                              >
                                View contents
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {groupSteps(steps).map((group, idx, arr) => {
                if (group.type === 'ai_group') {
                  const prevTimestampMs = idx > 0 ? getGroupLastTimestamp(arr[idx - 1]) : 0;
                  // A step is "latest running" only if this task is still running AND it's the last step
                  const isLatestRunningStep = status === 'running' && idx === arr.length - 1;
                  return (
                    <GroupedAiStepRow
                      key={group.id}
                      group={group}
                      startTimeMs={taskExec.ts > 1000000000000 ? taskExec.ts : taskExec.ts * 1000}
                      prevTimestampMs={prevTimestampMs}
                      isLatestRunningStep={isLatestRunningStep}
                    />
                  );
                }

                // Render single steps (progress, comm, cross_check, hitl, assign, completed, failed)
                const step = group.step!;
                const time = new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const isTerminal = status === 'completed' || status === 'failed';
                const isThisRunning = step.type === 'progress' && !isTerminal && idx === arr.length - 1;

                // Determine styling by step type
                type StepCfg = { icon: React.ReactNode; color: string; title: string; bg: string; bullet: string; };
                let cfg: StepCfg;

                if (step.type === 'comm') {
                  cfg = {
                    icon: <MessageSquare className="h-3 w-3" />,
                    color: "text-teal-800",
                    title: "Agent Communication",
                    bg: "border-teal-100 bg-teal-50/30",
                    bullet: "bg-teal-400",
                  };
                } else if (step.type === 'cross_check') {
                  cfg = {
                    icon: <Shield className="h-3 w-3" />,
                    color: "text-amber-800",
                    title: "Peer Review",
                    bg: "border-amber-100 bg-amber-50/30",
                    bullet: "bg-amber-400",
                  };
                } else if (step.type === 'hitl') {
                  cfg = {
                    icon: <ShieldAlert className="h-3 w-3" />,
                    color: "text-red-800",
                    title: "Human Review",
                    bg: "border-red-100 bg-red-50/30",
                    bullet: "bg-red-400",
                  };
                } else if (step.type === 'assign') {
                  cfg = {
                    icon: <Play className="h-3 w-3" />,
                    color: "text-blue-800",
                    title: "Task Assigned",
                    bg: "border-blue-100 bg-blue-50/20",
                    bullet: "bg-blue-400",
                  };
                } else if (step.type === 'completed') {
                  cfg = {
                    icon: <CheckCircle2 className="h-3 w-3" />,
                    color: "text-emerald-800",
                    title: "Completed",
                    bg: "border-emerald-100 bg-emerald-50/20",
                    bullet: "bg-emerald-400",
                  };
                } else if (step.type === 'failed') {
                  cfg = {
                    icon: <XCircle className="h-3 w-3" />,
                    color: "text-red-800",
                    title: "Failed",
                    bg: "border-red-100 bg-red-50/20",
                    bullet: "bg-red-400",
                  };
                } else {
                  // progress / default
                  cfg = {
                    icon: isThisRunning
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <CheckCircle2 className="h-3 w-3" />,
                    color: isThisRunning ? "text-amber-800" : "text-emerald-800",
                    title: isThisRunning ? "In Progress" : "Completed",
                    bg: isThisRunning
                      ? "border-amber-200 bg-gradient-to-br from-amber-50/50 to-white"
                      : "border-emerald-100 bg-emerald-50/20",
                    bullet: isThisRunning ? "bg-amber-400 ring-4 ring-amber-100 animate-pulse" : "bg-emerald-400",
                  };
                }

                return (
                  <div key={step.id} className="relative group/singlestep">
                    {/* Timeline bullet */}
                    <div className={cn(
                      "absolute -left-[24px] top-[14px] h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                      cfg.bullet
                    )}>
                      {isThisRunning
                        ? <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        : <span className="h-1 w-1 rounded-full bg-white" />
                      }
                    </div>

                    <div className={cn(
                      "rounded-2xl border text-xs transition-all shadow-sm overflow-hidden",
                      cfg.bg
                    )}>
                      {/* Step header row */}
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <div className={cn("flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest", cfg.color)}>
                          {cfg.icon}
                          <span>{cfg.title}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-mono">{time}</span>
                      </div>

                      {/* Step detail  Emain content */}
                      {step.detail && (
                        <div className={cn(
                          "px-3.5 pb-3 text-[11.5px] leading-relaxed",
                          "prose prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1",
                          "prose-strong:font-bold prose-code:rounded prose-code:px-1 prose-ul:my-1 prose-li:my-0.5",
                          cfg.color
                        )}>
                          <ReactMarkdown>{step.detail}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HITL review buttons inside the card */}
      {status === 'hitl' && (
        <div className="p-4 bg-amber-50/50 border-b border-zinc-100 flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-0.5">Approval Required</span>
              <p className="text-xs text-amber-950 font-medium">Please review this step before the swarm can proceed.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(taskId)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={() => handleDeny(taskId)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-red-55 border border-red-200 text-red-650 text-[11px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Deny
            </button>
          </div>
        </div>
      )}

      {/* Result Section */}
      {status === 'completed' && (result || (taskExec.artifacts && taskExec.artifacts.length > 0)) && (
        <div className="p-4 bg-emerald-50/10 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Task Result
            </span>
          </div>
          <div className="relative flex flex-col gap-3">
            {/* Render actual result summary text if present */}
            {result && (
              <div
                className={cn(
                  "bg-white border border-emerald-100 rounded-xl p-3.5 text-xs leading-relaxed shadow-sm overflow-hidden transition-all duration-300",
                  isHtml ? "prose prose-sm max-w-none" : "font-sans text-zinc-800 whitespace-pre-wrap",
                  !resultExpanded && "max-h-36"
                )}
                style={!resultExpanded ? { WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)", maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" } : {}}
              >
                {isHtml ? <div dangerouslySetInnerHTML={{ __html: result }} /> : result}
              </div>
            )}
            {result && (
              <button
                onClick={() => setResultExpanded(!resultExpanded)}
                className="flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", resultExpanded && "rotate-180")} />
                {resultExpanded ? "Collapse Summary" : "Show Full Summary"}
              </button>
            )}

            {/* Render Artifacts */}
            {taskExec.artifacts && taskExec.artifacts.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {taskExec.artifacts.map((artifact, idx) => (
                  <div key={idx} className="bg-white border border-zinc-200/80 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-zinc-300 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Files className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-800 truncate">{artifact.filename}</p>
                        {artifact.detail && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{artifact.detail}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => onArtifactClick && onArtifactClick(artifact.filename, artifact.content)}
                      className="text-xs font-bold text-indigo-650 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded hover:bg-zinc-150/40 flex items-center gap-0.5 flex-shrink-0 cursor-pointer"
                    >
                      View <span className="text-[10px]"></span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Section */}
      {status === 'failed' && error && (
        <div className="p-4 bg-red-50/30 border-t border-zinc-100">
          <div className="flex items-center gap-1 text-[10px] font-black text-red-800 uppercase tracking-widest mb-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-650" />
            Execution Failed
          </div>
          <div className="bg-white border border-red-100 rounded-xl p-3 text-xs text-red-950 font-medium">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SwarmChatFeed ────────────────────────────────────────────────────────────
interface CombinedFeedItem {
  ts: number;
  id: string;
  _type: 'message' | 'hitl' | 'tick' | 'task_exec' | 'comm_msg';
  msg?: ConvMessage;
  idx?: number;
  task?: SwarmTask;
  evt?: SwarmEvent;
  taskExec?: TaskExecution;
}

// ─── Swarm Execution Summary Card ─────────────────────────────────────────────
export function SwarmExecutionSummary({ combinedFeed }: { combinedFeed: CombinedFeedItem[] }) {
  // Aggregate tasks by agent directly from task_exec items
  const agentSummaries: Record<string, {
    agentName: string;
    tasks: { title: string; status: string; result?: string; error?: string }[];
    toolCallsCount: number;
    thinkingCount: number;
    commCount: number;
  }> = {};

  combinedFeed.forEach(item => {
    if (item._type === 'task_exec' && item.taskExec) {
      const { agentName, taskTitle, status, result, error, steps } = item.taskExec;
      const key = agentName || 'Unknown';
      if (!agentSummaries[key]) {
        agentSummaries[key] = {
          agentName: key,
          tasks: [],
          toolCallsCount: 0,
          thinkingCount: 0,
          commCount: 0
        };
      }
      agentSummaries[key].tasks.push({ title: taskTitle, status, result, error });

      // Count step types
      steps.forEach(step => {
        if (step.type === 'thinking') agentSummaries[key].thinkingCount++;
        else if (step.type === 'tool_call') agentSummaries[key].toolCallsCount++;
        else if (step.type === 'comm') agentSummaries[key].commCount++;
      });
    }
  });

  const agents = Object.values(agentSummaries);
  if (agents.length === 0) return null;

  // Calculate high-level run stats
  let totalTasksCount = 0;
  let completedTasksCount = 0;
  let failedTasksCount = 0;

  agents.forEach(a => {
    a.tasks.forEach(t => {
      totalTasksCount++;
      if (t.status === 'completed') completedTasksCount++;
      else if (t.status === 'failed') failedTasksCount++;
    });
  });

  const successRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/10 p-5 shadow-sm space-y-4 my-5 w-full">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wider leading-none">Swarm Execution Summary</h4>
            <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase mt-1 block">Collaborative run finished</span>
          </div>
        </div>

        {/* Run stats banner */}
        <div className="flex items-center gap-3 text-xs bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="text-zinc-550">
            Tasks: <span className="font-bold text-zinc-800">{completedTasksCount}/{totalTasksCount}</span>
          </div>
          <div className="h-3 w-px bg-zinc-200" />
          <div className="text-emerald-700">
            Success: <span className="font-bold">{successRate}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {agents.map((summary, idx) => {
          const initials = summary.agentName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || 'A';
          const colors = [
            "bg-violet-500", "bg-blue-500", "bg-emerald-500",
            "bg-rose-500", "bg-amber-500", "bg-cyan-500",
          ];
          const avatarColor = colors[summary.agentName.charCodeAt(0) % colors.length] || "bg-indigo-500";

          return (
            <div key={idx} className="flex gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-zinc-150/50 p-4 shadow-sm hover:border-zinc-200 transition-colors">
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black shadow-inner", avatarColor)}>
                {initials}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900">{summary.agentName}</span>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                    {summary.thinkingCount > 0 && <span>🧠 {summary.thinkingCount} Thoughts</span>}
                    {summary.toolCallsCount > 0 && <span>🔧 {summary.toolCallsCount} Tools</span>}
                    {summary.commCount > 0 && <span>💬 {summary.commCount} Comms</span>}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {summary.tasks.map((task, tIdx) => {
                    const isDone = task.status === 'completed';
                    const isFailed = task.status === 'failed';
                    return (
                      <div key={tIdx} className="text-xs border-l-2 border-zinc-100 pl-2.5 py-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-700">
                          {isDone ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          ) : isFailed ? (
                            <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          ) : (
                            <Loader2 className="h-3 w-3 text-amber-500 animate-spin flex-shrink-0" />
                          )}
                          <span className={cn("font-bold text-zinc-800", isDone && "text-emerald-950")}>
                            {task.title}
                          </span>
                        </div>
                        {task.result && (
                          <div className="text-[11px] text-zinc-500 italic mt-1 bg-zinc-50/50 rounded-lg p-2 border border-zinc-150/30 line-clamp-3 leading-relaxed">
                            {task.result.replace(/<[^>]*>/g, '').slice(0, 300)}...
                          </div>
                        )}
                        {task.error && (
                          <p className="text-[11px] text-red-500 mt-1 font-semibold bg-red-50/30 border border-red-100/30 rounded-lg p-2">
                            Error: {task.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SwarmChatFeedProps {
  combinedFeed: CombinedFeedItem[];
  workforceName: string;
  editingIndex: number | null;
  setEditingIndex: (i: number | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ConvMessage[]>>;
  handleApprove: (id: string) => void;
  handleDeny: (id: string) => void;
  isSending: boolean;
  isPolling: boolean;
  pollingExecutionId: string | null;
  error: string | null;
  thinkingSteps: any[];
  thinkingStep: any;
  thinkingNode: any;
  streamingContent: string;
  isStreaming: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  liveProgressMap?: Record<string, string>;
  completedTaskIds?: Set<string>;
  sessionStatus?: SessionStatus;
  onArtifactClick?: (filename: string, content: string) => void;
}

export function SwarmStepItem({
  exec,
  group,
  initials,
  avatarBg,
  colors,
}: {
  exec: TaskExecution;
  group: any;
  initials: string;
  avatarBg: string;
  colors: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const isAiGroup = group.type === 'ai_group';
  const step = isAiGroup ? (group.thinking || group.toolCall) : group.step;
  if (!step) return null;

  const groupedSteps = groupSteps(exec.steps);
  const gIdx = groupedSteps.findIndex(g => g.id === group.id);
  const isLast = gIdx === groupedSteps.length - 1;
  const isRunning = exec.status === 'running' || exec.status === 'queued';
  const isPending = isLast && isRunning;

  const time = new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const stepAgentName = step.payload?.reviewerName || exec.agentName;
  const stepInitials = stepAgentName.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || 'A';
  const stepAvatarBg = colors[stepAgentName.charCodeAt(0) % colors.length] || avatarBg;

  const badgeLabel = isPending ? "pending" : "status";
  const badgeType: 'status' | 'pending' | 'result' | 'dispatch' = isPending ? "pending" : "status";
  const timestamp = isPending ? "now" : time;

  let detailText = step.detail || "Working on task...";
  if (isAiGroup) {
    if (group.thinking) {
      detailText = group.thinking.detail || "Thinking and analyzing context...";
    } else if (group.toolCall) {
      detailText = group.toolCall.detail || "Executing tool invocation...";
    }
  }

  const hasDetails = isAiGroup || step.payload || step.detail;

  const thinkingStepsList: any[] = [];
  let currentStepLabel: string | null = null;
  let currentNodeLabel: string | null = null;
  let streamingContentText = "";

  if (isAiGroup) {
    if (group.thinking) {
      if (group.toolCall) {
        thinkingStepsList.push({
          step: group.thinking.detail || "Thinking complete",
          node: group.thinking.category?.toUpperCase() || "REFLECTION",
          timestamp: new Date(group.thinking.timestamp).getTime(),
        });

        if (group.toolResult) {
          thinkingStepsList.push({
            step: `Executed tool: ${group.toolCall.detail || "Tool invocation"}`,
            node: "TOOLS",
            timestamp: new Date(group.toolCall.timestamp).getTime(),
          });
          streamingContentText = group.toolResult.detail || "";
        } else {
          currentStepLabel = `Executing: ${group.toolCall.detail || "Tool invocation"}`;
          currentNodeLabel = "TOOLS";
        }
      } else {
        currentStepLabel = group.thinking.detail || "Analyzing and planning...";
        currentNodeLabel = group.thinking.category?.toUpperCase() || "REFLECTION";
      }
    } else if (group.toolCall) {
      if (group.toolResult) {
        thinkingStepsList.push({
          step: `Executed tool: ${group.toolCall.detail || "Tool invocation"}`,
          node: "TOOLS",
          timestamp: new Date(group.toolCall.timestamp).getTime(),
        });
        streamingContentText = group.toolResult.detail || "";
      } else {
        currentStepLabel = `Executing: ${group.toolCall.detail || "Tool invocation"}`;
        currentNodeLabel = "TOOLS";
      }
    }
  }

  return (
    <div className="w-full space-y-1.5 py-1">
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex-1 min-w-0">
          <SwarmFeedMessage
            avatarInitials={stepInitials}
            avatarBgClass={stepAvatarBg}
            agentName={stepAgentName}
            badgeLabel={badgeLabel}
            badgeType={badgeType}
            timestamp={timestamp}
            content={detailText}
            isLoading={isPending}
          />
        </div>

        {hasDetails && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 font-bold transition-all px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/50 hover:bg-zinc-100 flex-shrink-0 shadow-sm cursor-pointer"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 text-zinc-400", isOpen && "rotate-180")} />
            {isOpen ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>

      {isOpen && hasDetails && (
        <div className="ml-10 bg-zinc-50/50 border border-zinc-250/30 rounded-2xl p-4.5 animate-fadeIn space-y-3 shadow-inner max-w-[90%] text-xs text-zinc-700 leading-relaxed font-sans mt-1">
          {isAiGroup ? (
            <div className="bg-white rounded-xl border border-zinc-200/60 p-4 shadow-sm">
              <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest block mb-2">Cognitive Intelligence Execution</span>
              <StreamingMessage
                thinkingSteps={thinkingStepsList}
                currentStep={isPending ? currentStepLabel : null}
                currentNode={isPending ? currentNodeLabel : null}
                streamingContent={streamingContentText}
                isStreaming={!!streamingContentText}
                label={`${stepAgentName} Cognition`}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Detailed Execution Logs</span>
              <div className="bg-white rounded-xl border border-zinc-200/60 p-3.5 font-mono text-[10.5px] leading-relaxed text-zinc-650 whitespace-pre-wrap overflow-x-auto">
                {step.detail || "No additional execution details available."}
              </div>
              {step.payload && (
                <div className="bg-white rounded-xl border border-zinc-200/60 p-3.5 space-y-1.5 shadow-sm">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Context / Payload Parameters</span>
                  <pre className="text-[10px] font-mono text-zinc-600 bg-zinc-50/60 rounded-lg p-2 overflow-x-auto">{JSON.stringify(step.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SwarmChatFeed({
  combinedFeed,
  workforceName,
  editingIndex,
  setEditingIndex,
  setMessages,
  handleApprove,
  handleDeny,
  isSending,
  isPolling,
  pollingExecutionId,
  error,
  thinkingSteps,
  thinkingStep,
  thinkingNode,
  streamingContent,
  isStreaming,
  bottomRef,
  liveProgressMap,
  completedTaskIds,
  sessionStatus,
  onArtifactClick,
}: SwarmChatFeedProps) {
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {combinedFeed.length === 0 && !isSending && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-500">{workforceName.slice(0, 1)}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-700">{workforceName}</p>
          <p className="text-xs text-zinc-400 max-w-xs">Type a task below to run the workforce. Start the swarm to watch agents collaborate in real-time.</p>
        </div>
      )}

      {combinedFeed.map((item, index) => {
        if (item._type === 'task_exec') {
          const exec = item.taskExec!;
          return (
            <TaskExecutionCard
              key={item.id}
              taskExec={exec}
              handleApprove={handleApprove}
              handleDeny={handleDeny}
              onArtifactClick={onArtifactClick}
            />
          );
        }

        if (item._type === 'comm_msg') {
          const e = item.evt!;
          const time = new Date(e.timestamp).toLocaleTimeString();
          return (
            <div key={item.id} className="w-full">
              <InterAgentMessage payload={e.payload} time={time} />
            </div>
          );
        }

        if (item._type === 'tick') {
          const e = item.evt!;
          const time = new Date(e.timestamp).toLocaleTimeString();
          if (e.type === "CYCLE_INSPECT") {
            const count = e.payload?.taskCount ?? e.payload?.taskIds?.length ?? 0;
            return <CoordinatorTick key={item.id} agentLabel={count > 0 ? `${count} tasks in backlog` : "coordinator cycle"} time={time} />;
          }
          return (
            <div key={item.id} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 flex-1">
                <span className="font-bold">Cycle error</span> · {e.payload?.detail} · <span className="text-orange-400">{time}</span>
              </div>
            </div>
          );
        }

        if (item._type === 'hitl') {
          return (
            <div key={item.id} className="w-full">
              <HitlRequestCard task={item.task!} onApprove={handleApprove} onDeny={handleDeny} />
            </div>
          );
        }

        if (item._type === 'message') {
          const msg = item.msg!;
          const idx = item.idx!;

          if (msg.swarmEvent) {
            const { type, payload, timestamp } = msg.swarmEvent;
            const time = new Date(timestamp).toLocaleTimeString();


            if (type === 'USER_DIRECTED_MESSAGE') {
              const mentions: any[] = payload.mentions || [];
              const agentMentions = mentions.filter(m => m.type === 'agent');
              const taskMentions = mentions.filter(m => m.type === 'task');
              const toName = payload.toName || 'Swarm';
              return (
                <div key={item.id} className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-blue-100" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 max-w-[85%] flex-shrink-0">
                    <AtSign className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span className="text-blue-500 font-bold">User</span>
                    <span className="text-blue-400">→</span>
                    {agentMentions.map((m, i) => (
                      <span key={i} className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px]">@{m.name}</span>
                    ))}
                    {taskMentions.map((m, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[10px]">#{m.name}</span>
                    ))}
                    {agentMentions.length === 0 && taskMentions.length === 0 && <span className="font-bold">{toName}</span>}
                    <span className="text-blue-300 font-normal ml-1">{time}</span>
                  </div>
                  <div className="flex-1 h-px bg-blue-100" />
                </div>
              );
            }

            if (type === 'COORDINATOR_INSPECT') {
              const tasksList = parseInspectTasks(payload.detail || "");
              const taskCount = tasksList.length || payload.taskCount || 0;
              const initials = "CO";
              const avatarBg = "bg-violet-100 text-violet-755 border-violet-200/50";
              const inspectText = `Inspecting ${taskCount} unassigned task${taskCount !== 1 ? 's' : ''}`;

              return (
                <div key={item.id} className="w-full">
                  <SwarmFeedMessage
                    avatarInitials={initials}
                    avatarBgClass={avatarBg}
                    agentName="Coordinator"
                    badgeLabel="inspect"
                    badgeType="status"
                    timestamp={time}
                    content={
                      <div className="space-y-2">
                        <div className="font-semibold text-zinc-800">{inspectText}</div>
                        {tasksList.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Backlog Tasks</div>
                            <div className="flex flex-col gap-1.5 items-start">
                              {tasksList.map((t, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-750 border border-violet-100/80 shadow-sm"
                                >
                                  {t.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>
              );
            }

            if (type === 'COORDINATOR_ASSIGN') {
              let thinkPayload: any = null;
              let thinkTime: string | null = null;
              for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
                const prev = combinedFeed[i];
                if (prev._type === 'message' && prev.msg?.swarmEvent?.type === 'COORDINATOR_THINK') {
                  thinkPayload = prev.msg.swarmEvent.payload;
                  thinkTime = new Date(prev.msg.swarmEvent.timestamp).toLocaleTimeString();
                  break;
                }
              }

              const agentName = payload.agentName || "Agent";
              const initials = "CO";
              const avatarBg = "bg-violet-100 text-violet-755 border-violet-200/50";

              const taskExec = combinedFeed.find(f => f._type === 'task_exec' && f.taskExec?.taskId === payload.taskId)?.taskExec;
              const pipeline = taskExec?.pipeline || [];
              const currentStepIndex = taskExec?.currentStepIndex ?? 0;
              const prevAgentFriendly = currentStepIndex > 0 && pipeline[currentStepIndex - 1] ? (taskExec?.metadata?.pipelineNames?.[currentStepIndex - 1] || getFriendlyStepName(pipeline[currentStepIndex - 1])) : null;
              const currentAgentFriendly = getFriendlyStepName(payload.agentName || payload.to || 'Agent');

              const isHandoff = currentStepIndex > 0 && prevAgentFriendly;

              const pipelineNamesArr = taskExec?.metadata?.pipelineNames || pipeline.map(getFriendlyStepName);
              const pipelineNames = pipelineNamesArr.join(" ↁE");
              const dispatchContent = pipelineNames
                ? `Task received: ${payload.taskTitle || 'Task'}. Building pipeline: ${pipelineNames}. Dispatching to ${agentName} now.`
                : `Task received: ${payload.taskTitle || 'Task'}. Dispatching to ${agentName} now.`;

              return (
                <div key={item.id} className="w-full">
                  {isHandoff && (
                    <div className="flex items-center gap-3 py-4 w-full">
                      <div className="flex-1 h-px bg-zinc-200" />
                      <span className="text-[10px] text-zinc-400 font-semibold tracking-wider whitespace-nowrap">
                        ↁEhandoff: {prevAgentFriendly} ↁE{currentAgentFriendly}
                      </span>
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>
                  )}
                  <SwarmFeedMessage
                    avatarInitials={initials}
                    avatarBgClass={avatarBg}
                    agentName="Coordinator"
                    badgeLabel="dispatch"
                    badgeType="dispatch"
                    timestamp={time}
                    content={dispatchContent}
                    reasoning={thinkPayload ? { detail: thinkPayload.detail, time: thinkTime || time } : undefined}
                  />
                </div>
              );
            }

            if (type === 'AGENT_PROGRESS') {
              const nameLabel = payload.agentName ? payload.agentName : `Agent ${payload.from?.slice(0, 8) ?? ''}`;
              const isDone = payload.taskId && completedTaskIds?.has(payload.taskId);
              const liveDetail = !isDone && payload.taskId ? liveProgressMap?.[payload.taskId] : undefined;

              return (
                <div key={item.id} className="flex items-start gap-2">
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", isDone ? "bg-zinc-100" : "bg-amber-100")}>
                    {isDone ? <Check className="h-3.5 w-3.5 text-zinc-400" /> : <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin" />}
                  </div>
                  <div className={cn("border rounded-2xl rounded-tl-sm px-3 py-2 text-xs flex-1 max-w-[90%]", isDone ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-amber-50 border-amber-100")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-bold text-[10px] uppercase tracking-wide", isDone ? "text-zinc-500" : "text-amber-600")}>{nameLabel}</span>
                      <span className={cn("text-[9px]", isDone ? "text-zinc-400" : "text-amber-300")}>{time}</span>
                    </div>
                    <p className={cn("font-semibold mb-0.5", isDone ? "text-zinc-600 line-through" : "text-amber-900")}>{payload.taskTitle}</p>
                    <p className={cn("text-[11px] italic", isDone ? "text-zinc-500" : "text-amber-700/80")}>
                      {isDone ? '↳ Task execution finished' : (liveDetail ? `↳ ${liveDetail}` : `↳ ${payload.detail || 'gathering context and executing'}`)}
                    </p>
                  </div>
                </div>
              );
            }

            if (type === 'TASK_FAILED') return (
              <div key={item.id} className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                </div>
                <div className="border-l-4 border-red-500 bg-red-50 rounded-r-xl px-3 py-2.5 text-xs flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-red-655 uppercase tracking-widest">Task Failed</span>
                    <span className="text-[9px] text-red-300">{time}</span>
                  </div>
                  <p className="font-semibold text-red-900 mb-0.5">{payload.taskTitle}</p>
                  <p className="text-red-600 text-[11px]">{payload.error}</p>
                </div>
              </div>
            );

            if (type === 'INTER_AGENT_MSG') return (
              <div key={item.id}>
                <InterAgentMessage payload={payload} time={time} />
              </div>
            );

            if (type === 'HITL_REQUEST' && payload?.taskId) return (
              <div key={item.id} className="w-full">
                <HitlRequestCard
                  task={{ id: payload.taskId, title: payload.taskTitle || 'Approval Required', status: 'PENDING_APPROVAL', priority: 'HIGH', createdAt: timestamp, metadata: { approvalReason: payload.reason } }}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                />
              </div>
            );

            if (type === 'COORDINATOR_THINK') {
              return (
                <div key={item.id} className="flex items-start gap-2.5 my-3">
                  <div className="h-8 w-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <span className="text-base animate-pulse">🧠</span>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50/40 to-fuchsia-50/20 border border-violet-100 rounded-2xl rounded-tl-sm px-4 py-3 text-xs flex-1 shadow-sm">
                    <div className="flex items-center justify-between mb-2 border-b border-violet-200/30 pb-1.5">
                      <span className="font-black text-[9px] text-violet-655 uppercase tracking-widest">Coordinator Reasoning</span>
                      <span className="text-[9px] text-violet-400 font-mono">{time}</span>
                    </div>
                    <div className="text-zinc-800 text-[11.5px] leading-relaxed font-sans prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-violet-900 prose-strong:font-bold">
                      <ReactMarkdown>{payload.detail || ''}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            }

            if (type === 'CYCLE_IDLE') return (
              <CoordinatorTick key={item.id} agentLabel={payload.agentLabel || 'coordinator idle'} time={time} />
            );

            if (type === 'CYCLE_INSPECT') {
              const count = payload?.taskCount ?? payload?.taskIds?.length ?? 0;
              return <CoordinatorTick key={item.id} agentLabel={count > 0 ? `${count} tasks in backlog` : "coordinator cycle"} time={time} />;
            }

            if (type === 'CYCLE_ERROR') return (
              <div key={item.id} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-655 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 flex-1">
                  <span className="font-bold">Cycle error</span> · {payload.detail} · <span className="text-orange-400">{time}</span>
                </div>
              </div>
            );

            // Fallback for unknown event types
            return (
              <CoordinatorTick
                key={item.id}
                agentLabel={`${type.toLowerCase().replace(/_/g, ' ')}${payload?.agentLabel || payload?.detail ? `: ${payload.agentLabel || payload.detail}` : ''}`}
                time={time}
              />
            );
          }

          // Plain user / assistant chat bubble
          return (
            <div key={item.id} className={cn("flex items-start gap-2 group", msg.role === "assistant" && "flex-col items-end")}>
              {msg.role === "user" ? (
                <>
                  <div className="flex-1 rounded-2xl rounded-tl-sm bg-white border border-zinc-200 px-4 py-3 shadow-sm flex flex-col items-start min-w-0">
                    {editingIndex === idx ? (
                      <div className="w-full flex flex-col">
                        <textarea
                          id={`edit-msg-${idx}`}
                          defaultValue={msg.content}
                          autoFocus
                          className="w-full min-h-[60px] text-sm text-zinc-900 resize-none outline-none bg-transparent"
                          onBlur={() => setEditingIndex(null)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              setMessages(p => p.map((m, i) => i === idx ? { ...m, content: e.currentTarget.value } : m));
                              setEditingIndex(null);
                            }
                            if (e.key === "Escape") {
                              setEditingIndex(null);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-zinc-100">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); setEditingIndex(null); }}
                            className="px-4 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-[13px] font-bold hover:bg-zinc-50 transition-colors shadow-sm active:scale-95 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const val = (document.getElementById(`edit-msg-${idx}`) as HTMLTextAreaElement)?.value;
                              if (val) setMessages(p => p.map((m, i) => i === idx ? { ...m, content: val } : m));
                              setEditingIndex(null);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white text-[13px] font-bold hover:bg-zinc-800 transition-colors shadow-sm active:scale-95 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-900 whitespace-pre-wrap">{renderUserMessageTokens(msg.content, msg.meta?.mentions)}</p>
                    )}
                    {msg.meta && (
                      ((msg.meta.mentions || []).some((m: any) => !msg.content.toLowerCase().includes(m.name.toLowerCase())) ||
                        (msg.meta.contexts || []).length > 0)
                    ) && editingIndex !== idx && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          {(msg.meta.mentions || []).map((m: any, i: number) => {
                            const isAlreadyMentioned = msg.content.toLowerCase().includes(m.name.toLowerCase());
                            if (isAlreadyMentioned) return null;
                            return (
                              <div key={`m-${i}`} className="flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded shadow-sm border border-blue-200 text-[10px] tracking-wide uppercase">
                                <AtSign className="h-3 w-3 text-blue-600" />
                                <span>{m.name || 'Mention'}</span>
                              </div>
                            );
                          })}
                          {(msg.meta.contexts || []).map((c: any, i: number) => (
                            <div key={`c-${i}`} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded shadow-sm border border-indigo-200 text-[10px] tracking-wide uppercase">
                              <Layers className="h-3 w-3 text-indigo-600" />
                              <span>{c.name || 'Context'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  {editingIndex !== idx && (
                    <button onClick={() => setEditingIndex(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-zinc-100 text-zinc-400 transition-opacity cursor-pointer">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : (
                msg.executionId
                  ? <FinalOutputBubble content={msg.content} />
                  : msg.meta?.responder
                    ? (
                      <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 text-xs flex-1 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5 border-b border-zinc-100 pb-1">
                          <span className="font-black text-[9px] text-zinc-500 uppercase tracking-widest">{msg.meta.responder}</span>
                          <span className="text-[9px] text-zinc-400 font-mono">Response</span>
                        </div>
                        <div className="text-zinc-800 text-[11.5px] leading-relaxed font-sans prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-zinc-900 prose-strong:font-bold">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {/* Swarm Execution Results  Eshown only in the latest Coordinator message */}
                        {(() => {
                          if (msg.meta?.responder !== 'Coordinator') return null;

                          const isLatestCoordinatorMsg = (() => {
                            let latestIdx = -1;
                            for (let i = combinedFeed.length - 1; i >= 0; i--) {
                              const feedItem = combinedFeed[i];
                              if (feedItem._type === 'message' && feedItem.msg?.meta?.responder === 'Coordinator') {
                                latestIdx = i;
                                break;
                              }
                            }
                            return latestIdx === index;
                          })();

                          if (!isLatestCoordinatorMsg) return null;

                          const completedTaskExecs = combinedFeed
                            .filter(fItem => fItem._type === 'task_exec' && fItem.taskExec && ['completed', 'failed'].includes(fItem.taskExec.status))
                            .map(fItem => fItem.taskExec!);

                          if (completedTaskExecs.length === 0) return null;

                          return (
                            <div className="mt-4 border-t border-zinc-100 pt-3.5 space-y-3">
                              <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-4 w-4 rounded bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Swarm Execution Summary</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
                                  {completedTaskExecs.filter(t => t.status === 'completed').length} / {completedTaskExecs.length} Done
                                </span>
                              </div>
                              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                {completedTaskExecs.map((task, tIdx) => {
                                  const isDone = task.status === 'completed';
                                  return (
                                    <div key={tIdx} className="bg-zinc-50/70 rounded-xl border border-zinc-100/50 p-3 space-y-2 hover:border-zinc-200 transition-colors">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {isDone ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                          ) : (
                                            <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                          )}
                                          <span className="font-bold text-zinc-800 truncate text-[11.5px] leading-snug">
                                            {task.taskTitle}
                                          </span>
                                        </div>
                                        <span className="text-[9px] bg-zinc-200/50 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                                          👤 {task.agentName || 'Specialist'}
                                        </span>
                                      </div>
                                      {task.result && (
                                        <div className="text-[11px] text-zinc-600 leading-relaxed font-sans bg-white rounded-lg p-2.5 border border-zinc-100/80 shadow-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                                          {task.result}
                                        </div>
                                      )}
                                      {task.error && (
                                        <div className="text-[11px] text-red-600 leading-relaxed font-medium bg-red-50/40 rounded-lg p-2.5 border border-red-100">
                                          Error: {task.error}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm whitespace-pre-wrap max-w-[90%]">{msg.content}</div>
                    )
              )}
            </div>
          );
        }

        return null;
      })}

      {(isSending || isStreaming) && (
        <div className="flex items-start gap-2.5 my-2.5 self-start w-full max-w-[90%]">
          <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center text-white text-xs font-black shadow-sm flex-shrink-0 mt-0.5 animate-pulse">
            🧠
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 text-xs flex-1 shadow-sm">
            <StreamingMessage
              thinkingSteps={thinkingSteps}
              currentStep={thinkingStep}
              currentNode={thinkingNode}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              label={workforceName}
            />
          </div>
        </div>
      )}

      {isPolling && !isSending && (
        <div className="flex items-start justify-end">
          <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm max-w-[90%]">
            <div className="flex items-center gap-2 text-zinc-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {pollingExecutionId ? `Running (${pollingExecutionId.slice(0, 8)}…)  Efinalizing…` : "Finalizing…"}
            </div>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div ref={bottomRef} />
    </div>
  );
}
