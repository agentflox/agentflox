/**
 * BuilderProgressEmitter (v2)
 *
 * Streams both progress events AND LLM response tokens over a single SSE connection.
 *
 * Wire format (each frame is `data: <json>\n\n`):
 *
 *   Thinking step (pre-response processing):
 *     { type: "thinking", step: "...", node: "BEHAVIOR", timestamp: 1234 }
 *
 *   LLM response token (streamed text):
 *     { type: "token", text: "...", timestamp: 1234 }
 *
 *   Final metadata (conversationState, agentDraft, followups — everything EXCEPT response):
 *     { type: "complete", payload: { conversationState, agentDraft, followups, quickActions }, timestamp: 1234 }
 *
 *   Error:
 *     { type: "error", message: "...", timestamp: 1234 }
 */

import type { Response as ExpressResponse } from 'express';

export type ProgressEventType = 'thinking' | 'token' | 'complete' | 'error';

export interface ThinkingEvent {
    type: 'thinking';
    step: string;
    node?: string;
    timestamp: number;
}

export interface TokenEvent {
    type: 'token';
    text: string;
    timestamp: number;
}

export interface CompleteEvent {
    type: 'complete';
    payload: Record<string, unknown>;
    timestamp: number;
}

export interface ErrorEvent {
    type: 'error';
    message: string;
    timestamp: number;
}

export type ProgressEvent = ThinkingEvent | TokenEvent | CompleteEvent | ErrorEvent;

export class BuilderProgressEmitter {
    private readonly res: ExpressResponse;
    private closed = false;

    constructor(res: ExpressResponse) {
        this.res = res;
    }

    /** Set SSE response headers. Must be called BEFORE emitting events. */
    init(): void {
        this.res.setHeader('Content-Type', 'text/event-stream');
        this.res.setHeader('Cache-Control', 'no-cache, no-transform');
        this.res.setHeader('Connection', 'keep-alive');
        this.res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
        this.res.flushHeaders();
    }

    emit(event: ProgressEvent): void {
        if (this.closed) return;
        try {
            this.res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
            this.closed = true;
        }
    }

    /** Emit a thinking / progress step label */
    thinking(step: string, node?: string): void {
        this.emit({ type: 'thinking', step, node, timestamp: Date.now() });
    }

    /**
     * Emit a single response token chunk.
     * Called once per token as the LLM streams its answer.
     */
    token(text: string): void {
        if (!text) return;
        this.emit({ type: 'token', text, timestamp: Date.now() });
    }

    /**
     * Emit the final metadata event.
     * NOTE: `payload` must NOT include `response` — the full text was already
     * streamed token-by-token via `token()` events.
     */
    complete(payload: Record<string, unknown>): void {
        this.emit({ type: 'complete', payload, timestamp: Date.now() });
        this.end();
    }

    error(message: string): void {
        this.emit({ type: 'error', message, timestamp: Date.now() });
        this.end();
    }

    end(): void {
        if (this.closed) return;
        this.closed = true;
        try { this.res.end(); } catch { /* already closed */ }
    }

    get isClosed(): boolean {
        return this.closed;
    }
}
