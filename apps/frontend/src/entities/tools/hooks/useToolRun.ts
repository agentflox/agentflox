"use client";
import React from "react";
import { BACKEND_URL } from "@/hooks/useSSEStream";
import { fetchAuthToken } from "@/utils/backend-request";
import { useToast } from "@/hooks/useToast";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import { getSocket } from "@/lib/socket";

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
          `${BACKEND_URL}/v1/tools/composite/${encodeURIComponent(initialTool.id)}/run`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ input: resolvedInput, startStepId: options?.startStepId }),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          let message = text;
          try { const p = JSON.parse(text); message = p?.message || p?.error || text; } catch { }
          throw new Error(message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const serverRunId = data.runId;

        if (!serverRunId) {
          throw new Error("Server did not return a run ID");
        }

        // WebSockets streaming
        const socket = getSocket();
        if (!socket) {
          throw new Error("Real-time connection is not established");
        }

        const handleToolLog = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          const ts = Date.now();
          if (ev.type === "thinking") {
            appendLog({ type: "thinking", content: ev.content || "", ts, nodeId: ev.stepId, payload: ev.payload });
            if (ev.stepId) {
              setLiveRunState((prev) => {
                const contentStr = (ev.content || "");
                const isDone = contentStr.includes("completed");
                return {
                  ...prev,
                  [ev.stepId]: {
                    status: isDone ? "success" : "running",
                    output: ev.payload !== undefined ? ev.payload : prev[ev.stepId]?.output
                  }
                }
              });
            }
          } else if (ev.type === "token") {
            appendLog({ type: "token", content: ev.content || "", ts });
          }
        };

        const handleToolComplete = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          const finalOutput = ev.result ?? ev.payload;
          const ts = Date.now();

          appendLog({ type: "complete", content: typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput, null, 2), ts });
          setLiveRunState((prev) => ({
            ...prev,
            outputs: { status: "success", output: finalOutput }
          }));

          setRunHistory((prev) =>
            prev.map((r) =>
              r.id === runId
                ? {
                  ...r,
                  status: "success",
                  finishedAt: Date.now(),
                  output: finalOutput,
                }
                : r
            )
          );

          setIsRunningTool(false);
          cleanupSocket();
        };

        const handleToolError = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          const message = ev.message || "Unknown error";
          const ts = Date.now();

          appendLog({ type: "error", content: message, ts });
          setLiveRunState((prev) => ({
            ...prev,
            outputs: { status: "error", output: message }
          }));

          setRunHistory((prev) =>
            prev.map((r) =>
              r.id === runId ? { ...r, status: "error", finishedAt: Date.now(), error: message } : r
            )
          );

          setIsRunningTool(false);
          cleanupSocket();
        };

        const cleanupSocket = () => {
          socket.off('tool:log', handleToolLog);
          socket.off('tool:complete', handleToolComplete);
          socket.off('tool:error', handleToolError);
          socket.emit('tool:unsubscribe-logs', { runId: serverRunId });
        };

        socket.on('tool:log', handleToolLog);
        socket.on('tool:complete', handleToolComplete);
        socket.on('tool:error', handleToolError);

        socket.emit('tool:subscribe-logs', { runId: serverRunId });

      } catch (err: any) {
        appendLog({ type: "error", content: err?.message || "Failed to start tool execution.", ts: Date.now() });
        setRunHistory((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, status: "error", finishedAt: Date.now(), error: err?.message } : r
          )
        );
        setLiveRunState((prev) => ({
          ...prev,
          outputs: { status: "error", output: err?.message }
        }));
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
