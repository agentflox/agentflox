"use client";

import { useCallback } from "react";
import { useAgentStream, BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";

export interface UseToolEditorAssistantStreamParams {
  conversationId: string;
  message: string;
  context: unknown;
}

export function useToolEditorAssistantStream(
  callbacks: Parameters<typeof useAgentStream>[0] = {},
) {
  const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

  const sendMessage = useCallback(
    async ({ conversationId, message, context }: UseToolEditorAssistantStreamParams) => {
      const path = "/v1/agents/tools/editor-assistant/message-stream";
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
