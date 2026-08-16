"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { cn } from "@/lib/utils";
import type { WorkforceOp } from "@/entities/workforce/components/assistant/types";
import {
  ChatMessageList,
  type RenderedMessage,
  type MessageFollowup,
  type MessageAction,
} from "@/entities/chats/components/MessageList";
import { MessageRole } from "@agentflox/database/src/generated/prisma/client";
import { useWorkforceEditorAssistantStream } from "@/entities/workforce/hooks/useWorkforceEditorAssistantStream";

function formatOp(op: WorkforceOp): string {
  const anyOp: any = op as any;
  switch (anyOp.op) {
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

export function WorkforceEditorAssistantPanel({
  title,
  entityId,
  entityName,
  context,
  onApplyOps,
  onPersist,
  className,
}: {
  title: string;
  entityId: string;
  entityName?: string;
  context: unknown;
  onApplyOps: (ops: WorkforceOp[]) => void;
  onPersist?: () => Promise<void> | void;
  className?: string;
}) {
  const [messages, setMessages] = React.useState<RenderedMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [proposedOps, setProposedOps] = React.useState<WorkforceOp[]>([]);
  const [proposalText, setProposalText] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const initMutation = trpc.editorAssistant.initialize.useMutation();

  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isSending,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useWorkforceEditorAssistantStream({
    onComplete: (payload: any) => {
      void refetchMessages().then((result) => {
        if (result.data?.messages) {
          const mapped: RenderedMessage[] = result.data.messages.map((m: any) => ({
            id: m.id,
            role: m.role as MessageRole,
            content: m.content as string,
            createdAt: m.createdAt,
            followups: (m as any).followups as MessageFollowup[] | undefined,
          }));
          if (payload?.followups || payload?.actions) {
            const assistantIndices = mapped
              .map((m, idx) => ({ m, idx }))
              .filter(({ m }) => m.role === MessageRole.ASSISTANT);
            const last = assistantIndices[assistantIndices.length - 1];
            if (last) {
              mapped[last.idx] = {
                ...mapped[last.idx],
                followups: (payload.followups as MessageFollowup[] | undefined) ?? mapped[last.idx].followups,
                actions: (payload.actions as MessageAction[] | undefined) ?? mapped[last.idx].actions,
              };
            }
          }
          setMessages(mapped);
        }
      });
      if (payload?.proposedOps) setProposedOps(payload.proposedOps as WorkforceOp[]);
      if (payload?.assistantText) setProposalText(String(payload.assistantText));
    },
    onError: (msg: string) => setError(msg || "Failed to process assistant request."),
  });

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false, refetchOnMount: true, staleTime: 0 },
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await initMutation.mutateAsync({ mode: "workforce", entityId, entityName });
        if (!mounted) return;
        setConversationId(res.conversationId);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to initialize conversation.");
      }
    })();
    return () => { mounted = false; };
  }, [entityId, entityName]);

  React.useEffect(() => {
    if (!messagesData?.messages) return;
    const mapped: RenderedMessage[] = messagesData.messages.map((m: any) => ({
      id: m.id,
      role: m.role as MessageRole,
      content: m.content as string,
      createdAt: m.createdAt,
      followups: (m as any).followups as MessageFollowup[] | undefined,
    }));
    setMessages(mapped);
  }, [messagesData?.messages]);

  React.useEffect(() => {
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
    setError(null);
    if (!conversationId) return;

    setProposedOps([]);
    setProposalText("");

    setMessages((prev) => {
      const updated = prev.map(m => ({ ...m, followups: undefined, actions: undefined }));
      return [
        ...updated,
        {
          id: `temp-${Date.now()}`,
          role: MessageRole.USER,
          content: message,
          createdAt: new Date().toISOString(),
        } as RenderedMessage
      ];
    });

    try {
      await sendStreamMessage({
        conversationId,
        message,
        context,
        modelId: options?.modelId,
        attachments: options?.attachments,
        contexts: options?.contexts,
        mentions: options?.mentions,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to send message.");
    }
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Ask questions or request workflow changes. You’ll review and apply suggested edits.
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatMessageList
          messages={messages}
          pendingAssistantMessage={isSending ? (streamingContent || (isStreaming ? "Thinking…" : "")) : null}
          label="Workforce Assistant"
          onFollowupClick={async (_id, f) => await send(f.label)}
          onActionClick={async (_id, a) => a.label && await send(a.label)}
        />

        {error ? (
          <div className="px-4 pb-2">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
          </div>
        ) : null}

        {proposedOps.length > 0 ? (
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="text-xs font-semibold text-indigo-900">Proposed changes</div>
              <div className="mt-2 space-y-2">
                <ul className="list-disc pl-5 text-[12px] text-indigo-900/90 space-y-1">
                  {proposedOps.map((op, idx) => <li key={idx}>{formatOp(op)}</li>)}
                </ul>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8 text-xs bg-indigo-600" onClick={() => { onApplyOps(proposedOps); setProposedOps([]); setProposalText(""); }}>Apply</Button>
                  {onPersist ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => { onApplyOps(proposedOps); await onPersist(); setProposedOps([]); setProposalText(""); }}>Apply &amp; Save</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setProposedOps([]); setProposalText(""); }}>Discard</Button>
                </div>
                {proposalText ? <div className="text-[11px] text-indigo-900/80">{proposalText}</div> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-zinc-200 p-3">
        <ChatComposer onSend={send} isSending={initMutation.isPending || isSending} disabled={!conversationId} hideModelSelect />
      </div>
    </div>
  );
}
