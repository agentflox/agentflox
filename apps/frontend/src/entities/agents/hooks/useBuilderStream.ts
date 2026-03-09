"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useAgentStream } from './useAgentStream';
import type { AgentStreamCallbacks, UseAgentStreamReturn, ThinkingStep } from './useAgentStream';

export type { ThinkingStep };

export interface BuilderStreamCallbacks extends AgentStreamCallbacks { }

export interface UseBuilderStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        agentId: string;
        conversationId: string;
        message: string;
    }) => Promise<void>;
}

/**
 * Builder-specific wrapper around `useAgentStream`.
 * Routes to `POST /v1/agents/:agentId/builder/message-stream`.
 */
export function useBuilderStream(callbacks: BuilderStreamCallbacks = {}): UseBuilderStreamReturn {
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
            url: `${BACKEND_URL}/v1/agents/${agentId}/builder/message-stream`,
            body: { conversationId, message },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
