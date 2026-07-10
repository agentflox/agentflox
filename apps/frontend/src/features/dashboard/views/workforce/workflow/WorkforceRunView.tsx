"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Plus, Square, Loader2, Zap, Files, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { StreamingMessage } from "@/entities/agents/components/StreamingMessage";
import { BACKEND_URL } from "@/hooks/useSSEStream";
import { useWorkforceStream } from "../../../../../entities/workforce/hooks/useWorkforceStream";
import { trpc } from "@/lib/trpc";
import { WorkforceChatSkeleton } from "./WorkforceChatSkeleton";
import { fetchAuthToken } from "@/utils/backend-request";
import {
  TriggerWidget,
  WorkforceExecutionTrace,
  StepSummaryBadges,
  type ExecutionTrace,
} from "./WorkforceExecutionTrace";

// ─── Poll helper ──────────────────────────────────────────────────────────────

async function pollExecutionStatus(
  executionId: string,
  signal?: AbortSignal
): Promise<{
  status: string;
  error?: string | null;
  summary?: string | null;
  steps?: Record<string, any>;
  output?: any;
}> {
  const maxAttempts = 120;
  const intervalMs = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) return { status: "STOPPED" };

    const token = await fetchAuthToken();
    try {
      const res = await fetch(
        `${BACKEND_URL}/v1/workforces/executions/${encodeURIComponent(executionId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal }
      );
      if (!res.ok) {
        if (res.status === 404) return { status: "FAILED", error: "Execution not found" };
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      const data = await res.json() as {
        status?: string;
        error?: string | null;
        summary?: string | null;
        steps?: Record<string, any>;
        output?: any;
      };
      const status = data?.status ?? "RUNNING";
      if (status !== "RUNNING") {
        return {
          status,
          error: data?.error ?? null,
          summary: data?.summary ?? null,
          steps: data?.steps,
          output: data?.output,
        };
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return { status: "STOPPED" };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "FAILED", error: "Status check timed out", summary: null };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  executionId?: string;
  metadata?: any;
  trace?: ExecutionTrace;
  output?: any;
}

interface WorkforceRunViewProps {
  workforceId: string;
  workforceName: string;
  triggerLabel?: string;
  initialMessage?: string;
  onBack?: () => void;
  embeddedInSidebar?: boolean;
  initialConversationId?: string | null;
  onConversationReady?: (conversationId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkforceRunView({
  workforceId,
  workforceName,
  triggerLabel,
  initialConversationId = null,
  onConversationReady,
}: WorkforceRunViewProps) {
  // ── state ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [optimisticPending, setOptimisticPending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingExecutionId, setPollingExecutionId] = useState<string | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<{ label: string; content: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentTaskRef = useRef<string>("");
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const abortRef = useRef<AbortController | null>(null);
  const hasAutoCreatedRef = useRef(false);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createConversation = trpc.chat.createWorkforceConversation.useMutation();
  const appendUserMessage = trpc.chat.appendUserMessage.useMutation();
  const persistMessages = trpc.chat.persistWorkforceMessages.useMutation();

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 }
  );

  const { data: workforceData } = trpc.workforce.get.useQuery({ id: workforceId }, { enabled: !!workforceId, staleTime: 60_000, gcTime: 5 * 60_000 });

  // Create a fast lookup for step definitions
  const stepDefs = React.useMemo(() => {
    if (!workforceData?.data) return undefined;
    const data = workforceData.data as any;
    const nodes = data?.react_flow_graph?.nodes || data?.workforce_graph?.nodes || [];
    const mapping: Record<string, any> = {};
    for (const node of nodes) {
      if (node.id) mapping[node.id] = node.data;
      if (node.data?.stepId) mapping[node.data.stepId] = node.data;
    }
    return mapping;
  }, [workforceData]);

  // ── create / start new conversation ──────────────────────────────────────
  const startNewConversation = useCallback(async () => {
    try {
      const conv = await createConversation.mutateAsync({
        workforceId,
        workforceName,
        mode: "FLOW",
      });
      utils.chat.listWorkforceConversations.setData(
        { workforceId, mode: "FLOW" },
        (old) =>
          old
            ? [
              {
                id: conv.id,
                title: conv.title,
                createdAt: new Date(),
                lastMessageAt: null,
                messageCount: 0,
              },
              ...old,
            ]
            : []
      );
      setConversationId(conv.id);
      conversationIdRef.current = conv.id;
      setMessages([]);
      setError(null);
      onConversationReady?.(conv.id);
    } catch (err) {
      console.error("[WorkforceRunView] Failed to create conversation", err);
    }
  }, [workforceId, workforceName, createConversation, onConversationReady, utils]);

  // ── sync conversation id from parent ──────────────────────────────────────
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      conversationIdRef.current = initialConversationId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  // ── auto-create if embedded without an initial conversation id ───────────
  useEffect(() => {
    if (!initialConversationId && !hasAutoCreatedRef.current) {
      hasAutoCreatedRef.current = true;
      startNewConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPolling]);

  // ── stream hook ───────────────────────────────────────────────────────────
  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isSending,
    isStreaming,
    sendMessage: sendWorkforceMessage,
    abort: abortStream,
  } = useWorkforceStream({
    onError: (message) => {
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
      setOptimisticPending(false);
      setIsPolling(false);
      setPollingExecutionId(null);
    },
    onComplete: async (payload) => {
      if (!payload || typeof payload !== "object") return;

      const executionId = (payload as any).executionId as string | undefined;
      const workflowId = (payload as any).workflowId as string | undefined;
      let status = (payload as any).status as string | undefined;

      let steps = (payload as any).steps as Record<string, any> | undefined;
      let summary = (payload as any).summary as string | null | undefined;
      let output = (payload as any).output as any | undefined;

      if (executionId && (!steps || !summary)) {
        // Fallback polling if payload does not have context
        setIsPolling(true);
        setPollingExecutionId(executionId);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const pollResult = await pollExecutionStatus(executionId, ctrl.signal);
        status = pollResult.status;
        if (!summary) summary = pollResult.summary;
        if (!steps) steps = pollResult.steps;
        if (!output) output = pollResult.output;

        setIsPolling(false);
        setPollingExecutionId(null);
      }

      if (status === "STOPPED") {
        setOptimisticPending(false);
        return;
      }

      const trace: ExecutionTrace | undefined = executionId
        ? {
          executionId,
          workflowId,
          status: status || "COMPLETED",
          summary,
          steps,
          output,
          trigger: lastSentTaskRef.current,
          workforceName,
          triggerLabel,
        }
        : undefined;

      const assistantContent =
        summary ||
        (status === "COMPLETED"
          ? "Workflow completed successfully."
          : status === "FAILED"
            ? "Workflow execution failed."
            : `Execution ${(status || "").toLowerCase()}.`);

      const activeConvId = conversationIdRef.current;
      try {
        if (activeConvId && lastSentTaskRef.current) {
          const metadata: Record<string, unknown> = {
            executionId,
            workflowId,
            status,
            trace,
            output,
          };
          await persistMessages.mutateAsync({
            conversationId: activeConvId,
            userMessage: lastSentTaskRef.current,
            assistantContent,
            metadata,
          });
          await refetchMessages();
          utils.chat.listWorkforceConversations.invalidate({ workforceId, mode: "FLOW" });
        }
      } catch (err) {
        console.error("[WorkforceRunView] Failed to persist/refetch", err);
      } finally {
        setOptimisticPending(false);
        setIsPolling(false);
        setPollingExecutionId(null);
      }
    },
  });

  // ── sync DB messages → local state ────────────────────────────────────────
  useEffect(() => {
    if (!messagesData?.messages || isSending || isPolling || optimisticPending) return;
    const mapped: Message[] = (messagesData.messages as any[]).map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content as string,
      executionId: m.metadata?.executionId as string | undefined,
      metadata: m.metadata,
      trace: m.metadata?.trace as ExecutionTrace | undefined,
    }));
    setMessages(mapped);
  }, [messagesData, isSending, isPolling, optimisticPending]);

  // ── stop: abort stream + polling ──────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortStream();
    abortRef.current?.abort();
    setIsPolling(false);
    setPollingExecutionId(null);
    setOptimisticPending(false);
  }, [abortStream]);

  // ── send ──────────────────────────────────────────────────────────────────
  const handleSend = async (message: string, options?: { contexts?: any[]; mentions?: any[]; attachments?: any[] }) => {
    if (isSending || isPolling) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setError(null);
    setOptimisticPending(true);
    lastSentTaskRef.current = trimmed;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    if (conversationIdRef.current) {
      appendUserMessage.mutateAsync({
        conversationId: conversationIdRef.current,
        userMessage: trimmed,
      }).catch(err => console.error("[WorkforceRunView] Failed to append user message", err));
    }

    await sendWorkforceMessage({
      workforceId,
      task: trimmed,
      conversationId: conversationIdRef.current ?? undefined,
      messages: [...messages, { role: "user", content: trimmed }].map((m) => ({
        role: m.role,
        content: m.content,
      })),
      contexts: options?.contexts,
      mentions: options?.mentions,
      attachments: options?.attachments,
    });
  };

  const isActive = isSending || isPolling;

  // ── skeleton ──────────────────────────────────────────────────────────────
  if (!conversationId) return <WorkforceChatSkeleton />;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-[#f8f9fb] min-h-0">

      {/* ── Chat feed + composer ─────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative bg-[#f8f9fb]">
        {/* Main Feed */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto">
          <div
            className="flex-1 px-4 py-4 space-y-4 max-w-4xl mx-auto w-full"
          >
            {/* Historical messages */}
            {messages.length === 0 && !isSending && !isStreaming && (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-sm">
                  <Zap className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-700">{workforceName}</p>
                  <p className="text-xs text-zinc-400 max-w-xs mt-1">
                    Type a task below to trigger a new workflow run. Each run is fully traced and saved.
                  </p>
                </div>
              </div>
            )}

            {/* ── Persisted message pairs ────────────────────────────────── */}
            {messages.map((msg, index) => (
              <div key={index} className="space-y-3">

                {/* User bubble */}
                {msg.role === "user" && (
                  <div className="flex justify-end gap-2 group w-full">
                    {editingIndex !== index && (
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-opacity cursor-pointer mt-1 shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    <div className="max-w-[72%] rounded-[20px] bg-slate-100 px-5 py-3 text-[15px] leading-relaxed text-slate-800 min-w-0">
                      {editingIndex === index ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            id={`edit-msg-${index}`}
                            defaultValue={msg.content}
                            autoFocus
                            className="w-full min-h-[60px] text-[15px] bg-transparent resize-none outline-none"
                            onBlur={() => setEditingIndex(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                const val = e.currentTarget.value;
                                setMessages((prev) =>
                                  prev.map((m, i) => (i === index ? { ...m, content: val } : m))
                                );
                                setEditingIndex(null);
                              }
                              if (e.key === "Escape") setEditingIndex(null);
                            }}
                          />
                          <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditingIndex(null);
                              }}
                              className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const val = (
                                  document.getElementById(`edit-msg-${index}`) as HTMLTextAreaElement
                                )?.value;
                                if (val)
                                  setMessages((prev) =>
                                    prev.map((m, i) => (i === index ? { ...m, content: val } : m))
                                  );
                                setEditingIndex(null);
                              }}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Assistant: trigger card + trace */}
                {msg.role === "assistant" && (() => {
                  const pairedUser = messages.slice(0, index).reverse().find((m) => m.role === "user");
                  const trace = msg.trace;
                  return (
                    <div className="space-y-3">
                      <TriggerWidget
                        prompt={pairedUser?.content || msg.content}
                        workforceName={workforceName}
                        triggerLabel={triggerLabel}
                        executionId={msg.executionId || trace?.executionId}
                      />
                      {trace?.steps && Object.keys(trace.steps).length > 0 && (
                        <div className="pl-1">
                          <StepSummaryBadges steps={trace.steps} />
                        </div>
                      )}
                      {trace && <WorkforceExecutionTrace trace={trace} stepDefs={stepDefs} isPolling={false} onOpenArtifact={(label, content) => setActiveArtifact({ label, content })} />}
                      {!trace && msg.content && (
                        <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}

            {/* ── Live: SSE streaming ──────────────────────────────────── */}
            {isSending && (() => {
              const synthSteps: Record<string, any> = {};
              thinkingSteps.forEach(ts => {
                if (ts.node) {
                  if (!synthSteps[ts.node]) {
                    synthSteps[ts.node] = { status: "COMPLETED" };
                  }
                }
              });
              if (thinkingNode && !synthSteps[thinkingNode]) {
                synthSteps[thinkingNode] = { status: "RUNNING" };
              }

              const synthTrace: ExecutionTrace = {
                executionId: "streaming",
                workflowId: "streaming",
                status: "RUNNING",
                steps: synthSteps,
                trigger: lastSentTaskRef.current,
                workforceName,
                triggerLabel,
              };

              return (
                <div className="space-y-3">
                  {lastSentTaskRef.current && (
                    <TriggerWidget
                      prompt={lastSentTaskRef.current}
                      workforceName={workforceName}
                      triggerLabel={triggerLabel}
                    />
                  )}
                  {Object.keys(synthSteps).length > 0 ? (
                    <WorkforceExecutionTrace
                      trace={synthTrace}
                      stepDefs={stepDefs}
                      isPolling={true}
                      thinkingSteps={thinkingSteps}
                      currentStep={thinkingStep}
                      currentNode={thinkingNode}
                      streamingContent={streamingContent}
                      isStreaming={isStreaming}
                      onOpenArtifact={(label, content) => setActiveArtifact({ label, content })}
                    />
                  ) : (
                    <div className="bg-white border border-blue-200 rounded-2xl px-4 py-3 shadow-sm">
                      <StreamingMessage
                        thinkingSteps={thinkingSteps}
                        currentStep={thinkingStep}
                        currentNode={thinkingNode}
                        streamingContent={streamingContent}
                        isStreaming={isStreaming}
                        label={workforceName}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Live: polling for final result ───────────────────────── */}
            {isPolling && !isSending && (
              <div className="space-y-3">
                {lastSentTaskRef.current && (
                  <TriggerWidget
                    prompt={lastSentTaskRef.current}
                    workforceName={workforceName}
                    triggerLabel={triggerLabel}
                    executionId={pollingExecutionId || undefined}
                  />
                )}
                <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-blue-800">Workflow running…</div>
                    {pollingExecutionId && (
                      <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                        ID: {pollingExecutionId.slice(0, 8)}…
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Right-Side Artifact Modal ── */}
        {activeArtifact && (
          <div className="w-[480px] border-l border-zinc-200 bg-white flex flex-col shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] transition-all animate-in slide-in-from-right relative z-20 shrink-0 h-full">
            <div className="flex-none h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2 min-w-0">
                <Files className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-zinc-800 truncate block">
                    {activeArtifact.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeArtifact.content);
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

      {/* ── Composer bar ─────────────────────────────────────────────────── */}
      <div className="flex-none px-4 py-4 bg-white border-t border-zinc-200">
        <div className="max-w-2xl mx-auto">
          <ChatComposer
            onSend={handleSend}
            onStop={handleStop}
            isSending={isActive}
            disabled={false}
          />

          <div className="flex items-center justify-between mt-2 px-1">
            {/* Workforce badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200">
              <div className="h-4 w-4 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-[9px] font-black text-violet-600">
                  {workforceName.slice(0, 1)}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-600">{workforceName}</span>
            </div>

            {/* New Run */}
            <button
              onClick={startNewConversation}
              disabled={createConversation.isPending || isActive}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-40 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
