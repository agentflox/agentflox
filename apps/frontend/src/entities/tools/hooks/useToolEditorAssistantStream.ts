"use client";

import { useCallback } from "react";
import { useSSEStream, BACKEND_URL, type StreamCallbacks } from "@/hooks/useSSEStream";

export interface UseToolEditorAssistantStreamParams {
  conversationId: string;
  message: string;
  context: unknown;
  attachments?: Array<{ type: string; filename: string; content?: string }>;
  contexts?: Array<{ type: string; id: string }>;
  mentions?: Array<{ id: string; name: string; type: string }>;
}

/**
 * Tool editor-assistant SSE hook.
 * Self-contained — does NOT depend on useAgentStream.
 */
export function useToolEditorAssistantStream(callbacks: StreamCallbacks = {}) {
  const { stream, ...rest } = useSSEStream(callbacks);

  const sendMessage = useCallback(
    async ({ conversationId, message, context, attachments, contexts, mentions }: UseToolEditorAssistantStreamParams) => {
      await stream({
        url: `${BACKEND_URL}/v1/tools/editor-assistant/message-stream`,
        body: {
          conversationId,
          message,
          context,
          ...(attachments?.length ? { attachments } : {}),
          ...(contexts?.length ? { contexts } : {}),
          ...(mentions?.length ? { mentions } : {}),
        },
      });
    },
    [stream],
  );

  return { ...rest, sendMessage };
}
