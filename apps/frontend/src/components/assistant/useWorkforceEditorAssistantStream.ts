"use client";

import { useCallback } from "react";
import { useAgentStream, BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";

export interface UseWorkforceEditorAssistantStreamParams {
  conversationId: string;
  message: string;
  context: unknown;
}

export function useWorkforceEditorAssistantStream(
  callbacks: Parameters<typeof useAgentStream>[0] = {},
) {
  const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

  const sendMessage = useCallback(
    async ({ conversationId, message, context }: UseWorkforceEditorAssistantStreamParams) => {
      const path = "/v1/agents/workforces/editor-assistant/message-stream";
      await genericSend({
        url: `${BACKEND_URL}${path}`,
        body: { conversationId, message, context },
      });
    },
    [genericSend],
  );

  return {
    ...rest,
    sendMessage,
  };
}
