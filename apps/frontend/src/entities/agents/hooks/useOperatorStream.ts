"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useAgentStream } from './useAgentStream';
import type { AgentStreamCallbacks, UseAgentStreamReturn, ThinkingStep } from './useAgentStream';

export type { ThinkingStep };

export interface Attachment {
    type: 'text' | 'file';
    content?: string;
    chunks?: string[];
    fileId?: string;
    url: string;
    filename: string;
    mimeType: string;
}

export interface OperatorStreamCallbacks extends AgentStreamCallbacks { }

export interface UseOperatorStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        agentId: string;
        conversationId: string;
        message: string;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }>;
        attachments?: Attachment[];
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
        contexts,
        mentions,
        attachments,
    }: {
        agentId: string;
        conversationId: string;
        message: string;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }>;
        attachments?: Attachment[];
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/agents/${agentId}/operator/message-stream`,
            body: {
                conversationId,
                message,
                ...(contexts?.length ? { contexts } : {}),
                ...(mentions?.length ? { mentions } : {}),
                ...(attachments?.length ? { attachments } : {}),
            },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
