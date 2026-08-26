"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { cn } from "@/lib/utils";
import {
  ChatMessageList,
  type RenderedMessage,
  type MessageFollowup,
  type MessageAction,
} from "@/entities/chats/components/MessageList";
import { MessageRole } from "@agentflox/database/src/generated/prisma/client";
import { StreamingMessage } from "@/entities/tools/components/StreamingMessage";
import { useToolEditorAssistantStream } from "@/entities/tools/hooks/useToolEditorAssistantStream";
import { ToolOp } from "@/entities/tools/components/assistant/types";
import { useDefaultModel } from "@/entities/models/hooks/useModels";
import { formatModelErrorMessage } from "@/entities/models/utils/formatModelError";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  X,
  Plus,
  Trash2,
  Download,
  History,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatOp(op: ToolOp): string {
  const anyOp: any = op as any;
  switch (anyOp.op) {
    case "updateToolMeta":
      return `Update tool meta (${Object.keys(anyOp.patch || {}).join(", ") || "no fields"})`;
    case "addStep":
      return `Add step "${anyOp.step?.name}"`;
    case "deleteStep":
      return `Delete step ${anyOp.stepId}`;
    case "updateStep":
      return `Update step ${anyOp.stepId} (${Object.keys(anyOp.patch || {}).join(", ") || "no fields"})`;
    case "moveStep":
      return `Move step ${anyOp.stepId} ${anyOp.direction}`;
    case "replaceStep":
      return `Replace step ${anyOp.stepId} → "${anyOp.replacement?.name}"`;
    default:
      return `${String(anyOp.op)}`;
  }
}

const STARTER_PROMPTS = [
  "Run this tool with test inputs",
  "Improve this tool's inputs and description",
  "Review this tool and suggest improvements",
];

export function ToolEditorAssistantPanel({
  title = "Tool Assistant",
  entityId,
  entityName,
  context,
  onApplyOps,
  onPersist,
  onClose,
  onToggleExpand,
  isExpanded = false,
  className,
}: {
  title?: string;
  entityId: string;
  entityName?: string;
  context: unknown;
  onApplyOps: (ops: ToolOp[]) => void;
  onPersist?: () => Promise<void> | void;
  onClose?: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proposedOps, setProposedOps] = useState<ToolOp[]>([]);
  const [proposalText, setProposalText] = useState<string>("");
  const [followupsMap, setFollowupsMap] = useState<Map<string, MessageFollowup[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const isSendingRef = useRef(false);
  const optimisticMessageIds = useRef<Set<string>>(new Set());
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const initMutation = trpc.editorAssistant.initialize.useMutation();
  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();
  const { data: defaultModel } = useDefaultModel();
  const selectedModelId = defaultModel?.id ?? null;

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 30_000,
    }
  );

  const handleMessageComplete = useCallback(async (payload: any) => {
    const result = await refetchMessages();

    if (result.data?.messages) {
      optimisticMessageIds.current.clear();
      const allMessages = result.data.messages;
      const dbMessages: RenderedMessage[] = allMessages.map((msg, index) => {
        const followupsFromMetadata = (msg as any).followups;
        let followups: MessageFollowup[] | undefined = undefined;
        if (msg.role === "ASSISTANT") {
          const metadata = (msg as any).metadata || {};
          const followupsConsumed = metadata.followupsConsumed === true;
          const hasUserMessageAfter = allMessages.slice(index + 1).some((m) => m.role === "USER");
          if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
            followups = followupsFromMetadata;
          }
        }
        return {
          id: msg.id,
          role: msg.role as MessageRole,
          content: msg.content as string,
          createdAt: msg.createdAt,
          followups,
        };
      });

      if (payload?.followups || payload?.actions) {
        const assistantIndices = dbMessages
          .map((m, idx) => ({ m, idx }))
          .filter(({ m }) => m.role === MessageRole.ASSISTANT);
        const last = assistantIndices[assistantIndices.length - 1];
        if (last) {
          dbMessages[last.idx] = {
            ...dbMessages[last.idx],
            followups: (payload.followups as MessageFollowup[] | undefined) ?? dbMessages[last.idx].followups,
            actions: (payload.actions as MessageAction[] | undefined) ?? dbMessages[last.idx].actions,
          };
        }
      }

      isSendingRef.current = false;
      setMessages(dbMessages);
      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach((msg) => {
        if (msg.followups) newFollowupsMap.set(msg.id, msg.followups);
      });
      setFollowupsMap(newFollowupsMap);
    } else {
      isSendingRef.current = false;
    }

    if (payload?.proposedOps) setProposedOps(payload.proposedOps as ToolOp[]);
    if (payload?.assistantText) setProposalText(String(payload.assistantText));
  }, [refetchMessages]);

  const handleMessageError = useCallback((errorMessage: string) => {
    isSendingRef.current = false;
    const friendly = formatModelErrorMessage(errorMessage, "Failed to process assistant request.");
    setError(friendly);
    toast.error(friendly);
  }, []);

  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isSending,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useToolEditorAssistantStream({
    onComplete: handleMessageComplete,
    onError: handleMessageError,
  });

  const initializeChat = useCallback(async (forceNew = false) => {
    try {
      setError(null);
      const res = await initMutation.mutateAsync({
        mode: "tool",
        entityId,
        entityName,
      });
      setConversationId(res.conversationId);
      if (forceNew) {
        setMessages([]);
        setProposedOps([]);
        setProposalText("");
        setFollowupsMap(new Map());
      }
    } catch (e: any) {
      setError(e?.message || "Failed to initialize conversation.");
    }
  }, [entityId, entityName, initMutation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) {
        await initializeChat();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [entityId, entityName, initializeChat]);

  // Sync messages from database when not actively sending
  useEffect(() => {
    if (messagesData?.messages && conversationId && !isSendingRef.current) {
      const allMessages = messagesData.messages;
      const dbMessages: RenderedMessage[] = allMessages.map((msg, index) => {
        const followupsFromMetadata = (msg as any).followups;
        let followups: MessageFollowup[] | undefined = undefined;
        if (msg.role === "ASSISTANT") {
          const metadata = (msg as any).metadata || {};
          const followupsConsumed = metadata.followupsConsumed === true;
          const hasUserMessageAfter = allMessages.slice(index + 1).some((m) => m.role === "USER");
          if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
            followups = followupsFromMetadata;
          }
        }
        return {
          id: msg.id,
          role: msg.role as MessageRole,
          content: msg.content as string,
          createdAt: msg.createdAt,
          followups,
        };
      });

      if (dbMessages.length > 0) {
        setMessages(dbMessages);
        optimisticMessageIds.current.clear();
        const newFollowupsMap = new Map<string, MessageFollowup[]>();
        dbMessages.forEach((msg) => {
          if (msg.followups) newFollowupsMap.set(msg.id, msg.followups);
        });
        setFollowupsMap(newFollowupsMap);
      }
    }
  }, [messagesData, conversationId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (
    message: string,
    options?: {
      attachments?: Array<{ type: string; filename: string; content?: string }>;
      contexts?: Array<{ type: string; id: string }>;
      mentions?: Array<{ id: string; name: string; type: string }>;
      modelId?: string;
    }
  ) => {
    if (!message.trim() || isSending || !conversationId) return;

    setError(null);
    setProposedOps([]);
    setProposalText("");

    const optimisticId = `optimistic_${Date.now()}`;
    const userMessage: RenderedMessage = {
      id: optimisticId,
      role: MessageRole.USER,
      content: message,
      createdAt: new Date().toISOString(),
    };

    optimisticMessageIds.current.add(optimisticId);
    isSendingRef.current = true;

    setMessages((prev) => [
      ...prev.map((msg) => ({ ...msg, followups: undefined, actions: undefined })),
      userMessage,
    ]);
    setFollowupsMap(new Map());

    // Mark assistant followups consumed in DB in background
    const assistantMessages = messages.filter((msg) => msg.role === "ASSISTANT");
    Promise.all(
      assistantMessages.map((msg) =>
        markFollowupsConsumedMutation.mutateAsync({ messageId: msg.id }).catch(() => { })
      )
    ).catch(() => { });

    try {
      await sendStreamMessage({
        conversationId,
        message,
        context,
        modelId: options?.modelId ?? selectedModelId,
        attachments: options?.attachments,
        contexts: options?.contexts,
        mentions: options?.mentions,
      });
    } catch (e: any) {
      isSendingRef.current = false;
      setError(e?.message || "Failed to send message.");
    }
  };

  const handleFollowupClick = useCallback(
    async (messageId: string, followup: MessageFollowup) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, followups: undefined } : msg))
      );
      setFollowupsMap((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      try {
        await markFollowupsConsumedMutation.mutateAsync({ messageId });
      } catch (err) {
        console.error("Failed to mark followup consumed:", err);
      }
      send(followup.label);
    },
    [markFollowupsConsumedMutation]
  );

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.error("No messages to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tool-assistant-chat-${entityId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat history exported.");
  };

  const messagesWithFollowups = messages.map((msg) => ({
    ...msg,
    followups: msg.followups || followupsMap.get(msg.id),
  }));

  return (
    <div className={cn("flex h-full flex-col bg-white overflow-hidden", className)}>
      {/* ── Header ── */}
      <div className="h-[53px] border-b border-zinc-200 px-3 flex items-center justify-between bg-white select-none shrink-0">
        {/* Left: History menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-0.5 text-zinc-500" />
              <span>History</span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => initializeChat(true)} className="gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>New chat session</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => refetchMessages()} className="gap-2 cursor-pointer">
              <History className="h-4 w-4" />
              <span>Reload messages</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => initializeChat(true)} className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" /> New conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportChat} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4" /> Export chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setMessages([]);
                  setProposedOps([]);
                  setProposalText("");
                  toast.success("Messages cleared.");
                }}
                className="gap-2 text-red-600 focus:text-red-700 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md cursor-pointer"
              onClick={onToggleExpand}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="sr-only">Toggle width</span>
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md cursor-pointer"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close assistant</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Body Content ── */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-white">
        <ChatMessageList
          messages={messagesWithFollowups}
          pendingAssistantMessage={
            isSending ? (
              <StreamingMessage
                thinkingSteps={thinkingSteps}
                currentStep={thinkingStep}
                currentNode={thinkingNode}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                label="Tool Assistant"
              />
            ) : null
          }
          label="Tool Assistant"
          onFollowupClick={handleFollowupClick}
          onActionClick={async (_id, a) => a.label && (await send(a.label))}
          emptyState={
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center select-none">
              {/* Glowing Orb Avatar */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-blue-500/30 blur-lg animate-pulse" />
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 p-[1px] shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                  <div className="h-full w-full rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center gap-1.5">
                    <div className="h-5 w-1.5 rounded-full bg-white/90" />
                    <div className="h-5 w-1.5 rounded-full bg-white/90" />
                  </div>
                </div>
              </div>

              {/* Greeting */}
              <h3 className="text-xl font-semibold text-zinc-900 mb-8">
                How can I help?
              </h3>

              {/* Starter Quick Actions */}
              <div className="w-full max-w-sm space-y-2.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 text-left transition-all duration-150 group shadow-xs cursor-pointer"
                  >
                    <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-900">
                      {prompt}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {error ? (
          <div className="px-4 pb-2">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          </div>
        ) : null}

        {proposedOps.length > 0 ? (
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 shadow-xs">
              <div className="text-xs font-semibold text-indigo-900">
                Proposed changes
              </div>
              <div className="mt-2 space-y-2">
                <ul className="list-disc pl-5 text-[12px] text-indigo-900/90 space-y-1">
                  {proposedOps.map((op, idx) => (
                    <li key={idx}>{formatOp(op)}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                    onClick={() => {
                      onApplyOps(proposedOps);
                      setProposedOps([]);
                      setProposalText("");
                    }}
                  >
                    Apply
                  </Button>
                  {onPersist ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-indigo-200 hover:bg-indigo-100/50 cursor-pointer"
                      onClick={async () => {
                        onApplyOps(proposedOps);
                        await onPersist();
                        setProposedOps([]);
                        setProposalText("");
                      }}
                    >
                      Apply &amp; Save
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                    onClick={() => {
                      setProposedOps([]);
                      setProposalText("");
                    }}
                  >
                    Discard
                  </Button>
                </div>
                {proposalText ? (
                  <div className="text-[11px] text-indigo-900/80 pt-1">
                    {proposalText}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Bottom Composer ── */}
      <div className="border-t border-zinc-200 p-3 bg-white shrink-0">
        <ChatComposer
          onSend={send}
          isSending={initMutation.isPending || isSending}
          disabled={!conversationId}
          modelId={selectedModelId}
          placeholder="Create with Invent..."
        />
      </div>
    </div>
  );
}

export default ToolEditorAssistantPanel;
