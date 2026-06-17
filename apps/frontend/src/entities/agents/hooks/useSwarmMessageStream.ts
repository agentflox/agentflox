"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useAgentStream } from './useAgentStream';
import type { AgentStreamCallbacks, UseAgentStreamReturn } from './useAgentStream';

export interface UseSwarmMessageStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        sessionId: string;
        message: string;
        workspaceId?: string;
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
        mentions,
        contexts,
    }: {
        sessionId: string;
        message: string;
        workspaceId?: string;
        mentions?: any[];
        contexts?: any[];
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/agents/swarm/${sessionId}/message-stream`,
            body: { message, workspaceId, mentions, contexts },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
