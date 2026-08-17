"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useAgentStream } from './useAgentStream';
import type { AgentStreamCallbacks, UseAgentStreamReturn } from './useAgentStream';

export interface UseSwarmMessageStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        sessionId: string;
        message: string;
        workspaceId?: string;
        modelId?: string | null;
        mentions?: any[];
        contexts?: any[];
    }) => Promise<void>;
}

export function useSwarmMessageStream(callbacks: AgentStreamCallbacks = {}): UseSwarmMessageStreamReturn {
    const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

    const sendMessage = useCallback(async ({
        sessionId,
        message,
        workspaceId,
        modelId,
        mentions,
        contexts,
    }: {
        sessionId: string;
        message: string;
        workspaceId?: string;
        modelId?: string | null;
        mentions?: any[];
        contexts?: any[];
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/workforces/swarm/${sessionId}/message-stream`,
            body: {
                message,
                workspaceId,
                mentions,
                contexts,
                ...(modelId ? { modelId } : {}),
            },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
