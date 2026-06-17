"use client";

import React, { useState, useMemo } from "react";
import {
  Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  MessageSquare, Zap, Brain, Search, ArrowRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwarmEvent } from "./SwarmChatFeed";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgentActivityCardProps {
  agentId: string;
  agentName: string;
  events: SwarmEvent[];
  liveProgress?: string;
  isCompleted?: boolean;
  isFailed?: boolean;
}

interface CoordinatorPanelProps {
  events: SwarmEvent[];
}

interface CommThreadProps {
  events: SwarmEvent[];
}

// ─── Step Icon ────────────────────────────────────────────────────────────────
function StepIcon({ type }: { type: string }) {
  if (type === "tool") return <Zap className="h-3 w-3 text-purple-500" />;
  if (type === "think") return <Brain className="h-3 w-3 text-blue-500" />;
  if (type === "review") return <Search className="h-3 w-3 text-amber-500" />;
  return <ArrowRight className="h-3 w-3 text-zinc-400" />;
}

// ─── Per-Agent Activity Card ──────────────────────────────────────────────────
export function AgentActivityCard({
  agentId, agentName, events, liveProgress, isCompleted, isFailed,
}: AgentActivityCardProps) {
  const [expanded, setExpanded] = useState(true);

  const agentEvents = useMemo(() =>
    events.filter(e =>
      (e.payload?.agentId === agentId || e.payload?.from === agentId) &&
      (e.type === "AGENT_PROGRESS" || e.type === "TASK_COMPLETED" || e.type === "TASK_FAILED" || e.type === "AGENT_LIVE_PROGRESS")
    ),
    [events, agentId]
  );

  const taskTitle = useMemo(() => {
    const prog = events.find(e => e.payload?.agentId === agentId && e.payload?.taskTitle);
    return prog?.payload?.taskTitle || "Assigned task";
  }, [events, agentId]);

  const completedEvent = useMemo(() =>
    events.find(e => e.payload?.agentId === agentId && e.type === "TASK_COMPLETED"),
    [events, agentId]
  );

  const liveSteps = useMemo(() =>
    events
      .filter(e => e.payload?.agentId === agentId && e.type === "AGENT_LIVE_PROGRESS")
      .slice(-8),
    [events, agentId]
  );

  const initials = agentName
    ? agentName
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "A"
    : "A";
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-rose-500", "bg-amber-500", "bg-cyan-500",
  ];
  const avatarColor = colors[agentName.charCodeAt(0) % colors.length] || "bg-indigo-500";

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      isCompleted ? "border-emerald-200 bg-emerald-50/40" :
        isFailed ? "border-red-200 bg-red-50/40" :
          "border-zinc-200 bg-white shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-black", avatarColor)}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-800 truncate">{agentName}</span>
            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
            {isFailed && <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
            {!isCompleted && !isFailed && (
              <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-zinc-400 truncate">{taskTitle}</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-zinc-100 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp className="h-3 w-3 text-zinc-400" /> : <ChevronDown className="h-3 w-3 text-zinc-400" />}
        </button>
      </div>

      {/* Live step ticker */}
      {!isCompleted && !isFailed && liveProgress && (
        <div className="mx-3.5 mb-2 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
          <p className="text-[10.5px] text-indigo-700 font-medium truncate">↳ {liveProgress}</p>
        </div>
      )}

      {/* Expanded steps */}
      {expanded && (
        <div className="px-3.5 pb-3 space-y-1.5">
          {liveSteps.length > 0 && (
            <div className="space-y-1">
              {liveSteps.map((e, i) => {
                const cat: string = e.payload?.category || 'step';
                const isLatest = i === liveSteps.length - 1;

                if (cat === 'thinking') return (
                  <div key={i} className={cn(
                    "rounded-xl px-2.5 py-2 text-[10.5px] leading-relaxed border",
                    isLatest
                      ? "bg-indigo-50 border-indigo-100 text-indigo-900"
                      : "bg-zinc-50 border-zinc-100 text-zinc-400"
                  )}>
                    <span className="font-black text-[8px] uppercase tracking-widest block mb-0.5 text-indigo-400">
                      💭 Thinking
                    </span>
                    {e.payload?.detail}
                  </div>
                );

                if (cat === 'tool_call') return (
                  <div key={i} className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border",
                    isLatest
                      ? "bg-purple-50 border-purple-100"
                      : "bg-zinc-50 border-zinc-100 opacity-50"
                  )}>
                    <Zap className={cn("h-3 w-3 flex-shrink-0", isLatest ? "text-purple-500" : "text-zinc-300")} />
                    <span className={cn("text-[10px] font-mono truncate", isLatest ? "text-purple-800" : "text-zinc-400")}>
                      {e.payload?.detail}
                    </span>
                    {isLatest && <Loader2 className="h-2.5 w-2.5 text-purple-400 animate-spin ml-auto flex-shrink-0" />}
                  </div>
                );

                if (cat === 'tool_result') return (
                  <div key={i} className={cn(
                    "rounded-xl px-2.5 py-2 text-[10px] leading-relaxed border",
                    isLatest
                      ? "bg-teal-50 border-teal-100 text-teal-800"
                      : "bg-zinc-50 border-zinc-100 text-zinc-400"
                  )}>
                    <span className="font-black text-[8px] uppercase tracking-widest block mb-0.5 text-teal-400">
                      ✓ Result
                    </span>
                    <span className="line-clamp-2">{e.payload?.detail}</span>
                  </div>
                );

                if (cat === 'comm') return (
                  <div key={i} className={cn(
                    "flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 border",
                    "bg-amber-50 border-amber-100"
                  )}>
                    <MessageSquare className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-amber-800 leading-snug">{e.payload?.detail}</span>
                  </div>
                );

                // default 'step'
                return (
                  <div key={i} className={cn(
                    "flex items-center gap-1.5 text-[10px]",
                    isLatest ? "text-zinc-700" : "text-zinc-400"
                  )}>
                    <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                    <span>{e.payload?.detail}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Result */}
          {completedEvent?.payload?.result && (
            <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Result</p>
              <p className="text-[10.5px] text-emerald-900 leading-relaxed line-clamp-4">
                {completedEvent.payload.result}
              </p>
            </div>
          )}

          {!isCompleted && !isFailed && liveSteps.length === 0 && (
            <p className="text-[10px] text-zinc-400 italic">Waiting for agent to start…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Coordinator Panel ────────────────────────────────────────────────────────
export function CoordinatorPanel({ events }: CoordinatorPanelProps) {
  const coordEvents = useMemo(() =>
    events.filter(e =>
      e.type === "COORDINATOR_THINK" ||
      e.type === "COORDINATOR_ASSIGN" ||
      e.type === "COORDINATOR_INSPECT" ||
      e.type === "TASK_CROSS_CHECK"
    ).slice(-12),
    [events]
  );

  if (coordEvents.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-violet-100">
        <Brain className="h-4 w-4 text-violet-600" />
        <span className="text-xs font-bold text-violet-800">Coordinator</span>
        <span className="ml-auto text-[9px] text-violet-400 font-mono uppercase tracking-wide">Orchestrating</span>
      </div>
      <div className="px-3.5 py-2.5 space-y-2 max-h-64 overflow-y-auto">
        {coordEvents.map((e, i) => {
          const time = new Date(e.payload?.timestamp || e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const isAssign = e.type === "COORDINATOR_ASSIGN";
          const isCrossCheck = e.type === "TASK_CROSS_CHECK";
          const isInspect = e.type === "COORDINATOR_INSPECT";
          return (
            <div key={i} className={cn(
              "flex items-start gap-2 text-[10.5px]",
              i === coordEvents.length - 1 ? "opacity-100" : "opacity-60"
            )}>
              <span className={cn(
                "mt-0.5 flex-shrink-0 text-base leading-none",
                isAssign ? "text-blue-500" : isCrossCheck ? "text-amber-500" : isInspect ? "text-violet-500" : "text-violet-500"
              )}>
                {isAssign ? "📋" : isCrossCheck ? "🔍" : isInspect ? "🧠" : "💭"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-violet-900 leading-snug font-sans prose prose-sm max-w-none prose-p:leading-snug prose-strong:text-violet-950 prose-strong:font-bold">
                  <ReactMarkdown>{e.payload?.detail}</ReactMarkdown>
                </div>
                <p className="text-violet-400 text-[9px] mt-0.5">{time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Communication Thread ─────────────────────────────────────────────────────
export function AgentCommThread({ events }: CommThreadProps) {
  const commEvents = useMemo(() =>
    events.filter(e => e.type === "INTER_AGENT_MSG").slice(-20),
    [events]
  );

  if (commEvents.length === 0) return null;

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-teal-100">
        <MessageSquare className="h-4 w-4 text-teal-600" />
        <span className="text-xs font-bold text-teal-800">Agent Communications</span>
        <span className="ml-auto text-[9px] font-bold bg-teal-100 text-teal-600 rounded-full px-2 py-0.5">
          {commEvents.length}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-2 max-h-52 overflow-y-auto">
        {commEvents.map((e, i) => {
          const time = new Date(e.payload?.timestamp || e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const fromName = e.payload?.fromName || (e.payload?.from ? `Agent ${e.payload.from.slice(0, 6)}` : "Agent");
          const toName = e.payload?.toName || (e.payload?.to ? `Agent ${e.payload.to.slice(0, 6)}` : "Agent");
          return (
            <div key={i} className="bg-white rounded-xl border border-teal-100 px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-black text-teal-700 uppercase tracking-wide">{fromName}</span>
                <ArrowRight className="h-2.5 w-2.5 text-teal-400" />
                <span className="text-[9px] font-black text-teal-700 uppercase tracking-wide">{toName}</span>
                <span className="ml-auto text-[8px] text-teal-300">{time}</span>
              </div>
              <p className="text-[10.5px] text-zinc-700 leading-snug">{e.payload?.content || e.payload?.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Swarm Activity Feed ─────────────────────────────────────────────────
interface SwarmActivityFeedProps {
  events: SwarmEvent[];
  liveProgressMap: Record<string, string>;
  completedTaskIds: Set<string>;
  failedTaskIds?: Set<string>;
}

export function SwarmActivityFeed({
  events, liveProgressMap, completedTaskIds, failedTaskIds = new Set(),
}: SwarmActivityFeedProps) {
  // Derive unique agents from events
  const agentMap = useMemo(() => {
    const map = new Map<string, string>(); // id -> name
    events.forEach(e => {
      if (e.payload?.agentId && e.payload?.agentName) {
        map.set(e.payload.agentId, e.payload.agentName);
      }
      if (e.payload?.from && e.payload?.fromName) {
        map.set(e.payload.from, e.payload.fromName);
      }
    });
    return map;
  }, [events]);

  const agents = Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));

  // Task → agent mapping from AGENT_PROGRESS events
  const taskToAgent = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      if (e.payload?.taskId && e.payload?.agentId) {
        map.set(e.payload.taskId, e.payload.agentId);
      }
    });
    return map;
  }, [events]);

  // Compute liveProgress per agent from liveProgressMap (taskId-indexed)
  const agentLiveProgress = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(liveProgressMap).forEach(([taskId, detail]) => {
      const agentId = taskToAgent.get(taskId);
      if (agentId) map[agentId] = detail;
    });
    return map;
  }, [liveProgressMap, taskToAgent]);

  if (agents.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Coordinator */}
      <CoordinatorPanel events={events} />

      {/* Agent Cards */}
      {agents.length > 0 && (
        <div className={cn("grid gap-3", agents.length === 1 ? "grid-cols-1" : agents.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
          {agents.map(({ id, name }) => {
            const taskId = Array.from(taskToAgent.entries()).find(([, aid]) => aid === id)?.[0];
            const isCompleted = taskId ? completedTaskIds.has(taskId) : false;
            const isFailed = taskId ? failedTaskIds.has(taskId) : false;
            return (
              <AgentActivityCard
                key={id}
                agentId={id}
                agentName={name}
                events={events}
                liveProgress={agentLiveProgress[id]}
                isCompleted={isCompleted}
                isFailed={isFailed}
              />
            );
          })}
        </div>
      )}

      {/* Communication Thread */}
      <AgentCommThread events={events} />
    </div>
  );
}
