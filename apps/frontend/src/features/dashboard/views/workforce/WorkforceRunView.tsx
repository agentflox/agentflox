"use client";

import React, { useState, useEffect, useRef } from "react";
import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { StreamingMessage } from "@/entities/agents/components/StreamingMessage";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { useWorkforceStream } from "./useWorkforceStream";
import { trpc } from "@/lib/trpc";
import { WorkforceChatSkeleton } from "./WorkforceChatSkeleton";
import { fetchAuthToken } from "@/utils/backend-request";

/** Poll execution status until COMPLETED or FAILED; returns final { status, error, summary }. */
async function pollExecutionStatus(
  executionId: string
): Promise<{ status: string; error?: string | null; summary?: string | null }> {
  const maxAttempts = 120; // ~2 min at 1s interval
  const intervalMs = 1000;
  for (let i = 0; i < maxAttempts; i++) {
    const token = await fetchAuthToken();
    const res = await fetch(
      `${BACKEND_URL}/v1/agents/workforces/executions/${encodeURIComponent(executionId)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      if (res.status === 404) return { status: "FAILED", error: "Execution not found" };
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }
    const data = (await res.json()) as {
      status?: string;
      error?: string | null;
      summary?: string | null;
    };
    const status = data?.status ?? "RUNNING";
    if (status !== "RUNNING") {
      return { status, error: data?.error ?? null, summary: data?.summary ?? null };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "FAILED", error: "Status check timed out", summary: null };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  executionId?: string;
}

interface WorkforceRunViewProps {
  workforceId: string;
  workforceName: string;
  triggerLabel?: string;
  initialMessage?: string;
  onBack?: () => void;
  /** When true, hide the top header (used when embedded in test sidebar) */
  embeddedInSidebar?: boolean;
  /** Optional initial conversation id (e.g. from URL) */
  initialConversationId?: string | null;
  /** Optional callback when a conversation is created or switched */
  onConversationReady?: (conversationId: string) => void;
}

export default function WorkforceRunView({
  workforceId,
  workforceName,
  triggerLabel,
  initialMessage,
  onBack,
  embeddedInSidebar = false,
  initialConversationId = null,
  onConversationReady,
}: WorkforceRunViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [optimisticPending, setOptimisticPending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingExecutionId, setPollingExecutionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Keeps track of the most recent user-submitted task text so onComplete can persist it */
  const lastSentTaskRef = useRef<string>("");
  const conversationIdRef = useRef<string | null>(initialConversationId);

  // Sync conversationId when parent passes new initialConversationId (e.g. sidebar selection)
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      conversationIdRef.current = initialConversationId;
    }
  }, [initialConversationId, conversationId]);

  // Persisted messages for the active conversation
  const {
    data: messagesData,
    refetch: refetchMessages,
  } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 }
  );

  // tRPC mutations
  const utils = trpc.useUtils();
  const createConversation = trpc.chat.createWorkforceConversation.useMutation();
  const persistMessages = trpc.chat.persistWorkforceMessages.useMutation();

  // ── Initialize or create a conversation ────────────────────────────────────
  const startNewConversation = React.useCallback(async () => {
    try {
      const conv = await createConversation.mutateAsync({
        workforceId,
        workforceName,
      });
      const newConv = {
        id: conv.id,
        title: conv.title,
        createdAt: new Date(),
        lastMessageAt: null,
        messageCount: 0,
      };
      utils.chat.listWorkforceConversations.setData(
        { workforceId },
        (old) => (old ? [newConv, ...old] : [newConv])
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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isSending,
    isStreaming,
    sendMessage: sendWorkforceMessage,
  } = useWorkforceStream({
    onError: (message) => {
      setError(message);
      setMessages((prev) => prev.slice(0, -1)); // Remove optimistic user message on error
      setOptimisticPending(false);
      setIsPolling(false);
      setPollingExecutionId(null);
    },
    onComplete: async (payload) => {
      if (!payload || typeof payload !== "object") return;
      const executionId = (payload as any).executionId as string | undefined;
      const workflowId = (payload as any).workflowId as string | undefined;
      let status = (payload as any).status as string | undefined;
      let response = (payload as any).response as any | undefined;

      // When backend returns immediately with RUNNING, poll until the workflow actually completes,
      // and prefer the backend's natural-language summary when available.
      if (executionId && status === "RUNNING") {
        setIsPolling(true);
        setPollingExecutionId(executionId);
        const pollResult = await pollExecutionStatus(executionId);
        status = pollResult.status;
        // If the backend generated a natural-language summary, treat that as the primary response.
        if (pollResult.summary) {
          response = { ...(response || {}), summary: pollResult.summary };
        } else if (pollResult.error) {
          response = { ...(response || {}), reason: pollResult.error, skipped: false };
        }
        setIsPolling(false);
        setPollingExecutionId(null);
      }

      const normalizedStatus =
        status === "COMPLETED"
          ? "completed"
          : status
          ? status.toLowerCase()
          : "started";

      const reason = response?.reason as string | undefined;
      const skipped = response?.skipped === true;

      let assistantContent: string | undefined;

      if (skipped && reason === "NO_EXECUTOR_PLACEHOLDER") {
        assistantContent =
          "Execution skipped: no executor configured for this step (placeholder).";
      }
      if (!assistantContent && status === "FAILED" && response?.reason) {
        assistantContent = `Execution failed: ${response.reason}`;
      }
      if (!assistantContent && typeof response === "string") {
        assistantContent = response;
      }
      if (!assistantContent && typeof response?.message === "string") {
        assistantContent = response.message as string;
      }
      if (!assistantContent && typeof response?.summary === "string") {
        assistantContent = response.summary as string;
      }
      if (!assistantContent && typeof response?.output?.summary === "string") {
        assistantContent = response.output.summary as string;
      }
      if (!assistantContent && typeof response?.output?.text === "string") {
        assistantContent = response.output.text as string;
      }
      if (!assistantContent) {
        assistantContent = executionId
          ? `Execution ${normalizedStatus} (ID: ${executionId.slice(0, 8)}…)`
          : `Execution ${normalizedStatus}.`;
      }

      const activeConvId = conversationIdRef.current;
      try {
        if (activeConvId && lastSentTaskRef.current) {
          const metadata: Record<string, unknown> = { executionId, workflowId, status };
          if (response && typeof response === "object") {
            try {
              metadata.response = JSON.parse(JSON.stringify(response));
            } catch {
              metadata.response = { reason: (response as any)?.reason };
            }
          }
          await persistMessages.mutateAsync({
            conversationId: activeConvId,
            userMessage: lastSentTaskRef.current,
            assistantContent,
            metadata,
          });

          await refetchMessages();
          utils.chat.listWorkforceConversations.invalidate({ workforceId });
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

  // Sync local message state from persisted DB messages (skip when sending to preserve optimistic)
  useEffect(() => {
    if (!messagesData?.messages || isSending || isPolling || optimisticPending) return;
    const mapped: Message[] = messagesData.messages.map((m: any) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content as string,
      executionId: (m.metadata as any)?.executionId as string | undefined,
    }));
    setMessages(mapped);
  }, [messagesData, isSending, isPolling, optimisticPending]);

  const handleSend = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setError(null);
    setOptimisticPending(true);

    // Track for stale-closure-safe persistence in onComplete
    lastSentTaskRef.current = trimmed;

    // Optimistic: add user message immediately (like AgentChatBuilder)
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
    ]);

    await sendWorkforceMessage({
      workforceId,
      task: trimmed,
      conversationId: conversationIdRef.current ?? undefined,
      messages: [...messages, { role: "user", content: trimmed }].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  };

  const handleNewTask = async () => {
    await startNewConversation();
  };

  // Show skeleton until we have a conversation (creating or loading)
  if (!conversationId) {
    return <WorkforceChatSkeleton />;
  }

  return (
    <div className="flex h-full flex-col bg-[#fafafa] min-h-0">
      {/* Message area */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !isSending && !isStreaming && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-500">
                  {workforceName.slice(0, 1)}
                </span>
              </div>
              <p className="text-sm font-medium text-zinc-600">
                {workforceName}
              </p>
              <p className="text-xs text-zinc-400 max-w-xs">
                Type a task below to start a new run. Each run is saved as a conversation.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 group",
                msg.role === "assistant" && "flex-row-reverse"
              )}
            >
              {msg.role === "user" ? (
                <>
                  <div className="flex-1 rounded-2xl rounded-tl-sm bg-white border border-zinc-200 px-4 py-3 shadow-sm">
                    {editingIndex === index ? (
                      <textarea
                        defaultValue={msg.content}
                        onBlur={(e) => {
                          setMessages((prev) =>
                            prev.map((m, i) =>
                              i === index ? { ...m, content: e.target.value } : m
                            )
                          );
                          setEditingIndex(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLTextAreaElement).blur();
                          }
                        }}
                        autoFocus
                        className="w-full min-h-[60px] text-sm text-zinc-900 resize-none outline-none"
                      />
                    ) : (
                      <p className="text-sm text-zinc-900">{msg.content}</p>
                    )}
                  </div>
                  {editingIndex !== index && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm whitespace-pre-wrap max-w-[90%]">
                  {msg.executionId ? (
                    <span className="text-emerald-400">{msg.content}</span>
                  ) : (
                    msg.content
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Streaming/thinking state (like AgentChatBuilder) */}
          {isSending && (
            <div className="flex items-start justify-end">
              <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm max-w-[90%]">
                <StreamingMessage
                  thinkingSteps={thinkingSteps}
                  currentStep={thinkingStep}
                  currentNode={thinkingNode}
                  streamingContent={streamingContent}
                  isStreaming={isStreaming}
                  agentLabel={workforceName}
                />
              </div>
            </div>
          )}

          {/* After stream ends, we may still be polling for final status */}
          {isPolling && !isSending && (
            <div className="flex items-start justify-end">
              <div className="rounded-2xl bg-zinc-900 text-zinc-50 px-4 py-3 text-sm max-w-[90%]">
                <div className="text-zinc-200">
                  {pollingExecutionId
                    ? `Still running your workflow (ID: ${pollingExecutionId.slice(0, 8)}…). Finalizing results…`
                    : "Finalizing results…"}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer area */}
      <div className="flex-none px-4 py-4 bg-white border-t border-zinc-200">
        <div className="max-w-2xl mx-auto">
          <ChatComposer
            onSend={(message) => handleSend(message)}
            isSending={isSending}
            disabled={isSending}
          />
          <div className="flex items-center justify-between mt-2 px-1">
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-700">
              Help
            </a>
            {isSending ? (
              <span className="text-xs text-zinc-400">→ Sending to workforce…</span>
            ) : (
              <button
                onClick={handleNewTask}
                disabled={createConversation.isPending}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                New Task
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200">
              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-600">
                  {workforceName.slice(0, 1)}
                </span>
              </div>
              <span className="text-xs font-medium text-zinc-700">
                {workforceName}
              </span>
            </div>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
