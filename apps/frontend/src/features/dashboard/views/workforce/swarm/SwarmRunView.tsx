"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChatComposer, type ChatComposerRef } from "@/entities/chats/components/ChatComposer";
import { StreamingMessage } from "@/entities/agents/components/StreamingMessage";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { useWorkforceStream } from "../useWorkforceStream";
import { trpc } from "@/lib/trpc";
import { WorkforceChatSkeleton } from "../WorkforceChatSkeleton";
import { fetchAuthToken } from "@/utils/backend-request";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChatContextModal, type ContextEntity } from "@/features/dashboard/components/modals/ChatContextModal";
import { SwarmChatFeed, ActiveProcessingWidget, type ConvMessage, type SwarmEvent } from "./components/SwarmChatFeed";
import { SwarmLogView } from "./components/SwarmLogView";
import { SwarmTaskView, type SwarmTask } from "./components/SwarmTaskView";
import { SwarmGraphView } from "./components/SwarmGraphView";
import { SwarmMetricsView } from "./components/SwarmMetricsView";
import { SwarmTimelineView } from "./components/SwarmTimelineView";
import {
  MessageSquare, FileText, LayoutGrid, GitFork, BarChart3, Timer,
  Play, Square, Loader2, Shield, Check, AlertTriangle,
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
  for (let i = 0; i < 120; i++) {
    const res = await backendFetch(`/v1/agents/workforces/executions/${encodeURIComponent(executionId)}`);
    if (!res.ok) { await sleep(1000); continue; }
    const data = await res.json() as any;
    if (data?.status !== "RUNNING") return data;
    await sleep(1000);
  }
  return { status: "FAILED", error: "Timed out" };
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

  // ── conversation / chat state ─────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [optimisticPending, setOptimisticPending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingExecutionId, setPollingExecutionId] = useState<string | null>(null);
  const lastSentTaskRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ChatComposerRef>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // ── swarm data state ──────────────────────────────────────────────────────
  const [swarmEvents, setSwarmEvents] = useState<SwarmEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<SwarmTask[]>([]);
  const sseRef = useRef<AbortController | null>(null);

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
  useEffect(() => {
    if (sessionStatus !== "running" || !conversationId) return;
    const id = setInterval(() => refetchMessages(), 4000);
    return () => clearInterval(id);
  }, [sessionStatus, conversationId, refetchMessages]);

  // ── sync init conv id ─────────────────────────────────────────────────────
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      conversationIdRef.current = initialConversationId;
    }
  }, [initialConversationId]);

  // ── sync db messages to local ─────────────────────────────────────────────
  useEffect(() => {
    if (!messagesData?.messages || isPolling || optimisticPending) return;
    setMessages(messagesData.messages.map((m: any, idx: number) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content as string,
      executionId: (m.metadata as any)?.executionId,
      swarmEvent: (m.metadata as any)?.swarmEvent ?? null,
      ts: m.createdAt ? new Date(m.createdAt).getTime() : (Date.now() - 100000 + idx * 10),
      meta: (m.metadata as any)?.meta,
    })));
  }, [messagesData, isPolling, optimisticPending]);

  // ── scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── workforce stream ──────────────────────────────────────────────────────
  const { thinkingSteps, thinkingStep, thinkingNode, streamingContent, isSending, isStreaming, sendMessage: sendWorkforceMessage } = useWorkforceStream({
    onError: (msg) => {
      setError(msg); setMessages(p => p.slice(0, -1));
      setOptimisticPending(false); setIsPolling(false); setPollingExecutionId(null);
    },
    onComplete: async (payload) => {
      if (!payload || typeof payload !== "object") return;
      const executionId = (payload as any).executionId as string | undefined;
      const workflowId = (payload as any).workflowId as string | undefined;
      let status = (payload as any).status as string | undefined;
      let response = (payload as any).response as any;
      if (executionId && status === "RUNNING") {
        setIsPolling(true); setPollingExecutionId(executionId);
        const poll = await pollExecutionStatus(executionId);
        status = poll.status;
        if (poll.summary) response = { ...(response || {}), summary: poll.summary };
        else if (poll.error) response = { ...(response || {}), reason: poll.error };
        setIsPolling(false); setPollingExecutionId(null);
      }
      const normalized = status === "COMPLETED" ? "completed" : (status?.toLowerCase() ?? "started");
      let assistantContent = response?.summary || response?.message || response?.output?.summary || response?.output?.text ||
        (typeof response === "string" ? response : undefined) ||
        (executionId ? `Execution ${normalized} (ID: ${executionId.slice(0, 8)}…)` : `Execution ${normalized}.`);
      const activeConvId = conversationIdRef.current;
      try {
        if (activeConvId && lastSentTaskRef.current) {
          const meta: Record<string, unknown> = { executionId, workflowId, status };
          if (response && typeof response === "object") meta.response = response;
          await persistMessages.mutateAsync({ conversationId: activeConvId, userMessage: lastSentTaskRef.current, assistantContent, metadata: meta });
          await refetchMessages();
          utils.chat.listWorkforceConversations.invalidate({ workforceId, mode: 'SWARM' });
        }
      } catch { }
      finally { setOptimisticPending(false); setIsPolling(false); setPollingExecutionId(null); }
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

  // ── SSE subscription ──────────────────────────────────────────────────────
  const subscribeSSE = useCallback(async (sid: string) => {
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
        if (done || ctrl.signal.aborted) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.replace(/^data:\s*/m, "");
          try {
            const evt: SwarmEvent = JSON.parse(line);
            setSwarmEvents(prev => [evt, ...prev].slice(0, 200));
            // Parse inter-agent messages from CYCLE events
            if (evt.type === "CYCLE_INSPECT" && evt.payload?.taskIds) {
              fetchTasks();
            }
            if (evt.type === "SESSION_STOPPED") { setSessionStatus("stopped"); }
          } catch { }
        }
      }
    } catch (e: any) { if (e?.name !== "AbortError") console.error("[SwarmRunView] SSE error", e); }
  }, []);

  // ── fetch swarm tasks ─────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    // If we're tracking a specific swarm session, or at least have a default conversation ID limit to that
    const sid = swarmSessionId || conversationIdRef.current;
    if (!sid) return;

    try {
      const res = await backendFetch(`/v1/agents/swarm/tasks?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = await res.json() as any;
      const all: SwarmTask[] = data.tasks ?? [];
      setTasks(all);
      setPendingApprovals(all.filter(t => t.status === "PENDING_APPROVAL"));
    } catch { }
  }, [swarmSessionId]);

  // ── poll tasks when swarm is running ──────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== "running") return;
    fetchTasks();
    const id = setInterval(fetchTasks, 5000);
    return () => clearInterval(id);
  }, [sessionStatus, fetchTasks]);

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
    } catch (e: any) { toast.error(e?.message || "Failed to start swarm"); }
    finally { setIsStarting(false); }
  }, [conversationId, workforceId, subscribeSSE]);

  // ── stop swarm ────────────────────────────────────────────────────────────
  const handleStopSwarm = useCallback(async () => {
    if (!swarmSessionId) return;
    sseRef.current?.abort();
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
    setMessages(prev => [...prev, { role: "user", content: cleanContent, ts: Date.now(), meta: { mentions: payloadMentions, contexts: payloadContexts } }]);

    // Merge context and mentions into metadata
    let extraMeta = {};
    if (payloadContexts.length > 0) extraMeta = { ...extraMeta, contexts: payloadContexts };
    if (payloadMentions.length > 0) extraMeta = { ...extraMeta, mentions: payloadMentions };

    // Append to backend payload explicitly for LLM context
    let backendMessageStr = cleanContent;
    if (payloadMentions.length > 0) {
      const mentionsStr = payloadMentions.map(m => `[@${m.name}]`).join(" ");
      backendMessageStr = `${backendMessageStr}\n\nMentions: ${mentionsStr}`;
    }

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

        // Send message to the newly started swarm
        await backendFetch(`/v1/agents/swarm/${startData.sessionId}/message`, {
          method: "POST",
          body: JSON.stringify({ message: backendMessageStr, workspaceId: startData.workspaceId, ...extraMeta }),
        });
        setMessages(prev => [...prev, { role: "assistant", content: `Message sent to swarm: "${cleanContent}"`, ts: Date.now() + 1 }]);
      } catch (e: any) {
        toast.error(e?.message || "Failed to send message to swarm");
      } finally {
        setIsStarting(false);
        setOptimisticPending(false);
      }
    } else {
      // Send to active swarm as an interrupt task
      try {
        await backendFetch(`/v1/agents/swarm/${swarmSessionId}/message`, {
          method: "POST",
          body: JSON.stringify({ message: backendMessageStr, workspaceId, ...extraMeta }),
        });
        setMessages(prev => [...prev, { role: "assistant", content: `Message sent to swarm: "${cleanContent}"`, ts: Date.now() + 1 }]);
      } catch (e: any) { toast.error(e?.message || "Failed to send message to swarm"); }
      setOptimisticPending(false);
    }
  }, [selectedContexts, selectedMentions, sessionStatus, swarmSessionId, workspaceId, conversationId, workforceId, subscribeSSE]);

  // ── Combine messages, tasks, and swarm events BEFORE conditional returns ──
  const combinedFeed = React.useMemo(() => {
    const feed: ({ ts: number; id: string } & (
      | { _type: 'message'; msg: ConvMessage; idx: number }
      | { _type: 'hitl'; task: SwarmTask }
      | { _type: 'tick'; evt: SwarmEvent }
    ))[] = [];

    // Track which task IDs are already rendered from persisted swarmEvent messages
    // so we don't double-render them from the raw tasks array.
    const renderedHitlIds = new Set<string>();
    messages.forEach((msg, idx) => {
      feed.push({ _type: 'message', ts: msg.ts, msg, idx, id: `msg-${idx}` });
      if (msg.swarmEvent?.type === 'HITL_REQUEST' && msg.swarmEvent?.payload?.taskId) {
        renderedHitlIds.add(msg.swarmEvent.payload.taskId);
      }
    });

    // HITL tasks that haven't been persisted as a swarmEvent message yet
    // (i.e. they arrived via SSE poll but haven't been echoed back as a chat msg)
    pendingApprovals.forEach(t => {
      if (!renderedHitlIds.has(t.id)) {
        feed.push({ _type: 'hitl', ts: new Date(t.createdAt).getTime(), task: t, id: `hitl-${t.id}` });
        renderedHitlIds.add(t.id);
      }
    });

    // Coordinator cycle ticks — passive inline dividers, never full cards
    // Render only CYCLE_INSPECT + errors from raw SSE (not persisted messages)
    ;[...swarmEvents].reverse().forEach((e, i) => {
      if (e.type === "CYCLE_INSPECT" || e.type.includes("ERROR")) {
        feed.push({ _type: 'tick', ts: new Date(e.timestamp).getTime(), evt: e, id: `tick-${e.timestamp}-${i}` });
      }
    });

    return feed.sort((a, b) => a.ts - b.ts);
  }, [messages, pendingApprovals, swarmEvents]);

  // Metrics derived from events + tasks
  const cycleCount = swarmEvents.filter(e => e.type === "CYCLE_COMPLETED").length;
  const errorCount = swarmEvents.filter(e => e.type === "CYCLE_ERROR").length;
  const tasksDone = tasks.filter(t => t.status === "COMPLETED").length;
  const tasksFailed = tasks.filter(t => t.status.includes("FAIL")).length;

  // ── skeleton while no conversation ───────────────────────────────────────
  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <WorkforceChatSkeleton />
        <button onClick={startNewConversation} disabled={createConversation.isPending}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
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
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm">
              {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {isStarting ? "Starting…" : "Start"}
            </button>
          ) : (
            <button onClick={handleStopSwarm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm">
              <Square className="h-3.5 w-3.5 fill-current" />Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === "chat" && (
          <div className="flex h-full min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto px-4 py-4">
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
                />
              </div>
              <div className="flex-none px-4 py-3 bg-white border-t border-zinc-200">
                <div className="max-w-2xl mx-auto">
                  <ChatComposer
                    ref={composerRef}
                    onSend={handleSend}
                    isSending={isSending}
                    disabled={isSending}
                    onContextClick={() => setContextModalOpen(true)}
                    contextCount={selectedContexts.length}
                    selectedContexts={selectedContexts}
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

            {/* HITL panel */}
            {pendingApprovals.length > 0 && (
              <div className="w-72 flex-none border-l border-amber-100 bg-amber-50/50 flex flex-col">
                <div className="p-3 border-b border-amber-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">Human Review ({pendingApprovals.length})</span>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  {pendingApprovals.map(t => (
                    <div key={t.id} className="bg-white border border-amber-200 rounded-xl p-3 shadow-sm">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-zinc-800 leading-snug">{t.title}</p>
                      </div>
                      {t.metadata?.approvalReason && <p className="text-[10px] text-zinc-500 italic mb-2">{t.metadata.approvalReason}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(t.id)} className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" />Approve
                        </button>
                        <button onClick={() => handleDeny(t.id)} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] font-bold rounded-lg transition-colors">Deny</button>
                      </div>
                    </div>
                  ))}
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
        workspaceId={workspaceId ?? undefined}
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
                      composerRef.current?.insertMention(title);
                      setMentionModalOpen(false);
                    }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 rounded-lg flex items-center justify-between">
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
                      composerRef.current?.insertMention(name);
                      setMentionModalOpen(false);
                    }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 rounded-lg flex items-center justify-between">
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