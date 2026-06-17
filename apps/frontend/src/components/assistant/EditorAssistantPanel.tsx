"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { cn } from "@/lib/utils";
import type { ToolOp, WorkforceOp } from "./editorOps";
import { useAgentStream, BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";

type AssistantMessage = { id: string; role: "user" | "assistant"; content: string };

function formatOp(op: ToolOp | WorkforceOp): string {
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
    case "addNode":
      return `Add node ${anyOp.node?.type}`;
    case "deleteNode":
      return `Delete node ${anyOp.nodeId}`;
    case "updateNodeData":
      return `Update node ${anyOp.nodeId} data`;
    case "addEdge":
      return `Add edge ${anyOp.edge?.source} → ${anyOp.edge?.target}`;
    case "deleteEdge":
      return `Delete edge ${anyOp.edgeId}`;
    case "updateEdgeData":
      return `Update edge ${anyOp.edgeId} data`;
    case "replaceNode":
      return `Replace node ${anyOp.nodeId} → ${anyOp.replacement?.type}`;
    default:
      return `${String(anyOp.op)}`;
  }
}

export function EditorAssistantPanel({
  mode,
  title,
  entityId,
  entityName,
  context,
  onApplyOps,
  onPersist,
  className,
}: {
  mode: "tool" | "workforce";
  title: string;
  entityId: string;
  entityName?: string;
  context: unknown;
  onApplyOps: (ops: Array<ToolOp | WorkforceOp>) => void;
  onPersist?: () => Promise<void> | void;
  className?: string;
}) {
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [proposedOps, setProposedOps] = React.useState<Array<ToolOp | WorkforceOp>>([]);
  const [proposalText, setProposalText] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Scroll container ref for auto-scroll-to-bottom
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);

  const initMutation = trpc.editorAssistant.initialize.useMutation();
  const messageMutation = trpc.editorAssistant.message.useMutation();

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 },
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await initMutation.mutateAsync({ mode, entityId, entityName });
        if (!mounted) return;
        setConversationId(res.conversationId);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to initialize conversation.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mode, entityId, entityName]);

  React.useEffect(() => {
    if (!messagesData?.messages) return;
    const mapped: AssistantMessage[] = messagesData.messages.map((m: any) => ({
      id: m.id,
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content as string,
    }));
    setMessages(mapped);
  }, [messagesData?.messages]);

  // Always scroll to bottom when messages change
  React.useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const {
    streamingContent,
    isSending,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useAgentStream({
    onComplete: (payload: any) => {
      void refetchMessages();
      setProposedOps(payload?.proposedOps || []);
      setProposalText(payload?.assistantText || "");
    },
    onError: (msg: string) => setError(msg || "Failed to process assistant request."),
  });

  const send = async (message: string) => {
    setError(null);
    if (!conversationId) return;

    // Clear action card when sending a new message
    setProposedOps([]);
    setProposalText("");

    // Optimistically add user message so it appears immediately
    setMessages((prev) => [...prev, { id: 'temp-' + Date.now(), role: 'user', content: message }]);

    const path = mode === "tool"
      ? "/v1/agents/tools/editor-assistant/message-stream"
      : "/v1/agents/workforces/editor-assistant/message-stream";

    try {
      await sendStreamMessage({
        url: `${BACKEND_URL}${path}`,
        body: { conversationId, message, context },
      });
    } catch (e: any) {
      setError(e?.message || "Failed to send message.");
    }
  };

  const hasOps = proposedOps.length > 0;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Ask questions or request changes. You’ll review and apply suggested edits.
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Try: “What does this {mode} do?” or “Add an API step that fetches users and then loop over them.”
          </div>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-zinc-900 text-white max-w-[85%]"
                : "bg-white border border-zinc-200 text-zinc-900 max-w-[85%]",
            )}
          >
            {m.content}
          </div>
        ))}

        {isSending && (
          <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white border border-zinc-200 text-zinc-900 max-w-[85%]">
            {streamingContent || (isStreaming ? "Thinking…" : "Sending…")}
          </div>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        ) : null}

        {hasOps ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <div className="text-xs font-semibold text-indigo-900">Proposed changes</div>
            <div className="mt-2 space-y-2">
              <ul className="list-disc pl-5 text-[12px] text-indigo-900/90 space-y-1">
                {proposedOps.map((op, idx) => (
                  <li key={idx}>{formatOp(op)}</li>
                ))}
              </ul>
              <pre className="text-[11px] leading-relaxed bg-white/70 border border-indigo-100 rounded-lg p-2 overflow-auto max-h-64">
                {JSON.stringify(proposedOps, null, 2)}
              </pre>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
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
                    className="h-8 text-xs"
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
                  className="h-8 text-xs"
                  onClick={() => {
                    setProposedOps([]);
                    setProposalText("");
                  }}
                >
                  Discard
                </Button>
              </div>
              {proposalText ? (
                <div className="text-[11px] text-indigo-900/80">{proposalText}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-zinc-200 p-3">
        <ChatComposer
          onSend={async (m) => send(m)}
          isSending={initMutation.isPending || isSending}
          disabled={!conversationId}
          className="rounded-xl"
          inputClassName="text-sm"
        />
      </div>
    </div>
  );
}

