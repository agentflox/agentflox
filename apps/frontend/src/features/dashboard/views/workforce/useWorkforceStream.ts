"use client";

import { useCallback } from "react";
import { useAgentStream, BACKEND_URL, type AgentStreamCallbacks, type UseAgentStreamReturn } from "@/entities/agents/hooks/useAgentStream";

export interface UseWorkforceStreamReturn extends Omit<UseAgentStreamReturn, "sendMessage"> {
  sendMessage: (params: {
    workforceId: string;
    task: string;
    conversationId?: string;
    messages?: Array<{ role: string; content: string }>;
  }) => Promise<void>;
}

/**
 * Workforce-specific wrapper around `useAgentStream`.
 * Routes to `POST /v1/agents/workforces/:workforceId/run-stream`.
 */
export function useWorkforceStream(callbacks: AgentStreamCallbacks = {}): UseWorkforceStreamReturn {
  const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

  const sendMessage = useCallback(
    async ({
      workforceId,
      task,
      conversationId,
      messages,
    }: {
      workforceId: string;
      task: string;
      conversationId?: string;
      messages?: Array<{ role: string; content: string }>;
    }) => {
      await genericSend({
        url: `${BACKEND_URL}/v1/agents/workforces/${workforceId}/run-stream`,
        body: { task, conversationId, messages },
      });
    },
    [genericSend]
  );

  return { sendMessage, ...rest };
}

