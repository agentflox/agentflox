"use client";

import { useCallback } from 'react';
import { BACKEND_URL, useToolStream } from './useToolStream';
import type { ToolStreamCallbacks, UseToolStreamReturn, ThinkingStep } from './useToolStream';

export type { ThinkingStep };

export interface BuilderStreamCallbacks extends ToolStreamCallbacks { }

export interface UseBuilderStreamReturn extends Omit<UseToolStreamReturn, 'sendMessage'> {
    sendMessage: (params: {
        toolId: string;
        conversationId: string;
        message: string;
        modelId?: string | null;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: string }>;
        attachments?: Array<{ type: string; filename: string; content?: string }>;
    }) => Promise<void>;
}

/**
 * Builder-specific wrapper around `useToolStream`.
 * Routes to `POST /v1/tools/:toolId/builder/message-stream`.
 */
export function useBuilderStream(callbacks: BuilderStreamCallbacks = {}): UseBuilderStreamReturn {
    const { sendMessage: genericSend, ...rest } = useToolStream(callbacks);

    const sendMessage = useCallback(async ({
        toolId,
        conversationId,
        message,
        modelId,
        contexts,
        mentions,
        attachments,
    }: {
        toolId: string;
        conversationId: string;
        message: string;
        modelId?: string | null;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: string }>;
        attachments?: Array<{ type: string; filename: string; content?: string }>;
    }) => {
        await genericSend({
            url: `${BACKEND_URL}/v1/tools/${toolId}/builder/message-stream`,
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
