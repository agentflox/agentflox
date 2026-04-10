"use client";
import React from "react";
import { BACKEND_URL } from "@/entities/agents/hooks/useAgentStream";
import { fetchAuthToken } from "@/utils/backend-request";
import { useToast } from "@/hooks/useToast";
import type { BuilderInputField } from "@/entities/tools/types/builder";

export type RunLogEntry = { type: "thinking" | "token" | "complete" | "error"; content: string; ts: number; nodeId?: string; payload?: any };
export type RunRecord = {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: "running" | "success" | "error";
  input: Record<string, unknown>;
  logs: RunLogEntry[];
  output?: any;
  error?: string;
};
export type NodeRunState = { status: "running" | "success" | "error"; output?: any };

export function useToolRun({ initialTool, inputs }: { initialTool: any; inputs: BuilderInputField[] }) {
  const { toast } = useToast();
  const [isRunningTool, setIsRunningTool] = React.useState(false);
  const [runHistory, setRunHistory] = React.useState<RunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [runInput, setRunInput] = React.useState<Record<string, string>>({});
  const [liveRunState, setLiveRunState] = React.useState<Record<string, NodeRunState>>({});
  const selectedRun = runHistory.find((r) => r.id === selectedRunId) ?? null;

  const runCompositeTool = React.useCallback(
    async (options?: { startStepId?: string; onRunStart?: () => void }) => {
      if (!initialTool?.id) {
        toast({
          title: "Save tool first",
          description: "Please save this tool before running it.",
          variant: "destructive",
        });
        return;
      }

      if (isRunningTool) return;

      const resolvedInput: Record<string, unknown> = {};
      for (const field of inputs) {
        if (!field.name) continue;
        const overrideVal = runInput[field.name];
        if (overrideVal !== undefined && overrideVal !== "") {
          resolvedInput[field.name] = overrideVal;
        } else if (field.defaultValue !== undefined) {
          resolvedInput[field.name] = field.defaultValue;
        }
      }

      const runId = crypto.randomUUID();
      const newRecord: RunRecord = {
        id: runId,
        startedAt: Date.now(),
        status: "running",
        input: resolvedInput,
        logs: [],
      };
      setRunHistory((prev) => [newRecord, ...prev]);
      setSelectedRunId(runId);
      setIsRunningTool(true);
      setLiveRunState({
        outputs: { status: "running" }
      });
      
      if (options?.onRunStart) {
        options.onRunStart();
      }

      const appendLog = (entry: RunLogEntry) => {
        setRunHistory((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, logs: [...r.logs, entry] } : r
          )
        );
      };

      try {
        const token = await fetchAuthToken();
        const res = await fetch(
          `${BACKEND_URL}/v1/agents/composite-tools/${encodeURIComponent(initialTool.id)}/run`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ input: resolvedInput, startStepId: options?.startStepId }),
          }
        );

        if (!res.ok || !res.body) {
          const text = await res.text();
          let message = text;
          try { const p = JSON.parse(text); message = p?.message || p?.error || text; } catch { }
          throw new Error(message || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalOutput: any = undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              const ts = Date.now();
              if (ev.type === "thinking") {
                appendLog({ type: "thinking", content: ev.step || ev.content || "", ts, nodeId: ev.node, payload: ev.payload });
                if (ev.node) {
                  setLiveRunState((prev) => {
                    const contentStr = (ev.step || ev.content || "");
                    const isDone = contentStr.includes("completed successfully");
                    return {
                      ...prev,
                      [ev.node]: {
                        status: isDone ? "success" : "running",
                        output: ev.payload !== undefined ? ev.payload : prev[ev.node]?.output
                      }
                    }
                  });
                }
              } else if (ev.type === "token") {
                appendLog({ type: "token", content: ev.text || ev.content || "", ts });
              } else if (ev.type === "complete") {
                finalOutput = ev.payload?.output ?? ev.payload;
                appendLog({ type: "complete", content: typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput, null, 2), ts });
                setLiveRunState((prev) => ({
                  ...prev,
                  outputs: { status: "success", output: finalOutput }
                }));
              } else if (ev.type === "error") {
                appendLog({ type: "error", content: ev.message || ev.content || "Unknown error", ts });
                setLiveRunState((prev) => ({
                  ...prev,
                  outputs: { status: "error", output: ev.message || ev.content }
                }));
              }
            } catch { /* skip bad frames */ }
          }
        }

        setRunHistory((prev) =>
          prev.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: r.logs.some((l) => l.type === "error") ? "error" : "success",
                  finishedAt: Date.now(),
                  output: finalOutput,
                  error: r.logs.find((l) => l.type === "error")?.content,
                }
              : r
          )
        );
      } catch (err: any) {
        appendLog({ type: "error", content: err?.message || "Failed to run tool.", ts: Date.now() });
        setRunHistory((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, status: "error", finishedAt: Date.now(), error: err?.message } : r
          )
        );
        setLiveRunState((prev) => ({
          ...prev,
          outputs: { status: "error", output: err?.message }
        }));
      } finally {
        setIsRunningTool(false);
      }
    },
    [initialTool?.id, inputs, runInput, toast, isRunningTool],
  );

  return {
    isRunningTool,
    runHistory,
    setRunHistory,
    selectedRunId,
    setSelectedRunId,
    runInput,
    setRunInput,
    selectedRun,
    runCompositeTool,
    liveRunState,
  };
}
