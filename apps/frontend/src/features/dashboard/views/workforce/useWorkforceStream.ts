"use client";

import { useCallback } from "react";
import { useAgentStream, BACKEND_URL, type AgentStreamCallbacks, type UseAgentStreamReturn } from "@/entities/agents/hooks/useAgentStream";

export interface UseWorkforceStreamReturn extends Omit<UseAgentStreamReturn, "sendMessage"> {
  sendMessage: (params: { workforceId: string; task: string }) => Promise<void>;
}

/**
 * Workforce-specific wrapper around `useAgentStream`.
 * Routes to `POST /v1/agents/workforces/:workforceId/run-stream`.
 */
export function useWorkforceStream(callbacks: AgentStreamCallbacks = {}): UseWorkforceStreamReturn {
  const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

  const sendMessage = useCallback(
    async ({ workforceId, task }: { workforceId: string; task: string }) => {
      await genericSend({
        url: `${BACKEND_URL}/v1/agents/workforces/${workforceId}/run-stream`,
        body: { task },
      });
    },
    [genericSend]
  );

  return { sendMessage, ...rest };
}

