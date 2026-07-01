"use client";

/**
 * Shared SSE streaming utility for workforce and tool domain hooks.
 * Mirrors the logic in useAgentStream but is a plain function (not a hook)
 * so it can be called inside any hook without creating an extra React tree dep.
 */

import { useCallback, useRef, useState } from "react";
import { fetchAuthToken } from "@/utils/backend-request";

export const BACKEND_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SERVER_URL ?? "http://127.0.0.1:3002")
    : "http://127.0.0.1:3002";

export interface StreamCallbacks {
  onThinking?: (step: string, node?: string) => void;
  onToken?: (text: string) => void;
  onComplete?: (payload: any) => void;
  onError?: (message: string) => void;
}

export interface ThinkingStep {
  step: string;
  node?: string;
  timestamp: number;
}

export interface UseSSEStreamReturn {
  thinkingSteps: ThinkingStep[];
  thinkingStep: string | null;
  thinkingNode: string | null;
  streamingContent: string;
  isSending: boolean;
  isStreaming: boolean;
  abort: () => void;
  stream: (params: { url: string; body: Record<string, unknown> }) => Promise<void>;
}

/**
 * Self-contained SSE streaming hook — does NOT depend on useAgentStream.
 * Domain hooks (useWorkforceStream, useToolEditorAssistantStream, etc.) call
 * this directly instead of delegating through useAgentStream.
 */
export function useSSEStream(callbacks: StreamCallbacks = {}): UseSSEStreamReturn {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const [thinkingNode, setThinkingNode] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
    setIsStreaming(false);
    setThinkingStep(null);
    setThinkingNode(null);
    setStreamingContent("");
  }, []);

  const stream = useCallback(async ({ url, body }: { url: string; body: Record<string, unknown> }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSending(true);
    setIsStreaming(false);
    setThinkingSteps([]);
    setThinkingStep("Starting...");
    setThinkingNode(null);
    setStreamingContent("");

    try {
      const token = await fetchAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const ct = response.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await response.json();
            errMsg = data?.message || data?.error || errMsg;
          } else {
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              errMsg = data?.message || data?.error || errMsg;
            } catch {
              errMsg = text.substring(0, 200) || errMsg;
            }
          }
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        const data = await response.json();
        callbacksRef.current.onComplete?.(data);
        return;
      }

      setIsStreaming(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;
          const dataLines = frame
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice("data: ".length));

          if (dataLines.length === 0) continue;
          const rawJson = dataLines.join("");

          let event: any;
          try {
            event = JSON.parse(rawJson);
          } catch {
            console.warn("[useSSEStream] Failed to parse SSE frame:", rawJson.substring(0, 100));
            continue;
          }

          switch (event.type) {
            case "thinking": {
              const step = event.step ?? "";
              const node = event.node;
              setThinkingStep(step);
              setThinkingNode(node ?? null);
              setThinkingSteps((prev) => [
                ...prev,
                { step, node, timestamp: event.timestamp ?? Date.now() },
              ]);
              callbacksRef.current.onThinking?.(step, node);
              break;
            }
            case "token": {
              const text = event.text ?? "";
              setStreamingContent((prev) => prev + text);
              callbacksRef.current.onToken?.(text);
              break;
            }
            case "complete": {
              setIsStreaming(false);
              setThinkingStep(null);
              setThinkingNode(null);
              callbacksRef.current.onComplete?.(event.payload ?? event);
              break;
            }
            case "error": {
              throw new Error(event.message ?? "Stream error");
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      setIsStreaming(false);
      setThinkingStep(null);
      callbacksRef.current.onError?.(msg);
    } finally {
      setIsSending(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []); // stable — uses refs for callbacks

  return {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isSending,
    isStreaming,
    abort,
    stream,
  };
}
