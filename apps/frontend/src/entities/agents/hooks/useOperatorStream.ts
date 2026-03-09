"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useAgentStream } from './useAgentStream';
import type { AgentStreamCallbacks, UseAgentStreamReturn, ThinkingStep } from './useAgentStream';

export type { ThinkingStep };

export interface OperatorStreamCallbacks extends AgentStreamCallbacks { }

export interface UseOperatorStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        agentId: string;
        conversationId: string;
        message: string;
    }) => Promise<void>;
}

/**
 * Operator-specific wrapper around `useAgentStream`.
 * Routes to `POST /v1/agents/:agentId/operator/message-stream`.
 */
export function useOperatorStream(callbacks: OperatorStreamCallbacks = {}): UseOperatorStreamReturn {
    const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

    const sendMessage = useCallback(async ({
        agentId,
        conversationId,
        message,
    }: {
        agentId: string;
        conversationId: string;
        message: string;
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/agents/${agentId}/operator/message-stream`,
            body: { conversationId, message },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
