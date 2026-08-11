"use client";

import { fetchAuthToken, sendBackendRequest } from "@/utils/backend-request";
import { BACKEND_URL } from "@/hooks/useSSEStream";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SupportStreamCallbacks {
  onThinking?: (step: string) => void;
  onToken?: (text: string) => void;
  onComplete?: (content: string) => void;
  onError?: (message: string) => void;
}

// ─── Initialize support conversation ────────────────────────────────────────

export async function initializeSupportAssistant(
  title?: string,
): Promise<{ conversationId: string; created: boolean }> {
  const res = await sendBackendRequest("/v1/support/initialize", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Send message (non-streaming) ───────────────────────────────────────────

export async function sendMessageToSupportAssistant(
  conversationId: string,
  message: string,
): Promise<{ content: string }> {
  const res = await sendBackendRequest("/v1/support/message", {
    method: "POST",
    body: JSON.stringify({ conversationId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Stream message (SSE) ────────────────────────────────────────────────────

/**
 * Streams the assistant response for the support chat.
 * Emits SSE frames: thinking → token → complete | error.
 * Compatible with useSSEStream on the frontend.
 */
export async function streamMessageToSupportAssistant(
  conversationId: string,
  message: string,
  callbacks: SupportStreamCallbacks,
  modelId?: string | null,
): Promise<void> {
  const token = await fetchAuthToken();

  const res = await fetch(`${BACKEND_URL}/v1/support/message-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conversationId, message, ...(modelId ? { modelId } : {}) }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let errMsg = `HTTP ${res.status}`;
    try {
      const data = JSON.parse(text);
      errMsg = data?.message || data?.error || errMsg;
    } catch { /* ignore */ }
    callbacks.onError?.(errMsg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

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
      let event: any;
      try {
        event = JSON.parse(dataLines.join(""));
      } catch {
        continue;
      }

      switch (event.type) {
        case "thinking":
          callbacks.onThinking?.(event.step ?? "");
          break;
        case "token":
          fullText += event.text ?? "";
          callbacks.onToken?.(event.text ?? "");
          break;
        case "complete":
          callbacks.onComplete?.(event.payload?.content ?? fullText);
          break;
        case "error":
          callbacks.onError?.(event.message ?? "Unknown error");
          break;
      }
    }
  }
}
