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

export interface ExecutorStreamCallbacks extends AgentStreamCallbacks { }

export interface UseExecutorStreamReturn extends Omit<UseAgentStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        agentId: string;
        conversationId: string;
        message: string;
        modelId?: string | null;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }>;
        attachments?: Attachment[];
    }) => Promise<void>;
}

/**
 * Executor-specific wrapper around `useAgentStream`.
 * Routes to `POST /v1/agents/:agentId/executor/message-stream`.
 */
export function useExecutorStream(callbacks: ExecutorStreamCallbacks = {}): UseExecutorStreamReturn {
    const { sendMessage: genericSend, ...rest } = useAgentStream(callbacks);

    const sendMessage = useCallback(async ({
        agentId,
        conversationId,
        message,
        modelId,
        contexts,
        mentions,
        attachments,
    }: {
        agentId: string;
        conversationId: string;
        message: string;
        modelId?: string | null;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' }>;
        attachments?: Attachment[];
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/agents/${agentId}/executor/message-stream`,
            body: {
                conversationId,
                message,
                ...(modelId ? { modelId } : {}),
                ...(contexts?.length ? { contexts } : {}),
                ...(mentions?.length ? { mentions } : {}),
                ...(attachments?.length ? { attachments } : {}),
            },
        });
    }, [genericSend]);

    return { sendMessage, ...rest };
}
