"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChatComposer, type ChatComposerRef } from "@/entities/chats/components/ChatComposer";
import { StreamingMessage } from "@/entities/agents/components/StreamingMessage";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { useSwarmMessageStream } from "@/entities/agents/hooks/useSwarmMessageStream";
import { trpc } from "@/lib/trpc";
import { WorkforceChatSkeleton } from "../WorkforceChatSkeleton";
import { fetchAuthToken } from "@/utils/backend-request";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChatContextModal, type ContextEntity } from "@/features/dashboard/components/modals/ChatContextModal";
import { SwarmChatFeed, ActiveProcessingWidget, type ConvMessage, type SwarmEvent, type TaskExecution } from "./components/SwarmChatFeed";
import { SwarmActivityFeed } from "./components/SwarmAgentActivityFeed";
import { SwarmLogView } from "./components/SwarmLogView";
import { SwarmTaskView, type SwarmTask } from "./components/SwarmTaskView";
import { SwarmGraphView } from "./components/SwarmGraphView";
import { SwarmMetricsView } from "./components/SwarmMetricsView";
import { SwarmTimelineView } from "./components/SwarmTimelineView";
import {
  MessageSquare, FileText, LayoutGrid, GitFork, BarChart3, Timer,
  Play, Square, Loader2, Shield, Check, AlertTriangle, Files, X, Sparkles, ArrowRight
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────
type ViewType = "chat" | "log" | "task" | "graph" | "metrics" | "timeline";
type SessionStatus = "idle" | "running" | "stopped";

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
async function backendFetch(path: string, opts: RequestInit = {}) {
  const token = await fetchAuthToken();
  return fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
}

async function pollExecutionStatus(executionId: string) {
  // This is now handled via SSE stream invalidation.
  // We just return a generic response since the UI will update via SSE.
  return { status: "RUNNING" };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── StatusPill ──────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: "idle" | "running" | "stopped" }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
      status === "running" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
        status === "stopped" ? "bg-red-50 text-red-600 border-red-200" :
          "bg-zinc-50 text-zinc-500 border-zinc-200"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "running" ? "bg-emerald-500 animate-pulse" :
          status === "stopped" ? "bg-red-400" : "bg-zinc-400"
      )} />
      {status === "running" ? "Running" : status === "stopped" ? "Stopped" : "Idle"}
    </div>
  );
}


interface SwarmRunViewProps {
  workforceId: string;
  workforceName: string;
  triggerLabel?: string;
  initialMessage?: string;
  onBack?: () => void;
  embeddedInSidebar?: boolean;
  initialConversationId?: string | null;
  onConversationReady?: (conversationId: string) => void;
}

interface PendingMessage {
  id: string;
  content: string;
  ts: number;
}

// ─── main component ───────────────────────────────────────────────────────────
export default function SwarmRunView({
  workforceId,
  workforceName,
  initialConversationId = null,
  onConversationReady,
}: SwarmRunViewProps) {
  // ── view / session state ──────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ViewType>("chat");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [swarmSessionId, setSwarmSessionId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // ── modals state ──────────────────────────────────────────────────────────
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<ContextEntity[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<any[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<{ filename: string; content: string } | null>(null);

  // ── conversation / chat state ─────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [optimisticPending, setOptimisticPending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingExecutionId, setPollingExecutionId] = useState<string | null>(null);
  const lastSentTaskRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<ChatComposerRef>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingUserMessages, setPendingUserMessages] = useState<PendingMessage[]>([]);

  // ── swarm data state ──────────────────────────────────────────────────────
  const [swarmEvents, setSwarmEvents] = useState<SwarmEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<SwarmTask[]>([]);
  const sseRef = useRef<AbortController | null>(null);
  const subscribedSessionIdRef = useRef<string | null>(null);

  // ── trpc ──────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createConversation = trpc.chat.createWorkforceConversation.useMutation();
  const persistMessages = trpc.chat.persistWorkforceMessages.useMutation();
  const { data: workforceData } = trpc.workforce.get.useQuery({ id: workforceId });

  // Extract nodes from graph
  const graph = (workforceData as any)?.graph || (workforceData as any)?.data?.react_flow_graph;
  const rfNodes: any[] = graph?.nodes ?? [];

  const swarmAgents = rfNodes.filter((n: any) => n.type === 'agentNode');
  const swarmTasks = rfNodes.filter((n: any) => n.type === 'taskNode');

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 }
  );

  // ── auto-refresh DB messages while swarm is running ───────────────────────
  // Replaced blind 4s polling with SSE-driven invalidation.
  useEffect(() => {
    // No-op: invalidation is handled by subscribeSSE when specific events arrive.
  }, [sessionStatus, conversationId]);

  // ── sync init conv id ─────────────────────────────────────────────────────
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      conversationIdRef.current = initialConversationId;
    }
  }, [initialConversationId]);

  // ── sync db messages to local & extract swarm events ──────────────────────
  useEffect(() => {
    if (!messagesData?.messages) return;
    const dbMessages = messagesData.messages.map((m: any, idx: number) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content as string,
      executionId: (m.metadata as any)?.executionId,
      swarmEvent: (m.metadata as any)?.swarmEvent ?? null,
      ts: m.createdAt ? new Date(m.createdAt).getTime() : (Date.now() - 100000 + idx * 10),
      meta: m.metadata ? ((m.metadata as any).meta || m.metadata) : null,
    }));

    // Filter out pending messages that are already in dbMessages
    const newPending = pendingUserMessages.filter(pending => {
      return !dbMessages.some(dbMsg => {
        if (dbMsg.role !== "user") return false;

        const graceBuffer = 5000; // 5s clock drift buffer
        if (dbMsg.ts < pending.ts - graceBuffer) return false;

        const cleanDb = dbMsg.content.trim().toLowerCase();
        const cleanPending = pending.content.trim().toLowerCase();

        return cleanDb === cleanPending || cleanDb.startsWith(cleanPending) || cleanPending.startsWith(cleanDb);
      });
    });

    // Only update state if the pending messages changed (to prevent infinite loops)
    if (JSON.stringify(newPending) !== JSON.stringify(pendingUserMessages)) {
      setPendingUserMessages(newPending);
    }

    // Map remaining pending messages into ConvMessage structures
    const pendingConvMessages = newPending.map(pending => ({
      role: "user" as const,
      content: pending.content,
      ts: pending.ts,
      meta: null,
    }));

    setMessages([...dbMessages, ...pendingConvMessages]);

    // Extract swarm events from messages, order them newest first (descending timestamp/ts)
    const extractedEvents: SwarmEvent[] = [];
    dbMessages.forEach((msg) => {
      if (msg.swarmEvent) {
        extractedEvents.push(msg.swarmEvent);
      }
    });
    // Merge DB events with existing live events (to avoid erasing delayed buffer events)
    setSwarmEvents(prev => {
      const map = new Map<string, SwarmEvent>();
      extractedEvents.forEach(e => {
        const ts = e.timestamp || e.payload?.timestamp || new Date().toISOString();
        e.timestamp = ts;
        map.set(ts, e);
      });
      prev.forEach(e => {
        const ts = e.timestamp || e.payload?.timestamp || new Date().toISOString();
        e.timestamp = ts;
        if (!map.has(ts)) map.set(ts, e);
      });
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return merged.slice(0, 200);
    });

    // If sessionStatus is currently "idle" but we have messages, it means we are loading a past run.
    // Use functional update to avoid stale closures.
    setSessionStatus(prev => {
      if (prev === "idle" && dbMessages.length > 0) return "stopped";
      return prev;
    });
  }, [messagesData, pendingUserMessages]);

  // ── scroll to bottom ──────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  useEffect(() => {
    setIsAutoScrollEnabled(true);
  }, [conversationId]);

  useEffect(() => {
    if (isAutoScrollEnabled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, swarmEvents, tasks, pendingApprovals, isAutoScrollEnabled]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setIsAutoScrollEnabled(isAtBottom);
  }, []);


  // ── swarm message stream ──────────────────────────────────────────────────
  const { thinkingSteps, thinkingStep, thinkingNode, streamingContent, isSending, isStreaming, sendMessage: sendSwarmMessage, abort: abortSwarmMessage } = useSwarmMessageStream({
    onError: (msg) => {
      setError(msg);
      setOptimisticPending(false);
    },
    onComplete: async (payload) => {
      await refetchMessages();
      setOptimisticPending(false);
    },
  });

  // ── create conversation ───────────────────────────────────────────────────
  const startNewConversation = useCallback(async () => {
    const conv = await createConversation.mutateAsync({ workforceId, workforceName, mode: 'SWARM' });
    utils.chat.listWorkforceConversations.setData({ workforceId, mode: 'SWARM' }, old =>
      old ? [{ id: conv.id, title: conv.title, createdAt: new Date(), lastMessageAt: null, messageCount: 0 }, ...old] : []
    );
    setConversationId(conv.id); conversationIdRef.current = conv.id;
    setMessages([]); setError(null);
    onConversationReady?.(conv.id);
  }, [workforceId, workforceName, createConversation, utils, onConversationReady]);

  // ── fetch swarm tasks ─────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    const sid = swarmSessionId || conversationId;
    if (!sid) return;

    try {
      const res = await backendFetch(`/v1/agents/swarm/tasks?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = await res.json() as any;
      const all: SwarmTask[] = data.tasks ?? [];
      setTasks(all);
      setPendingApprovals(all.filter(t => t.status === "PENDING_APPROVAL"));
    } catch { }
  }, [swarmSessionId, conversationId]);

  // ── SSE subscription ──────────────────────────────────────────────────────
  const subscribeSSE = useCallback(async (sid: string, isReconnect = false) => {
    if (!isReconnect && subscribedSessionIdRef.current === sid && sseRef.current && !sseRef.current.signal.aborted) {
      return; // Already subscribed
    }
    subscribedSessionIdRef.current = sid;
    sseRef.current?.abort();
    const ctrl = new AbortController();
    sseRef.current = ctrl;
    try {
      const token = await fetchAuthToken();
      const res = await fetch(`${BACKEND_URL}/v1/agents/swarm/${sid}/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (ctrl.signal.aborted) break;
        if (done) {
          // Reconnect if the stream drops unexpectedly (e.g. timeout)
          if (!ctrl.signal.aborted) {
            setTimeout(() => subscribeSSE(sid, true), 2000);
          }
          break;
        }
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.replace(/^data:\s*/m, "");
          try {
            const evt: SwarmEvent = JSON.parse(line);
            if (!evt.timestamp) {
              evt.timestamp = evt.payload?.timestamp || new Date().toISOString();
            }
            setSwarmEvents(prev => [evt, ...prev].slice(0, 200));
            // Parse inter-agent messages from CYCLE events
            if (evt.type === "CYCLE_INSPECT" && evt.payload?.taskIds) {
              fetchTasks();
            }
            if (evt.type !== "AGENT_LIVE_PROGRESS") {
              refetchMessages();
            }
            if (evt.type === "SESSION_STOPPED") {
              setSessionStatus("stopped");
            }
          } catch { }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("[SwarmRunView] SSE error", e);
        if (!ctrl.signal.aborted) setTimeout(() => subscribeSSE(sid, true), 3000);
      }
    }
  }, [refetchMessages, fetchTasks]);

  // ── check swarm session status ────────────────────────────────────────────
  const checkSessionStatus = useCallback(async (cid: string) => {
    try {
      const res = await backendFetch(`/v1/agents/swarm/${encodeURIComponent(cid)}/status`);
      if (!res.ok) return;
      const data = await res.json() as any;
      if (data?.status === "running") {
        setSessionStatus("running");
        setSwarmSessionId(cid);
        if (data.workspaceId) {
          setWorkspaceId(data.workspaceId);
        }
        subscribeSSE(cid);
      } else {
        if (messages.length > 0 || (messagesData?.messages && messagesData.messages.length > 0)) {
          setSessionStatus("stopped");
        } else {
          setSessionStatus("idle");
        }
      }
    } catch (e) {
      console.error("[SwarmRunView] Failed to check session status", e);
    }
  }, [subscribeSSE, messages.length, messagesData]);

  // ── fetch tasks & status on conversation load ─────────────────────────────
  useEffect(() => {
    // Clear/Reset all session/conversation states on conversation change
    // to avoid displaying content from the previous conversation.
    if (sseRef.current) {
      sseRef.current.abort();
      sseRef.current = null;
    }
    subscribedSessionIdRef.current = null;

    setMessages([]);
    setSwarmEvents([]);
    setAgentMessages([]);
    setTasks([]);
    setPendingApprovals([]);
    setSessionStatus("idle");
    setSwarmSessionId(null);
    setPendingUserMessages([]);
    setOptimisticPending(false);

    if (conversationId) {
      fetchTasks();
      checkSessionStatus(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    return () => {
      sseRef.current?.abort();
    };
  }, []);

  // ── poll tasks when swarm is running ──────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== "running") return;
    fetchTasks();
    const id = setInterval(() => {
      fetchTasks();
      refetchMessages();
    }, 5000);
    return () => clearInterval(id);
  }, [sessionStatus, fetchTasks, refetchMessages]);

  // ── start swarm ───────────────────────────────────────────────────────────
  const handleStartSwarm = useCallback(async () => {
    if (!conversationId) { toast.error("No active conversation"); return; }
    setIsStarting(true);
    try {
      const res = await backendFetch("/v1/agents/swarm/start", {
        method: "POST",
        body: JSON.stringify({ workforceId, sessionId: conversationId }),
      });
      if (!res.ok) {
        const err = await res.json() as any;
        toast.error(err.error || "Failed to start swarm");
        return;
      }
      const data = await res.json() as any;
      setSwarmSessionId(data.sessionId);
      setWorkspaceId(data.workspaceId);
      setSessionStatus("running");
      toast.success("Swarm started");
      subscribeSSE(data.sessionId);
      refetchMessages();
      setTimeout(() => refetchMessages(), 2500);
    } catch (e: any) { toast.error(e?.message || "Failed to start swarm"); }
    finally { setIsStarting(false); }
  }, [conversationId, workforceId, subscribeSSE, refetchMessages]);

  // ── stop swarm ────────────────────────────────────────────────────────────
  const handleStopSwarm = useCallback(async () => {
    if (!swarmSessionId) return;
    sseRef.current?.abort();
    subscribedSessionIdRef.current = null;
    try {
      await backendFetch(`/v1/agents/swarm/${swarmSessionId}/stop`, { method: "POST" });
      setSessionStatus("stopped"); toast.info("Swarm stopped");
    } catch { }
  }, [swarmSessionId]);

  // ── handle task approve ───────────────────────────────────────────────────
  const handleApprove = useCallback(async (taskId: string) => {
    try {
      await backendFetch(`/v1/agents/swarm/tasks/${taskId}/approve`, { method: "POST" });
      toast.success("Task approved"); fetchTasks();
    } catch { toast.error("Approval failed"); }
  }, [fetchTasks]);

  // ── handle task deny ─────────────────────────────────────────────────────
  const handleDeny = useCallback(async (taskId: string) => {
    try {
      await backendFetch(`/v1/agents/swarm/tasks/${taskId}/deny`, { method: "POST" });
      toast.info("Task denied"); fetchTasks();
    } catch { toast.error("Deny failed"); }
  }, [fetchTasks]);

  // ── send chat message ─────────────────────────────────────────────────────
  const handleSend = useCallback(async (message: string) => {
    const cleanContent = message.trim();
    if (!cleanContent) return;
    setError(null); setOptimisticPending(true);

    const payloadContexts = [...selectedContexts];
    const payloadMentions = [...selectedMentions];

    setSelectedMentions([]);
    setSelectedContexts([]);

    lastSentTaskRef.current = cleanContent;
    const pendingItem: PendingMessage = {
      id: `pending-${Date.now()}-${Math.random()}`,
      content: cleanContent,
      ts: Date.now(),
    };
    setIsAutoScrollEnabled(true);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    setPendingUserMessages(prev => [...prev, pendingItem]);
    setMessages(prev => [...prev, {
      role: "user",
      content: cleanContent,
      ts: pendingItem.ts,
      meta: { mentions: payloadMentions, contexts: payloadContexts }
    }]);

    // Merge context and mentions into metadata
    let extraMeta = {};
    if (payloadContexts.length > 0) extraMeta = { ...extraMeta, contexts: payloadContexts };
    if (payloadMentions.length > 0) extraMeta = { ...extraMeta, mentions: payloadMentions };

    // Do not append raw mentions text to avoid rendering issues in UI; backend uses the structured mentions array.
    const backendMessageStr = cleanContent;

    if (sessionStatus !== "running" || !swarmSessionId || !workspaceId) {
      // Auto-start swarm if stopped/idle before sending
      setIsStarting(true);
      try {
        const startRes = await backendFetch("/v1/agents/swarm/start", {
          method: "POST",
          body: JSON.stringify({ workforceId, sessionId: conversationId }),
        });
        if (!startRes.ok) {
          const err = await startRes.json() as any;
          throw new Error(err.error || "Failed to start swarm");
        }
        const startData = await startRes.json() as any;
        setSwarmSessionId(startData.sessionId);
        setWorkspaceId(startData.workspaceId);
        setSessionStatus("running");
        subscribeSSE(startData.sessionId);
        toast.success("Swarm started");

        // Send message to the newly started swarm using streaming
        await sendSwarmMessage({
          sessionId: startData.sessionId,
          message: backendMessageStr,
          workspaceId: startData.workspaceId,
          mentions: payloadMentions,
          contexts: payloadContexts,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to send message to swarm");
        setOptimisticPending(false);
      } finally {
        setIsStarting(false);
      }
    } else {
      // Send to active swarm as an interrupt task using streaming
      try {
        await sendSwarmMessage({
          sessionId: swarmSessionId,
          message: backendMessageStr,
          workspaceId,
          mentions: payloadMentions,
          contexts: payloadContexts,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to send message to swarm");
        setOptimisticPending(false);
      }
    }
  }, [selectedContexts, selectedMentions, sessionStatus, swarmSessionId, workspaceId, conversationId, workforceId, subscribeSSE, sendSwarmMessage]);

  // ── Combine messages, tasks, and swarm events BEFORE conditional returns ──
  // ── Combine messages, tasks, and swarm events BEFORE conditional returns ──
  const combinedFeed = React.useMemo(() => {
    const feed: ({ ts: number; id: string } & (
      | { _type: 'message'; msg: ConvMessage; idx: number }
      | { _type: 'hitl'; task: SwarmTask }
      | { _type: 'tick'; evt: SwarmEvent }
      | { _type: 'task_exec'; taskExec: TaskExecution }
      | { _type: 'comm_msg'; evt: SwarmEvent }
    ))[] = [];

    // 1. Gather all unique swarm events and regular chat messages
    const uniqueEventsMap = new Map<string, SwarmEvent>();
    const persistedTimestamps = new Set<string>();
    const chatMessages: { msg: ConvMessage; idx: number }[] = [];

    // Process DB messages
    messages.forEach((msg, idx) => {
      if (msg.swarmEvent) {
        const evt = msg.swarmEvent;
        // Key by type and timestamp to deduplicate
        const key = `${evt.type}_${evt.timestamp}`;
        uniqueEventsMap.set(key, evt);
        persistedTimestamps.add(evt.timestamp);
      } else {
        chatMessages.push({ msg, idx });
      }
    });

    // Process live SSE events
    swarmEvents.forEach((evt) => {
      const key = `${evt.type}_${evt.timestamp}`;
      if (!uniqueEventsMap.has(key) && !persistedTimestamps.has(evt.timestamp)) {
        uniqueEventsMap.set(key, evt);
      }
    });

    // Sort events chronologically (oldest first)
    const sortedEvents = Array.from(uniqueEventsMap.values()).sort((a, b) => {
      const aTime = new Date(a.timestamp || a.payload?.timestamp || Date.now()).getTime();
      const bTime = new Date(b.timestamp || b.payload?.timestamp || Date.now()).getTime();
      return aTime - bTime;
    });

    // 2. Parse task-related events into TaskExecutions grouped by taskId
    const taskExecutions = new Map<string, TaskExecution>();

    // Pre-populate with all known tasks from the database so blocked/queued tasks appear
    tasks.forEach(dbTask => {
      const blockedByTitles = (dbTask.blockedBy as string[] || [])
        .map(blockingId => tasks.find(t => t.id === blockingId)?.title)
        .filter(Boolean) as string[];

      taskExecutions.set(dbTask.id, {
        taskId: dbTask.id,
        taskTitle: dbTask.title,
        agentId: dbTask.agentId || "",
        agentName: dbTask.metadata?.pipelineNames?.[dbTask.metadata?.currentStepIndex || 0] || "Agent",
        status: dbTask.status === 'BLOCKED' ? "queued" : "queued", // Will sync exactly later
        // Force unstarted tasks to the bottom of the feed using a huge future timestamp offset
        ts: 4000000000000 + new Date(dbTask.createdAt).getTime(),
        steps: [],
        metadata: { ...(dbTask.metadata as object || {}), inputData: dbTask.inputData },
        pipeline: dbTask.metadata?.pipeline,
        currentStepIndex: dbTask.metadata?.currentStepIndex,
        blockedByTitles: blockedByTitles.length > 0 ? blockedByTitles : undefined,
      });
    });

    // Event types that are part of task execution
    const TASK_EVENT_TYPES = new Set([
      'AGENT_PROGRESS',
      'AGENT_LIVE_PROGRESS',
      'TASK_CROSS_CHECK',
      'HITL_REQUEST',
      'TASK_COMPLETED',
      'TASK_FAILED',
    ]);

    sortedEvents.forEach((e) => {
      if (!TASK_EVENT_TYPES.has(e.type)) return;

      const taskId = e.payload?.taskId || e.payload?.task?.id;
      if (!taskId) return;

      const eventTime = e.timestamp || e.payload?.timestamp || new Date().toISOString();

      let taskExec = taskExecutions.get(taskId);
      if (!taskExec) {
        taskExec = {
          taskId,
          taskTitle: e.payload.taskTitle || e.payload.title || e.payload.task?.title || "Untitled Task",
          agentId: e.payload.agentId || e.payload.reviewerAgentId || e.payload.originalAgentId || "",
          agentName: e.payload.agentName || e.payload.reviewerName || e.payload.originalAgentName || "Agent",
          status: "queued",
          ts: new Date(eventTime).getTime(),
          steps: [],
        };
        taskExecutions.set(taskId, taskExec);
      }

      // Update fields with latest info if available
      if (e.payload.taskTitle) taskExec.taskTitle = e.payload.taskTitle;
      if (e.payload.agentName) taskExec.agentName = e.payload.agentName;
      if (e.payload.agentId) taskExec.agentId = e.payload.agentId;

      const eventTs = new Date(eventTime).getTime();
      if (taskExec.ts > 4000000000000) {
        taskExec.ts = eventTs + 1;
      }

      if (e.type === 'AGENT_PROGRESS') {
        taskExec.status = "running";
        const isCompleted = e.payload.status === 'completed';
        taskExec.steps.push({
          id: `step-progress-${taskId}-${eventTime}-${taskExec.steps.length}`,
          type: isCompleted ? "completed" : "progress",
          timestamp: eventTime,
          detail: e.payload.detail || "Working on task...",
          payload: e.payload,
        });
      } else if (e.type === 'AGENT_LIVE_PROGRESS') {
        taskExec.status = "running";
        const category = e.payload.category || "step";
        const stepType = category === "step" ? "progress" : category;
        taskExec.steps.push({
          id: `step-live-${taskId}-${eventTime}-${taskExec.steps.length}`,
          type: stepType,
          timestamp: eventTime,
          detail: e.payload.detail || "",
          payload: e.payload,
        });
      } else if (e.type === 'TASK_CROSS_CHECK') {
        taskExec.status = "running";
        taskExec.steps.push({
          id: `step-cross-${taskId}-${eventTime}-${taskExec.steps.length}`,
          type: "cross_check",
          timestamp: eventTime,
          detail: e.payload.label || e.payload.detail || "Peer review started...",
          payload: e.payload,
        });
      } else if (e.type === 'HITL_REQUEST') {
        taskExec.status = "hitl";
        taskExec.steps.push({
          id: `step-hitl-${taskId}-${eventTime}-${taskExec.steps.length}`,
          type: "hitl",
          timestamp: eventTime,
          detail: e.payload.reason || "Human review requested.",
          payload: e.payload,
        });
      } else if (e.type === 'TASK_COMPLETED') {
        taskExec.status = "completed";
        taskExec.result = e.payload.result || "";
        taskExec.suggestedActions = e.payload.suggestedActions;
        taskExec.artifacts = e.payload.artifacts;
        const alreadyHasCompleted = taskExec.steps.some(s => s.type === 'completed');
        if (!alreadyHasCompleted) {
          taskExec.steps.push({
            id: `step-completed-${taskId}-${eventTime}-${taskExec.steps.length}`,
            type: "completed",
            timestamp: eventTime,
            detail: "Task completed successfully.",
            payload: e.payload,
          });
        }
      } else if (e.type === 'TASK_FAILED') {
        taskExec.status = "failed";
        taskExec.error = e.payload.error || "Execution failed.";
        taskExec.steps.push({
          id: `step-failed-${taskId}-${eventTime}-${taskExec.steps.length}`,
          type: "failed",
          timestamp: eventTime,
          detail: e.payload.error || "Task execution failed.",
          payload: e.payload,
        });
      }
    });

    // 3. Populate final feed items
    // Add regular chat messages
    chatMessages.forEach(({ msg, idx }) => {
      feed.push({
        _type: 'message',
        ts: msg.ts,
        msg,
        idx,
        id: `msg-${idx}`,
      });
    });

    // Add TaskExecution cards
    taskExecutions.forEach((taskExec) => {
      // Sync status and result with actual DB task state to handle server restarts/event losses gracefully
      const dbTask = tasks.find(t => t.id === taskExec.taskId);
      if (dbTask) {
        taskExec.taskTitle = dbTask.title;
        // Expose pipeline metadata to the UI
        taskExec.pipeline = dbTask.metadata?.pipeline;
        taskExec.currentStepIndex = dbTask.metadata?.currentStepIndex;
        taskExec.metadata = { ...(dbTask.metadata as object || {}), inputData: dbTask.inputData };

        const dynamicBlockedByTitles = (dbTask.blockedBy as string[] || [])
          .map(blockingId => tasks.find(t => t.id === blockingId)?.title)
          .filter(Boolean) as string[];
        taskExec.blockedByTitles = dynamicBlockedByTitles.length > 0 ? dynamicBlockedByTitles : undefined;

        if (dbTask.status === 'COMPLETED') {
          taskExec.status = 'completed';
          const dbResult = dbTask.metadata?.result || dbTask.metadata?.summary || (dbTask as any).result?.summary || (dbTask as any).result;
          taskExec.result = typeof dbResult === 'string'
            ? dbResult
            : dbResult?.summary || dbResult?.output || JSON.stringify(dbResult || '');
        } else if (dbTask.status === 'FAILED' || dbTask.status === 'FAILED_PERMANENTLY') {
          taskExec.status = 'failed';
          taskExec.error = dbTask.error || 'Task execution failed.';
        } else if (dbTask.status === 'PENDING_APPROVAL') {
          taskExec.status = 'hitl';
        } else if (dbTask.status === 'QUEUED' || dbTask.status === 'RUNNING') {
          taskExec.status = dbTask.status.toLowerCase() as any;
        }
      }

      feed.push({
        _type: 'task_exec',
        ts: taskExec.ts,
        taskExec,
        id: `task-exec-${taskExec.taskId}`,
      });
    });

    // Add non-task events
    const TICK_TYPES = new Set(['CYCLE_INSPECT', 'CYCLE_ERROR', 'CYCLE_IDLE']);
    const IGNORED_TYPES = new Set(['SESSION_STARTED', 'SESSION_STOPPED']);

    sortedEvents.forEach((e) => {
      if (TASK_EVENT_TYPES.has(e.type)) return; // already grouped inside task execution card
      if (IGNORED_TYPES.has(e.type)) return; // filter out session start/stop noise

      const eventTime = e.timestamp || e.payload?.timestamp || new Date().toISOString();
      const ts = new Date(eventTime).getTime();

      // If it's a dispatch event, shift the task card to appear right after this message
      if (e.type === 'COORDINATOR_ASSIGN') {
        const dispatchedTaskId = e.payload?.taskId || e.payload?.task?.id;
        if (dispatchedTaskId) {
          const t = taskExecutions.get(dispatchedTaskId);
          if (t && t.ts > 4000000000000) t.ts = ts + 1;
        }
      }

      if (TICK_TYPES.has(e.type)) {
        feed.push({
          _type: 'tick',
          ts,
          evt: e,
          id: `tick-${eventTime}-${e.type}`,
        });
      } else if (e.type === 'INTER_AGENT_MSG') {
        feed.push({
          _type: 'comm_msg',
          ts,
          evt: e,
          id: `comm-${eventTime}`,
        });
      } else {
        // Fallback for non-task lifecycle events (SESSION_STARTED, SESSION_STOPPED, etc.)
        const syntheticMsg: ConvMessage = {
          role: 'assistant',
          content: e.payload?.label || e.type,
          swarmEvent: e,
          ts,
        };
        feed.push({
          _type: 'message',
          ts,
          msg: syntheticMsg,
          idx: -1,
          id: `live-event-${eventTime}-${e.type}`,
        });
      }
    });

    // Add pending approvals that don't have task executions yet
    pendingApprovals.forEach(t => {
      if (!taskExecutions.has(t.id)) {
        feed.push({
          _type: 'hitl',
          ts: new Date(t.createdAt).getTime(),
          task: t,
          id: `hitl-${t.id}`,
        });
      }
    });

    const sortedFeed = feed.sort((a, b) => a.ts - b.ts);
    return sortedFeed.filter((item, idx) => {
      // Hide unstarted tasks that are NOT blocked by anything.
      // This prevents the UI from showing empty "queued" task cards before the coordinator even inspects/dispatches them.
      // If a task IS blocked, we keep it visible at the bottom so the user knows it is waiting on dependencies.
      if (item._type === 'task_exec') {
        const isUnstarted = item.taskExec.ts > 4000000000000;
        const isBlocked = item.taskExec.blockedByTitles && item.taskExec.blockedByTitles.length > 0;
        if (isUnstarted && !isBlocked) {
          return false;
        }
      }

      if (item._type === 'message' && item.msg?.swarmEvent?.type === 'COORDINATOR_THINK') {
        for (let i = idx + 1; i < Math.min(idx + 3, sortedFeed.length); i++) {
          const nextItem = sortedFeed[i];
          if (nextItem._type === 'message' && nextItem.msg?.swarmEvent?.type === 'COORDINATOR_ASSIGN') {
            return false;
          }
        }
      }
      return true;
    });
  }, [messages, pendingApprovals, swarmEvents]);

  const liveProgressMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    // Always overwrite so the LATEST step per task is shown, not the first
    swarmEvents.forEach(e => {
      if (e.type === 'AGENT_LIVE_PROGRESS' && e.payload?.taskId) {
        map[e.payload.taskId] = e.payload.detail;
      }
    });
    return map;
  }, [swarmEvents]);

  const [dismissedActionId, setDismissedActionId] = React.useState<string | null>(null);

  // Extract active suggested actions from the latest message or task execution
  const { activeSuggestedActions, activeSuggestedMessageId } = React.useMemo(() => {
    if (!combinedFeed || combinedFeed.length === 0) return { activeSuggestedActions: [], activeSuggestedMessageId: null };

    // Find the latest item with suggestedActions
    for (let i = combinedFeed.length - 1; i >= 0; i--) {
      const item = combinedFeed[i];
      if (item._type === 'message' && item.msg?.role === 'user') {
          return { activeSuggestedActions: [], activeSuggestedMessageId: null };
      }
      if (item._type === 'message' && item.msg?.meta?.suggestedActions?.length > 0) {
        return { activeSuggestedActions: item.msg.meta.suggestedActions, activeSuggestedMessageId: item.id };
      }
      if (item._type === 'task_exec' && (item.taskExec?.suggestedActions?.length ?? 0) > 0) {
        return { activeSuggestedActions: item.taskExec.suggestedActions!, activeSuggestedMessageId: item.id };
      }
    }
    return { activeSuggestedActions: [], activeSuggestedMessageId: null };
  }, [combinedFeed]);

  // Metrics derived from events + tasks
  const cycleCount = swarmEvents.filter(e => e.type === "CYCLE_COMPLETED").length;
  const errorCount = swarmEvents.filter(e => e.type === "CYCLE_ERROR").length;
  const tasksDone = tasks.filter(t => t.status === "COMPLETED").length;
  const tasksFailed = tasks.filter(t => t.status.includes("FAIL")).length;

  const completedTaskIds = React.useMemo(() => {
    return new Set(tasks.filter(t => t.status === "COMPLETED").map(t => t.id));
  }, [tasks]);

  const failedTaskIds = React.useMemo(() => {
    return new Set(tasks.filter(t => t.status.includes("FAIL")).map(t => t.id));
  }, [tasks]);

  // ── skeleton while no conversation ───────────────────────────────────────
  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <WorkforceChatSkeleton />
        <button onClick={startNewConversation} disabled={createConversation.isPending}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer">
          {createConversation.isPending ? "Creating…" : "Start Session"}
        </button>
      </div>
    );
  }

  const TABS: { id: ViewType; label: string; Icon: any }[] = [
    { id: "chat", label: "Chat", Icon: MessageSquare },
    { id: "log", label: "Log", Icon: FileText },
    { id: "task", label: "Tasks", Icon: LayoutGrid },
    { id: "graph", label: "Graph", Icon: GitFork },
    { id: "metrics", label: "Metrics", Icon: BarChart3 },
    { id: "timeline", label: "Timeline", Icon: Timer },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f8f9fb] min-h-0">
      {/* ── Top Bar ── */}
      <div className="flex-none flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200 shadow-sm z-10 gap-3">
        {/* tabs */}
        <div className="flex items-center gap-0.5">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveView(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeView === id ? "bg-indigo-50 text-indigo-700" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              )}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
        {/* status + controls */}
        <div className="flex items-center gap-2">
          <StatusPill status={sessionStatus} />
          {sessionStatus !== "running" ? (
            <button onClick={handleStartSwarm} disabled={isStarting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer">
              {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {isStarting ? "Starting…" : "Start"}
            </button>
          ) : (
            <button onClick={handleStopSwarm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer">
              <Square className="h-3.5 w-3.5 fill-current" />Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === "chat" && (
          <div className="flex h-full min-h-0 gap-0">
            {/* ── Left: Chat feed + composer ─────────────── */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto px-4 py-4"
              >
                <SwarmChatFeed
                  combinedFeed={combinedFeed as any}
                  workforceName={workforceName}
                  editingIndex={editingIndex}
                  setEditingIndex={setEditingIndex}
                  setMessages={setMessages}
                  handleApprove={handleApprove}
                  handleDeny={handleDeny}
                  isSending={isSending}
                  isPolling={isPolling}
                  pollingExecutionId={pollingExecutionId}
                  error={error}
                  thinkingSteps={thinkingSteps}
                  thinkingStep={thinkingStep}
                  thinkingNode={thinkingNode}
                  streamingContent={streamingContent}
                  isStreaming={isStreaming}
                  bottomRef={bottomRef}
                  liveProgressMap={liveProgressMap}
                  completedTaskIds={completedTaskIds}
                  sessionStatus={sessionStatus}
                  onArtifactClick={(filename, rawContent) => {
                    // Sanitize: unwrap nested JSON wrapper if content was stored as raw tool result
                    let content = rawContent;
                    try {
                      const parsed = JSON.parse(rawContent);
                      // Handle {status, toolCallId, result: {content}} wrapper
                      const inner = typeof parsed.result === 'object' && parsed.result !== null ? parsed.result : parsed;
                      const extracted = inner.content || inner.script || inner.documentation ||
                        parsed.content || parsed.script ||
                        (typeof parsed.result === 'string' ? parsed.result : null);
                      if (extracted && typeof extracted === 'string') content = extracted;
                    } catch { /* not JSON, use as-is */ }
                    setActiveArtifact({ filename, content });
                  }}
                />
              </div>

              {/* Always render — visibility toggled by pendingApprovals */}
              {pendingApprovals.length > 0 && (
                <div className="mx-4 mb-2 border border-amber-400 bg-amber-50 rounded-xl p-3 shadow-lg 
                                animate-pulse-border flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center 
                                  justify-center flex-shrink-0 text-sm">🛡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                      Approval Required
                    </p>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5">
                      {pendingApprovals[0].title}
                    </p>
                    {pendingApprovals[0].metadata?.approvalReason && (
                      <p className="text-[11px] text-amber-800 italic mt-1">
                        {pendingApprovals[0].metadata.approvalReason}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleApprove(pendingApprovals[0].id)}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white 
                                   text-[11px] font-bold rounded-lg cursor-pointer">✓ Approve</button>
                      <button onClick={() => handleDeny(pendingApprovals[0].id)}
                        className="flex-1 py-1.5 border border-red-200 text-red-600 
                                   text-[11px] font-bold rounded-lg cursor-pointer">✕ Deny</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-none px-4 py-3 bg-white border-t border-zinc-200">
                <div className="max-w-2xl mx-auto">
                  {/* Follow-up Options */}
                  {activeSuggestedActions && activeSuggestedActions.length > 0 && sessionStatus === 'running' && dismissedActionId !== activeSuggestedMessageId && (
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm mb-4">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                        <span className="text-sm font-semibold text-zinc-700">Follow-up questions</span>
                        <button 
                          onClick={() => setDismissedActionId(activeSuggestedMessageId)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-col divide-y divide-zinc-100">
                        {activeSuggestedActions.map((action: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSend(action.label)}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-none w-6 h-6 rounded-md bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-medium">
                                {i + 1}
                              </div>
                              <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{action.label}</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <ChatComposer
                    ref={composerRef}
                    onSend={handleSend}
                    onStop={abortSwarmMessage}
                    isSending={isSending}
                    disabled={sessionStatus !== 'running'}
                    onContextClick={() => setContextModalOpen(true)}
                    contextCount={selectedContexts.length}
                    onMentionClick={() => setMentionModalOpen(true)}
                    onMentionSelect={(m) => setSelectedMentions(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])}
                    mentionCount={selectedMentions.length}
                    selectedMentions={selectedMentions}
                    mentionsData={{ agents: swarmAgents, tasks: swarmTasks }}
                  />
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <ActiveProcessingWidget events={swarmEvents} status={sessionStatus} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right-Side Artifact Modal ── */}
            {activeArtifact && (
              <div className="w-[480px] border-l border-zinc-200 bg-white flex flex-col shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] transition-all animate-in slide-in-from-right relative z-20">
                <div className="flex-none h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-zinc-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Files className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-800 truncate block">
                        {activeArtifact.filename.replace(/-/g, ' ').replace(/\.md$/, '').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{activeArtifact.filename}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeArtifact.content);
                        toast.success("Copied to clipboard");
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded transition-colors cursor-pointer"
                      title="Copy content"
                    >
                      <Files className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setActiveArtifact(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
                  <div className="prose prose-sm max-w-none text-zinc-800 prose-headings:text-zinc-900 prose-headings:font-bold prose-p:text-zinc-700 prose-li:text-zinc-700 prose-strong:text-zinc-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                    <ReactMarkdown>{activeArtifact.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "log" && <SwarmLogView swarmEvents={swarmEvents} />}
        {activeView === "task" && <SwarmTaskView tasks={tasks} onApprove={handleApprove} />}
        {activeView === "graph" && (
          <SwarmGraphView
            swarmEvents={swarmEvents}
            swarmSessionId={swarmSessionId}
            sessionStatus={sessionStatus}
            tasks={tasks}
            cycleCount={cycleCount}
          />
        )}
        {activeView === "metrics" && (
          <SwarmMetricsView
            cycleCount={cycleCount}
            errorCount={errorCount}
            tasksDone={tasksDone}
            tasksFailed={tasksFailed}
            pendingApprovals={pendingApprovals}
            swarmEvents={swarmEvents}
          />
        )}
        {activeView === "timeline" && <SwarmTimelineView tasks={tasks} />}
      </div>

      <ChatContextModal
        workspaceId={workspaceId || ""}
        open={contextModalOpen}
        onOpenChange={setContextModalOpen}
        selectedContexts={selectedContexts}
        onContextsChange={setSelectedContexts}
      />

      <Dialog open={mentionModalOpen} onOpenChange={setMentionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mention Entity</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="max-h-64 overflow-y-auto mt-4 space-y-1">
              {swarmTasks.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">No tasks found in config</p> :
                swarmTasks.map((t: any) => {
                  const title = t.data?.label || t.data?.title || t.data?.name || "Task";
                  const status = t.data?.status || "CONFIGURED";
                  return (
                    <button key={t.id} onClick={() => {
                      composerRef.current?.insertMention(title, "task");
                      setMentionModalOpen(false);
                    }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 rounded-lg flex items-center justify-between cursor-pointer">
                      <span className="truncate pr-2">{title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-zinc-400 bg-zinc-200 px-1.5 py-0.5 rounded">{status}</span>
                      </div>
                    </button>
                  )
                })
              }
            </TabsContent>
            <TabsContent value="agents" className="max-h-64 overflow-y-auto mt-4 space-y-1">
              {swarmAgents.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">No agents found</p> :
                swarmAgents.map((a: any) => {
                  const name = a.data?.label || a.data?.name || "Agent";
                  return (
                    <button key={a.id} onClick={() => {
                      composerRef.current?.insertMention(name, "agent");
                      setMentionModalOpen(false);
                    }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 rounded-lg flex items-center justify-between cursor-pointer">
                      <span>{name}</span>
                    </button>
                  )
                })
              }
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}