"use client";

import { useCallback } from "react";
import { useSSEStream, BACKEND_URL, type StreamCallbacks } from "@/hooks/useSSEStream";

export type { StreamCallbacks as WorkforceStreamCallbacks };

export interface UseWorkforceStreamReturn {
  thinkingSteps: import("@/hooks/useSSEStream").ThinkingStep[];
  thinkingStep: string | null;
  thinkingNode: string | null;
  streamingContent: string;
  isSending: boolean;
  isStreaming: boolean;
  abort: () => void;
  sendMessage: (params: {
    workforceId: string;
    task: string;
    conversationId?: string;
    messages?: Array<{ role: string; content: string }>;
    contexts?: Array<{ type: string; id: string }>;
    mentions?: Array<{ id: string; name: string; type: string }>;
    attachments?: Array<{ type: string; filename: string; content?: string }>;
  }) => Promise<void>;
}

/**
 * Workforce run-stream hook.
 * Self-contained — does NOT depend on useAgentStream.
 */
export function useWorkforceStream(callbacks: StreamCallbacks = {}): UseWorkforceStreamReturn {
  const { stream, ...rest } = useSSEStream(callbacks);

  const sendMessage = useCallback(
    async ({ workforceId, task, conversationId, messages, contexts, mentions, attachments }: {
      workforceId: string;
      task: string;
      conversationId?: string;
      messages?: Array<{ role: string; content: string }>;
      contexts?: Array<{ type: string; id: string }>;
      mentions?: Array<{ id: string; name: string; type: string }>;
      attachments?: Array<{ type: string; filename: string; content?: string }>;
    }) => {
      await stream({
        url: `${BACKEND_URL}/v1/workforces/${workforceId}/run-stream`,
        body: {
          task,
          ...(conversationId ? { conversationId } : {}),
          ...(messages?.length ? { messages } : {}),
          ...(contexts?.length ? { contexts } : {}),
          ...(mentions?.length ? { mentions } : {}),
          ...(attachments?.length ? { attachments } : {}),
        },
      });
    },
    [stream],
  );

  return { sendMessage, ...rest };
}
